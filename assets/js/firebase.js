// assets/js/firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// GitHub girişi için gerekli olan 'GithubAuthProvider' ve 'signInWithPopup' eklendi
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    updateProfile,
    GithubAuthProvider, // EKLENDI
    signInWithPopup     // EKLENDI
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    deleteDoc, 
    updateDoc, 
    query, 
    where, 
    getDoc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- SENIN CONFIG BILGILERIN ---
const firebaseConfig = {
  apiKey: "AIzaSyAiQBvNTcD1M9SzU04dLXwp2ayFvZ3trZg",
  authDomain: "quel-400b2.firebaseapp.com",
  projectId: "quel-400b2",
  storageBucket: "quel-400b2.firebasestorage.app",
  messagingSenderId: "544893245562",
  appId: "1:544893245562:web:1922777c9d813feafe83c3"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// GitHub Sağlayıcısını Tanımla (Eksik olan kısım burasıydı)
const provider = new GithubAuthProvider();

// Dışarı Aktar (Export)
export { 
    auth, 
    db, 
    provider, // ARTIK DISARI AKTARILIYOR
    signInWithPopup, // ARTIK DISARI AKTARILIYOR
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile,
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    deleteDoc, 
    updateDoc, 
    query, 
    where,
    getDoc,
    setDoc
};
