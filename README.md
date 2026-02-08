# QUEL - Next Gen Code Editor

QUEL is a modern, browser-based HTML/CSS/JS playground and developer portfolio platform. It allows users to write code, preview it in real-time, and leverage AI assistance.

🔗 Live Demo: tahayesil.github.io/Quel/

## ✨ Features

-   **Live Code Editor:** Instant preview for HTML, CSS, and JavaScript.
-   **AI Copilot:** Integrated Llama 3 (via Groq API) for code generation and debugging.
-   **Glassmorphism UI:** Premium, modern interface design.
-   **Firebase Backend:**
    -   Authentication (Email/Password, Google, GitHub)
    -   Firestore (Project storage & sync)
-   **Privacy Controls:** Security rules to protect private projects (Pro feature).

## 🚀 Getting Started

### Prerequisites

You need a Firebase Project to run this app.

1.  Create a project at [Firebase Console](https://console.firebase.google.com/).
2.  Enable **Authentication** (Email/Password).
3.  Enable **Firestore Database**.
4.  Copy your web app configuration.

### Installation

1.  Clone the content.
2.  Update `assets/js/firebase-config.js` with your own firebase keys:
    ```javascript
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_PROJECT.appspot.com",
      messagingSenderId: "...",
      appId: "..."
    };
    ```
3.  Open `index.html` in your browser (or use a local server like Live Server).

## 🔒 Security

This project uses Firestore Security Rules to ensure data privacy.
Please apply the contents of `firestore.rules` to your Firebase Console under **Firestore > Rules**.

## 📄 License

MIT License.
