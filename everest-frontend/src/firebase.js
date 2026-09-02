// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBCxMXDAv5rqIogTaLHFnbTPTqQeI0d1Ag",
  authDomain: "everest-finance-demo.firebaseapp.com",
  projectId: "everest-finance-demo",
  storageBucket: "everest-finance-demo.firebasestorage.app",
  messagingSenderId: "554236541872",
  appId: "1:554236541872:web:1068c45b0501fc87863475"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Secondary app for admin account creation without logging out active session
const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
const secondaryAuth = getAuth(secondaryApp);
auth.settings.appVerificationDisabledForTesting = true;
// Enforce browser local persistence for authentication to survive server restarts/tab closes
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Error setting auth persistence', err);
});

// Use robust persistent cache for Firebase v9+ / v10+ instead of deprecated enableIndexedDbPersistence
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});

const storage = getStorage(app);
const analytics = getAnalytics(app);
const secondaryDb = getFirestore(secondaryApp);

export { auth, db, storage, secondaryAuth, secondaryDb };
