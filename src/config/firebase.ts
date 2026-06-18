import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Environment parameters are injected or set in .env.example
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.FIREBASE_APP_ID || ""
};

let db: Firestore | null = null;
let isConfigured = false;

export function initializeFirebase(): { db: Firestore | null; isConfigured: boolean } {
  if (isConfigured && db) {
    return { db, isConfigured };
  }

  // Check if minimal keys are present
  if (!firebaseConfig.projectId || firebaseConfig.projectId === 'xxx') {
    console.warn("⚠️ Firebase credentials are using placeholder values. falling back to offline-friendly Local Database.");
    return { db: null, isConfigured: false };
  }

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    isConfigured = true;
    console.log("🔥 Firebase Firestore connected successfully.");
    return { db, isConfigured };
  } catch (error) {
    console.error("❌ Failed to lazily initialize Firebase Firestore:", error);
    return { db: null, isConfigured: false };
  }
}

export { db };
