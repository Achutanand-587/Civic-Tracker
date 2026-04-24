require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const crypto = require('crypto');
const multer = require('multer');

// Configure Multer for processing 'multipart/form-data' files in memory
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

function haversineDistance(coords1, coords2) {
    const toRad = (x) => (x * Math.PI) / 180;
    const { lat: lat1, lng: lon1 } = coords1;
    const { lat: lat2, lng: lon2 } = coords2;

    const R = 6371e3; // metres
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

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
        
        const db = admin.firestore();
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
        
        const distance = haversineDistance(issueLocation, technicianLocation);
        const ALLOWED_RADIUS = 50000000; // Increased to 50,000km for testing / dev
        
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
