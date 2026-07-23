// WhatsPoll History Controller

class HistoryController {
    constructor() {
        this.timelineList = document.getElementById('history-timeline-list');
        this.searchInput = document.getElementById('history-search');
        this.searchBtn = document.getElementById('history-search-btn');
        this.filterPills = document.querySelectorAll('.history-filters .filter-pill');
        
        this.currentFilter = 'all';
        this.searchQuery = "";
        this.polls = [];

        this.init();
    }

    init() {
        if (!this.timelineList) return;
        this.renderTimeline();
        this.bindEvents();
    }

    bindEvents() {
        // Search execution
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Filter Pills
        this.filterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                this.filterPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                
                this.currentFilter = pill.dataset.filter;
                this.renderTimeline();
            });
        });

        // Listener for new votes to update list
        window.addEventListener('new-user-voted', (e) => {
            this.handleNewVoteTimeline(e.detail);
        });
    }

    handleSearch() {
        this.searchQuery = this.searchInput.value.trim().toLowerCase();
        this.renderTimeline();
    }

    syncStateData() {
        this.polls = window.WhatsPollState.history || [];
    }

    renderTimeline() {
        this.syncStateData();
        this.timelineList.innerHTML = "";
        
        // Filter and Search logic
        const filtered = this.polls.filter(poll => {
            // Text search match
            const matchesSearch = poll.question.toLowerCase().includes(this.searchQuery);
            
            // Tab filter match
            let matchesTab = true;
            if (this.currentFilter === 'created') matchesTab = (poll.type === 'created');
            else if (this.currentFilter === 'voted') matchesTab = (poll.type === 'voted');
            else if (this.currentFilter === 'favorites') matchesTab = (poll.favorite === true);
            
            return matchesSearch && matchesTab;
        });

        if (filtered.length === 0) {
            this.timelineList.innerHTML = `<p style="text-align:center; padding:30px; color:var(--text-secondary);">No matching polls found in history.</p>`;
            return;
        }

        filtered.forEach(poll => {
            const card = document.createElement('div');
            card.className = 'card history-item-card';
            
            const badgeType = poll.type === 'created' ? 'created' : 'voted';
            const badgeLabel = poll.type === 'created' ? 'Created' : 'Voted';
            
            card.innerHTML = `
                <div class="history-item-details">
                    <div class="history-item-badge-row">
                        <span class="h-badge ${badgeType}">${badgeLabel}</span>
                        <span style="font-size:11px; color:var(--text-muted);">${poll.date}</span>
                    </div>
                    <h4 style="margin: 6px 0 2px 0; font-size:16px;">${poll.question}</h4>
                    <p style="font-size:13px; font-weight:500;">
                        ${poll.choiceEmoji ? poll.choiceEmoji + ' ' : ''}${poll.choiceText}
                    </p>
                </div>
                <div class="history-item-right">
                    <span style="font-size:12px; color:var(--text-secondary); font-weight:600;">${poll.responses} responses</span>
                    <button class="favorite-star-btn ${poll.favorite ? 'active' : ''}" title="Toggle Favorite">
                        <i data-lucide="star" style="width:18px; height:18px;"></i>
                    </button>
                </div>
            `;
            
            // Favorite Button action
            const starBtn = card.querySelector('.favorite-star-btn');
            starBtn.addEventListener('click', () => {
                poll.favorite = !poll.favorite;
                starBtn.classList.toggle('active');
                if (this.currentFilter === 'favorites') {
                    this.renderTimeline();
                }
            });

            this.timelineList.appendChild(card);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    handleNewVoteTimeline(vote) {
        // Timeline renders directly based on updated window.WhatsPollState synced by app.js / responder.js
        this.renderTimeline();
    }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
    window.WhatsPollPassport = new HistoryController();
});
export default HistoryController;
