require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const crypto = require('crypto');
const multer = require('multer');
const cron = require('node-cron');

// Configure Multer for processing 'multipart/form-data' files in memory
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = require('./pmc-service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully.");
    } catch (e) {
        console.error("Warning: pmc-service-account.json not found or invalid", e);
        admin.initializeApp();
    }
}

const db = admin.firestore();

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Haversine distance calculation (in meters)
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in metres
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute deadline based on severity SLA
 */
function computeDeadline(severity) {
  const SLA_HOURS = {
    critical: 4,
    high: 24,
    medium: 72,
    low: 168  // 7 days
  };

  const hours = SLA_HOURS[severity] ?? 72;
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
}

/**
 * Compute new deadline for escalation levels
 */
function computeNewDeadline(level) {
  const deadline = new Date();
  if (level === 1) {
    deadline.setHours(deadline.getHours() + 12);
  } else if (level === 2) {
    deadline.setHours(deadline.getHours() + 4);
  }
  return deadline;
}

/**
 * Resolve escalation assignee by level and wardId
 */
async function resolveEscalationAssignee(level, wardId) {
  try {
    let query;
    if (level === 1) {
      // Ward Officer
      query = db.collection('users')
        .where('role', '==', 'ward_officer')
        .where('wardId', '==', wardId);
    } else if (level === 2) {
      // Commissioner
      query = db.collection('users').where('role', '==', 'commissioner');
    } else {
      return null;
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      console.warn(`No user found for level ${level}, wardId ${wardId}`);
      return null;
    }

    return snapshot.docs[0].id; // Return first matching uid
  } catch (error) {
    console.error('Error resolving escalation assignee:', error);
    return null;
  }
}

/**
 * Send FCM push notification
 */
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const tokens = userDoc.data()?.fcmTokens ?? [];

    if (!tokens.length) {
      console.log(`No FCM tokens found for user ${userId}`);
      return;
    }

    const message = {
      notification: { title, body },
      data,
      tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Clean up stale tokens
    const staleTokens = [];
    response.responses.forEach((r, i) => {
      if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
        staleTokens.push(tokens[i]);
      }
    });

    if (staleTokens.length) {
      await db.collection('users').doc(userId).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens)
      });
    }

    console.log(`FCM notification sent to ${userId}: ${title}`);
  } catch (error) {
    console.error('Error sending FCM notification:', error);
  }
}

/**
 * Verify Firebase ID token from Authorization header
 */
async function verifyAuthToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// ============================================================
// API ENDPOINTS
// ============================================================

/**
 * Feature 1: Geofence Validation API
 * POST /api/geofence/validate
 */
