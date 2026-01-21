import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA65RlWsspLIG8UAI7zNmpV54cKsslW8Iw",
  authDomain: "let-itout.firebaseapp.com",
  projectId: "let-itout",
  storageBucket: "let-itout.firebasestorage.app",
  messagingSenderId: "976666516752",
  appId: "1:976666516752:web:14f5384283caa7b4d69995",
  measurementId: "G-6GTD6DHNKQ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
// Check if auth is already initialized to avoid error
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  if (error.code === "auth/already-initialized") {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
