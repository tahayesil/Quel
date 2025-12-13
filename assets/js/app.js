document.addEventListener('DOMContentLoaded', () => {
    const { createApp } = Vue;
    const STORAGE_KEY = 'quel_projects_v3'; 
    const API_KEY_STORAGE = 'quel_groq_key';

    const defaultProjects = [
        { id: 1, isSystem: true, category: 'Animation', title: 'Neon Glow Button', description: 'Stunning neon glow effects.', html: `<div class="container">\n  <button class="neon-button">Hover Me</button>\n</div>`, css: `body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0a0a0a; font-family: sans-serif; }\n.neon-button { padding: 20px 50px; font-size: 24px; color: #00ffff; background: transparent; border: 3px solid #00ffff; border-radius: 50px; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }\n.neon-button:hover { background: #00ffff; color: #0a0a0a; box-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff; }`, js: '', author: { name: 'Alex Chen', avatar: 'https://ui-avatars.com/api/?name=Alex+Chen&background=ff6b6b&color=fff' }, likes: 342, views: 1205 },
        { id: 2, isSystem: true, category: 'Layout', title: 'CSS Spinner', description: 'Smooth rotating loader.', html: `<div class="spinner"></div>`, css: `body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a2e; }\n.spinner { width: 80px; height: 80px; border: 8px solid rgba(255,255,255,0.1); border-top: 8px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; }\n@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`, js: '', author: { name: 'Sarah Miller', avatar: 'https://ui-avatars.com/api/?name=Sarah+Miller&background=4ecdc4&color=fff' }, likes: 567, views: 2341 }
    ];

    createApp({
        data() {
            return {
                user: { tier: 'free' },
                assetStorage: { used: 150, limit: 2 },
                assets: [],
                collaborators: [],
                isLoggedIn: false,
                showAuthModal: false, showPricingModal: false, showAssetModal: false, showCollabModal: false,
                authTab: 'login', authEmail: '', authPassword: '', authLoading: false, authError: '',
                failedAttempts: 0, isLockedOut: false, lockoutCountdown: 0,
                showEditor: false, showAiPanel: false, hasError: false, aiMessages: [], aiPrompt: '', aiLoading: false, aiDebugging: false, groqApiKey: '',
                searchQuery: '', showUserMenu: false, activeTab: 'html',
                currentProject: { id: null, title: '', html: '', css: '', js: '', description: '', category: 'General', author: {}, likes: 0, isPrivate: false },
                previewContent: '', debounceTimer: null, projects: [],
                categories: ['All', 'Animation', 'Layout', 'Game', 'AI', 'General'],
                selectedCategory: 'All', visibleCount: 6,
                showToast: false, toastMessage: '', toastType: 'success',
                physicsEngine: null
            };
        },
        computed: {
            trendingProjects() { return this.projects.filter(p => p.isSystem).slice(0, 3); },
            filteredAllProjects() {
                let result = this.projects.filter(p => !p.isPrivate);
                if (this.searchQuery) {
                    const q = this.searchQuery.toLowerCase();
                    result = result.filter(p => p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
                }
                if (this.selectedCategory !== 'All') result = result.filter(p => p.category === this.selectedCategory);
                return result;
            },
            visibleProjects() { return this.filteredAllProjects.slice(0, this.visibleCount); },
            maxCollaborators() { return this.user.tier === 'pro' ? 2 : (this.user.tier === 'pro_plus' ? 4 : 0); },
            filteredProjects() {
                let result = this.trendingProjects;
                if(this.searchQuery) result = this.projects.filter(p => p.title.toLowerCase().includes(this.searchQuery.toLowerCase()));
                return result;
            }
        },
        methods: {
            switchTier(tier) {
                this.user.tier = tier;
                this.assetStorage.limit = tier === 'pro' ? 2 : (tier === 'pro_plus' ? 10 : 0);
                this.showPricingModal = false;
                this.showToastNotification(`Welcome to ${tier.toUpperCase()} Plan!`);
            },
            openAssetModal() { this.user.tier === 'free' ? this.showPricingModal = true : this.showAssetModal = true; },
            uploadAsset() {
                const newAsset = { id: Date.now(), name: `img_${this.assets.length+1}.png`, size: 2.5 };
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
            checkAuth() { if (localStorage.getItem('quel_auth_token')) this.isLoggedIn = true; if(localStorage.getItem(API_KEY_STORAGE)) this.groqApiKey = localStorage.getItem(API_KEY_STORAGE); },
            handleLogin() {
                if (this.authPassword !== 'admin123') { this.failedAttempts++; if(this.failedAttempts>=3) this.isLockedOut=true; return; }
                this.isLoggedIn = true; this.showAuthModal = false; localStorage.setItem('quel_auth_token', 'token');
                if (this.isCreatingNew) this.createNewPen();
                else if (this.pendingProject) { this.openProject(this.pendingProject); this.pendingProject = null; }
            },
            logout() { this.isLoggedIn = false; localStorage.removeItem('quel_auth_token'); this.user.tier = 'free'; this.showUserMenu = false; },
            loadProjects() {
                const stored = localStorage.getItem(STORAGE_KEY);
                this.projects = stored ? JSON.parse(stored) : [...defaultProjects];
            },
            saveToLocalStorage() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projects)); },
            saveApiKey() { localStorage.setItem(API_KEY_STORAGE, this.groqApiKey); this.showToastNotification('API Key Saved'); },
            showToastNotification(msg, type='success') { this.toastMessage = msg; this.toastType = type; this.showToast = true; setTimeout(() => this.showToast = false, 3000); },
            scrollToProjects() { document.getElementById('trending-grid')?.scrollIntoView({ behavior: 'smooth' }); },
            scrollToTrending() { document.getElementById('trending-grid')?.scrollIntoView({ behavior: 'smooth' }); },
            scrollToAllPens() { document.getElementById('all-pens-grid')?.scrollIntoView({ behavior: 'smooth' }); },
            scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); },
            closeEditor() { this.showEditor = false; },
            loadMore() { this.visibleCount += 6; },
            createNewPen() {
                if (!this.isLoggedIn) { this.isCreatingNew = true; this.showAuthModal = true; return; }
                this.currentProject = { id: Date.now(), title: 'Untitled', html: '<h1>Hello</h1>', css: 'body{background:#222;color:white;display:grid;place-items:center;height:100vh}', js: '', category: 'General', author: {name:'Demo'}, isPrivate: false };
                this.showEditor = true; this.updatePreview();
            },
            openProject(p) {
                if (!this.isLoggedIn) { this.pendingProject = p; this.showAuthModal = true; return; }
                this.currentProject = JSON.parse(JSON.stringify(p)); this.showEditor = true; this.updatePreview();
            },
            saveProject() {
                if (this.currentProject.isSystem) {
                    const forked = JSON.parse(JSON.stringify(this.currentProject)); forked.id = Date.now(); forked.title = 'Fork of ' + forked.title; delete forked.isSystem;
                    this.projects.unshift(forked); this.currentProject = forked;
                } else {
                    const idx = this.projects.findIndex(p => p.id === this.currentProject.id);
                    if (idx !== -1) this.projects[idx] = JSON.parse(JSON.stringify(this.currentProject));
                    else this.projects.unshift(JSON.parse(JSON.stringify(this.currentProject)));
                }
                this.saveToLocalStorage(); this.showToastNotification('Saved!');
            },
            deleteProject(id) { if(confirm('Delete?')) { this.projects = this.projects.filter(p => p.id !== id); this.saveToLocalStorage(); } },
            forkProject() {
                const forked = JSON.parse(JSON.stringify(this.currentProject));
                forked.id = Date.now(); forked.title = 'Fork of ' + forked.title;
                delete forked.isSystem; 
                this.projects.unshift(forked);
                this.currentProject = forked;
                this.saveToLocalStorage();
                this.showToastNotification('Forked successfully!');
            },
            
            // --- AI ---
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
            refreshPreview() { this.updatePreview(); },

            // --- ANTIGRAVITY PHYSICS ---
            initPhysics() {
                if(!this.$refs.titleRef || !this.$refs.searchRef) return;
                const Engine = Matter.Engine, World = Matter.World, Bodies = Matter.Bodies, Body = Matter.Body, Mouse = Matter.Mouse, MouseConstraint = Matter.MouseConstraint;
                const engine = Engine.create();
                this.physicsEngine = engine;
                const world = engine.world;
                
                engine.world.gravity.y = 0;
                engine.world.gravity.x = 0;

                const titleEl = this.$refs.titleRef;
                const searchEl = this.$refs.searchRef;
                const tRect = titleEl.getBoundingClientRect();
                const sRect = searchEl.getBoundingClientRect();
                
                const titleBody = Bodies.rectangle(tRect.left + tRect.width / 2, tRect.top + tRect.height / 2, tRect.width, tRect.height, { restitution: 0.9, frictionAir: 0.01, density: 0.001 });
                const searchBody = Bodies.rectangle(sRect.left + sRect.width / 2, sRect.top + sRect.height / 2, sRect.width, sRect.height, { restitution: 0.9, frictionAir: 0.01, density: 0.002 });

                Body.setVelocity(titleBody, { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 });
                Body.setVelocity(searchBody, { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 });
                Body.setAngularVelocity(titleBody, (Math.random() - 0.5) * 0.05);

                World.add(world, [titleBody, searchBody]);

                let floor, ceiling, leftWall, rightWall;
                const updateWalls = () => {
                    World.remove(world, [floor, ceiling, leftWall, rightWall]);
                    const w = window.innerWidth;
                    const h = window.innerHeight;
                    const wallOpts = { isStatic: true, render: { visible: false }, restitution: 1 };
                    const thickness = 200;
                    floor = Bodies.rectangle(w/2, h + thickness/2, w, thickness, wallOpts);
                    ceiling = Bodies.rectangle(w/2, -thickness*2, w, thickness, wallOpts);
                    leftWall = Bodies.rectangle(-thickness/2, h/2, thickness, h*2, wallOpts);
                    rightWall = Bodies.rectangle(w + thickness/2, h/2, thickness, h*2, wallOpts);
                    World.add(world, [floor, ceiling, leftWall, rightWall]);
                };
                updateWalls();
                window.addEventListener('resize', updateWalls);

                const mouse = Mouse.create(document.body);
                const mConstraint = MouseConstraint.create(engine, { mouse: mouse, constraint: { stiffness: 0.2, render: { visible: false } } });
                World.add(world, mConstraint);

                [titleEl, searchEl].forEach(el => {
                    el.style.position = 'absolute'; el.style.left = '0'; el.style.top = '0'; el.style.margin = '0'; el.style.willChange = 'transform';
                });
                
                titleEl.style.width = tRect.width + 'px'; searchEl.style.width = sRect.width + 'px'; titleEl.style.height = tRect.height + 'px';

                const animate = () => {
                    Engine.update(engine);
                    const tPos = titleBody.position;
                    const tAngle = titleBody.angle;
                    titleEl.style.transform = `translate(${tPos.x - tRect.width/2}px, ${tPos.y - tRect.height/2}px) rotate(${tAngle}rad)`;
                    const sPos = searchBody.position;
                    const sAngle = searchBody.angle;
                    searchEl.style.transform = `translate(${sPos.x - sRect.width/2}px, ${sPos.y - sRect.height/2}px) rotate(${sAngle}rad)`;
                    requestAnimationFrame(animate);
                };
                animate();
            }
        },
        mounted() {
            this.checkAuth(); 
            this.loadProjects();
            setTimeout(() => { this.initPhysics(); }, 100);
            window.addEventListener('message', this.handleIframeMessage);
            document.addEventListener('click', (e) => { if (!e.target.closest('.relative')) this.showUserMenu = false; });
        },
        beforeUnmount() { window.removeEventListener('message', this.handleIframeMessage); }
    }).mount('#app');
    console.log("Vue App Mounted with Antigravity");
});