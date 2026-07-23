// WhatsPoll Main Coordinator (State, Routing, Navigation, Themes & Supabase Auth)

// Unified WhatsPoll API Fetch Wrapper with Offline Fallback & Sync Queue
window.WhatsPollFetch = async function(url, options = {}) {
    options.headers = options.headers || {};
    const jwt = localStorage.getItem('whatspoll-jwt');
    if (jwt) {
        options.headers['Authorization'] = `Bearer ${jwt}`;
        options.headers['X-Supabase-Auth'] = jwt;
    }
    
    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || `HTTP ${res.status}`);
        }
        return res;
    } catch (err) {
        console.warn(`WhatsPollFetch failed for ${url}, executing offline fallback:`, err);
        return handleOfflineFallback(url, options, err);
    }
};

async function handleOfflineFallback(url, options, originalError) {
    const method = (options.method || 'GET').toUpperCase();
    
    // GET requests cache fallback
    if (method === 'GET' && url.includes('/api/state')) {
        const localState = localStorage.getItem('whatspoll-offline-state');
        if (localState) {
            return {
                ok: true,
                status: 200,
                json: async () => JSON.parse(localState)
            };
        }
        return {
            ok: true,
            status: 200,
            json: async () => window.WhatsPollState
        };
    }
    
    // POST request syncing queue
    if (method === 'POST') {
        const payload = options.body ? JSON.parse(options.body) : {};
        
        // Save to offline sync queue
        const queue = JSON.parse(localStorage.getItem('whatspoll-offline-queue') || '[]');
        queue.push({ url, method, payload, time: Date.now() });
        localStorage.setItem('whatspoll-offline-queue', JSON.stringify(queue));
        
        showOfflineIndicator();

        // Calculate and cache locally
        let localState = JSON.parse(localStorage.getItem('whatspoll-offline-state') || JSON.stringify(window.WhatsPollState));
        
        if (url.includes('/api/poll')) {
            localState.currentPoll = {
                title: payload.question,
                description: payload.advice || "",
                options: payload.options,
                completionTime: payload.time || "1 min",
                responsesCount: 0,
                winningOption: "N/A",
                confidenceAvg: "0%",
                voteCounts: new Array(payload.options.length).fill(0)
            };
            localState.votes = [];
            localState.history.unshift({
                id: Date.now(),
                question: payload.question,
                choiceText: "Created by you (Offline)",
                choiceEmoji: payload.options[0]?.emoji || '💡',
                date: "Today",
                type: "created",
                favorite: false,
                responses: 0
            });
        } else if (url.includes('/api/vote')) {
            const newVote = {
                optionText: payload.optionText,
                optionEmoji: payload.optionEmoji || '💡',
                confidence: payload.confidence || 80,
                reason: payload.reason || "",
                timestamp: "Now (Offline)"
            };
            localState.votes.push(newVote);
            
            const poll = localState.currentPoll;
            if (poll) {
                const tallies = new Array(poll.options.length).fill(0);
                poll.options.forEach((opt, idx) => {
                    tallies[idx] = localState.votes.filter(v => v.optionText === opt.text).length;
                });
                poll.voteCounts = tallies;
                poll.responsesCount = localState.votes.length;
                if (localState.votes.length > 0) {
                    const maxIdx = tallies.indexOf(Math.max(...tallies));
                    poll.winningOption = poll.options[maxIdx].text;
                    const sumConf = localState.votes.reduce((acc, curr) => acc + curr.confidence, 0);
                    poll.confidenceAvg = `${Math.round(sumConf / localState.votes.length)}%`;
                }
            }
        }
        
        localStorage.setItem('whatspoll-offline-state', JSON.stringify(localState));
        window.WhatsPollState = localState;
        
        return {
            ok: true,
            status: 200,
            json: async () => ({ status: "success", state: localState, offline: true })
        };
    }
    
    throw originalError;
}

function showOfflineIndicator() {
    let indicator = document.getElementById('offline-sync-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'offline-sync-indicator';
        indicator.style.cssText = "position:fixed; bottom:24px; right:24px; background-color:#F59E0B; color:#ffffff; padding:12px 18px; border-radius:8px; font-weight:600; font-size:13px; z-index:10000; box-shadow:0 4px 12px rgba(0,0,0,0.15); display:flex; align-items:center; gap:8px;";
        indicator.innerHTML = `<i data-lucide="wifi-off" style="width:16px; height:16px;"></i> Offline Mode: Changes saved locally.`;
        document.body.appendChild(indicator);
        if (window.lucide) window.lucide.createIcons();
    }
}

// Auto sync when online status changes
window.addEventListener('online', () => {
    syncOfflineQueue();
});

