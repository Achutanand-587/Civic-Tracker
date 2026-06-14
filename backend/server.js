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
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
            : require('./pmc-service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`
        });
        console.log("Firebase Admin initialized successfully.");
    } catch (e) {
        console.error("Warning: pmc-service-account.json not found or invalid", e);
        admin.initializeApp({
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
    }
}

const db = admin.firestore();
const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET || admin.app().options.storageBucket || 'local-issue-tracker-1533d.firebasestorage.app';

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
    const findFirstUser = async (roleValues, wardValue) => {
      for (const role of roleValues) {
        const baseQuery = db.collection('users').where('role', '==', role);
        const queries = wardValue
          ? [
              baseQuery.where('wardId', '==', wardValue),
              baseQuery.where('ward_id', '==', wardValue)
            ]
          : [baseQuery];

        for (const query of queries) {
          const snapshot = await query.limit(1).get();
          if (!snapshot.empty) {
            return snapshot.docs[0].id;
          }
        }
      }

      return null;
    };

    if (level === 1) {
      return findFirstUser(['WARD_OFFICER', 'ward_officer'], wardId);
    } else if (level === 2) {
      return findFirstUser(['COMMISSIONER', 'commissioner'], null);
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error resolving escalation assignee:', error);
    return null;
  }
}

