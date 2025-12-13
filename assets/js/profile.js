// NOT: Eğer import hatası alırsan index.html'deki <script type="module"> kısmını kontrol et.
// import satırını sildik!
const { createApp } = Vue; // Vue'yu globalden alıyoruz

const STORAGE_KEY = 'quel_projects_v4'; // v3 değil v4 yaptık ki ana sayfayla uyumlu olsun
const API_KEY_STORAGE = 'quel_groq_key';

createApp({
    data() {
        return {
            user: {
                name: 'Demo User',
                email: 'demo@quel.io',
                avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=6366f1&color=fff',
                tier: 'free'
            },
            projects: [],
            activeTab: 'public',
            apiKeyInput: '',
            hasApiKey: false
        };
    },
    computed: {
        userProjects() {
            // Sadece sistem projesi olmayanlar (Kullanıcının oluşturdukları)
            return this.projects.filter(p => !p.isSystem);
        },
        publicProjects() {
            return this.userProjects.filter(p => !p.isPrivate);
        },
        privateProjects() {
            return this.userProjects.filter(p => p.isPrivate);
        },
        filteredProjects() {
            return this.activeTab === 'public' ? this.publicProjects : this.privateProjects;
        },
        totalLikes() {
            return this.userProjects.reduce((sum, p) => sum + (p.likes || 0), 0);
        },
        storageLimit() {
            return this.user.tier === 'pro' ? 2 : (this.user.tier === 'pro_plus' ? 10 : 0.5);
        },
        storageUsed() {
            // Mock hesaplama
            return (this.userProjects.length * 0.05).toFixed(2);
        }
    },
    methods: {
        checkAuth() {
            const token = localStorage.getItem('quel_auth_token');
            if (!token) {
                window.location.href = 'index.html'; // Giriş yoksa ana sayfaya at
            }
            
            // LocalStorage'dan kullanıcı verilerini çek
            const savedTier = localStorage.getItem('quel_user_tier');
            if(savedTier) this.user.tier = savedTier;

            // API Key kontrolü
            const key = localStorage.getItem(API_KEY_STORAGE);
            if(key) {
                this.apiKeyInput = key;
                this.hasApiKey = true;
            }
        },
        loadProjects() {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.projects = JSON.parse(stored);
            }
        },
        saveApiKey() {
            if(!this.apiKeyInput.trim()) return;
            localStorage.setItem(API_KEY_STORAGE, this.apiKeyInput);
            this.hasApiKey = true;
            alert('API Key Saved Successfully!');
        },
        getTierColor(tier) {
            if (tier === 'pro') return 'bg-amber-500 text-white';
            if (tier === 'pro_plus') return 'bg-purple-600 text-white';
            return 'bg-gray-600 text-white';
        },
        getProjectPreview(p) {
            // Iframe içinde önizleme (CSS'i biraz küçülttük)
            return `<!DOCTYPE html><html><head><style>body{margin:0;overflow:hidden;transform:scale(0.8);transform-origin:top left;width:125%;height:125%;}${p.css}</style></head><body>${p.html}</body></html>`;
        },
        deleteProject(id) {
            if(confirm('Are you sure you want to delete this source? This cannot be undone.')) {
                this.projects = this.projects.filter(p => p.id !== id);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projects));
            }
        },
        openProject(project) {
            // Ana sayfaya dönüp projeyi açmak yerine şimdilik basit bir alert.
            // Gelişmiş versiyonda URL parametresi ile index.html?edit=123 yapılabilir.
            alert('Please open this project from the main editor dashboard.');
            window.location.href = 'index.html';
        },
        logout() {
            localStorage.removeItem('quel_auth_token');
            window.location.href = 'index.html';
        }
    },
    mounted() {
        this.checkAuth();
        this.loadProjects();
    }
}).mount('#profile-app');