// WhatsPoll Results Page (Analytics) Controller

class AnalyticsDashboard {
    constructor() {
        // Dedicated page elements
        this.responsesCountEl = document.getElementById('results-responses-count');
        this.winningOptionEl = document.getElementById('results-winning-option');
        this.confidenceAvgEl = document.getElementById('results-confidence-avg');
        this.questionSubtitle = document.getElementById('results-poll-question-subtitle');
        
        this.barChartContainer = document.getElementById('results-bar-chart-container');
        this.pieChartContainer = document.getElementById('results-pie-chart-container');
        this.pieKeysContainer = document.getElementById('results-pie-keys-container');
        this.timelineContainer = document.getElementById('results-timeline-container');
        this.aiInsightsText = document.getElementById('results-ai-insights-text');
        
        // Export Buttons
        this.exportExcelBtn = document.getElementById('export-excel-btn');
        this.exportCsvBtn = document.getElementById('export-csv-btn');
        this.exportPdfBtn = document.getElementById('export-pdf-btn');
        this.shareResultsBtn = document.getElementById('share-results-btn');
        
        // Homepage Sandbox elements
        this.responsesCountElHome = document.getElementById('results-responses-count-home');
        this.winningOptionElHome = document.getElementById('results-winning-option-home');
        this.confidenceAvgElHome = document.getElementById('results-confidence-avg-home');
        this.barChartContainerHome = document.getElementById('results-bar-chart-container-home');
        this.aiInsightsTextHome = document.getElementById('results-ai-insights-text-home');

        this.mockVoteCounts = [79, 30, 15];
        this.mockTotal = 124;
        
        this.init();
    }

    init() {
        this.renderCharts();
        this.bindEvents();
    }

    bindEvents() {
        // Listen for new sandbox votes
        window.addEventListener('new-user-voted', (e) => {
            this.handleNewVote(e.detail);
        });

        // Bind exports simulations
        if (this.exportExcelBtn) {
            [this.exportExcelBtn, this.exportCsvBtn, this.exportPdfBtn].forEach(btn => {
                btn.addEventListener('click', () => this.simulateExport(btn));
            });
        }

        if (this.shareResultsBtn) {
            this.shareResultsBtn.addEventListener('click', () => {
                const originalText = this.shareResultsBtn.innerHTML;
                this.shareResultsBtn.innerHTML = `<i data-lucide="check" style="width:14px; height:14px; vertical-align:middle;"></i> Link Copied!`;
                if (window.lucide) window.lucide.createIcons();
                
                setTimeout(() => {
                    this.shareResultsBtn.innerHTML = originalText;
                    if (window.lucide) window.lucide.createIcons();
                }, 1500);
            });
        }
    }

    syncStateData() {
        const poll = window.WhatsPollState.currentPoll;
        if (poll) {
            this.mockVoteCounts = poll.voteCounts || [0, 0, 0];
            this.mockTotal = poll.responsesCount || 0;
        }
    }

    renderCharts() {
        this.syncStateData();
        const poll = window.WhatsPollState.currentPoll;
        
        // Update Dedicated view if exists
        if (this.questionSubtitle) {
            this.questionSubtitle.innerText = poll.title;
            this.responsesCountEl.innerText = this.mockTotal;
            this.winningOptionEl.innerText = this.getWinningOptionText();
            this.confidenceAvgEl.innerText = poll.confidenceAvg;
            this.drawBarChart();
            this.drawPieChart();
            this.drawTimelineSVG();
            this.updateAIInsights();
        }

        // Update Homepage Sandbox view if exists
        if (this.responsesCountElHome) {
            this.responsesCountElHome.innerText = this.mockTotal;
            this.winningOptionElHome.innerText = this.getWinningOptionText();
            this.confidenceAvgElHome.innerText = poll.confidenceAvg;
            this.drawBarChartHome();
            this.updateAIInsightsHome();
        }
    }

    getWinningOptionText() {
        const poll = window.WhatsPollState.currentPoll;
        let maxIndex = 0;
        let maxVal = -1;
        this.mockVoteCounts.forEach((count, idx) => {
            if (count > maxVal) {
                maxVal = count;
                maxIndex = idx;
            }
        });
        
        if (this.mockTotal === 0 || maxVal === 0) return "N/A";
        return poll.options[maxIndex] ? poll.options[maxIndex].text : "N/A";
    }

