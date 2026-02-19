// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBitbmjthQUvKyrHmADVLkvwENoVrXYxNY",
  authDomain: "nutriplan-100f9.firebaseapp.com",
  databaseURL: "https://nutriplan-100f9-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "nutriplan-100f9",
  storageBucket: "nutriplan-100f9.firebasestorage.app",
  messagingSenderId: "371119799995",
  appId: "1:371119799995:web:309e59696041f3bbc9739e",
  measurementId: "G-VELZ8ZZYQ3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
