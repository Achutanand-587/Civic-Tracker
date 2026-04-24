const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

// Export Auth Functions
const authFunctions = require('./auth');

exports.generateAndSendOTP = authFunctions.generateAndSendOTP;
exports.verifyOTP = authFunctions.verifyOTP;
