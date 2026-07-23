// WhatsPoll AI Poll Studio & Creator Workspace Controller

const MASTER_CHIPS = [
    "🍕 Lunch Plan", "🎉 Birthday Party", "📚 Class Quiz", "🎬 Movie Night",
    "✈️ Trip Planning", "🏆 Voting", "📅 Meeting Time", "🏠 Hostel Poll",
    "💼 Office Survey", "🎓 College Election", "🎁 Gift Choice", "⚽ Sports Event",
    "🍔 Food Order", "📖 Book Club", "🎵 Playlist", "🎮 Gaming Night"
];

const PLACEHOLDERS = [
    "Ask anything...",
    "What would you like to create?",
    "Describe your poll...",
    "Create a poll in one sentence...",
    "What decision are you trying to make?",
    "Type your idea here..."
];

const QUICK_CREATE_TEMPLATES = {
    poll: {
        question: "Cast your vote on this active issue",
        options: [
            { text: "Option A: Approve as draft", emoji: "✅" },
            { text: "Option B: Hold for review", emoji: "⏳" },
            { text: "Option C: Reject changes", emoji: "❌" }
        ],
        time: "1 min",
        advice: "Provide clear descriptions for approve/reject options."
    },
    survey: {
        question: "How was your experience with WhatsPoll?",
        options: [
            { text: "Excellent and smooth", emoji: "🤩" },
            { text: "Good but needs some updates", emoji: "🙂" },
            { text: "Poor, encountered errors", emoji: "😟" }
        ],
        time: "1.5 mins",
        advice: "Adding mid-point options (neutral) ensures responses are not forced."
    },
    quiz: {
        question: "Which CSS property defines an element's border radius?",
        options: [
            { text: "border-radius", emoji: "📐" },
            { text: "corner-style", emoji: "✏️" },
            { text: "border-curve", emoji: "📏" }
        ],
        time: "45 secs",
        advice: "Trivia and quizzes should have exactly one correct answer. Keep options concise."
    },
    decision: {
        question: "Which framework is best for our project?",
        options: [
            { text: "React.js (Component-driven ecosystem)", emoji: "⚛️" },
            { text: "Vue.js (Approachable syntax structure)", emoji: "🟢" },
            { text: "Angular (Full-fledged corporate setup)", emoji: "🅰️" }
        ],
        time: "2 mins",
        advice: "Include description details for frameworks to help team members compare variables."
    },
    schedule: {
        question: "Choose a time slot for our weekly sync",
        options: [
            { text: "Monday 10:00 AM PST", emoji: "🌅" },
            { text: "Wednesday 2:00 PM PST", emoji: "☀️" },
            { text: "Friday 4:00 PM PST", emoji: "🌌" }
        ],
        time: "1 min",
        advice: "Avoid early Mondays or late Fridays to maximize participant responses."
    },
    event: {
        question: "Select preferred activity for our annual team day out",
        options: [
            { text: "Bowling & Arcade games", emoji: "🎳" },
            { text: "Outdoor Hiking & Picnic", emoji: "🧺" },
            { text: "VR escape room adventure", emoji: "🎮" }
        ],
        time: "2 mins",
        advice: "Include diverse choices to appeal to different preferences and constraints."
    }
};

const THEMES = {
    minimal: { primaryColor: "#111827", accentColor: "#4B5563", cardBg: "#FFFFFF" },
    modern: { primaryColor: "#22C55E", accentColor: "#2563EB", cardBg: "#F8FAFC" },
    corporate: { primaryColor: "#2563EB", accentColor: "#1E293B", cardBg: "#F1F5F9" },
    gaming: { primaryColor: "#EC4899", accentColor: "#8B5CF6", cardBg: "#1E1B4B" },
    festival: { primaryColor: "#F59E0B", accentColor: "#DC2626", cardBg: "#FFFBEB" },
    education: { primaryColor: "#10B981", accentColor: "#059669", cardBg: "#F0FDF4" }
};

