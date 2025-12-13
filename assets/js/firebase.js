// assets/js/firebase.js

// Firebase kütüphanelerini yüklüyoruz
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Bu fonksiyonları diğer dosyalarda kullanmak için dışa aktarıyoruz
export { 
    auth, 
    db, 
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