function getIssueWardId(issue) {
  return issue.wardId || issue.ward_id || null;
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

    const stringData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {});

    const message = {
      notification: { title, body },
      data: stringData,
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

async function uploadBufferToStorage(path, buffer, contentType = 'image/jpeg') {
  const token = crypto.randomUUID();
  const bucket = admin.storage().bucket(storageBucketName);
  const fileUpload = bucket.file(path);

  await fileUpload.save(buffer, {
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });

  return `https://firebasestorage.googleapis.com/v0/b/${storageBucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function uploadBase64ToStorage(path, base64) {
  const match = base64.match(/^data:(.+);base64,(.+)$/);
  const contentType = match?.[1] || 'image/jpeg';
  const rawBase64 = match?.[2] || base64;
  return uploadBufferToStorage(path, Buffer.from(rawBase64, 'base64'), contentType);
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

    const { ticketId, technicianCoords, accuracy, photoBlob, photoBase64, notes } = req.body;
    const base64Photo = photoBase64 || (typeof photoBlob === 'string' ? photoBlob : null);

    if (!ticketId || !technicianCoords) {
      return res.status(400).json({ error: 'Missing ticketId or technicianCoords' });
    }

    if (!req.file && !base64Photo) {
      return res.status(400).json({ error: 'Resolution photo is required' });
    }

    // Parse coords if string
    let coords = technicianCoords;
    if (typeof coords === 'string') {
      coords = JSON.parse(coords);
    }

    if (
      typeof coords.lat !== 'number' ||
      typeof coords.lng !== 'number' ||
      Number.isNaN(coords.lat) ||
      Number.isNaN(coords.lng)
    ) {
      return res.status(400).json({ error: 'Invalid technician coordinates' });
    }

    // Check GPS accuracy
    const parsedAccuracy = Number(accuracy);
    if (Number.isFinite(parsedAccuracy) && parsedAccuracy > 50) {
      return res.status(400).json({
        error: 'GPS signal too weak. Please move to an open area and try again.',
        accuracy: parsedAccuracy
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
    const uploadPhoto = async (basePath) => {
      if (req.file) {
        const fileExt = req.file.mimetype?.split('/')[1] || 'jpg';
        return uploadBufferToStorage(
          `${basePath}/${ticketId}/${Date.now()}.${fileExt}`,
          req.file.buffer,
          req.file.mimetype || 'image/jpeg'
        );
      }

      if (base64Photo) {
        return uploadBase64ToStorage(`${basePath}/${ticketId}/${Date.now()}.jpg`, base64Photo);
      }

      return null;
    };

    if (distance <= GEOFENCE_RADIUS) {
      // --- RESOLUTION SUCCESS ---
      // Upload photo to Firebase Storage
      const photoUrl = await uploadPhoto('resolutions');

      // Update ticket
      const batch = db.batch();
      batch.update(ticketRef, {
        status: 'resolved',
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
        resolvedBy: decodedToken.uid,
        resolutionPhotoUrl: photoUrl,
        resolvedCoords: { lat: coords.lat, lng: coords.lng },
        resolutionNotes: notes || ticket.resolutionNotes || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await batch.commit();

      // Notify citizen
      if (ticket.reportedBy) {
        await sendPushNotification(
          ticket.reportedBy,
          'Issue Resolved',
          `Your reported issue "${ticket.title}" has been resolved.`,
          { ticketId, status: 'resolved', type: 'resolution' }
        );
      }

      return res.json({ status: 'resolved', distance });

    } else {
      // --- GEOFENCE BLOCK ---
      // Upload photo to disputes storage
      const photoUrl = await uploadPhoto('disputes');

      // Create dispute record
      const disputeRef = db.collection('disputes').doc(ticketId);
      const batch = db.batch();
      batch.set(disputeRef, {
        ticketId,
        technicianId: decodedToken.uid,
        technicianCoords: { lat: coords.lat, lng: coords.lng },
        issueCoords: { lat: issueCoords.lat, lng: issueCoords.lng },
        distanceMeters: distance,
        photoUrl,
        notes: notes || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending_review'
      });
      batch.update(ticketRef, {
        last_geofence_block_at: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await batch.commit();

      // Query for ward officer of the ticket's ward
      const wardId = getIssueWardId(ticket);
      if (wardId) {
        const wardOfficerId = await resolveEscalationAssignee(1, wardId);
        if (wardOfficerId) {
          await sendPushNotification(
            wardOfficerId,
            'Manual Review Required',
            'A technician was outside the geofence. Review disputed submission.',
            { ticketId, disputeId: disputeRef.id, distanceMeters: String(Math.round(distance)), type: 'geofence_block' }
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
// SLA ESCALATION JOB
// ============================================================

async function runEscalationCheck(source = 'cron') {
  try {
    console.log(`[SLA ${source}] Checking for overdue tickets...`);
    const now = new Date();

    const overdueSnapshot = await db.collection('issues')
      .where('status', 'not-in', ['resolved', 'closed'])
      .where('deadline_at', '<=', admin.firestore.Timestamp.fromDate(now))
      .where('escalation_level', '<', 2)
      .get();

    if (overdueSnapshot.empty) {
      console.log(`[SLA ${source}] No overdue tickets found.`);
      return { escalatedCount: 0 };
    }

    const batch = db.batch();
    let escalatedCount = 0;
    const notifications = [];

    for (const doc of overdueSnapshot.docs) {
      const issue = doc.data();
      const newLevel = (issue.escalation_level ?? 0) + 1;
      const newAssigneeId = await resolveEscalationAssignee(newLevel, getIssueWardId(issue));
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
        last_escalated_at: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Queue FCM notification for new assignee
      if (newAssigneeId) {
        notifications.push(sendPushNotification(
          newAssigneeId,
          'Ticket Escalated to You',
          `"${issue.title}" has been escalated and requires your attention.`,
          {
            ticketId: doc.id,
            escalationLevel: String(newLevel),
            type: 'escalation',
            reason: 'SLA_BREACH'
          }
        ));
      }

      console.log(`[SLA ${source}] Queued escalation for ticket ${doc.id} to level ${newLevel}`);
      escalatedCount++;
    }

    await batch.commit();
    await Promise.allSettled(notifications);
    console.log(`[SLA ${source}] Escalated ${escalatedCount} tickets.`);
    return { escalatedCount };

  } catch (error) {
    console.error(`[SLA ${source}] Error:`, error);
    throw error;
  }
}

cron.schedule('*/15 * * * *', async () => {
  try {
    await runEscalationCheck('cron');
  } catch (error) {
    // runEscalationCheck already logs full details.
  }
});

console.log('[SLA Cron] Scheduler initialized. Running checks every 15 minutes.');

app.post('/api/cron/escalate', async (req, res) => {
  const configuredSecret = process.env.SCHEDULER_SHARED_SECRET;
  const providedSecret = req.headers['x-scheduler-secret'] || req.body?.secret;

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await runEscalationCheck('http');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Escalation job failed', message: error.message });
  }
});

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
        const bucketName = storageBucketName;
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