    drawBarChart() {
        if (!this.barChartContainer) return;
        const poll = window.WhatsPollState.currentPoll;
        this.barChartContainer.innerHTML = "";
        
        const colors = ['var(--primary-blue)', 'var(--primary-green)', 'var(--warning)', 'var(--danger)'];
        
        poll.options.forEach((opt, idx) => {
            const count = this.mockVoteCounts[idx] || 0;
            const pct = this.mockTotal > 0 ? Math.round((count / this.mockTotal) * 100) : 0;
            const row = document.createElement('div');
            row.className = 'flat-bar-row';
            
            row.innerHTML = `
                <div class="bar-row-lbl-flex">
                    <span>${opt.emoji || ''} ${opt.text}</span>
                    <strong>${pct}% (${count} votes)</strong>
                </div>
                <div class="bar-bg-track">
                    <div class="bar-fill-solid" style="width:0%; background-color:${colors[idx % colors.length]};"></div>
                </div>
            `;
            
            this.barChartContainer.appendChild(row);
            
            setTimeout(() => {
                const fill = row.querySelector('.bar-fill-solid');
                if (fill) fill.style.width = `${pct}%`;
            }, 100);
        });
    }

    drawBarChartHome() {
        if (!this.barChartContainerHome) return;
        const poll = window.WhatsPollState.currentPoll;
        this.barChartContainerHome.innerHTML = "";
        
        const colors = ['var(--primary-blue)', 'var(--primary-green)', 'var(--warning)', 'var(--danger)'];
        
        poll.options.forEach((opt, idx) => {
            const count = this.mockVoteCounts[idx] || 0;
            const pct = this.mockTotal > 0 ? Math.round((count / this.mockTotal) * 100) : 0;
            const row = document.createElement('div');
            row.className = 'flat-bar-row';
            row.style.gap = "2px";
            
            row.innerHTML = `
                <div class="bar-row-lbl-flex" style="font-size:11px;">
                    <span>${opt.emoji || ''} ${opt.text}</span>
                    <strong>${pct}% (${count})</strong>
                </div>
                <div class="bar-bg-track" style="height:8px; margin-top:2px;">
                    <div class="bar-fill-solid" style="width:0%; background-color:${colors[idx % colors.length]};"></div>
                </div>
            `;
            
            this.barChartContainerHome.appendChild(row);
            
            setTimeout(() => {
                const fill = row.querySelector('.bar-fill-solid');
                if (fill) fill.style.width = `${pct}%`;
            }, 100);
        });
    }

    drawPieChart() {
        if (!this.pieChartContainer) return;
        const poll = window.WhatsPollState.currentPoll;
        const colors = ['#2563EB', '#22C55E', '#F59E0B', '#EF4444'];
        
        let cumulativePct = 0;
        let svgCirclesHTML = "";
        let keysHTML = "";

        poll.options.forEach((opt, idx) => {
            const count = this.mockVoteCounts[idx] || 0;
            const pct = this.mockTotal > 0 ? Math.round((count / this.mockTotal) * 100) : 0;
            
            svgCirclesHTML += `
                <circle class="donut-slice" cx="18" cy="18" r="15.9155" 
                        fill="transparent" 
                        stroke="${colors[idx % colors.length]}" 
                        stroke-width="4" 
                        stroke-dasharray="${pct} 100" 
                        stroke-dashoffset="-${cumulativePct}">
                </circle>
            `;
            
            keysHTML += `
                <div class="pie-key-item">
                    <div class="pie-key-color" style="background-color:${colors[idx % colors.length]};"></div>
                    <span>${opt.emoji || ''} ${opt.text}: <strong>${pct}%</strong></span>
                </div>
            `;
            
            cumulativePct += pct;
        });

        this.pieChartContainer.innerHTML = `
            <svg width="120" height="120" viewBox="0 0 36 36" style="transform: rotate(-90deg);">
                <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="var(--border-color)" stroke-width="4"></circle>
                ${svgCirclesHTML}
            </svg>
        `;
        
        this.pieKeysContainer.innerHTML = keysHTML;
    }

