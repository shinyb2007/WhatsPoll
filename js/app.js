// WhatsPoll Main Coordinator (State, Routing, Navigation, Themes & Supabase Auth)

// Unified WhatsPoll API Fetch Wrapper with Real-time Error Handling
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
        
        // Remove connection error toast if present
        const errToast = document.getElementById('connection-error-toast');
        if (errToast) errToast.remove();
        
        return res;
    } catch (err) {
        console.error(`WhatsPollFetch API connection error for ${url}:`, err);
        showConnectionError(err.message || "Failed to reach server");
        throw err;
    }
};

function showConnectionError(message) {
    let errToast = document.getElementById('connection-error-toast');
    if (!errToast) {
        errToast = document.createElement('div');
        errToast.id = 'connection-error-toast';
        errToast.style.cssText = "position:fixed; bottom:24px; right:24px; background-color:#DC2626; color:#ffffff; padding:16px 20px; border-radius:8px; font-weight:600; font-size:13px; z-index:10000; box-shadow:0 4px 16px rgba(0,0,0,0.2); display:flex; align-items:center; gap:10px; border-left:4px solid #7f1d1d; transition: all 0.2s ease;";
        document.body.appendChild(errToast);
    }
    errToast.innerHTML = `
        <i data-lucide="alert-triangle" style="width:18px; height:18px; color:#fca5a5;"></i>
        <div>
            <div style="font-weight:700;">Database Connection Error</div>
            <div style="font-weight:400; font-size:11px; color:#fca5a5; margin-top:2px;">${message}</div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
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
        
        this.authState = 'signin';
        
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
            const urlParams = new URLSearchParams(window.location.search);
            const pollId = urlParams.get('poll');
            const url = pollId ? `/api/state?poll_id=${pollId}` : '/api/state';
            
            const res = await window.WhatsPollFetch(url);
            if (res.ok) {
                const data = await res.json();
                window.WhatsPollState = data;
                
                // Rerender active section
                const activeSec = document.querySelector('.content-section.active');
                if (activeSec) {
                    this.navigateToSection(activeSec.id);
                }

                // If loading a specific deep-linked poll, auto-route to voting experience
                if (pollId) {
                    setTimeout(() => {
                        this.navigateToSection('vote-section');
                        this.updateActiveNavLink('vote-section');
                    }, 50);
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
                    this.syncAuthUserState();
                    this.fetchServerState();
                } else {
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