app.post('/api/geofence/validate', upload.single('photoBlob'), async (req, res) => {
  try {
    const decodedToken = await verifyAuthToken(req);
    if (!decodedToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ticketId, technicianCoords, accuracy } = req.body;

    if (!ticketId || !technicianCoords) {
      return res.status(400).json({ error: 'Missing ticketId or technicianCoords' });
    }

    // Parse coords if string
    let coords = technicianCoords;
    if (typeof coords === 'string') {
      coords = JSON.parse(coords);
    }

    // Check GPS accuracy
    if (accuracy && accuracy > 50) {
      return res.status(400).json({
        error: 'GPS signal too weak. Please move to an open area and try again.',
        accuracy
      });
    }

    // Fetch ticket
    const ticketRef = db.collection('issues').doc(ticketId);
    const ticketSnap = await ticketRef.get();

    if (!ticketSnap.exists) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketSnap.data();
    const issueCoords = ticket.location;

    if (!issueCoords) {
      return res.status(400).json({ error: 'Issue missing location data' });
    }

    // Calculate Haversine distance
    const distance = haversineDistanceMeters(
      issueCoords.lat,
      issueCoords.lng,
      coords.lat,
      coords.lng
    );

    const GEOFENCE_RADIUS = 100; // meters
    const bucketName = "local-issue-tracker-1533d.firebasestorage.app";
    const bucket = admin.storage().bucket(bucketName);

    if (distance <= GEOFENCE_RADIUS) {
      // --- RESOLUTION SUCCESS ---
      // Upload photo to Firebase Storage
      let photoUrl = null;
      if (req.file) {
        const token = crypto.randomUUID();
        const fileName = `resolutions/${ticketId}/${Date.now()}.jpg`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(req.file.buffer, {
          metadata: {
            contentType: req.file.mimetype || 'image/jpeg',
            metadata: { firebaseStorageDownloadTokens: token }
          }
        });

        photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
      }

      // Update ticket
      await ticketRef.update({
        status: 'resolved',
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
        resolvedBy: decodedToken.uid,
        resolutionPhotoUrl: photoUrl,
        resolvedCoords: { lat: coords.lat, lng: coords.lng }
      });

      // Notify citizen
      if (ticket.reportedBy) {
        await sendPushNotification(
          ticket.reportedBy,
          'Issue Resolved',
          `Your reported issue "${ticket.title}" has been resolved.`,
          { ticketId, status: 'resolved' }
        );
      }

      return res.json({ status: 'resolved', distance });

    } else {
      // --- GEOFENCE BLOCK ---
      // Upload photo to disputes storage
      let photoUrl = null;
      if (req.file) {
        const token = crypto.randomUUID();
        const fileName = `disputes/${ticketId}/${Date.now()}.jpg`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(req.file.buffer, {
          metadata: {
            contentType: req.file.mimetype || 'image/jpeg',
            metadata: { firebaseStorageDownloadTokens: token }
          }
        });

        photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
      }

      // Create dispute record
      const disputeRef = db.collection('disputes').doc();
      await disputeRef.set({
        ticketId,
        technicianId: decodedToken.uid,
        technicianCoords: { lat: coords.lat, lng: coords.lng },
        issueCoords: { lat: issueCoords.lat, lng: issueCoords.lng },
        distanceMeters: distance,
        photoUrl,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending_review'
      });

      // Query for ward officer of the ticket's ward
      const wardId = ticket.ward_id;
      if (wardId) {
        const wardOfficerQuery = await db.collection('users')
          .where('role', '==', 'ward_officer')
          .where('wardId', '==', wardId)
          .get();

        if (!wardOfficerQuery.empty) {
          const wardOfficerId = wardOfficerQuery.docs[0].id;
          await sendPushNotification(
            wardOfficerId,
            'Manual Review Required',
            `Technician was ${Math.round(distance)}m away from issue location. Review disputed submission.`,
            { ticketId, disputeId: disputeRef.id, distanceMeters: distance }
          );
        }
      }

      return res.json({
        status: 'geofence_block',
        distanceMeters: distance,
        message: `You are too far from the issue location (${Math.round(distance)}m away). Your location has been flagged for review.`
      });
    }

  } catch (error) {
    console.error('Error in geofence validation:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ============================================================
// SLA ESCALATION CRON JOB (Runs every 15 minutes)
// ============================================================

cron.schedule('*/15 * * * *', async () => {
  try {
    console.log('[SLA Cron] Checking for overdue tickets...');
    const now = new Date();

    const overdueSnapshot = await db.collection('issues')
      .where('status', 'not-in', ['resolved', 'closed'])
      .where('deadline_at', '<=', admin.firestore.Timestamp.fromDate(now))
      .where('escalation_level', '<', 2)
      .get();

    if (overdueSnapshot.empty) {
      console.log('[SLA Cron] No overdue tickets found.');
      return;
    }

    const batch = db.batch();
    let escalatedCount = 0;

    for (const doc of overdueSnapshot.docs) {
      const issue = doc.data();
      const newLevel = (issue.escalation_level ?? 0) + 1;
      const newAssigneeId = await resolveEscalationAssignee(newLevel, issue.ward_id);
      const newDeadline = computeNewDeadline(newLevel);

      const escalationEntry = {
        escalatedAt: admin.firestore.FieldValue.serverTimestamp(),
        fromLevel: issue.escalation_level,
        toLevel: newLevel,
        reason: 'SLA_BREACH',
        previousAssigneeId: issue.assignedTo
      };

      batch.update(doc.ref, {
        escalation_level: newLevel,
        assignedTo: newAssigneeId,
        deadline_at: admin.firestore.Timestamp.fromDate(newDeadline),
        escalation_history: admin.firestore.FieldValue.arrayUnion(escalationEntry),
        last_escalated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // Queue FCM notification for new assignee
      if (newAssigneeId) {
        sendPushNotification(
          newAssigneeId,
          'Ticket Escalated to You',
          `"${issue.title}" has been escalated and requires your attention.`,
          {
            ticketId: doc.id,
            escalationLevel: newLevel,
            reason: 'SLA_BREACH'
          }
        ).catch(err => console.error('Error sending escalation notification:', err));
      }

      escalatedCount++;
    }

    await batch.commit();
    console.log(`[SLA Cron] Escalated ${escalatedCount} tickets.`);

  } catch (error) {
    console.error('[SLA Cron] Error:', error);
  }
});

console.log('[SLA Cron] Scheduler initialized. Running checks every 15 minutes.');

// ============================================================
// EXISTING ENDPOINTS (OTP, RESOLUTION, etc.)
// ============================================================

app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const db = admin.firestore();
        
        // Validate if the email belongs to an authorized PMC admin via Firebase Auth
        let uid;
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            uid = userRecord.uid;
        } catch (error) {
            return res.status(403).json({ error: "Unauthorized email." });
        }

        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return res.status(403).json({ error: "Unauthorized email." });
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Hash OTP before storing (Security Best Practice)
        const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
        
        // Set 5-minute TTL
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        
        // Store in Firestore `otps` collection
        await db.collection("otps").doc(email).set({
            hashedOTP,
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
            uid
        });
        
        // Mock email sending
        console.log(`\n======================================================`);
        console.log(`[EMAIL MOCK] Sending OTP Code: ${otp} to ${email}`);
        console.log(`======================================================\n`);
        
        res.json({ success: true, message: "OTP sent to email." });

    } catch (error) {
        console.error("Error generating OTP:", error);
        res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ error: "Email and OTP are required." });
        }
        
        const db = admin.firestore();
        const otpDocRef = db.collection("otps").doc(email);
        const otpDoc = await otpDocRef.get();
        
        if (!otpDoc.exists) {
            return res.status(404).json({ error: "No pending OTP found for this email." });
        }
        
        const otpData = otpDoc.data();
        
        // Check TTL
        if (otpData.expiresAt.toDate() < new Date()) {
            await otpDocRef.delete(); // cleanup
            return res.status(400).json({ error: "OTP has expired." });
        }
        
        // Verify Hash
        const hashedCodeInput = crypto.createHash("sha256").update(otp).digest("hex");
        if (hashedCodeInput !== otpData.hashedOTP) {
            return res.status(401).json({ error: "Invalid OTP." });
        }
        
        // Cleanup OTP immediately to prevent reuse
        await otpDocRef.delete();
        
        // Generate Custom Auth Token using the claims system from Phase 1
        const customToken = await admin.auth().createCustomToken(otpData.uid);
        
        res.json({ success: true, token: customToken });

    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
});

