// assets/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDTNUkwLAnFdFXhMqFItnBZj9DrRrHUSI0",
    authDomain: "quel-baa75.firebaseapp.com",
    projectId: "quel-baa75",
    storageBucket: "quel-baa75.firebasestorage.app",
    messagingSenderId: "100917732280",
    appId: "1:100917732280:web:a99b63ff9bab0b9148e54d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export { auth, db, provider, githubProvider };
