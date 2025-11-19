
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken } from "firebase/messaging";
import { getFunctions } from "firebase/functions";

const firebaseConfig: FirebaseOptions = {
  projectId: "saledup-37079661-bf1ee",
  appId: "1:549813095043:web:3f71153821f97fa2c1e9b6",
  apiKey: "AIzaSyB8o--qEIG40NFt16EbP8P9TtQrpX6QhPo",
  authDomain: "saledup-37079661-bf1ee.firebaseapp.com",
  storageBucket: "saledup-37079661-bf1ee.appspot.com",
  messagingSenderId: "549813095043",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);


const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// Function to request permission and get token
const requestForToken = async () => {
    if (!messaging) {
        console.log("Firebase Messaging is not available in this environment.");
        return null;
    }
    
    const vapidKey = "BG6Jp0pM0N8d7q_21g0N-7_e4gW2R0b-gZJ3y3fH5D5c3g7J3c1Q6C6m0K1v5wJ0n3s4L5a6B7z8E9D"; // Replace with your VAPID key
    if (!vapidKey) {
        console.error("VAPID key not found.");
        return null;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            const currentToken = await getToken(messaging, { vapidKey });
            if (currentToken) {
                console.log('current token for client: ', currentToken);
                return currentToken;
            } else {
                console.log('No registration token available. Request permission to generate one.');
                return null;
            }
        } else {
            console.log('Unable to get permission to notify.');
            return null;
        }
    } catch (err) {
        console.log('An error occurred while retrieving token. ', err);
        return null;
    }
};


export { app, auth, db, storage, functions, messaging, requestForToken };
