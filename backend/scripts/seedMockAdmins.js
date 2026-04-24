/*
 * Script to generate Mock Admin Accounts based on real Pune Municipal Corporation (PMC) Wards & Departments
 * Run via: node backend/scripts/seedMockAdmins.js
 */

const admin = require('firebase-admin');

// IMPORTANT: Initialize Firebase Admin before running
// const serviceAccount = require('./path-to-your-service-account.json');
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

if (!admin.apps.length) {
    try {
        const serviceAccount = require('../pmc-service-account.json');
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
        admin.initializeApp(); 
    }
}

const { setAdminRole, ROLES } = require('./setCustomClaims');

const PUNE_DEPARTMENTS = {
  SWM: "SWM",       // Solid Waste Management
  ROAD: "ROAD",     // Road Maintenance
  WATER: "WATER",   // Water Supply
  HEALTH: "HEALTH", // Public Health
  GARDEN: "GARDEN"  // Parks and Gardens
};

// Based on actual 15 Pune Municipal Corporation Ward Offices
const PUNE_WARDS = {
  AUNDH_BANER: "W-01",
  KOTHRUD_BAVDHAN: "W-02",
  DHOLE_PATIL: "W-03",
  NAGAR_ROAD: "W-04",
  SHIVAJINAGAR_GHOLE: "W-05",
  YERAWADA_KALAS: "W-06",
  BHAVANI_PETH: "W-07",
  KASBA_VISHRAMBAUG: "W-08",
  TILAK_ROAD: "W-09",
  SAHAKARNAGAR: "W-10",
  HADAPSAR_MUNDHWA: "W-11",
  KONDHWA_YEWALEWADI: "W-12",
  DHANKAWADI_SAHAKARNAGAR: "W-13",
  SINHAGAD_ROAD: "W-14",
  WARJE_KARVENAGAR: "W-15"
};

const MOCK_ADMINS = [
  {
    email: "commissioner@pmc.gov.in",
    password: "Password123!",
    name: "PMC Commissioner (City Wide)",
    role: ROLES.COMMISSIONER,
    wardId: null,
    deptId: null
  },
  {
    email: "hod.swm@pmc.gov.in",
    password: "Password123!",
    name: "HOD - Solid Waste Management",
    role: ROLES.HOD,
    wardId: null,
    deptId: PUNE_DEPARTMENTS.SWM
  },
  {
    email: "hod.roads@pmc.gov.in",
    password: "Password123!",
    name: "HOD - Road Department",
    role: ROLES.HOD,
    wardId: null,
    deptId: PUNE_DEPARTMENTS.ROAD
  },
  {
    email: "wo.kothrud@pmc.gov.in",
    password: "Password123!",
    name: "Ward Officer - Kothrud/Bavdhan",
    role: ROLES.WARD_OFFICER,
    wardId: PUNE_WARDS.KOTHRUD_BAVDHAN,
    deptId: null
  },
  {
    email: "wo.shivajinagar@pmc.gov.in",
    password: "Password123!",
    name: "Ward Officer - Shivajinagar/Ghole Road",
    role: ROLES.WARD_OFFICER,
    wardId: PUNE_WARDS.SHIVAJINAGAR_GHOLE,
    deptId: null
  },
  {
    email: "je.kothrud.water@pmc.gov.in",
    password: "Password123!",
    name: "Junior Engineer - Kothrud Water Supply",
    role: ROLES.JUNIOR_ENGINEER,
    wardId: PUNE_WARDS.KOTHRUD_BAVDHAN,
    deptId: PUNE_DEPARTMENTS.WATER
  },
  {
    email: "je.shivajinagar.road@pmc.gov.in",
    password: "Password123!",
    name: "Junior Engineer - Shivajinagar Roads",
    role: ROLES.JUNIOR_ENGINEER,
    wardId: PUNE_WARDS.SHIVAJINAGAR_GHOLE,
    deptId: PUNE_DEPARTMENTS.ROAD
  }
];

async function seedDatabase() {
  console.log("--- Starting PMC Mock Admin Seeding ---");
  for (const adminUser of MOCK_ADMINS) {
    try {
      // 1. Create the User in Firebase Auth
      let userRecord;
      try {
         userRecord = await admin.auth().getUserByEmail(adminUser.email);
         console.log(`User ${adminUser.email} already exists. Updating claims...`);
      } catch (err) {
         if (err.code === 'auth/user-not-found') {
            userRecord = await admin.auth().createUser({
              email: adminUser.email,
              password: adminUser.password, // We create a default password so you can test logins!
              displayName: adminUser.name,
            });
            console.log(`Created new auth user: ${adminUser.email}`);
         } else {
            throw err;
         }
      }

      // 2. Assign Custom Claims and create Firestore profile entry via our Phase 1 script
      await setAdminRole(userRecord.uid, adminUser.role, adminUser.wardId, adminUser.deptId);
      
      console.log(`✅ Successfully seeded: ${adminUser.name} (${adminUser.role})`);
    } catch (error) {
      console.error(`❌ Failed to seed ${adminUser.email}:`, error.message);
    }
  }
  console.log("--- Seeding Complete ---");
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0)).catch(console.error);
}

module.exports = { MOCK_ADMINS, PUNE_WARDS, PUNE_DEPARTMENTS, seedDatabase };
