/*
 * Script to assign custom claims to PMC admins and engineers.
 * Prerequisites:
 *   - npm install firebase-admin
 *   - Service account key JSON exported from Firebase Console.
 */

const admin = require('firebase-admin');

// Ensure you have your service account JSON file
// const serviceAccount = require('./path/to/pmc-service-account-key.json');
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// Fallback init inside Cloud Functions or GCP environments
if (!admin.apps.length) {
    try {
        const serviceAccount = require('../../pmc-service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        // Fallback to default credentials if json is missing
        admin.initializeApp();
    }
}

const ROLES = {
  COMMISSIONER: 'COMMISSIONER',
  HOD: 'HOD',
  WARD_OFFICER: 'WARD_OFFICER',
  JUNIOR_ENGINEER: 'JUNIOR_ENGINEER'
};

/**
 * Sets custom claims for a given user based on their specific role in PMC.
 * 
 * @param {string} uid - The Firebase Auth User ID.
 * @param {string} role - The role to assign (from ROLES).
 * @param {string|null} wardId - Ward identifier (required for Ward Officer and JE).
 * @param {string|null} deptId - Department identifier (required for HOD and JE).
 */
async function setAdminRole(uid, role, wardId = null, deptId = null) {
  try {
    if (!Object.values(ROLES).includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    if (role === ROLES.WARD_OFFICER && !wardId) {
      throw new Error('Ward Officers must have a wardId assigned.');
    }

    if (role === ROLES.HOD && !deptId) {
      throw new Error('HODs must have a deptId assigned.');
    }

    if (role === ROLES.JUNIOR_ENGINEER && (!wardId || !deptId)) {
      throw new Error('Junior Engineers must have both wardId and deptId assigned.');
    }

    const claims = {
      pmcRole: role,
      ward_id: wardId,
      dept_id: deptId,
      pmc_access_level: role === ROLES.COMMISSIONER ? 1 :
                        role === ROLES.HOD ? 2 :
                        role === ROLES.WARD_OFFICER ? 3 : 4 
    };

    await admin.auth().setCustomUserClaims(uid, claims);

    const db = admin.firestore();
    await db.collection('users').doc(uid).set({
      role: role,
      ward_id: wardId,
      dept_id: deptId,
      customClaimsSetAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`Successfully assigned ${role} role to user ${uid}`);
    console.log(`Claims payload: ${JSON.stringify(claims)}`);
    
  } catch (error) {
    console.error('Error setting custom claims:', error.message);
    throw error;
  }
}

module.exports = { setAdminRole, ROLES };
