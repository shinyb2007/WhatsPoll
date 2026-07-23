// WhatsPoll Main Coordinator (State, Routing, Navigation & Themes)

// Initialize Mocks Fallback (will be overwritten by server fetch)
window.WhatsPollState = {
    currentPoll: {
        title: "Select the best meeting time.",
        description: "We need to select a core alignment window for Q3 sprints updates.",
        options: [
            { text: "Tuesday 9:00 AM PST", description: "Standard alignment kickoff slot.", emoji: "🌅" },
            { text: "Wednesday 12:00 PM PST", description: "Mid-week core hours window.", emoji: "☀️" },
            { text: "Thursday 5:00 PM PST", description: "Evening slot for late review sync.", emoji: "🌌" }
        ],
        completionTime: "1 min",
        responsesCount: 124,
        winningOption: "Tuesday 9:00 AM PST",
        confidenceAvg: "82%"
    },
    votes: [],
    history: [],
    teams: {}
};

class AppController {
    constructor() {
        this.navLinks = document.querySelectorAll('.app-nav .nav-link');
        this.sections = document.querySelectorAll('.content-section');
        this.themeSelect = document.getElementById('appearance-theme-select');
        this.logo = document.getElementById('nav-logo');
        this.header = document.getElementById('app-header');
        
        // Sticky/Header buttons
        this.navCreateBtn = document.getElementById('nav-create-poll-btn');
        
        // Hero triggers
        this.heroCreateBtn = document.getElementById('hero-create-btn');
        this.heroDemoBtn = document.getElementById('hero-demo-btn');
        
        this.init();
    }

    init() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        this.bindEvents();
        this.loadSavedThemeSetting();
        this.fetchServerState();
    }

    async fetchServerState() {
        try {
            const res = await fetch('/api/state');
            if (res.ok) {
                const data = await res.json();
                window.WhatsPollState = data;
                
                // Rerender active section if any modular controller is loaded
                const activeSec = document.querySelector('.content-section.active');
                if (activeSec) {
                    this.navigateToSection(activeSec.id);
                }
            }
        } catch (err) {
            console.error("Could not sync with Python server:", err);
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

        // Logo click
        this.logo.addEventListener('click', () => {
            const homeLink = document.querySelector('.app-nav a[data-target="home-section"]');
            if (homeLink) homeLink.click();
        });

        // Theme dropdown selection
        this.themeSelect.addEventListener('change', (e) => {
            this.setThemeSetting(e.target.value);
        });

        // Create Poll actions
        if (this.navCreateBtn) {
            this.navCreateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = "create-section";
                this.navigateToSection(targetId);
                this.updateActiveNavLink(targetId);
            });
        }

        if (this.heroCreateBtn) {
            this.heroCreateBtn.addEventListener('click', () => {
                const targetId = "create-section";
                this.navigateToSection(targetId);
                this.updateActiveNavLink(targetId);
            });
        }

        if (this.heroDemoBtn) {
            this.heroDemoBtn.addEventListener('click', () => {
                // Populate default demo data & reset success states
                if (window.WhatsPollResponder) {
                    window.WhatsPollResponder.resetVoteCard();
                }
                const targetId = "vote-section";
                this.navigateToSection(targetId);
                this.updateActiveNavLink(targetId);
            });
        }

        // Window Scroll Tracker: transparent nav transitions to solid on scroll
        window.addEventListener('scroll', () => {
            if (window.scrollY > 10) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }
        });
    }

    navigateToSection(targetId) {
        this.sections.forEach(section => {
            if (section.id === targetId) {
                section.classList.add('active');
                
                // Triggers inside modular components if section needs specific updates
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
        
        // Force SVG/canvas charts theme colors update if result screen is visible
        if (window.WhatsPollAnalytics) {
            setTimeout(() => {
                window.WhatsPollAnalytics.renderCharts();
            }, 50);
        }
    }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
    window.WhatsPollApp = new AppController();
});
export default AppController;
