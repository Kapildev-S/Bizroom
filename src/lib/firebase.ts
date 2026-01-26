
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type Storage } from "firebase/storage";
import { getMessaging, type Messaging } from "firebase/messaging";

// User's web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlJYElsOYVcjoWGZOYug7mkoKXYWYMaIY",
  authDomain: "bill-7362b.firebaseapp.com",
  projectId: "bill-7362b",
  storageBucket: "bill-7362b.firebasestorage.app",
  messagingSenderId: "374803975236",
  appId: "1:374803975236:web:be4e0a4caa45ad01e34011",
  measurementId: "G-8DRPZPNJRG" // Optional
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: Storage;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

// Function to get the messaging instance
const getMessagingInstance = (): Messaging | null => {
  // Check for window existence to ensure it's client-side
  if (typeof window !== 'undefined') {
    return getMessaging(app);
  }
  return null;
};


export { app, auth, db, storage, getMessagingInstance };

