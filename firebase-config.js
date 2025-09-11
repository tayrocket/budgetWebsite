// Firebase configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJ3ScCe9gdA87YTWSf-ecFSXyUqswWOqg",
  authDomain: "budgetwebsite-5d565.firebaseapp.com",
  projectId: "budgetwebsite-5d565",
  storageBucket: "budgetwebsite-5d565.firebasestorage.app",
  messagingSenderId: "583153950223",
  appId: "1:583153950223:web:4a2f2501ee0174439b4d7a"
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);