    drawTimelineSVG() {
        if (!this.timelineContainer) return;
        this.timelineContainer.innerHTML = `
            <svg viewBox="0 0 400 100" class="svg-chart">
                <line x1="10" y1="90" x2="390" y2="90" stroke="var(--border-color)" stroke-width="1.5"/>
                <line x1="10" y1="20" x2="390" y2="20" stroke="var(--chart-grid)" stroke-width="1" stroke-dasharray="3"/>
                <line x1="10" y1="55" x2="390" y2="55" stroke="var(--chart-grid)" stroke-width="1" stroke-dasharray="3"/>
                
                <path d="M 10 90 L 90 70 L 170 80 L 250 45 L 330 35 L 390 15" 
                      fill="none" stroke="var(--primary-green)" stroke-width="2.5" stroke-linecap="round"/>
                
                <circle cx="90" cy="70" r="3.5" fill="var(--bg-main)" stroke="var(--primary-green)" stroke-width="2"/>
                <circle cx="170" cy="80" r="3.5" fill="var(--bg-main)" stroke="var(--primary-green)" stroke-width="2"/>
                <circle cx="250" cy="45" r="3.5" fill="var(--bg-main)" stroke="var(--primary-green)" stroke-width="2"/>
                <circle cx="330" cy="35" r="3.5" fill="var(--bg-main)" stroke="var(--primary-green)" stroke-width="2"/>
                <circle cx="390" cy="15" r="4.5" fill="var(--primary-green)"/>

                <text x="90" y="98" fill="var(--text-secondary)" font-size="8" text-anchor="middle">10 AM</text>
                <text x="170" y="98" fill="var(--text-secondary)" font-size="8" text-anchor="middle">12 PM</text>
                <text x="250" y="98" fill="var(--text-secondary)" font-size="8" text-anchor="middle">2 PM</text>
                <text x="330" y="98" fill="var(--text-secondary)" font-size="8" text-anchor="middle">4 PM</text>
                <text x="390" y="98" fill="var(--text-secondary)" font-size="8" text-anchor="middle">Now</text>
            </svg>
        `;
    }

    updateAIInsights() {
        if (!this.aiInsightsText) return;
        const poll = window.WhatsPollState.currentPoll;
        const winning = this.getWinningOptionText();
        this.aiInsightsText.innerHTML = `
            <strong>Smart Insights:</strong> "${winning}" leads the vote. Average decision confidence is high (${poll.confidenceAvg || '82%'}). The primary reason patterns highlight convenience and availability. Word frequencies show key triggers: "lunch", "quick", "delivery", "meeting".
        `;
    }

    updateAIInsightsHome() {
        if (!this.aiInsightsTextHome) return;
        const poll = window.WhatsPollState.currentPoll;
        const winning = this.getWinningOptionText();
        if (this.mockTotal === 0) {
            this.aiInsightsTextHome.innerHTML = `
                <strong>Smart Insights:</strong> No votes recorded yet in the sandbox. Cast your selection in the center panel to update statistics.
            `;
            return;
        }
        this.aiInsightsTextHome.innerHTML = `
            <strong>Smart Insights:</strong> "${winning}" holds the majority. Responders express high average certainty (${poll.confidenceAvg || '82%'}). Options phrasing remains unbiased.
        `;
    }

    handleNewVote(vote) {
        // Redraw based on server state synced during response handling callback
        this.renderCharts();
    }

    resetChartsHome() {
        this.syncStateData();
        this.renderCharts();
    }

    simulateExport(btn) {
        const originalText = btn.innerText;
        btn.innerHTML = `<i data-lucide="loader" class="spin" style="width:13px; height:13px; display:inline-block; vertical-align:middle; animation:rotation 1s infinite linear;"></i> Saving...`;
        if (window.lucide) window.lucide.createIcons();
        
        setTimeout(() => {
            btn.innerHTML = `<i data-lucide="check" style="width:13px; height:13px; display:inline-block; vertical-align:middle; color:var(--primary-green);"></i> Completed`;
            if (window.lucide) window.lucide.createIcons();
            
            setTimeout(() => {
                btn.innerText = originalText;
                if (window.lucide) window.lucide.createIcons();
            }, 1200);
        }, 1500);
    }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
    window.WhatsPollAnalytics = new AnalyticsDashboard();
});
export default AnalyticsDashboard;
