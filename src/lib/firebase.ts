// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, FieldValue } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
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

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize FCM
let messaging: any = null;

export async function initFCM() {
  try {
    messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FCM_VAPID_KEY || "AIzaSyD9PGIvDi-SW6BAnO2nRndmyEWPDB9esB8"
    });

    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("Error initializing FCM:", error);
    return null;
  }
}

export function getMessagingInstance() {
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
}

export function setupFCMListener(callback: (payload: any) => void) {
  if (!messaging) {
    messaging = getMessaging(app);
  }
  
  onMessage(messaging, (payload) => {
    console.log("Message received:", payload);
    callback(payload);
  });
}