class CreatorWorkspace {
    constructor() {
        // AI Input and dynamic elements
        this.promptInput = document.getElementById('ai-prompt-input');
        this.suggestionsSection = document.getElementById('dynamic-suggestions-section');
        this.suggestionsRow = document.getElementById('suggestions-row');
        this.quickCreateRow = document.getElementById('quick-create-row');
        
        // Studio Content Inputs
        this.studioInputQuestion = document.getElementById('studio-input-question');
        this.studioInputDesc = document.getElementById('studio-input-desc');
        this.studioOptionsList = document.getElementById('studio-options-list');
        this.studioAddOptBtn = document.getElementById('studio-add-opt-btn');
        this.studioPublishBtn = document.getElementById('studio-publish-btn');
        
        // Studio Toolbar Actions
        this.studioUndoBtn = document.getElementById('studio-undo-btn');
        this.studioRedoBtn = document.getElementById('studio-redo-btn');
        this.deviceToggles = document.querySelectorAll('.device-toggle');
        this.deviceWrapper = document.getElementById('studio-preview-device-wrapper');
        this.studioGenerateBtn = document.getElementById('studio-generate-btn');
        this.studioSaveStatus = document.getElementById('studio-save-status');
        
        // Studio Preview Nodes
        this.previewCard = document.getElementById('studio-preview-card');
        this.previewQuestion = document.getElementById('studio-preview-question');
        this.previewDesc = document.getElementById('studio-preview-desc');
        this.previewOptions = document.getElementById('studio-preview-options');
        this.previewTypeLabel = document.getElementById('studio-preview-type');
        
        // Studio Customizer Inputs (Right Panel)
        this.studioThemeSelect = document.getElementById('studio-theme-select');
        this.studioColorPrimary = document.getElementById('studio-color-primary');
        this.studioColorPrimaryHex = document.getElementById('studio-color-primary-hex');
        this.studioColorAccent = document.getElementById('studio-color-accent');
        this.studioColorAccentHex = document.getElementById('studio-color-accent-hex');
        this.studioColorCard = document.getElementById('studio-color-card');
        this.studioColorCardHex = document.getElementById('studio-color-card-hex');
        
        this.studioFontSelect = document.getElementById('studio-font-select');
        this.studioRadiusSelect = document.getElementById('studio-radius-select');
        this.studioQtypeSelect = document.getElementById('studio-qtype-select');
        this.studioResultsVisible = document.getElementById('studio-results-visible');
        
        // AI Toolbox Buttons
        this.studioAiWording = document.getElementById('studio-ai-wording');
        this.studioAiEmojis = document.getElementById('studio-ai-emojis');
        this.studioAiTranslate = document.getElementById('studio-ai-translate');
        this.studioAiPredict = document.getElementById('studio-ai-predict');

        // Homepage Quick Sandbox
        this.promptInputHome = document.getElementById('ai-prompt-input-home');
        this.generateBtnHome = document.getElementById('generate-poll-btn-home');
        this.quickCreateRowHome = document.getElementById('quick-create-row-home');
        this.suggestionsSectionHome = document.getElementById('dynamic-suggestions-section-home');
        this.suggestionsRowHome = document.getElementById('suggestions-row-home');
        this.loaderHome = document.getElementById('create-loader-home');
        this.wordingAdviceBoxHome = document.getElementById('wording-advice-box-home');
        this.wordingAdviceTextHome = document.getElementById('wording-advice-text-home');

        // Initialize Studio Editable State Stack
        this.pollDraft = {
            question: "Select the best meeting time.",
            description: "We need to select a core alignment window for Q3 sprints updates.",
            options: [
                { text: "Tuesday 9:00 AM PST", emoji: "🌅" },
                { text: "Wednesday 12:00 PM PST", emoji: "☀️" },
                { text: "Thursday 5:00 PM PST", emoji: "🌌" }
            ],
            theme: "modern",
            primaryColor: "#22c55e",
            accentColor: "#2563eb",
            cardBg: "#f8fafc",
            font: "inter",
            radius: "16px",
            qtype: "single",
            resultsVisible: true
        };
        
        this.undoStack = [];
        this.redoStack = [];

        this.init();
    }

    init() {
        this.bindEvents();
        this.randomizePlaceholders();
        this.buildContextSuggestions();
        this.syncInputsFromDraft();
        this.renderPreviewCanvas();
        this.initAccordions();
    }

