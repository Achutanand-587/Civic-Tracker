/*
 * Script to generate Mock Issues based on real Pune Municipal Corporation (PMC) Wards & Departments
 * Run via: node backend/scripts/seedMockIssues.js
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = require('../pmc-service-account.json');
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
        admin.initializeApp();
    }
}

const { PUNE_WARDS, PUNE_DEPARTMENTS } = require('./seedMockAdmins');

const MOCK_ISSUES = [
  {
    title: "Large Pothole near University Circle",
    description: "Deep pothole causing traffic slowdowns and poses danger to two-wheelers.",
    category: "pothole",
    status: "reported",
    location: {
      lat: 18.5362,
      lng: 73.8226,
      address: "University Circle, Shivajinagar, Pune"
    },
    upvotes: 42,
    upvotedBy: [],
    reportedBy: "citizen123",
    severity: "high",
    ward_id: PUNE_WARDS.SHIVAJINAGAR_GHOLE,
    ward_name: "Shivajinagar/Ghole Road",
    dept_id: PUNE_DEPARTMENTS.ROAD,
    dept_name: "Road Maintenance",
    assigned_incharge: "Prakash Deshmukh (Ward Officer)"
  },
  {
    title: "Overflowing Garbage Bins",
    description: "Garbage hasn't been collected for 3 days near Paud Road.",
    category: "garbage",
    status: "in-progress",
    location: {
      lat: 18.5085,
      lng: 73.8055,
      address: "Paud Road, Kothrud, Pune"
    },
    upvotes: 15,
    upvotedBy: [],
    reportedBy: "citizen456",
    severity: "medium",
    ward_id: PUNE_WARDS.KOTHRUD_BAVDHAN,
    ward_name: "Kothrud/Bavdhan",
    dept_id: PUNE_DEPARTMENTS.SWM,
    dept_name: "Solid Waste Management",
    assigned_incharge: "Sunita Reddy (Ward Officer)"
  },
  {
    title: "No water supply since morning",
    description: "Entire society has no water pressure. Pls check valve.",
    category: "water",
    status: "reported",
    location: {
      lat: 18.5132,
      lng: 73.8112,
      address: "Dahanukar Colony, Kothrud"
    },
    upvotes: 89,
    upvotedBy: [],
    reportedBy: "citizen789",
    severity: "critical",
    ward_id: PUNE_WARDS.KOTHRUD_BAVDHAN,
    ward_name: "Kothrud/Bavdhan",
    dept_id: PUNE_DEPARTMENTS.WATER,
    dept_name: "Water Supply",
    assigned_incharge: "Arun Patil (Junior Engineer)"
  },
  {
    title: "Streetlight not working",
    description: "Dark patch on the internal road, unsafe at night.",
    category: "streetlight",
    status: "resolved",
    location: {
      lat: 18.5284,
      lng: 73.8504,
      address: "FC Road, Shivajinagar"
    },
    upvotes: 5,
    upvotedBy: [],
    reportedBy: "citizen999",
    severity: "low",
    resolutionNotes: "Replaced the LED bulb.",
    ward_id: PUNE_WARDS.SHIVAJINAGAR_GHOLE,
    ward_name: "Shivajinagar/Ghole Road",
    dept_id: "ELECTRICAL",
    dept_name: "Electrical Department",
    assigned_incharge: "Suresh Joshi (Technician)"
  }
];

async function seedIssues() {
  console.log("--- Starting Mock Issues Seeding ---");
  const db = admin.firestore();
  
  for (const issue of MOCK_ISSUES) {
    try {
      const docRef = await db.collection("issues").add({
        ...issue,
        reportedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Created issue: ${issue.title} (ID: ${docRef.id})`);
    } catch (error) {
      console.error(`❌ Failed to create issue: ${issue.title}`, error);
    }
  }
  console.log("--- Seeding Complete ---");
}

if (require.main === module) {
  seedIssues().then(() => process.exit(0)).catch(console.error);
}

module.exports = { seedIssues };