// Legacy endpoint - use /api/geofence/validate instead
app.post('/api/resolve-issue-geofence', upload.single('photo'), async (req, res) => {
    try {
        const { issueId, notes } = req.body;
        
        let technicianLocation;
        try {
            technicianLocation = req.body.technicianLocation ? JSON.parse(req.body.technicianLocation) : null;
        } catch (err) {
            return res.status(400).json({ error: "Invalid location format." });
        }

        if (!issueId || !technicianLocation || technicianLocation.lat === undefined || technicianLocation.lng === undefined) {
             return res.status(400).json({ error: "Missing required fields or invalid coordinates." });
        }
        
        if (!req.file) {
             return res.status(400).json({ error: "Live resolution photo is strictly required." });
        }
        
        const issueRef = db.collection("issues").doc(issueId);
        const issueDoc = await issueRef.get();
        
        if (!issueDoc.exists) {
            return res.status(404).json({ error: "Issue not found." });
        }
        
        const issueData = issueDoc.data();
        const issueLocation = issueData.location;
        
        if (!issueLocation || issueLocation.lat === undefined || issueLocation.lng === undefined) {
            return res.status(400).json({ error: "Issue is missing valid location data." });
        }
        
        const distance = haversineDistanceMeters(issueLocation.lat, issueLocation.lng, technicianLocation.lat, technicianLocation.lng);
        const ALLOWED_RADIUS = 100; // 100 meters
        
        if (distance > ALLOWED_RADIUS) {
            return res.status(403).json({ error: `Geofence block: You are ${Math.round(distance)}m away. Must be within ${ALLOWED_RADIUS}m of the issue location.` });
        }
        
        // --- 1. Firebase Storage Upload logic ---
        // Grab default bucket name specified in frontend or use project ID
        // Often we can get it dynamically from admin instances or hardcoded 
        const bucketName = "local-issue-tracker-1533d.firebasestorage.app";
        const bucket = admin.storage().bucket(bucketName);
        
        const fileExt = req.file.mimetype.split('/')[1] || 'jpg';
        const fileName = `resolutions/issue_${issueId}_${Date.now()}.${fileExt}`;
        const fileUpload = bucket.file(fileName);
        
        const token = crypto.randomUUID();
        await fileUpload.save(req.file.buffer, {
            metadata: { 
                contentType: req.file.mimetype,
                metadata: { firebaseStorageDownloadTokens: token }
            }
        });
        
        const photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
        
        // --- 2. Update Firestore with new photoUrl ---
        await issueRef.update({
            status: 'resolved',
            resolutionNotes: notes || '',
            resolutionPhotoUrl: photoUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ success: true, message: "Issue securely resolved.", distance: Math.round(distance), photoUrl });
    } catch (error) {
        console.error("Error in resolve-issue-geofence:", error);
        res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Civil Connect Backend Running');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