    pushToHistory() {
        // Deep copy state object
        const clone = JSON.parse(JSON.stringify(this.pollDraft));
        this.undoStack.push(clone);
        if (this.undoStack.length > 40) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo stack on new action
        this.updateSaveStatus();
    }

    undo() {
        if (this.undoStack.length > 0) {
            const current = JSON.parse(JSON.stringify(this.pollDraft));
            this.redoStack.push(current);
            
            const prev = this.undoStack.pop();
            this.pollDraft = prev;
            
            this.syncInputsFromDraft();
            this.renderPreviewCanvas();
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const current = JSON.parse(JSON.stringify(this.pollDraft));
            this.undoStack.push(current);
            
            const next = this.redoStack.pop();
            this.pollDraft = next;
            
            this.syncInputsFromDraft();
            this.renderPreviewCanvas();
        }
    }

    updateSaveStatus() {
        if (this.studioSaveStatus) {
            this.studioSaveStatus.innerHTML = `<i data-lucide="loader" class="spin" style="width:12px; height:12px; display:inline-block; vertical-align:middle; animation:rotation 1s infinite linear; margin-right:4px;"></i> Saving...`;
            if (window.lucide) window.lucide.createIcons();
            
            setTimeout(() => {
                this.studioSaveStatus.innerHTML = `<i data-lucide="check" style="width:12px; height:12px; display:inline-block; vertical-align:middle; color:var(--primary-green); margin-right:4px;"></i> Draft auto-saved`;
                if (window.lucide) window.lucide.createIcons();
            }, 800);
        }
    }

