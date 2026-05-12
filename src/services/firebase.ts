import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAonvIGydn0ROu2wumFRLXQS9FWvstRbVw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0566071236.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0566071236",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0566071236.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "485814053867",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:485814053867:web:ef495ef94f83a6282447ae",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-V3FMENV4DN",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
