// firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdAVuZlyKeiIBsbAggBd9zxoWkVvgS7uw",
  authDomain: "teacher-attendance-dynamic-v.firebaseapp.com",
  projectId: "teacher-attendance-dynamic-v",
  storageBucket: "teacher-attendance-dynamic-v.firebasestorage.app",
  messagingSenderId: "339903120292",
  appId: "1:339903120292:web:ee3bcae530a0a64f2db731",
  measurementId: "G-SREH6MW6QB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service  
export const db = getFirestore(app);

export default app;