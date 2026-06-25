import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAhas8mg1L8UIVf3WeR3eoP1bLwHbRZBp0",
  authDomain: "clutch-509d7.firebaseapp.com",
  projectId: "clutch-509d7",
  storageBucket: "clutch-509d7.firebasestorage.app",
  messagingSenderId: "983921779502",
  appId: "1:983921779502:web:8b67375bea397332b050bf"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Helper for Firestore references
export const pagesCol = collection(db, 'pages');
export const tasksCol = collection(db, 'tasks');

export {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  writeBatch,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
};

