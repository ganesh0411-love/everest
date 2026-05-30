// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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
auth.settings.appVerificationDisabledForTesting = true;
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

export { auth, db, storage };
