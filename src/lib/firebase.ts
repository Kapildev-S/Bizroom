
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { isSupported, getMessaging, type Messaging } from "firebase/messaging";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlJYElsOYVcjoWGZOYug7mkoKXYWYMaIY",
  authDomain: "bill-7362b.firebaseapp.com",
  projectId: "bill-7362b",
  storageBucket: "bill-7362b.firebasestorage.app",
  messagingSenderId: "374803975236",
  appId: "1:374803975236:web:be4e0a4caa45ad01e34011",
  measurementId: "G-8DRPZPNJRG",
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);

db = typeof window !== 'undefined'
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  : getFirestore(app);
storage = getStorage(app);

/**
 * Returns a Firebase Messaging instance ONLY when the environment supports it
 * (requires Service Workers + Push API — not available in Capacitor WebView).
 * Always returns null silently in unsupported contexts.
 */
const getMessagingInstance = async (): Promise<Messaging | null> => {
  try {
    if (typeof window === 'undefined') return null;
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch {
    return null;
  }
};

export { app, auth, db, storage, getMessagingInstance };
