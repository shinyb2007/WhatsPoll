// WhatsPoll Vote Page (Responder) Controller

class ResponderExperience {
    constructor() {
        // Dedicated page elements
        this.voteCard = document.getElementById('vote-card-box');
        this.successBox = document.getElementById('vote-success-box');
        this.questionEl = document.getElementById('vote-poll-question');
        this.descEl = document.getElementById('vote-poll-desc');
        this.optionsList = document.getElementById('vote-options-list');
        
        // Form Controls
        this.confidenceSlider = document.getElementById('vote-confidence-slider');
        this.confidenceValText = document.getElementById('vote-confidence-value');
        this.reasonInput = document.getElementById('vote-reason-text');
        this.submitVoteBtn = document.getElementById('submit-vote-btn');
        
        // Ask AI Sidebar Chat
        this.aiChatViewport = document.getElementById('ai-chat-viewport');
        this.aiChatInput = document.getElementById('ai-chat-input');
        this.aiChatSend = document.getElementById('ai-chat-send');
        
        // Navigation success redirections
        this.goToResultsBtn = document.getElementById('go-to-results-btn');
        
        // Homepage Sandbox elements
        this.voteCardHome = document.getElementById('vote-card-box-home');
        this.successBoxHome = document.getElementById('vote-success-box-home');
        this.questionElHome = document.getElementById('vote-poll-question-home');
        this.descElHome = document.getElementById('vote-poll-desc-home');
        this.optionsListHome = document.getElementById('vote-options-list-home');
        
        this.confidenceSliderHome = document.getElementById('vote-confidence-slider-home');
        this.confidenceValTextHome = document.getElementById('vote-confidence-value-home');
        this.reasonInputHome = document.getElementById('vote-reason-text-home');
        this.submitVoteBtnHome = document.getElementById('submit-vote-btn-home');
        this.resetVoteHomeBtn = document.getElementById('reset-vote-home-btn');
        
        this.selectedOptionIdx = null;
        this.selectedOptionIdxHome = null;

        this.init();
    }

    init() {
        this.renderPoll();
        this.renderPollHome();
        this.bindEvents();
    }

    renderPoll() {
        if (!this.optionsList) return;
        const poll = window.WhatsPollState.currentPoll;
        
        this.questionEl.innerText = poll.title;
        this.descEl.innerText = poll.description || "Pick your option and explain your reasoning.";
        
        this.optionsList.innerHTML = "";
        poll.options.forEach((opt, index) => {
            const isSelected = this.selectedOptionIdx === index;
            const button = document.createElement('button');
            button.className = `solid-option-btn ${isSelected ? 'selected' : ''}`;
            button.dataset.index = index;
            
            button.innerHTML = `
                <div class="solid-checkbox-marker"></div>
                <span style="font-size:18px;">${opt.emoji || '💡'}</span>
                <span>${opt.text}</span>
            `;
            
            button.addEventListener('click', () => {
                this.selectedOptionIdx = index;
                this.renderPoll();
            });
            
            this.optionsList.appendChild(button);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    renderPollHome() {
        if (!this.optionsListHome) return;
        const poll = window.WhatsPollState.currentPoll;
        
        this.questionElHome.innerText = poll.title;
        this.descElHome.innerText = poll.description || "Pick your option and explain your reasoning.";
        
        this.optionsListHome.innerHTML = "";
        poll.options.forEach((opt, index) => {
            const isSelected = this.selectedOptionIdxHome === index;
            const button = document.createElement('button');
            button.className = `solid-option-btn ${isSelected ? 'selected' : ''}`;
            button.style.padding = "10px 14px";
            button.style.fontSize = "13px";
            button.dataset.index = index;
            
            button.innerHTML = `
                <div class="solid-checkbox-marker" style="width:14px; height:14px;"></div>
                <span style="font-size:15px;">${opt.emoji || '💡'}</span>
                <span>${opt.text}</span>
            `;
            
            button.addEventListener('click', () => {
                this.selectedOptionIdxHome = index;
                this.renderPollHome();
            });
            
            this.optionsListHome.appendChild(button);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    bindEvents() {
        // Slider inputs
        if (this.confidenceSlider) {
            this.confidenceSlider.addEventListener('input', (e) => {
                this.confidenceValText.innerText = `${e.target.value}%`;
            });
        }

        if (this.confidenceSliderHome) {
            this.confidenceSliderHome.addEventListener('input', (e) => {
                this.confidenceValTextHome.innerText = `${e.target.value}%`;
            });
        }

        // Submit action
        if (this.submitVoteBtn) {
            this.submitVoteBtn.addEventListener('click', () => this.handleVoteSubmit());
        }

        if (this.submitVoteBtnHome) {
            this.submitVoteBtnHome.addEventListener('click', () => this.handleVoteSubmitHome());
        }

        // Reset sandbox vote action
        if (this.resetVoteHomeBtn) {
            this.resetVoteHomeBtn.addEventListener('click', () => this.resetVoteCardHome());
        }

        // Ask AI actions
        if (this.aiChatSend) {
            this.aiChatSend.addEventListener('click', () => this.handleAiChat());
            this.aiChatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.handleAiChat();
            });
        }

        // Go to Results redirect
        if (this.goToResultsBtn) {
            this.goToResultsBtn.addEventListener('click', () => {
                const resultsLink = document.querySelector('.app-nav a[data-target="results-section"]');
                if (resultsLink) {
                    resultsLink.click();
                }
            });
        }
    }

    async handleVoteSubmit() {
        if (this.selectedOptionIdx === null) {
            alert("Please pick an option before voting.");
            return;
        }

        const poll = window.WhatsPollState.currentPoll;
        const selectedOpt = poll.options[this.selectedOptionIdx];
        
        try {
            const res = await fetch('/api/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    optionText: selectedOpt.text,
                    optionEmoji: selectedOpt.emoji || '💡',
                    confidence: parseInt(this.confidenceSlider.value),
                    reason: this.reasonInput.value.trim(),
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                })
            });

            if (res.ok) {
                const responseData = await res.json();
                window.WhatsPollState = responseData.state;
                
                // Rerender analytics results instantly
                if (window.WhatsPollAnalytics) {
                    window.WhatsPollAnalytics.renderCharts();
                }

                this.voteCard.classList.add('hidden');
                this.successBox.classList.remove('hidden');
            }
        } catch (err) {
            console.error("Failed to post vote to server:", err);
        }
    }

    async handleVoteSubmitHome() {
        if (this.selectedOptionIdxHome === null) {
            alert("Please pick an option before voting.");
            return;
        }

        const poll = window.WhatsPollState.currentPoll;
        const selectedOpt = poll.options[this.selectedOptionIdxHome];
        
        try {
            const res = await fetch('/api/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    optionText: selectedOpt.text,
                    optionEmoji: selectedOpt.emoji || '💡',
                    confidence: parseInt(this.confidenceSliderHome.value),
                    reason: this.reasonInputHome.value.trim(),
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                })
            });

