// ===== UI Rendering Module =====
// Handles all dynamic content rendering

export class PortfolioUI {
    constructor(portfolioData) {
        this.data = portfolioData;
    }

    /**
     * Render Hero Stats
     */
    renderHeroStats() {
        const container = document.getElementById('hero-stats-container');
        if (!container) return;

        const stats = this.data?.about?.stats || {};
        const projectCount = stats.projectsCompleted || this.data.projects.length;
        const yearsExp = stats.yearsExperience || (new Date().getFullYear() - 2020);

        let techCount = stats.technologiesMastered;
        if (!techCount && this.data.skills) {
            techCount = this.data.skills.reduce((acc, cat) =>
                acc + cat.proficient.length + cat.familiar.length, 0
            );
        }

        const content = `
            <div class="stat">
                <div class="stat-number" data-count="${projectCount}" data-suffix="+">0+</div>
                <div class="stat-label">Projects</div>
            </div>
            <div class="stat">
                <div class="stat-number" data-count="${yearsExp}" data-suffix="+">0+</div>
                <div class="stat-label">Years Exp</div>
            </div>
            <div class="stat">
                <div class="stat-number" data-count="${techCount}" data-suffix="+">0+</div>
                <div class="stat-label">Technologies</div>
            </div>
        `;

        container.classList.add('content-loaded');
        container.innerHTML = content;
    }

    /**
     * Render About Section  
     */
    renderAbout() {
        this.renderAboutText();
        this.renderAboutFeatures();
    }

    renderAboutText() {
        const container = document.getElementById('about-text-container');
        if (!container || !this.data) return;

        const content = `
            <h3>Hello! I'm Sugam</h3>
            ${this.data.about.summary.map(p => `<p>${p}</p>`).join('')}
        `;

        container.classList.add('content-loaded');
        container.innerHTML = content;
    }

    renderAboutFeatures() {
        const container = document.getElementById('about-features-container');
        if (!container || !this.data) return;

        const content = this.data.about.features.map(feature => `
            <div class="feature">
                <i class="fas ${feature.icon}"></i>
                <div>
                    <h4>${feature.title}</h4>
                    <p>${feature.text}</p>
                </div>
            </div>
        `).join('');

        container.classList.add('content-loaded');
        container.innerHTML = content;
    }

    /**
     * Render Skills
     */
    renderSkills() {
        const container = document.getElementById('skills-container');
        if (!container || !this.data) return;

        const getSkillIcon = (skill) => {
            const icons = {
                'React': 'fab fa-react',
                'JavaScript': 'fab fa-js',
                'Node.js': 'fab fa-node-js',
                'HTML5': 'fab fa-html5',
                'CSS3': 'fab fa-css3-alt',
                'Python': 'fab fa-python',
                'Git': 'fab fa-git-alt',
                'GitHub': 'fab fa-github',
                'Docker': 'fab fa-docker',
                'AWS': 'fab fa-aws',
                'MongoDB': 'fab fa-envira',
                'TypeScript': 'fas fa-code',
                'Tailwind CSS': 'fas fa-wind'
            };

            for (const key in icons) {
                if (skill.includes(key)) return icons[key];
            }
            return 'fas fa-code';
        };

        const content = this.data.skills.map(category => `
            <div class="skill-category">
                <h3 class="category-title">
                    <i class="fas ${category.icon}"></i>
                    ${category.category}
                </h3>
                <div class="proficiency-group">
                    <h4 class="proficiency-label">Proficient</h4>
                    <div class="skill-tags">
                        ${category.proficient.map(skill => `
                            <span class="skill-tag">
                                <i class="${getSkillIcon(skill)}"></i>
                                ${skill}
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div class="proficiency-group">
                    <h4 class="proficiency-label">Familiar</h4>
                    <div class="skill-tags">
                        ${category.familiar.map(skill => `
                            <span class="skill-tag skill-tag-familiar">
                                <i class="${getSkillIcon(skill)}"></i>
                                ${skill}
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        container.classList.add('content-loaded');
        container.innerHTML = content;
    }

    /**
     * Render Projects
     */
    renderProjects() {
        const container = document.getElementById('projects-container');
        if (!container || !this.data) return;

        const projectCards = this.data.projects.map(project => `
            <article class="project-card tilt-card" data-category="${project.category}">
                <div class="project-media">
                    <img src="${project.image}" alt="${project.title}" loading="lazy" width="400" height="250">
                    <div class="project-overlay">
                        <div class="project-links">
                            ${project.links.preview ? `
                            <a href="${project.links.preview}" class="project-link with-text" target="_blank" aria-label="Live Preview">
                                <i class="fas fa-external-link-alt"></i>
                                <span>Live Demo</span>
                            </a>` : ''}
                            ${project.links.github ? `
                            <a href="${project.links.github}" class="project-link with-text" target="_blank" aria-label="GitHub Repo">
                                <i class="fab fa-github"></i>
                                <span>Source Code</span>
                            </a>` : ''}
                        </div>
                    </div>
                </div>
                <div class="project-content">
                    <h3 class="project-title">${project.title}</h3>
                    <p class="project-description">${project.description}</p>
                    <div class="project-tech">
                        ${project.tech.map(tag => `<span class="tech-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </article>
        `).join('');

        // Duplicate for infinite scroll effect
        const content = `
            <div class="projects-track">
                ${projectCards}
                ${projectCards}
            </div>
        `;

        container.classList.add('content-loaded');
        container.innerHTML = content;
    }

    /**
     * Render all sections
     */
    renderAll() {
        this.renderHeroStats();
        this.renderAbout();
        this.renderSkills();
        this.renderProjects();
    }
}
