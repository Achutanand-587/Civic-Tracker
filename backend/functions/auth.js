const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Validates admin credentials, generates a 6-digit OTP, stores its hash with TTL,
 * and sends it to the admin's email.
 */
exports.generateAndSendOTP = functions.https.onCall(async (data, context) => {
    const email = data.email;
    if (!email) {
        throw new functions.https.HttpsError("invalid-argument", "Email is required");
    }

    const db = admin.firestore();
    
    // Validate if the email belongs to an authorized PMC admin
    const userSnapshot = await db.collection("users").where("email", "==", email).get();
    if (userSnapshot.empty) {
        throw new functions.https.HttpsError("permission-denied", "Unauthorized email.");
    }
    
    const uid = userSnapshot.docs[0].id;
    
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
    
    // In a real production scenario, integrate Nodemailer or SendGrid here
    // For now we log it to standard output.
    console.log(`[EMAIL MOCK] Sending OTP ${otp} (hashed: ${hashedOTP}) to ${email}`);
    
    return { success: true, message: "OTP sent to email." };
});

/**
 * Exchanges the code for a Firebase Custom Token upon successful validation.
 */
exports.verifyOTP = functions.https.onCall(async (data, context) => {
    const { email, otp } = data;
    
    if (!email || !otp) {
        throw new functions.https.HttpsError("invalid-argument", "Email and OTP are required.");
    }
    
    const db = admin.firestore();
    const otpDocRef = db.collection("otps").doc(email);
    const otpDoc = await otpDocRef.get();
    
    if (!otpDoc.exists) {
        throw new functions.https.HttpsError("not-found", "No pending OTP found for this email.");
    }
    
    const otpData = otpDoc.data();
    
    // Check TTL
    if (otpData.expiresAt.toDate() < new Date()) {
        await otpDocRef.delete(); // cleanup
        throw new functions.https.HttpsError("deadline-exceeded", "OTP has expired.");
    }
    
    // Verify Hash
    const hashedCodeInput = crypto.createHash("sha256").update(otp).digest("hex");
    if (hashedCodeInput !== otpData.hashedOTP) {
        throw new functions.https.HttpsError("unauthenticated", "Invalid OTP.");
    }
    
    // Cleanup OTP immediately to prevent reuse
    await otpDocRef.delete();
    
    // Generate Custom Auth Token using the claims system from Phase 1
    const customToken = await admin.auth().createCustomToken(otpData.uid);
    
    return { success: true, token: customToken };
});
