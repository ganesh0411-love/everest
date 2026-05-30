import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCNwb-MibwwEIVe7zfusNJXVg1V0hpK_VI",
  authDomain: "everestmicrofinance-e966f.firebaseapp.com",
  projectId: "everestmicrofinance-e966f",
  storageBucket: "everestmicrofinance-e966f.firebasestorage.app",
  messagingSenderId: "684525651349",
  appId: "1:684525651349:web:27fb22c47edcfefd59a29c",
  measurementId: "G-8XJ2JJQXD9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
