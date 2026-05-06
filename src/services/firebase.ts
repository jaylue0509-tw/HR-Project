import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAonvIGydn0ROu2wumFRLXQS9FWvstRbVw",
  authDomain: "gen-lang-client-0566071236.firebaseapp.com",
  projectId: "gen-lang-client-0566071236",
  storageBucket: "gen-lang-client-0566071236.firebasestorage.app",
  messagingSenderId: "485814053867",
  appId: "1:485814053867:web:ef495ef94f83a6282447ae",
  measurementId: "G-V3FMENV4DN"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
