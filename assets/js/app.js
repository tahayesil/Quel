// assets/js/app.js

// 1. Firebase Fonksiyonlarını İçe Aktarıyoruz
import {
    auth, db, provider,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged,
    collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where, setDoc
} from './firebase.js';

import { createApp } from 'https://unpkg.com/vue@3.3.4/dist/vue.esm-browser.js';

document.addEventListener('DOMContentLoaded', () => {
    const API_KEY_STORAGE = 'quel_groq_key';

    // Varsayılan sistem projeleri
    const defaultProjects = [
        { id: 'sys_1', isSystem: true, category: 'Animation', title: 'Neon Glow Button', description: 'Stunning neon glow effects.', html: `<div class="container">\n  <button class="neon-button">Hover Me</button>\n</div>`, css: `body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0a0a0a; font-family: sans-serif; }\n.neon-button { padding: 20px 50px; font-size: 24px; color: #00ffff; background: transparent; border: 3px solid #00ffff; border-radius: 50px; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }\n.neon-button:hover { background: #00ffff; color: #0a0a0a; box-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff; }`, js: '', author: { name: 'Alex Chen', avatar: 'https://ui-avatars.com/api/?name=Alex+Chen&background=ff6b6b&color=fff' }, likes: 342, views: 1205 },
        { id: 'sys_2', isSystem: true, category: 'Layout', title: 'CSS Spinner', description: 'Smooth rotating loader.', html: `<div class="spinner"></div>`, css: `body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a2e; }\n.spinner { width: 80px; height: 80px; border: 8px solid rgba(255,255,255,0.1); border-top: 8px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; }\n@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`, js: '', author: { name: 'Sarah Miller', avatar: 'https://ui-avatars.com/api/?name=Sarah+Miller&background=4ecdc4&color=fff' }, likes: 567, views: 2341 }
    ];

    createApp({
        data() {
            return {
                user: { uid: null, email: '', name: 'Guest', avatar: '', tier: 'free' },

                assetStorage: { used: 150, limit: 2 },
                assets: [],
                collaborators: [],

                isLoggedIn: false,
                showAuthModal: false, showPricingModal: false, showAssetModal: false, showCollabModal: false,

                // Auth States
                authTab: 'login', authEmail: '', authPassword: '', authLoading: false, authError: '',
                failedAttempts: 0, isLockedOut: false, lockoutCountdown: 0,

                // Editor & AI States
                showEditor: false, showAiPanel: false, hasError: false,
                aiMessages: [], aiPrompt: '', aiLoading: false, aiDebugging: false,
                groqApiKey: localStorage.getItem(API_KEY_STORAGE) || '',

                searchQuery: '', showUserMenu: false, activeTab: 'html',

                // Project Data
                projects: [...defaultProjects],
                currentProject: { id: null, title: 'Untitled', html: '', css: '', js: '', description: '', category: 'General', author: {}, likes: 0, isPrivate: false },
                previewContent: '', debounceTimer: null,
                categories: ['All', 'Animation', 'Layout', 'Game', 'AI', 'General'],
                selectedCategory: 'All', visibleCount: 6,

                showToast: false, toastMessage: '', toastType: 'success',
                // physicsEngine sildik
                isCreatingNew: false, pendingProject: null
            };
        },
        computed: {
            trendingProjects() { return this.projects.slice(0, 3); },
            filteredAllProjects() {
                let result = this.projects.filter(p => !p.isPrivate || p.uid === this.user.uid);
                if (this.searchQuery) {
                    const q = this.searchQuery.toLowerCase();
                    result = result.filter(p => p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
                }
                if (this.selectedCategory !== 'All') result = result.filter(p => p.category === this.selectedCategory);
                return result;
            },
            visibleProjects() { return this.filteredAllProjects.slice(0, this.visibleCount); },
            maxCollaborators() { return this.user.tier === 'pro' ? 2 : (this.user.tier === 'pro_plus' ? 4 : 0); }
        },
        methods: {
            // --- FIREBASE AUTHENTICATION ---
            async handleLogin() {
                this.authLoading = true; this.authError = '';
                try {
                    await signInWithEmailAndPassword(auth, this.authEmail, this.authPassword);
                    this.showAuthModal = false;
                    this.showToastNotification('Welcome back!');
                } catch (error) {
                    this.authError = "Login Failed: " + error.message;
                } finally { this.authLoading = false; }
            },
            async handleRegister() {
                this.authLoading = true; this.authError = '';
                try {
                    const res = await createUserWithEmailAndPassword(auth, this.authEmail, this.authPassword);
                    this.showAuthModal = false;
                    this.showToastNotification('Account created! Welcome.');
                } catch (error) {
                    this.authError = "Register Failed: " + error.message;
                } finally { this.authLoading = false; }
            },
            async handleSocialLogin() {
                this.authLoading = true;
                try {
                    await signInWithPopup(auth, provider);
                    this.showAuthModal = false;
                    this.showToastNotification('Connected with GitHub!');
                } catch (error) {
                    this.authError = error.message;
                } finally { this.authLoading = false; }
            },
            async logout() {
                await signOut(auth);
                localStorage.removeItem('quel_auth_token');
                localStorage.removeItem('quel_user_tier');
                localStorage.removeItem('quel_user_name');
                localStorage.removeItem('quel_user_email');
                localStorage.removeItem('quel_user_avatar');
                this.showToastNotification('Logged out successfully');
                this.showUserMenu = false;
            },

            // --- FIREBASE DATABASE ---
            async loadProjects() {
                let loadedProjects = [...defaultProjects];
                if (this.user.uid) {
                    try {
                        const q = query(collection(db, "projects"), where("uid", "==", this.user.uid));
                        const querySnapshot = await getDocs(q);
                        const userProjects = [];
                        querySnapshot.forEach((doc) => {
                            userProjects.push({ id: doc.id, ...doc.data() });
                        });
                        loadedProjects = [...userProjects, ...defaultProjects];
                    } catch (e) { console.error("Error loading projects:", e); }
                }
                this.projects = loadedProjects;
            },

            async saveProject() {
                if (!this.isLoggedIn) {
                    this.pendingProject = this.currentProject;
                    this.showAuthModal = true;
                    return;
                }
                this.showToastNotification('Saving to Cloud...', 'info');

                const projectData = {
                    title: this.currentProject.title,
                    html: this.currentProject.html,
                    css: this.currentProject.css,
                    js: this.currentProject.js,
                    category: this.currentProject.category,
                    description: this.currentProject.description || '',
                    isPrivate: this.currentProject.isPrivate,
                    uid: this.user.uid,
                    author: { name: this.user.name, avatar: this.user.avatar },
                    updatedAt: new Date().toISOString(),
                    likes: this.currentProject.likes || 0,
                    views: this.currentProject.views || 0
                };

                try {
                    if (this.currentProject.id && !this.currentProject.isSystem && typeof this.currentProject.id === 'string') {
                        const projectRef = doc(db, "projects", this.currentProject.id);
                        await updateDoc(projectRef, projectData);
                        const idx = this.projects.findIndex(p => p.id === this.currentProject.id);
                        if (idx !== -1) this.projects[idx] = { ...this.projects[idx], ...projectData };
                        this.showToastNotification('Project Updated!');
                    } else {
                        const docRef = await addDoc(collection(db, "projects"), projectData);
                        const newProject = { id: docRef.id, ...projectData };
                        this.currentProject = newProject;
                        this.projects.unshift(newProject);
                        this.showToastNotification('Project Created!');
                    }
                } catch (e) {
                    console.error("Save Error:", e);
                    this.showToastNotification('Error saving project', 'delete');
                }
            },

            async deleteProject(id) {
                if (!confirm('Delete this project permanently?')) return;
                try {
                    await deleteDoc(doc(db, "projects", id));
                    this.projects = this.projects.filter(p => p.id !== id);
                    this.showToastNotification('Project deleted', 'delete');
                    if (this.showEditor && this.currentProject.id === id) this.closeEditor();
                } catch (e) { this.showToastNotification('Error deleting', 'delete'); }
            },

            // --- UI Methods ---
            createNewPen() {
                if (!this.isLoggedIn) { this.isCreatingNew = true; this.showAuthModal = true; return; }
                this.currentProject = {
                    id: null, title: 'Untitled Source',
                    html: '\n<div class="center">\n  <h1>Hello World</h1>\n</div>',
                    css: 'body { \n  background: #1a1a2e; \n  color: white; \n  display: flex; \n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n  font-family: sans-serif;\n}',
                    js: '', category: 'General', author: { name: this.user.name }, isPrivate: false
                };
                this.showEditor = true; this.updatePreview();
            },
            openProject(p) {
                this.currentProject = JSON.parse(JSON.stringify(p));
                this.showEditor = true; this.updatePreview();
            },
            switchTier(tier) {
                this.user.tier = tier;
                this.assetStorage.limit = tier === 'pro' ? 2 : (tier === 'pro_plus' ? 10 : 0);
                this.showPricingModal = false;
                this.showToastNotification(`Welcome to ${tier.toUpperCase()} Plan!`);
            },
            openAssetModal() { this.user.tier === 'free' ? this.showPricingModal = true : this.showAssetModal = true; },
            uploadAsset() {
                const newAsset = { id: Date.now(), name: `img_${this.assets.length + 1}.png`, size: 2.5 };
                this.assets.push(newAsset); this.assetStorage.used += 2.5;
                this.showToastNotification('Asset uploaded');
            },
            deleteAsset(id) {
                this.assets = this.assets.filter(a => a.id !== id);
                this.assetStorage.used -= 2.5;
            },
            togglePrivacy() {
                if (this.user.tier === 'free') { this.showPricingModal = true; return; }
                this.currentProject.isPrivate = !this.currentProject.isPrivate;
                this.showToastNotification(this.currentProject.isPrivate ? 'Private' : 'Public');
            },
            inviteCollaborator() {
                const limit = this.maxCollaborators;
                if (limit === 0) { this.showPricingModal = true; return; }
                if (this.collaborators.length >= limit) { this.showToastNotification('Limit reached', 'delete'); return; }
                this.collaborators.push({ id: Date.now(), name: 'Guest', email: 'guest@dev.com', avatar: 'https://ui-avatars.com/api/?name=Guest&background=random' });
                this.showToastNotification('Invited!');
            },
            removeCollaborator(id) { this.collaborators = this.collaborators.filter(c => c.id !== id); },
            saveApiKey() { localStorage.setItem(API_KEY_STORAGE, this.groqApiKey); this.showToastNotification('API Key Saved'); },
            showToastNotification(msg, type = 'success') { this.toastMessage = msg; this.toastType = type; this.showToast = true; setTimeout(() => this.showToast = false, 3000); },

            // Navigation
            scrollToProjects() { document.getElementById('trending-grid')?.scrollIntoView({ behavior: 'smooth' }); },
            scrollToTrending() { document.getElementById('trending-grid')?.scrollIntoView({ behavior: 'smooth' }); },
            scrollToAllPens() { document.getElementById('all-pens-grid')?.scrollIntoView({ behavior: 'smooth' }); },
            scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); },
            closeEditor() { this.showEditor = false; this.loadProjects(); },
            loadMore() { this.visibleCount += 6; },

            // --- AI & Iframe ---
            toggleAiPanel() { this.showAiPanel = !this.showAiPanel; },
            handleIframeMessage(event) {
                if (event.data && event.data.type === 'code-error') {
                    this.hasError = true;
                    this.aiMessages.push({ type: 'error', title: event.data.name, text: event.data.message, line: event.data.line });
                    if (this.user.tier === 'pro_plus' && this.groqApiKey) this.analyzeErrorWithAI(event.data);
                }
            },
            async analyzeErrorWithAI(errData) {
                this.aiDebugging = true;
                try {
                    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST', headers: { 'Authorization': `Bearer ${this.groqApiKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model: 'llama3-70b-8192', messages: [{ role: 'system', content: 'Explain this JS error briefly.' }, { role: 'user', content: `${errData.name}: ${errData.message}` }] })
                    });
                    const data = await res.json();
                    this.aiMessages.push({ type: 'ai', title: 'Llama 3', text: data.choices[0].message.content });
                } catch (e) { this.aiMessages.push({ type: 'error', title: 'API Error', text: e.message }); }
                finally { this.aiDebugging = false; }
            },
            async generateCode() {
                if (!this.groqApiKey) { this.showToastNotification('Missing API Key', 'delete'); return; }
                this.aiLoading = true; this.aiMessages.push({ type: 'user', title: 'You', text: this.aiPrompt });
                try {
                    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST', headers: { 'Authorization': `Bearer ${this.groqApiKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'llama3-70b-8192',
                            messages: [
                                { role: 'system', content: 'You are a Vue/HTML expert. Return a JSON object with keys: "html", "css", "js". Do NOT wrap in markdown code blocks.' },
                                { role: 'user', content: `Create: ${this.aiPrompt}` }
                            ],
                            response_format: { type: "json_object" }
                        })
                    });
                    const data = await res.json();
                    let raw = data.choices[0].message.content;
                    raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                    const content = JSON.parse(raw);
                    if (content.html) this.currentProject.html = content.html;
                    if (content.css) this.currentProject.css = content.css;
                    if (content.js) this.currentProject.js = content.js;
                    this.updatePreview();
                    this.aiMessages.push({ type: 'ai', title: 'Llama 3', text: 'Code Generated!' });
                } catch (e) { this.aiMessages.push({ type: 'error', title: 'Gen Error', text: e.message }); }
                finally { this.aiLoading = false; this.aiPrompt = ''; }
            },
            getProjectPreview(p) {
                const errScript = `<script>window.onerror=function(m,s,l,c,e){window.parent.postMessage({type:'code-error',message:m,line:l,name:e?e.name:'Error'},'*');return false;}<\/script>`;
                return `<!DOCTYPE html><html><head>${errScript}<style>body{margin:0;overflow:hidden;}${p.css}</style></head><body>${p.html}<script>${p.js}<\/script></body></html>`;
            },
            updatePreview() { this.hasError = false; this.aiMessages = []; this.previewContent = this.getProjectPreview(this.currentProject); },
            debouncedUpdate() { clearTimeout(this.debounceTimer); this.debounceTimer = setTimeout(() => this.updatePreview(), 1000); },
            refreshPreview() { this.updatePreview(); }

            // --- FİZİK MOTORU (ANTIGRAVITY) SİLİNDİ ---
            // Artık yazı ve search bar CSS ile ortada sabit duracak.
            // Arka plandaki Shader (Waves) scripti index.html üzerinden çalıştığı için
            // fizik motoru kalkınca otomatik olarak görünür hale gelecek.
        },
        mounted() {
            // Vue mount olduktan hemen sonra shader'ı başlat
            setTimeout(() => {
                if (window.initShaderBackground) {
                    window.initShaderBackground('hero-shader-canvas');
                }
            }, 100);

            onAuthStateChanged(auth, (user) => {
                if (user) {
                    this.isLoggedIn = true;
                    this.user.uid = user.uid;
                    this.user.email = user.email;
                    this.user.name = user.displayName || user.email.split('@')[0];
                    this.user.avatar = user.photoURL || `https://ui-avatars.com/api/?name=${this.user.name}&background=random`;

                    // Sync for profile.html
                    user.getIdToken().then(token => localStorage.setItem('quel_auth_token', token));
                    localStorage.setItem('quel_user_tier', this.user.tier);
                    localStorage.setItem('quel_user_name', this.user.name);
                    localStorage.setItem('quel_user_email', this.user.email);
                    localStorage.setItem('quel_user_avatar', this.user.avatar);

                    this.loadProjects();

                    if (this.isCreatingNew) { this.createNewPen(); this.isCreatingNew = false; }
                    if (this.pendingProject) { this.saveProject(); this.pendingProject = null; }
                } else {
                    this.isLoggedIn = false;
                    this.user = { uid: null, name: 'Guest', tier: 'free' };
                    // Clear for profile.html
                    localStorage.removeItem('quel_auth_token');
                    localStorage.removeItem('quel_user_tier');
                    localStorage.removeItem('quel_user_name');
                    localStorage.removeItem('quel_user_email');
                    localStorage.removeItem('quel_user_avatar');

                    this.projects = [...defaultProjects];
                }
            });

            // Iframe mesajları
            window.addEventListener('message', this.handleIframeMessage);
            document.addEventListener('click', (e) => { if (!e.target.closest('.relative')) this.showUserMenu = false; });
        },
        beforeUnmount() { window.removeEventListener('message', this.handleIframeMessage); }
    }).mount('#app');

    console.log("QUEL Firebase v1.1 - Physics Removed, Waves Restored 🌊");
});
