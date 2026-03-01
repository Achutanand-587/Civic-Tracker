// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD9PGIvDi-SW6BAnO2nRndmyEWPDB9esB8",
  authDomain: "local-issue-tracker-1533d.firebaseapp.com",
  projectId: "local-issue-tracker-1533d",
  storageBucket: "local-issue-tracker-1533d.firebasestorage.app",
  messagingSenderId: "971353754402",
  appId: "1:971353754402:web:c19df9427f6c9ab765b37b",
  measurementId: "G-RF58L9ZVWZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

