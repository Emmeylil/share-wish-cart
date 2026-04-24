// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZhHYolMaUocbbmgDdWu55ZYkOdWgntuo",
  authDomain: "share-wish-cart.firebaseapp.com",
  projectId: "share-wish-cart",
  storageBucket: "share-wish-cart.firebasestorage.app",
  messagingSenderId: "861436857263",
  appId: "1:861436857263:web:8a5e7a94bb5e41e79f7d5a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics conditionally (it only works in browser)
export const analytics = typeof window !== "undefined" 
  ? isSupported().then(yes => yes ? getAnalytics(app) : null)
  : null;

export default app;
