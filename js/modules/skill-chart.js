// ===== Skill Chart Visualization Module =====
// Interactive skill charts using Canvas API

class SkillChart {
    constructor(canvasId, skills, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas with id "${canvasId}" not found`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.skills = skills;
        this.options = {
            type: options.type || 'bar', // 'bar', 'radar', 'circular'
            colors: options.colors || ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'],
            animate: options.animate !== false,
            interactive: options.interactive !== false,
            ...options
        };

        this.animationProgress = 0;
        this.hoveredIndex = -1;

        this.setupCanvas();
        this.bindEvents();
        this.render();
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        this.width = rect.width;
        this.height = rect.height;
    }

    bindEvents() {
        if (!this.options.interactive) return;

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.handleHover(x, y);
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredIndex = -1;
            this.render();
        });

        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.render();
        });
    }

    handleHover(x, y) {
        const oldIndex = this.hoveredIndex;
        this.hoveredIndex = this.getHoveredSkill(x, y);

        if (oldIndex !== this.hoveredIndex) {
            this.render();
        }
    }

    getHoveredSkill(x, y) {
        if (this.options.type === 'bar') {
            return this.getHoveredBarIndex(x, y);
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        if (this.options.type === 'bar') {
            this.renderBarChart();
        }

        if (this.hoveredIndex >= 0) {
            this.renderTooltip(this.hoveredIndex);
        }
    }

    renderBarChart() {
        // Responsive values based on screen width
        const isMobile = this.width < 600;
        const padding = isMobile ? 40 : 60; // Increased padding for rotated labels
        const barSpacing = isMobile ? 8 : 15;
        const barWidth = (this.width - padding * 2 - barSpacing * (this.skills.length - 1)) / this.skills.length;
        const fontSize = isMobile ? 10 : 13;

        // Draw background grid with glow
        this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
        this.ctx.lineWidth = 1;
        this.ctx.shadowBlur = isMobile ? 5 : 10;
        this.ctx.shadowColor = 'rgba(99, 102, 241, 0.3)';

        for (let i = 0; i <= 4; i++) {
            const y = padding + (this.height - padding * 2) * (i / 4);
            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(this.width - padding, y);
            this.ctx.stroke();

            // Draw percentage labels with better styling
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#cbd5e1';
            this.ctx.font = `bold ${fontSize}px sans-serif`;
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`${100 - i * 25}%`, padding - (isMobile ? 8 : 15), y + 5);
        }

        this.ctx.shadowBlur = 0;

        // Draw bars
        this.skills.forEach((skill, index) => {
            const barX = padding + index * (barWidth + barSpacing);
            const barHeight = (this.height - padding * 2) * (skill.level / 100) * this.animationProgress;
            const barY = this.height - padding - barHeight;

            const isHovered = this.hoveredIndex === index;
            const scale = isHovered ? 1.08 : 1;
            const adjustedBarWidth = barWidth * scale;
            const adjustedBarX = barX - (adjustedBarWidth - barWidth) / 2;

            // Enhanced gradient
            const gradient = this.ctx.createLinearGradient(barX, barY, barX, this.height - padding);
            const color = this.options.colors[index % this.options.colors.length];
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.5, color + 'dd');
            gradient.addColorStop(1, color + '66');

            // Glow effect for hovered bar
            if (isHovered) {
                this.ctx.shadowBlur = 20;
                this.ctx.shadowColor = color;
            }

            // Draw bar
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(adjustedBarX, barY, adjustedBarWidth, barHeight);

            this.ctx.shadowBlur = 0;

            // Glossy overlay
            const glossGradient = this.ctx.createLinearGradient(adjustedBarX, barY, adjustedBarX, this.height - padding);
            glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            glossGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
            glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            this.ctx.fillStyle = glossGradient;
            this.ctx.fillRect(adjustedBarX, barY, adjustedBarWidth / 2, barHeight);

            // Draw border
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = isHovered ? 3 : 2;
            this.ctx.strokeRect(adjustedBarX, barY, adjustedBarWidth, barHeight);

            // Draw percentage on bar
            if (barHeight > 30) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = `bold ${isMobile ? 11 : 14}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(
                    `${Math.round(skill.level * this.animationProgress)}%`,
                    barX + barWidth / 2,
                    barY + (isMobile ? 15 : 20)
                );
            }

            // Draw skill name - rotated to prevent overlap
            this.ctx.save();
            const labelY = this.height - padding + (isMobile ? 20 : 25);
            const labelX = barX + barWidth / 2;

            this.ctx.translate(labelX, labelY);
            this.ctx.rotate(-Math.PI / 4); // Rotate 45 degrees counter-clockwise

            this.ctx.fillStyle = isHovered ? color : '#e2e8f0';
            this.ctx.font = isHovered ? `bold ${isMobile ? 10 : 12}px sans-serif` : `${isMobile ? 10 : 12}px sans-serif`;
            this.ctx.textAlign = 'right';
            this.ctx.fillText(skill.name, 0, 0);
            this.ctx.restore();
        });
    }

    renderTooltip(index) {
        const skill = this.skills[index];
        const percentage = Math.round(skill.level * this.animationProgress);
        const tooltipText = `${skill.name}`;
        const percentText = `${percentage}%`;
        const experienceText = this.getExperienceLabel(percentage);

        this.ctx.font = 'bold 15px sans-serif';
        const titleWidth = this.ctx.measureText(tooltipText).width;
        this.ctx.font = '13px sans-serif';
        const expWidth = this.ctx.measureText(experienceText).width;
        const maxWidth = Math.max(titleWidth, expWidth);

        const tooltipWidth = maxWidth + 40;
        const tooltipHeight = 75;

        const tooltipX = (this.width - tooltipWidth) / 2;
        const tooltipY = 10;

        // Draw shadow
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowOffsetY = 5;

        // Draw background
        const bgGradient = this.ctx.createLinearGradient(
            tooltipX, tooltipY,
            tooltipX, tooltipY + tooltipHeight
        );
        bgGradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
        bgGradient.addColorStop(1, 'rgba(30, 41, 59, 0.95)');

        this.ctx.fillStyle = bgGradient;
        this.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 10);
        this.ctx.fill();

        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;

        // Draw border
        const color = this.options.colors[index % this.options.colors.length];
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 10);
        this.ctx.stroke();

        // Draw text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 15px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(tooltipText, tooltipX + tooltipWidth / 2, tooltipY + 25);

        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 20px sans-serif';
        this.ctx.fillText(percentText, tooltipX + tooltipWidth / 2, tooltipY + 50);

        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText(experienceText, tooltipX + tooltipWidth / 2, tooltipY + 67);
    }

    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }

    getExperienceLabel(percentage) {
        if (percentage >= 90) return 'Expert';
        if (percentage >= 75) return 'Advanced';
        if (percentage >= 60) return 'Intermediate';
        if (percentage >= 40) return 'Proficient';
        return 'Beginner';
    }

    animate() {
        if (!this.options.animate || this.animationProgress >= 1) return;

        this.animationProgress += 0.02;
        this.render();

        if (this.animationProgress < 1) {
            requestAnimationFrame(() => this.animate());
        }
    }

    start() {
        if (this.options.animate) {
            this.animationProgress = 0;
            this.animate();
        } else {
            this.animationProgress = 1;
            this.render();
        }
    }
}

// Auto-expose to window
if (typeof window !== 'undefined') {
    window.SkillChart = SkillChart;
}