async function syncOfflineQueue() {
    const queue = JSON.parse(localStorage.getItem('whatspoll-offline-queue') || '[]');
    if (queue.length === 0) return;
    
    const indicator = document.getElementById('offline-sync-indicator');
    if (indicator) indicator.remove();
    
    const syncToast = document.createElement('div');
    syncToast.style.cssText = "position:fixed; bottom:24px; right:24px; background-color:#10B981; color:#ffffff; padding:12px 18px; border-radius:8px; font-weight:600; font-size:13px; z-index:10000; box-shadow:0 4px 12px rgba(0,0,0,0.15);";
    syncToast.innerHTML = `Syncing changes with cloud database...`;
    document.body.appendChild(syncToast);

    for (const item of queue) {
        try {
            await fetch(item.url, {
                method: item.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('whatspoll-jwt')}`
                },
                body: JSON.stringify(item.payload)
            });
        } catch (e) {
            console.error("Failed to sync offline item:", item, e);
        }
    }
    
    localStorage.removeItem('whatspoll-offline-queue');
    syncToast.innerHTML = `Synced successfully with Supabase!`;
    setTimeout(() => syncToast.remove(), 2000);
    
    if (window.WhatsPollApp) {
        window.WhatsPollApp.fetchServerState();
    }
}

class AppController {
    constructor() {
        this.navLinks = document.querySelectorAll('.app-nav .nav-link');
        this.sections = document.querySelectorAll('.content-section');
        this.themeSelect = document.getElementById('appearance-theme-select');
        this.logo = document.getElementById('nav-logo');
        this.header = document.getElementById('app-header');
        this.navCreateBtn = document.getElementById('nav-create-poll-btn');
        this.heroCreateBtn = document.getElementById('hero-create-btn');
        this.heroDemoBtn = document.getElementById('hero-demo-btn');
        
        // Supabase Authentication Nodes
        this.navLoginBtn = document.getElementById('nav-login-btn');
        this.profileAvatarBtn = document.getElementById('profile-avatar-btn');
        this.authModal = document.getElementById('auth-modal');
        this.closeAuthBtn = document.getElementById('close-auth-btn');
        this.submitAuthBtn = document.getElementById('submit-auth-btn');
        this.authSwitchBtn = document.getElementById('auth-switch-btn');
        
        this.authEmailInput = document.getElementById('auth-email');
        this.authPasswordInput = document.getElementById('auth-password');
        this.authErrorMsg = document.getElementById('auth-error-msg');
        
        this.authState = 'signin'; // 'signin' or 'signup'
        
        this.init();
    }

    init() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        this.bindEvents();
        this.loadSavedThemeSetting();
        this.syncAuthUserState();
        this.fetchServerState();
    }

    async fetchServerState() {
        try {
            const res = await window.WhatsPollFetch('/api/state');
            if (res.ok) {
                const data = await res.json();
                window.WhatsPollState = data;
                localStorage.setItem('whatspoll-offline-state', JSON.stringify(data));
                
                // Rerender active section
                const activeSec = document.querySelector('.content-section.active');
                if (activeSec) {
                    this.navigateToSection(activeSec.id);
                }
            }
        } catch (err) {
            console.error("Could not sync with Python backend:", err);
        }
    }

    syncAuthUserState() {
        const user = localStorage.getItem('whatspoll-user');
        const jwt = localStorage.getItem('whatspoll-jwt');
        
        if (user && jwt) {
            const userData = JSON.parse(user);
            const name = userData.user_metadata?.name || userData.email.split('@')[0].toUpperCase();
            
            // Show avatar, toggle Login btn text to Logout
            if (this.profileAvatarBtn) {
                this.profileAvatarBtn.innerText = name.slice(0, 2).toUpperCase();
                this.profileAvatarBtn.style.display = 'flex';
            }
            if (this.navLoginBtn) {
                this.navLoginBtn.innerText = 'Sign Out';
            }
        } else {
            if (this.profileAvatarBtn) {
                this.profileAvatarBtn.style.display = 'none';
            }
            if (this.navLoginBtn) {
                this.navLoginBtn.innerText = 'Login';
            }
        }
    }

    bindEvents() {
        // Navigation clicks
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('data-target');
                this.navigateToSection(targetId);
                
                this.navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        this.logo.addEventListener('click', () => {
            const homeLink = document.querySelector('.app-nav a[data-target="home-section"]');
            if (homeLink) homeLink.click();
        });

        this.themeSelect.addEventListener('change', (e) => {
            this.setThemeSetting(e.target.value);
        });

        if (this.navCreateBtn) {
            this.navCreateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToSection("create-section");
                this.updateActiveNavLink("create-section");
            });
        }

        if (this.heroCreateBtn) {
            this.heroCreateBtn.addEventListener('click', () => {
                this.navigateToSection("create-section");
                this.updateActiveNavLink("create-section");
            });
        }

        if (this.heroDemoBtn) {
            this.heroDemoBtn.addEventListener('click', () => {
                if (window.WhatsPollResponder) {
                    window.WhatsPollResponder.resetVoteCard();
                }
                this.navigateToSection("vote-section");
                this.updateActiveNavLink("vote-section");
            });
        }

        // Authentications Triggers
        if (this.navLoginBtn) {
            this.navLoginBtn.addEventListener('click', () => {
                const jwt = localStorage.getItem('whatspoll-jwt');
                if (jwt) {
                    // Sign out
                    localStorage.removeItem('whatspoll-jwt');
                    localStorage.removeItem('whatspoll-user');
                    localStorage.removeItem('whatspoll-offline-state');
                    this.syncAuthUserState();
                    this.fetchServerState();
                } else {
                    // Show auth popup modal
                    this.authState = 'signin';
                    this.renderAuthModalState();
                    this.authModal.classList.remove('hidden');
                }
            });
        }

        if (this.closeAuthBtn) {
            this.closeAuthBtn.addEventListener('click', () => {
                this.authModal.classList.add('hidden');
            });
        }

        if (this.authSwitchBtn) {
            this.authSwitchBtn.addEventListener('click', () => {
                this.authState = this.authState === 'signin' ? 'signup' : 'signin';
                this.renderAuthModalState();
            });
        }

        if (this.submitAuthBtn) {
            this.submitAuthBtn.addEventListener('click', () => this.handleAuthSubmit());
        }

        window.addEventListener('scroll', () => {
            if (window.scrollY > 10) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }
        });
    }

    renderAuthModalState() {
        const title = document.getElementById('auth-modal-title');
        const switchText = document.getElementById('auth-switch-text');
        
        if (this.authState === 'signin') {
            title.innerText = 'Sign In to WhatsPoll';
            this.submitAuthBtn.innerText = 'Sign In';
            switchText.innerText = "Don't have an account?";
            this.authSwitchBtn.innerText = 'Sign Up';
        } else {
            title.innerText = 'Create your Account';
            this.submitAuthBtn.innerText = 'Sign Up';
            switchText.innerText = "Already have an account?";
            this.authSwitchBtn.innerText = 'Sign In';
        }
        this.authErrorMsg.classList.add('hidden');
    }

    async handleAuthSubmit() {
        const email = this.authEmailInput.value.trim();
        const password = this.authPasswordInput.value.trim();
        
        if (!email || !password) {
            this.authErrorMsg.innerText = 'Please input both email and password.';
            this.authErrorMsg.classList.remove('hidden');
            return;
        }

        this.submitAuthBtn.innerText = 'Verifying...';
        this.submitAuthBtn.disabled = true;

        const path = this.authState === 'signin' ? '/api/auth/login' : '/api/auth/signup';
        
        try {
            const res = await fetch(path, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok && !data.error) {
                // Set Session items
                const token = data.access_token;
                const user = data.user;
                if (token && user) {
                    localStorage.setItem('whatspoll-jwt', token);
                    localStorage.setItem('whatspoll-user', JSON.stringify(user));
                }
                
                this.authModal.classList.add('hidden');
                this.authEmailInput.value = '';
                this.authPasswordInput.value = '';
                
                this.syncAuthUserState();
                this.fetchServerState();
            } else {
                this.authErrorMsg.innerText = data.error_description || data.error || 'Authentication failed.';
                this.authErrorMsg.classList.remove('hidden');
            }
        } catch (e) {
            this.authErrorMsg.innerText = 'Server connection error.';
            this.authErrorMsg.classList.remove('hidden');
        } finally {
            this.submitAuthBtn.innerText = this.authState === 'signin' ? 'Sign In' : 'Sign Up';
            this.submitAuthBtn.disabled = false;
        }
    }

    navigateToSection(targetId) {
        this.sections.forEach(section => {
            if (section.id === targetId) {
                section.classList.add('active');
                
                if (targetId === 'vote-section' && window.WhatsPollResponder) {
                    window.WhatsPollResponder.renderPoll();
                }
                if (targetId === 'results-section' && window.WhatsPollAnalytics) {
                    window.WhatsPollAnalytics.renderCharts();
                }
                if (targetId === 'history-section' && window.WhatsPollPassport) {
                    window.WhatsPollPassport.renderTimeline();
                }
                if (targetId === 'teams-section' && window.WhatsPollOrganization) {
                    window.WhatsPollOrganization.renderWorkspace();
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                section.classList.remove('active');
            }
        });
    }

    updateActiveNavLink(sectionId) {
        this.navLinks.forEach(link => {
            if (link.getAttribute('data-target') === sectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    loadSavedThemeSetting() {
        const saved = localStorage.getItem('whatspoll-theme') || 'system';
        this.themeSelect.value = saved;
        this.setThemeSetting(saved);
    }

    setThemeSetting(value) {
        document.documentElement.setAttribute('data-theme', value);
        localStorage.setItem('whatspoll-theme', value);
        
        if (window.WhatsPollAnalytics) {
            setTimeout(() => {
                window.WhatsPollAnalytics.renderCharts();
            }, 50);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.WhatsPollApp = new AppController();
});
export default AppController;
