// WhatsPoll Interactive Canvas Background: Abstract Decision Network

class DecisionNetwork {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: null, y: null, radius: 180 };
        this.theme = document.documentElement.getAttribute('data-theme') || 'dark';
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        this.createParticles();
        this.bindEvents();
        this.animate();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        this.particles = [];
        // Calculate particle count based on screen size
        const particleCount = Math.floor((this.canvas.width * this.canvas.height) / 14000);
        
        // Define colors based on current theme
        const colors = this.getThemeColors();
        
        for (let i = 0; i < particleCount; i++) {
            const size = Math.random() * 2 + 1; // particle size (1px to 3px)
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.35, // slow drifting velocity
                vy: (Math.random() - 0.5) * 0.35,
                radius: size,
                color: colors[Math.floor(Math.random() * colors.length)],
                originalColor: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }

    getThemeColors() {
        if (this.theme === 'dark') {
            return [
                'rgba(16, 185, 129, 0.45)', // emerald
                'rgba(20, 184, 166, 0.45)', // teal
                'rgba(59, 130, 246, 0.35)'   // blue
            ];
        } else {
            return [
                'rgba(5, 150, 105, 0.25)',  // emerald
                'rgba(13, 148, 136, 0.25)', // teal
                'rgba(37, 99, 235, 0.2)'    // blue
            ];
        }
    }

    updateTheme(newTheme) {
        this.theme = newTheme;
        const colors = this.getThemeColors();
        this.particles.forEach(p => {
            p.color = colors[Math.floor(Math.random() * colors.length)];
            p.originalColor = p.color;
        });
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.createParticles();
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('mouseleave', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });

        // Listen for theme switch events
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    const currentTheme = document.documentElement.getAttribute('data-theme');
                    this.updateTheme(currentTheme);
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
    }

    drawLines() {
        const maxDist = 115;
        const lineColor = this.theme === 'dark' ? 'rgba(255, 255, 255,' : 'rgba(0, 0, 0,';
        
        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];
            
            // Check proximity to mouse
            if (this.mouse.x !== null && this.mouse.y !== null) {
                const dxMouse = p1.x - this.mouse.x;
                const dyMouse = p1.y - this.mouse.y;
                const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
                
                // Add soft gravitational pull towards mouse
                if (distMouse < this.mouse.radius) {
                    const force = (this.mouse.radius - distMouse) / this.mouse.radius;
                    p1.x -= dxMouse * force * 0.02;
                    p1.y -= dyMouse * force * 0.02;
                }
            }

            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < maxDist) {
                    // Normalize transparency based on distance
                    const alpha = (1 - (dist / maxDist)) * 0.12;
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `${lineColor} ${alpha})`;
                    this.ctx.lineWidth = 0.65;
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw and update particles
        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();

            // Update particle coordinates
            p.x += p.vx;
            p.y += p.vy;

            // Bounce on boundaries
            if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;
        });

        this.drawLines();

        requestAnimationFrame(() => this.animate());
    }
}

// Initialise the background network canvas
document.addEventListener('DOMContentLoaded', () => {
    new DecisionNetwork('network-canvas');
});
export default DecisionNetwork;
