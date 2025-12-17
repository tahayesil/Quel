// assets/js/profile.js
import { createApp } from 'https://unpkg.com/vue@3.3.4/dist/vue.esm-browser.js';
import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const API_KEY_STORAGE = 'quel_groq_key';

createApp({
    data() {
        return {
            user: {
                name: 'Guest',
                email: '',
                avatar: 'https://ui-avatars.com/api/?name=Guest&background=6366f1&color=fff',
                tier: 'free'
            },
            projects: [],
            activeTab: 'public',
            apiKeyInput: '',
            hasApiKey: false,

            // Modal States
            showPricingModal: false,
            showToast: false,
            toastMessage: '',
            toastType: 'success'
        };
    },
    computed: {
        userProjects() {
            // Sadece sistem projesi olmayanlar
            return this.projects; // Firebase'den zaten sadece user projects geliyor
        },
        publicProjects() {
            return this.projects.filter(p => !p.isPrivate);
        },
        privateProjects() {
            return this.projects.filter(p => p.isPrivate);
        },
        filteredProjects() {
            return this.activeTab === 'public' ? this.publicProjects : this.privateProjects;
        },
        totalLikes() {
            return this.projects.reduce((sum, p) => sum + (p.likes || 0), 0);
        },
        storageLimit() {
            return this.user.tier === 'pro' ? 2 : (this.user.tier === 'pro_plus' ? 10 : 0.5);
        },
        storageUsed() {
            // Mock hesaplama
            return (this.projects.length * 0.05).toFixed(2);
        }
    },
    methods: {
        async checkAuth() {
            // Vue mounted icinde onAuthStateChanged kullanacagiz
            const key = localStorage.getItem(API_KEY_STORAGE);
            if (key) {
                this.apiKeyInput = key;
                this.hasApiKey = true;
            }
        },
        async loadProjects() {
            this.projects = [];
            if (this.user.uid) {
                try {
                    const q = query(collection(db, "projects"), where("uid", "==", this.user.uid));
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach((doc) => {
                        this.projects.push({ id: doc.id, ...doc.data() });
                    });
                } catch (e) {
                    console.error("Error loading profile projects:", e);
                }
            }
        },
        saveApiKey() {
            if (!this.apiKeyInput.trim()) return;
            localStorage.setItem(API_KEY_STORAGE, this.apiKeyInput);
            this.hasApiKey = true;
            this.showToastNotification('API Key Saved Successfully!');
        },
        showToastNotification(msg, type = 'success') {
            this.toastMessage = msg;
            this.toastType = type;
            this.showToast = true;
            setTimeout(() => this.showToast = false, 3000);
        },
        getTierColor(tier) {
            if (tier === 'pro') return 'bg-amber-500 text-white';
            if (tier === 'pro_plus') return 'bg-purple-600 text-white';
            return 'bg-gray-600 text-white';
        },
        switchTier(tier) {
            this.user.tier = tier;
            localStorage.setItem('quel_user_tier', tier);
            this.showPricingModal = false;
            this.showToastNotification(`Welcome to ${tier.toUpperCase()} Plan!`);
        },
        getProjectPreview(p) {
            return `<!DOCTYPE html><html><head><style>body{margin:0;overflow:hidden;transform:scale(0.8);transform-origin:top left;width:125%;height:125%;}${p.css}</style></head><body>${p.html}</body></html>`;
        },
        deleteProject(id) {
            // Silme islemi icin app.js ana ekrani kullanilmasi daha guvenli simdilik
            // veya burada da deleteDoc ekleyebiliriz ama kullaniciya oraya yonlendiriyoruz
            if (confirm('Please go to the main Editor to delete projects completely.')) {
                window.location.href = 'index.html';
            }
        },
        openProject(project) {
            window.location.href = 'index.html'; // Editoru acmasi icin
        },
        async logout() {
            await signOut(auth);
            localStorage.removeItem('quel_auth_token');
            localStorage.removeItem('quel_user_uid');
            localStorage.removeItem('quel_user_tier');
            localStorage.removeItem('quel_user_name');
            localStorage.removeItem('quel_user_email');
            localStorage.removeItem('quel_user_avatar');
            window.location.href = 'index.html';
        }
    },
    mounted() {
        this.checkAuth();

        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.user.uid = user.uid;
                this.user.email = user.email;
                this.user.name = user.displayName || user.email.split('@')[0];
                this.user.avatar = user.photoURL || `https://ui-avatars.com/api/?name=${this.user.name}&background=random`;
                // LocalStorage tier sync
                const savedTier = localStorage.getItem('quel_user_tier');
                if (savedTier) this.user.tier = savedTier;

                this.loadProjects();
            } else {
                window.location.href = 'index.html';
            }
        });
    }
}).mount('#profile-app');