    bindEvents() {
        // Undo / Redo clicks
        if (this.studioUndoBtn) {
            this.studioUndoBtn.addEventListener('click', () => this.undo());
            this.studioRedoBtn.addEventListener('click', () => this.redo());
        }

        // AI Formulate in Studio
        if (this.studioGenerateBtn) {
            this.studioGenerateBtn.addEventListener('click', () => {
                const query = this.promptInput.value.trim();
                if (!query) return;
                this.pushToHistory();
                this.handleStudioPromptGenerate(query);
            });
        }

        // Focus listeners for create input
        if (this.promptInput) {
            this.promptInput.addEventListener('focus', () => {
                this.suggestionsSection.classList.remove('hidden');
            });
            this.promptInput.addEventListener('blur', () => {
                setTimeout(() => {
                    this.suggestionsSection.classList.add('hidden');
                }, 200);
            });
        }

        // Quick Create buttons
        if (this.quickCreateRow) {
            this.quickCreateRow.querySelectorAll('.quick-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    this.pushToHistory();
                    this.handleStudioQuickTemplate(type);
                });
            });
        }

        // Content Editor fields
        if (this.studioInputQuestion) {
            this.studioInputQuestion.addEventListener('input', (e) => {
                this.pollDraft.question = e.target.value;
                this.renderPreviewCanvas();
            });
            this.studioInputQuestion.addEventListener('change', () => this.pushToHistory());
        }

        if (this.studioInputDesc) {
            this.studioInputDesc.addEventListener('input', (e) => {
                this.pollDraft.description = e.target.value;
                this.renderPreviewCanvas();
            });
            this.studioInputDesc.addEventListener('change', () => this.pushToHistory());
        }

        if (this.studioAddOptBtn) {
            this.studioAddOptBtn.addEventListener('click', () => {
                this.pushToHistory();
                this.pollDraft.options.push({ text: "New Option", emoji: "💡" });
                this.syncInputsFromDraft();
                this.renderPreviewCanvas();
            });
        }

        if (this.studioPublishBtn) {
            this.studioPublishBtn.addEventListener('click', () => this.handlePublishStudio());
        }

        // Device preview frames toggles
        this.deviceToggles.forEach(btn => {
            btn.addEventListener('click', () => {
                this.deviceToggles.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const device = btn.dataset.device;
                if (device === 'desktop') {
                    this.deviceWrapper.style.maxWidth = '600px';
                    this.deviceWrapper.style.width = '100%';
                } else if (device === 'tablet') {
                    this.deviceWrapper.style.maxWidth = '540px';
                    this.deviceWrapper.style.width = '540px';
                } else if (device === 'mobile') {
                    this.deviceWrapper.style.maxWidth = '360px';
                    this.deviceWrapper.style.width = '360px';
                }
            });
        });

        // Right Customizer Bindings
        if (this.studioThemeSelect) {
            this.studioThemeSelect.addEventListener('change', (e) => {
                this.pushToHistory();
                const themeVal = e.target.value;
                this.pollDraft.theme = themeVal;
                
                const preset = THEMES[themeVal];
                if (preset) {
                    this.pollDraft.primaryColor = preset.primaryColor;
                    this.pollDraft.accentColor = preset.accentColor;
                    this.pollDraft.cardBg = preset.cardBg;
                    
                    this.studioColorPrimary.value = preset.primaryColor;
                    this.studioColorPrimaryHex.value = preset.primaryColor;
                    this.studioColorAccent.value = preset.accentColor;
                    this.studioColorAccentHex.value = preset.accentColor;
                    this.studioColorCard.value = preset.cardBg;
                    this.studioColorCardHex.value = preset.cardBg;
                }
                this.renderPreviewCanvas();
            });
        }

        // Color Inputs
        const bindColorControl = (wheel, hexField, draftKey) => {
            if (wheel) {
                wheel.addEventListener('input', (e) => {
                    this.pollDraft[draftKey] = e.target.value;
                    hexField.value = e.target.value;
                    this.renderPreviewCanvas();
                });
                wheel.addEventListener('change', () => this.pushToHistory());
                
                hexField.addEventListener('input', (e) => {
                    const hex = e.target.value.trim();
                    if (hex.match(/^#[0-9A-Fa-f]{6}$/)) {
                        this.pollDraft[draftKey] = hex;
                        wheel.value = hex;
                        this.renderPreviewCanvas();
                    }
                });
                hexField.addEventListener('change', () => this.pushToHistory());
            }
        };

        bindColorControl(this.studioColorPrimary, this.studioColorPrimaryHex, 'primaryColor');
        bindColorControl(this.studioColorAccent, this.studioColorAccentHex, 'accentColor');
        bindColorControl(this.studioColorCard, this.studioColorCardHex, 'cardBg');

        // Font and Corner Radii
        if (this.studioFontSelect) {
            this.studioFontSelect.addEventListener('change', (e) => {
                this.pushToHistory();
                this.pollDraft.font = e.target.value;
                this.renderPreviewCanvas();
            });
            this.studioRadiusSelect.addEventListener('change', (e) => {
                this.pushToHistory();
                this.pollDraft.radius = e.target.value;
                this.renderPreviewCanvas();
            });
            this.studioQtypeSelect.addEventListener('change', (e) => {
                this.pushToHistory();
                this.pollDraft.qtype = e.target.value;
                this.renderPreviewCanvas();
            });
            this.studioResultsVisible.addEventListener('change', (e) => {
                this.pushToHistory();
                this.pollDraft.resultsVisible = e.target.checked;
                this.renderPreviewCanvas();
            });
        }

        // AI Assistant Toolbox hooks
        if (this.studioAiWording) {
            this.studioAiWording.addEventListener('click', () => {
                this.pushToHistory();
                const q = this.pollDraft.question;
                // Improve title wording logic
                this.pollDraft.question = q.charAt(0).toUpperCase() + q.slice(1).replace(/\?$/, "") + "?";
                this.syncInputsFromDraft();
                this.renderPreviewCanvas();
            });

            this.studioAiEmojis.addEventListener('click', () => {
                this.pushToHistory();
                const emojisMap = { lunch: "🍕", logo: "📐", meeting: "📅", time: "🕒", design: "🎨", food: "🍔" };
                const qLower = this.pollDraft.question.toLowerCase();
                
                this.pollDraft.options.forEach(opt => {
                    const txt = opt.text.toLowerCase();
                    let match = "💡";
                    for (const [key, val] of Object.entries(emojisMap)) {
                        if (txt.includes(key) || qLower.includes(key)) {
                            match = val;
                        }
                    }
                    opt.emoji = match;
                });
                
                this.syncInputsFromDraft();
                this.renderPreviewCanvas();
            });

            this.studioAiTranslate.addEventListener('click', () => {
                this.pushToHistory();
                const translationDict = {
                    "Tuesday 9:00 AM PST": "Martes 9:00 AM PST",
                    "Wednesday 12:00 PM PST": "Miércoles 12:00 PM PST",
                    "Thursday 5:00 PM PST": "Jueves 5:00 PM PST",
                    "Tacos & Burritos Spot": "Local de Tacos y Burritos",
                    "Burger & Fries Joint": "Lugar de Hamburguesas y Papas",
                    "Sushi & Ramen Bar": "Bar de Sushi y Ramen",
                    "Salad & Greens Kitchen": "Cocina de Ensaladas y Verduras"
                };

                this.pollDraft.options.forEach(opt => {
                    if (translationDict[opt.text]) {
                        opt.text = translationDict[opt.text];
                    }
                });

                this.syncInputsFromDraft();
                this.renderPreviewCanvas();
            });

            this.studioAiPredict.addEventListener('click', () => {
                alert(`AI Prediction:\n- Expected Completion: 1.2 minutes\n- Predicted Response Rate: 84%\n- Bias Risk: Very Low (Neutral framing detected)`);
            });
        }

        // Homepage Sandbox actions
        if (this.generateBtnHome) {
            this.generateBtnHome.addEventListener('click', () => this.handleGenerationHome());
        }

        if (this.promptInputHome) {
            this.promptInputHome.addEventListener('focus', () => {
                this.suggestionsSectionHome.classList.remove('hidden');
            });
            this.promptInputHome.addEventListener('blur', () => {
                setTimeout(() => {
                    this.suggestionsSectionHome.classList.add('hidden');
                }, 200);
            });
        }

        if (this.quickCreateRowHome) {
            this.quickCreateRowHome.querySelectorAll('.quick-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    this.handleQuickCreateHome(type);
                });
            });
        }
    }

    randomizePlaceholders() {
        const pick = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];
        if (this.promptInput) this.promptInput.placeholder = pick;
        if (this.promptInputHome) this.promptInputHome.placeholder = pick;
    }

    buildContextSuggestions() {
        const hour = new Date().getHours();
        let timeChips = [];
        if (hour >= 7 && hour < 11) {
            timeChips = ["☕ Breakfast", "📚 Study Plan", "📅 Meeting", "🚍 Bus Time"];
        } else if (hour >= 11 && hour < 17) {
            timeChips = ["🍕 Lunch", "💼 Team Poll", "🎯 Task Priority", "🍔 Food Order"];
        } else if (hour >= 17 && hour < 24) {
            timeChips = ["🎬 Movie", "🍽️ Dinner", "🎮 Game Night", "📍 Weekend Plan"];
        } else {
            timeChips = ["🌌 Night Sync", "🎮 Gaming Night", "🎵 Playlist", "✈️ Trip Planning"];
        }
        
        let allSelected = [...timeChips];
        const available = MASTER_CHIPS.filter(c => !allSelected.includes(c));
        const shuffled = available.sort(() => 0.5 - Math.random());
        allSelected.push(shuffled[0]);
        allSelected.push(shuffled[1]);
        
        const finalChips = allSelected.slice(0, 6);

        if (this.suggestionsRow) {
            this.suggestionsRow.innerHTML = "";
            finalChips.forEach(chip => {
                const button = document.createElement('button');
                button.className = 'suggestion-chip';
                button.innerText = chip;
                button.addEventListener('click', () => {
                    this.promptInput.value = "";
                    this.typePrompt(chip);
                });
                this.suggestionsRow.appendChild(button);
            });
        }

        if (this.suggestionsRowHome) {
            this.suggestionsRowHome.innerHTML = "";
            finalChips.forEach(chip => {
                const button = document.createElement('button');
                button.className = 'suggestion-chip';
                button.innerText = chip;
                button.addEventListener('click', () => {
                    this.promptInputHome.value = "";
                    this.typePromptHome(chip);
                });
                this.suggestionsRowHome.appendChild(button);
            });
        }
    }

    typePrompt(text, index = 0) {
        if (index < text.length) {
            this.promptInput.value += text.charAt(index);
            setTimeout(() => this.typePrompt(text, index + 1), 12);
        } else {
            setTimeout(() => {
                this.pushToHistory();
                this.handleStudioPromptGenerate(text);
            }, 150);
        }
    }

    typePromptHome(text, index = 0) {
        if (index < text.length) {
            this.promptInputHome.value += text.charAt(index);
            setTimeout(() => this.typePromptHome(text, index + 1), 12);
        } else {
            setTimeout(() => this.handleGenerationHome(), 150);
        }
    }

    initAccordions() {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const targetId = header.dataset.target;
                const content = document.getElementById(targetId);
                if (content) {
                    content.classList.toggle('hidden');
                    const icon = header.querySelector('i');
                    if (icon) {
                        const isHidden = content.classList.contains('hidden');
                        icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
                    }
                }
            });
        });
    }

    syncInputsFromDraft() {
        this.studioInputQuestion.value = this.pollDraft.question;
        this.studioInputDesc.value = this.pollDraft.description;
        this.studioThemeSelect.value = this.pollDraft.theme;
        
        this.studioColorPrimary.value = this.pollDraft.primaryColor;
        this.studioColorPrimaryHex.value = this.pollDraft.primaryColor;
        this.studioColorAccent.value = this.pollDraft.accentColor;
        this.studioColorAccentHex.value = this.pollDraft.accentColor;
        this.studioColorCard.value = this.pollDraft.cardBg;
        this.studioColorCardHex.value = this.pollDraft.cardBg;
        
        this.studioFontSelect.value = this.pollDraft.font;
        this.studioRadiusSelect.value = this.pollDraft.radius;
        this.studioQtypeSelect.value = this.pollDraft.qtype;
        this.studioResultsVisible.checked = this.pollDraft.resultsVisible;
        
        // Render options list editors
        this.studioOptionsList.innerHTML = "";
        this.pollDraft.options.forEach((opt, idx) => {
            const row = document.createElement('div');
            row.className = 'option-edit-row';
            row.innerHTML = `
                <input type="text" class="flat-input opt-emoji-val" style="width:40px; text-align:center; padding:0; height:36px; font-size:16px;" value="${opt.emoji || '💡'}">
                <input type="text" class="flat-input opt-text-val" style="flex:1; height:36px; font-size:13px;" value="${opt.text}">
                
                <button class="opt-reorder-btn" data-action="up" title="Move Up">▲</button>
                <button class="opt-reorder-btn" data-action="down" title="Move Down">▼</button>
                
                <button class="opt-delete-btn" title="Delete Option"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
            `;
            
            // Emoji inputs
            const emojiInp = row.querySelector('.opt-emoji-val');
            emojiInp.addEventListener('input', (e) => {
                opt.emoji = e.target.value;
                this.renderPreviewCanvas();
            });
            emojiInp.addEventListener('change', () => this.pushToHistory());

            // Option text inputs
            const textInp = row.querySelector('.opt-text-val');
            textInp.addEventListener('input', (e) => {
                opt.text = e.target.value;
                this.renderPreviewCanvas();
            });
            textInp.addEventListener('change', () => this.pushToHistory());

            // Delete
            row.querySelector('.opt-delete-btn').addEventListener('click', () => {
                this.pushToHistory();
                this.pollDraft.options.splice(idx, 1);
                this.syncInputsFromDraft();
                this.renderPreviewCanvas();
            });

            // Reorder Actions
            row.querySelector('[data-action="up"]').addEventListener('click', () => {
                if (idx > 0) {
                    this.pushToHistory();
                    const temp = this.pollDraft.options[idx];
                    this.pollDraft.options[idx] = this.pollDraft.options[idx - 1];
                    this.pollDraft.options[idx - 1] = temp;
                    this.syncInputsFromDraft();
                    this.renderPreviewCanvas();
                }
            });

            row.querySelector('[data-action="down"]').addEventListener('click', () => {
                if (idx < this.pollDraft.options.length - 1) {
                    this.pushToHistory();
                    const temp = this.pollDraft.options[idx];
                    this.pollDraft.options[idx] = this.pollDraft.options[idx + 1];
                    this.pollDraft.options[idx + 1] = temp;
                    this.syncInputsFromDraft();
                    this.renderPreviewCanvas();
                }
            });

            this.studioOptionsList.appendChild(row);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    renderPreviewCanvas() {
        this.previewQuestion.innerText = this.pollDraft.question;
        this.previewDesc.innerText = this.pollDraft.description || "Description options...";
        
        // Update labels type
        this.previewTypeLabel.innerText = this.pollDraft.qtype === 'yesno' ? 'Yes / No Choice' : (this.pollDraft.qtype === 'multiple' ? 'Multiple Choice' : 'Single Choice');

        // Apply Custom Styling Overrides
        this.previewCard.style.backgroundColor = this.pollDraft.cardBg;
        this.previewCard.style.borderRadius = this.pollDraft.radius;
        this.previewCard.style.borderColor = this.pollDraft.primaryColor;
        
        // Apply Font Overrides
        if (this.pollDraft.font === 'poppins') {
            this.previewCard.style.fontFamily = "'Poppins', sans-serif";
        } else if (this.pollDraft.font === 'sfpro') {
            this.previewCard.style.fontFamily = "-apple-system, BlinkMacSystemFont, sans-serif";
        } else if (this.pollDraft.font === 'roboto') {
            this.previewCard.style.fontFamily = "'Roboto', sans-serif";
        } else {
            this.previewCard.style.fontFamily = "'Inter', sans-serif";
        }

        // Render preview options list
        this.previewOptions.innerHTML = "";
        this.pollDraft.options.forEach((opt, index) => {
            const isMultiple = this.pollDraft.qtype === 'multiple';
            const button = document.createElement('div');
            button.className = 'solid-option-btn';
            button.style.cursor = 'default';
            button.style.borderColor = this.pollDraft.primaryColor;
            button.style.backgroundColor = 'var(--bg-main)';
            
            // Re-render check markers
            const markerClass = isMultiple ? 'solid-checkbox-marker' : 'solid-checkbox-marker';
            const markerRadius = isMultiple ? '4px' : '50%';
            
            button.innerHTML = `
                <div class="${markerClass}" style="border-radius: ${markerRadius}; border-color:${this.pollDraft.accentColor}"></div>
                <span style="font-size:16px;">${opt.emoji || '💡'}</span>
                <span style="font-weight:600; color:var(--text-primary);">${opt.text}</span>
            `;
            this.previewOptions.appendChild(button);
        });
    }

    async handleStudioPromptGenerate(query) {
        let templateKey = 'meeting';
        if (query.includes('lunch') || query.includes('go for') || query.includes('food')) templateKey = 'lunch';
        else if (query.includes('logo') || query.includes('club') || query.includes('design')) templateKey = 'logo';
        else if (query.includes('meeting') || query.includes('time') || query.includes('calendar')) templateKey = 'meeting';

        let pollData = POLL_TEMPLATES[templateKey];
        if (!POLL_TEMPLATES[templateKey]) {
            pollData = {
                question: query,
                options: [
                    { text: "Option A: Approve as draft", emoji: "✅" },
                    { text: "Option B: Hold for review", emoji: "⏳" }
                ],
                time: "1.5 mins",
                advice: "Ensure options are mutually exclusive."
            };
        }

        this.pollDraft.question = pollData.question;
        this.pollDraft.options = pollData.options;
        this.pollDraft.description = pollData.advice;

        this.syncInputsFromDraft();
        this.renderPreviewCanvas();
    }

    async handleStudioQuickTemplate(type) {
        const template = QUICK_CREATE_TEMPLATES[type];
        if (!template) return;

        this.pollDraft.question = template.question;
        this.pollDraft.options = template.options;
        this.pollDraft.description = template.advice;
        this.pollDraft.qtype = type === 'quiz' ? 'single' : (type === 'survey' ? 'multiple' : 'single');

        this.syncInputsFromDraft();
        this.renderPreviewCanvas();
    }

    async handlePublishStudio() {
        const origText = this.studioPublishBtn.innerText;
        this.studioPublishBtn.innerText = "Publishing...";
        this.studioPublishBtn.style.backgroundColor = "#2563EB";

        try {
            const res = await fetch('/api/poll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: this.pollDraft.question,
                    options: this.pollDraft.options,
                    time: "1.5 mins",
                    advice: this.pollDraft.description
                })
            });

            if (res.ok) {
                const responseData = await res.json();
                window.WhatsPollState = responseData.state;

                if (window.WhatsPollResponder) {
                    window.WhatsPollResponder.resetVoteCard();
                    window.WhatsPollResponder.resetVoteCardHome();
                }

                this.studioPublishBtn.innerText = "Published!";
                this.studioPublishBtn.style.backgroundColor = "#16a34a";

                setTimeout(() => {
                    this.studioPublishBtn.innerText = origText;
                    this.studioPublishBtn.style.backgroundColor = "";
                    
                    const voteLink = document.querySelector('.app-nav a[data-target="vote-section"]');
                    if (voteLink) {
                        voteLink.click();
                    }
                }, 800);
            }
        } catch (err) {
            console.error("Failed to post studio draft:", err);
            this.studioPublishBtn.innerText = origText;
            this.studioPublishBtn.style.backgroundColor = "";
        }
    }

    // Homepage Quick Sandbox templates
    async handleQuickCreateHome(type) {
        const template = QUICK_CREATE_TEMPLATES[type];
        if (!template) return;

        this.wordingAdviceBoxHome.classList.add('hidden');
        this.loaderHome.classList.remove('hidden');
        this.promptInputHome.value = `Create a ${type}: ${template.question}`;

        try {
            const res = await fetch('/api/poll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: template.question,
                    options: template.options,
                    time: template.time,
                    advice: template.advice
                })
            });

            if (res.ok) {
                const responseData = await res.json();
                window.WhatsPollState = responseData.state;

                if (window.WhatsPollResponder) {
                    window.WhatsPollResponder.resetVoteCardHome();
                }
                if (window.WhatsPollAnalytics) {
                    window.WhatsPollAnalytics.resetChartsHome();
                }
            }
        } catch (err) {
            console.error("Failed to quick create on homepage:", err);
        }

        this.wordingAdviceTextHome.innerText = template.advice;
        this.loaderHome.classList.add('hidden');
        this.wordingAdviceBoxHome.classList.remove('hidden');

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    async handleGenerationHome() {
        const query = this.promptInputHome.value.trim().toLowerCase();
        if (!query) return;

        this.wordingAdviceBoxHome.classList.add('hidden');
        this.loaderHome.classList.remove('hidden');

        let templateKey = 'meeting';
        if (query.includes('lunch') || query.includes('go for') || query.includes('food')) templateKey = 'lunch';
        else if (query.includes('logo') || query.includes('club') || query.includes('design')) templateKey = 'logo';
        else if (query.includes('meeting') || query.includes('time') || query.includes('calendar')) templateKey = 'meeting';

        let pollData = POLL_TEMPLATES[templateKey];
        if (!POLL_TEMPLATES[templateKey]) {
            pollData = {
                question: this.promptInputHome.value,
                options: [
                    { text: "Option 1: Proceed immediately", emoji: "⚡" },
                    { text: "Option 2: Schedule pilot test", emoji: "⚙️" },
                    { text: "Option 3: Hold for audit", emoji: "🛡️" }
                ],
                time: "1.5 mins",
                advice: "Ensure options are mutually exclusive."
            };
        }

        try {
            const res = await fetch('/api/poll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: pollData.question,
                    options: pollData.options,
                    time: pollData.time,
                    advice: pollData.advice
                })
            });

            if (res.ok) {
                const responseData = await res.json();
                window.WhatsPollState = responseData.state;

                if (window.WhatsPollResponder) {
                    window.WhatsPollResponder.resetVoteCardHome();
                }
                if (window.WhatsPollAnalytics) {
                    window.WhatsPollAnalytics.resetChartsHome();
                }
            }
        } catch (err) {
            console.error("Failed to generate poll on server:", err);
        }

        this.wordingAdviceTextHome.innerText = pollData.advice;
        this.loaderHome.classList.add('hidden');
        this.wordingAdviceBoxHome.classList.remove('hidden');

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
    window.WhatsPollCreator = new CreatorWorkspace();
});
export default CreatorWorkspace;
