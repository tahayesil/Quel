import { createApp } from 'https://unpkg.com/vue@3.3.4/dist/vue.esm-browser.js';
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const API_KEY_STORAGE = 'quel_groq_key';

createApp({
    data() {
        return {
            user: { uid: null, name: 'Guest', tier: 'free' },
            currentProject: {
                title: 'Loading...', html: '', css: '', js: '', isPrivate: false
            },
            activeTab: 'html',
            previewContent: '',
            debounceTimer: null,

            // AI
            showAiPanel: false,
            groqApiKey: localStorage.getItem(API_KEY_STORAGE) || '',
            aiPrompt: '',
            aiLoading: false,
            aiDebugging: false,
            aiMessages: [],
            hasError: false,

            // Toast & Modals
            showToast: false, toastMessage: '', toastType: 'success',
            showPricingModal: false
        };
    },
    methods: {
        async init() {
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('id');
            const isNew = urlParams.get('new');

            if (!auth.currentUser) {
                // Wait for auth to initialize in mounted
                return;
            }

            if (isNew) {
                this.createNewProject();
            } else if (projectId) {
                await this.loadProject(projectId);
            } else {
                window.location.href = 'index.html';
            }
        },
        createNewProject() {
            this.currentProject = {
                id: null,
                title: 'Untitled Source',
                html: '\n<div class="center">\n  <h1>Hello World</h1>\n</div>',
                css: 'body { \n  background: #1a1a2e; \n  color: white; \n  display: flex; \n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n  font-family: sans-serif;\n}',
                js: '',
                category: 'General',
                author: { name: this.user.name },
                isPrivate: false
            };
            this.updatePreview();
        },
        async loadProject(id) {
            try {
                // Try to get from Firestore
                const docRef = doc(db, "projects", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    this.currentProject = { id: docSnap.id, ...docSnap.data() };
                    this.updatePreview();
                } else {
                    // Fallback to local system projects for demo if needed, or error
                    const sysProject = this.getSystemProject(id);
                    if (sysProject) {
                        this.currentProject = sysProject;
                        this.updatePreview();
                    } else {
                        alert('Project not found!');
                        window.location.href = 'index.html';
                    }
                }
            } catch (e) {
                console.error("Error loading project:", e);
                // Try system project
                const sysProject = this.getSystemProject(id);
                if (sysProject) {
                    this.currentProject = sysProject;
                    this.updatePreview();
                }
            }
        },
        getSystemProject(id) {
            // Simple fallback for system projects
            if (id === 'sys_1') return { id: 'sys_1', title: 'Neon Glow Button', html: `<div class="container">\n  <button class="neon-button">Hover Me</button>\n</div>`, css: `body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0a0a0a; font-family: sans-serif; }\n.neon-button { padding: 20px 50px; font-size: 24px; color: #00ffff; background: transparent; border: 3px solid #00ffff; border-radius: 50px; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }\n.neon-button:hover { background: #00ffff; color: #0a0a0a; box-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff; }`, js: '', isPrivate: false };
            if (id === 'sys_2') return { id: 'sys_2', title: 'CSS Spinner', html: `<div class="spinner"></div>`, css: `body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a2e; }\n.spinner { width: 80px; height: 80px; border: 8px solid rgba(255,255,255,0.1); border-top: 8px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; }\n@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`, js: '', isPrivate: false };
            return null;
        },
        async saveProject() {
            if (!this.user.uid) return;
            this.showToastNotification('Saving...', 'info');

            const projectData = {
                title: this.currentProject.title,
                html: this.currentProject.html,
                css: this.currentProject.css,
                js: this.currentProject.js,
                category: this.currentProject.category || 'General',
                isPrivate: this.currentProject.isPrivate,
                uid: this.user.uid,
                author: { name: this.user.name },
                updatedAt: new Date().toISOString()
            };

            try {
                if (this.currentProject.id && !this.currentProject.id.toString().startsWith('sys_')) {
                    const projectRef = doc(db, "projects", this.currentProject.id);
                    await updateDoc(projectRef, projectData);
                    this.showToastNotification('Saved!');
                } else {
                    const docRef = await addDoc(collection(db, "projects"), projectData);
                    this.currentProject.id = docRef.id;
                    // Update URL without reload
                    const newUrl = new URL(window.location);
                    newUrl.searchParams.delete('new');
                    newUrl.searchParams.set('id', docRef.id);
                    window.history.pushState({}, '', newUrl);
                    this.showToastNotification('Created!');
                }
            } catch (e) {
                console.error(e);
                this.showToastNotification('Error saving', 'delete');
            }
        },

        // Editor Core
        getProjectPreview(p) {
            const errScript = `<script>window.onerror=function(m,s,l,c,e){window.parent.postMessage({type:'code-error',message:m,line:l,name:e?e.name:'Error'},'*');return false;}<\/script>`;
            return `<!DOCTYPE html><html><head>${errScript}<style>body{margin:0;overflow:hidden;}${p.css}</style></head><body>${p.html}<script>${p.js}<\/script></body></html>`;
        },
        updatePreview() { this.hasError = false; this.aiMessages = []; this.previewContent = this.getProjectPreview(this.currentProject); },
        debouncedUpdate() { clearTimeout(this.debounceTimer); this.debounceTimer = setTimeout(() => this.updatePreview(), 1000); },
        refreshPreview() { this.updatePreview(); },

        // AI Logic
        toggleAiPanel() { this.showAiPanel = !this.showAiPanel; },
        saveApiKey() { localStorage.setItem(API_KEY_STORAGE, this.groqApiKey); },
        async generateCode() {
            if (!this.groqApiKey) { this.showToastNotification('Missing API Key', 'delete'); return; }
            this.aiLoading = true;
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
            finally { this.aiLoading = false; }
        },
        handleIframeMessage(event) {
            if (event.data && event.data.type === 'code-error') {
                this.hasError = true;
                this.aiMessages.push({ type: 'error', title: event.data.name, text: event.data.message, line: event.data.line });
            }
        },

        // Utils
        togglePrivacy() {
            if (this.user.tier === 'free') {
                this.showPricingModal = true;
                return;
            }
            this.currentProject.isPrivate = !this.currentProject.isPrivate;
            this.showToastNotification(this.currentProject.isPrivate ? 'Private' : 'Public');
        },
        switchTier(tier) {
            this.user.tier = tier;
            localStorage.setItem('quel_user_tier', tier);
            this.showPricingModal = false;
            this.showToastNotification(`Welcome to ${tier.toUpperCase()} Plan!`);
        },
        showToastNotification(msg, type = 'success') {
            this.toastMessage = msg; this.toastType = type; this.showToast = true;
            setTimeout(() => this.showToast = false, 3000);
        }
    },
    mounted() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.user.uid = user.uid;
                this.user.email = user.email;
                this.user.name = localStorage.getItem('quel_user_name') || user.email.split('@')[0];
                this.user.tier = localStorage.getItem('quel_user_tier') || 'free';

                this.init();
            } else {
                // Not logged in, redirect home
                window.location.href = 'index.html';
            }
        });

        window.addEventListener('message', this.handleIframeMessage);
    },
    beforeUnmount() { window.removeEventListener('message', this.handleIframeMessage); }
}).mount('#editor-app');