            if (res.ok) {
                const responseData = await res.json();
                window.WhatsPollState = responseData.state;
                
                // Rerender analytics results instantly
                if (window.WhatsPollAnalytics) {
                    window.WhatsPollAnalytics.renderCharts();
                }

                this.voteCardHome.classList.add('hidden');
                this.successBoxHome.classList.remove('hidden');
            }
        } catch (err) {
            console.error("Failed to post sandbox vote to server:", err);
        }
    }

    handleAiChat() {
        const prompt = this.aiChatInput.value.trim();
        if (!prompt) return;

        this.appendChatBubble(prompt, 'user');
        this.aiChatInput.value = "";

        setTimeout(() => {
            let botReply = "I can explain these choices objectively. What details would you like to compare?";
            const txt = prompt.toLowerCase();
            const poll = window.WhatsPollState.currentPoll;
            
            if (txt.includes('option a') || txt.includes('first') || (poll.options[0] && txt.includes(poll.options[0].text.toLowerCase().split(' ')[0]))) {
                botReply = `Option A ("${poll.options[0].text}") focuses on upfront delivery optimization. Recommended if long-term structure is your target.`;
            } else if (txt.includes('option b') || txt.includes('second') || (poll.options[1] && txt.includes(poll.options[1].text.toLowerCase().split(' ')[0]))) {
                botReply = `Option B ("${poll.options[1].text}") provides high efficiency with low immediate resource needs. Best for speedy rollout.`;
            } else if (txt.includes('option c') || txt.includes('third') || (poll.options[2] && txt.includes(poll.options[2].text.toLowerCase().split(' ')[0]))) {
                botReply = `Option C ("${poll.options[2].text}") targets safety parameters. However, it requires longer schedule alignments.`;
            } else if (txt.includes('wording') || txt.includes('better')) {
                botReply = "This question is structured neutrally. Option options do not display overlapping variables, which guarantees unbiased results.";
            }

            this.appendChatBubble(botReply, 'bot');
        }, 800);
    }

    appendChatBubble(text, sender) {
        const bubble = document.createElement('div');
        bubble.className = `ai-bubble ${sender}`;
        bubble.innerText = text;
        this.aiChatViewport.appendChild(bubble);
        this.aiChatViewport.scrollTop = this.aiChatViewport.scrollHeight;
    }

    resetVoteCard() {
        this.selectedOptionIdx = null;
        this.reasonInput.value = "";
        this.confidenceSlider.value = 80;
        this.confidenceValText.innerText = "80%";
        
        this.voteCard.classList.remove('hidden');
        this.successBox.classList.add('hidden');
        this.renderPoll();
    }

    resetVoteCardHome() {
        this.selectedOptionIdxHome = null;
        if (this.reasonInputHome) this.reasonInputHome.value = "";
        if (this.confidenceSliderHome) this.confidenceSliderHome.value = 80;
        if (this.confidenceValTextHome) this.confidenceValTextHome.innerText = "80%";
        
        if (this.voteCardHome) this.voteCardHome.classList.remove('hidden');
        if (this.successBoxHome) this.successBoxHome.classList.add('hidden');
        this.renderPollHome();
    }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
    window.WhatsPollResponder = new ResponderExperience();
});
export default ResponderExperience;
