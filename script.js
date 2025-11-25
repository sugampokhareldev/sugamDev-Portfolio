// Enhanced Portfolio Application
class Portfolio {
    constructor() {
        this.isInitialized = false;
        this.portfolioData = null; // Store fetched data
        this.currentSection = 'home'; // Track current section for chat context

        // Initialize performance monitoring
        if (typeof PerformanceMonitor !== 'undefined') {
            this.performanceMonitor = new PerformanceMonitor();
            // Expose to window for easy console access
            window.portfolioPerformance = this.performanceMonitor;
        }

        this.init();
    }

    init() {
        if (this.isInitialized) return;

        // Setup core UI elements first
        this.setupTheme();
        this.setupNavigation();
        this.setupScrollEffects();
        this.setupBackToTop();
        this.setupCursorTrail();
        this.setupPageLoader();
        this.setupTypingEffect();
        this.setupPWAInstall();
        this.setupOfflineDetection(); // Monitor connection status
        this.setupChatWidget();
        this.setupIntersectionObserver(); // Initialize observer for static elements
        this.setupErrorHandling();
        this.setupContactForm(); // Contact form is static, can be setup early

        // Load dynamic content
        this.loadPortfolioData();

        this.isInitialized = true;
        // console.log('Portfolio initialized successfully');
    }

    // --- NEW: Load and Render Dynamic Content with Retry Logic ---
    async loadPortfolioData() {
        const MAX_RETRIES = 3;
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            try {
                const apiStartTime = performance.now();
                const response = await fetch('/api/portfolio-data');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                this.portfolioData = await response.json();

                // Track API performance
                if (this.performanceMonitor) {
                    this.performanceMonitor.trackAPICall('/api/portfolio-data', apiStartTime);
                }

                // Once data is loaded successfully, render dynamic sections
                this.renderHeroStats();
                this.renderAbout();
                this.renderSkills();
                this.renderProjects();

                // Success - exit retry loop
                return;

            } catch (error) {
                attempt++;
                console.error(`Load attempt ${attempt}/${MAX_RETRIES} failed:`, error);

                if (attempt >= MAX_RETRIES) {
                    // All retries exhausted - show error and render fallbacks
                    console.error('All retry attempts failed');
                    this.showToast(
                        'Unable to load portfolio content. Showing cached version.',
                        'warning'
                    );
                    // Render fallback content
                    this.renderHeroStats(true);
                    this.renderAbout(true);
                    this.renderSkills(true);
                    this.renderProjects(true);
                } else {
                    // Wait before retrying (exponential backoff: 1s, 2s, 4s)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        // Always initialize animations (even if content load failed)
        this.setupDynamicAnimations();
    }

    renderHeroStats(error = false) {
        const container = document.getElementById('hero-stats-container');
        if (!container) return;

        let content;
        if (error || !this.portfolioData) {
            content = `
                <div class="stat"><div class="stat-number">?</div><div class="stat-label">Projects</div></div>
                <div class="stat"><div class="stat-number">?</div><div class="stat-label">Years Exp</div></div>
                <div class="stat"><div class="stat-number">?</div><div class="stat-label">Technologies</div></div>
            `;
        } else {
            // Use explicit stats from server if available, otherwise fallback to calculation
            const stats = this.portfolioData.about?.stats || {};

            const projectCount = stats.projectsCompleted || this.portfolioData.projects.length;
            const yearsExp = stats.yearsExperience || (new Date().getFullYear() - 2020);

            // Calculate tech count if not provided
            let techCount = stats.technologiesMastered;
            if (!techCount && this.portfolioData.skills) {
                techCount = this.portfolioData.skills.reduce((acc, cat) => acc + cat.proficient.length + cat.familiar.length, 0);
            }

            content = `
                <div class="stat">
                    <div class="stat-number" data-count="${projectCount}" data-suffix="+">${projectCount}+</div>
                    <div class="stat-label">Projects</div>
                </div>
                <div class="stat">
                    <div class="stat-number" data-count="${yearsExp}" data-suffix="+">${yearsExp}+</div>
                    <div class="stat-label">Years Exp</div>
                </div>
                <div class="stat">
                    <div class="stat-number" data-count="${techCount}" data-suffix="+">${techCount}+</div>
                    <div class="stat-label">Technologies</div>
                </div>
            `;
        }
        container.classList.add('content-loaded');
        container.innerHTML = content;
    }

    renderAbout(error = false) {
        const textContainer = document.getElementById('about-text-container');
        const featuresContainer = document.getElementById('about-features-container');

        if (textContainer) {
            let textContent;
            if (error || !this.portfolioData) {
                textContent = `<h3>Hello! I'm Sugam</h3><p>Error loading summary. Please check your connection and try again.</p>`;
            } else {
                textContent = `
                    <h3>Hello! I'm Sugam</h3>
                    ${this.portfolioData.about.summary.map(p => `<p>${p}</p>`).join('')}
                `;
            }
            textContainer.classList.add('content-loaded');
            textContainer.innerHTML = textContent;
        }

        if (featuresContainer) {
            let featuresContent;
            if (error || !this.portfolioData) {
                featuresContent = `
                    <div class="feature">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div><h4>Error</h4><p>Could not load features.</p></div>
                    </div>
                `;
            } else {
                featuresContent = this.portfolioData.about.features.map(feature => `
                    <div class="feature">
                        <i class="fas ${feature.icon}"></i>
                        <div>
                            <h4>${feature.title}</h4>
                            <p>${feature.text}</p>
                        </div>
                    </div>
                `).join('');
            }
            featuresContainer.classList.add('content-loaded');
            featuresContainer.innerHTML = featuresContent;
        }
    }

    renderSkills(error = false) {
        const container = document.getElementById('skills-container');
        if (!container) return;

        let content;
        if (error || !this.portfolioData) {
            content = `<div class="skill-category"><h3 class="category-title"><i class="fas fa-exclamation-triangle"></i> Error Loading Skills</h3></div>`;
        } else {
            // Helper to get icon for skill
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
                    'Database': 'fas fa-database',
                    'MongoDB': 'fab fa-envira',
                    'TypeScript': 'fas fa-code',
                    'Tailwind CSS': 'fas fa-wind',
                    'Express.js': 'fas fa-server',
                    'Vue.js': 'fab fa-vuejs',
                    'Rust': 'fab fa-rust',
                    'GraphQL': 'fas fa-project-diagram',
                    'REST APIs': 'fas fa-network-wired',
                    'CI/CD': 'fas fa-sync-alt',
                    'AI/ML': 'fas fa-brain',
                    'VS Code': 'fas fa-code'
                };

                // Simple fuzzy match
                for (const key in icons) {
                    if (skill.includes(key)) return icons[key];
                }

                // Default
                return 'fas fa-code';
            };

            content = this.portfolioData.skills.map(category => `
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
                                </span>`).join('')}
                        </div>
                    </div>
                    <div class="proficiency-group">
                        <h4 class="proficiency-label">Familiar</h4>
                        <div class="skill-tags">
                            ${category.familiar.map(skill => `
                                <span class="skill-tag skill-tag-familiar">
                                    <i class="${getSkillIcon(skill)}"></i>
                                    ${skill}
                                </span>`).join('')}
                        </div>
                    </div>
                </div>
            `).join('');
        }
        container.classList.add('content-loaded');
        container.innerHTML = content;
    }

    renderProjects(error = false) {
        const container = document.getElementById('projects-container');
        if (!container) return;

        let content;
        if (error || !this.portfolioData) {
            content = `<p>Error loading projects. Please try again later.</p>`;
        } else {
            const projectCards = this.portfolioData.projects.map(project => `
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

            // Duplicate the cards twice for seamless infinite loop
            content = `
                <div class="projects-track">
                    ${projectCards}
                    ${projectCards}
                </div>
            `;
        }
        container.classList.add('content-loaded');
        container.innerHTML = content;
    }

    // --- NEW: Setup animations that depend on dynamic content ---
    setupDynamicAnimations() {
        // These must run AFTER dynamic content is rendered
        this.animateStats();

        this.setupTiltEffect();

        // Re-initialize intersection observer for new dynamic elements
        this.setupIntersectionObserver();
    }


    // Enhanced Chat Widget (Unchanged)
    setupChatWidget() {
        const chatToggle = document.getElementById('chatToggle');
        const chatWindow = document.getElementById('chatWindow');
        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');
        const chatMessages = document.getElementById('chatMessages');
        const typingIndicator = document.getElementById('typingIndicator');

        // Debug: Log chat widget setup
        // console.log('Chat Widget Setup:', {
        //     chatToggle: !!chatToggle,
        //     chatWindow: !!chatWindow,
        //     chatForm: !!chatForm,
        //     chatInput: !!chatInput,
        //     chatMessages: !!chatMessages,
        //     typingIndicator: !!typingIndicator
        // });

        if (!chatToggle || !chatWindow || !chatForm) {
            console.error('Chat widget elements missing!');
            return;
        }

        // Add initial greeting from portfolioData
        const greeting = this.portfolioData?.ui?.chatGreeting || "Hi! I'm Sugam's AI assistant. Ask me anything about his skills, projects, or experience!";
        const greetingDiv = document.createElement('div');
        greetingDiv.className = 'message bot';
        greetingDiv.textContent = greeting;
        chatMessages.insertBefore(greetingDiv, chatMessages.firstChild);

        // Toggle Chat
        chatToggle.addEventListener('click', () => {
            chatToggle.classList.toggle('active');
            chatWindow.classList.toggle('active');
            if (chatWindow.classList.contains('active')) {
                setTimeout(() => chatInput.focus(), 300);
            }
        });

        // Send Message
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // console.log('Chat form submitted!');
            const message = chatInput.value.trim();
            if (!message) return;

            // Add User Message
            this.addMessage(message, 'user');
            chatInput.value = '';

            // Show Typing Indicator
            if (typingIndicator) {
                typingIndicator.classList.add('active');
            }
            chatMessages.scrollTop = chatMessages.scrollHeight;

            try {
                // --- UPDATED to use real /api/chat endpoint ---
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message,
                        context: this.currentSection // Pass the current section as context
                    })
                });

                const data = await response.json();

                // Hide Typing Indicator
                if (typingIndicator) {
                    typingIndicator.classList.remove('active');
                }

                if (data.success) {
                    this.addMessage(data.message, 'bot');
                } else {
                    this.addMessage(data.message || 'Sorry, I encountered an error.', 'bot');
                }
            } catch (error) {
                console.error('Chat Error:', error);
                if (typingIndicator) {
                    typingIndicator.classList.remove('active');
                }
                this.addMessage('Network error. Please check your connection.', 'bot');
            }
        });
    }

    addMessage(text, sender) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        // Convert simple markdown to HTML (bold, italic, links)
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

        messageDiv.innerHTML = formattedText;

        // Insert before typing indicator
        const typingIndicator = document.getElementById('typingIndicator');
        chatMessages.insertBefore(messageDiv, typingIndicator);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Enhanced Theme System (Unchanged)
    setupTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('portfolio-theme') || (systemPrefersDark ? 'dark' : 'light');

        this.applyTheme(savedTheme);

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.applyTheme(newTheme);
            this.showToast(`Switched to ${newTheme} mode`, 'info');
        });

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('portfolio-theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                this.applyTheme(newTheme);
            }
        });
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('portfolio-theme', theme);
        this.updateThemeIcon(theme);
    }

    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // Enhanced Navigation (Unchanged)
    setupNavigation() {
        const nav = document.getElementById('mainNav');
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        const navLinks = document.querySelectorAll('.nav-link');
        const mobileMenuScrim = document.getElementById('mobileMenuScrim');

        // Scroll effect
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });

        // Mobile menu toggle
        const toggleMobileMenu = (isOpen) => {
            navToggle.classList.toggle('active', isOpen);
            navMenu.classList.toggle('active', isOpen);
            if (mobileMenuScrim) {
                mobileMenuScrim.classList.toggle('active', isOpen);
            }
            // Prevent body scroll when menu is open
            document.body.style.overflow = isOpen ? 'hidden' : '';
        };

        navToggle.addEventListener('click', () => {
            const isOpen = !navToggle.classList.contains('active');
            toggleMobileMenu(isOpen);
        });

        // Click outside to close (scrim click)
        if (mobileMenuScrim) {
            mobileMenuScrim.addEventListener('click', () => {
                toggleMobileMenu(false);
            });
        }

        // Close mobile menu on link click
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                toggleMobileMenu(false);
            });
        });

        // Active link highlighting
        this.setupActiveNavigation();
    }

    setupActiveNavigation() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('id');
                        navLinks.forEach(link => {
                            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                        });
                        this.currentSection = id; // Update current section
                    }
                });
            },
            {
                threshold: 0.2,
                rootMargin: '-100px 0px -40% 0px'
            }
        );

        sections.forEach(section => observer.observe(section));
    }

    // Enhanced Scroll Effects (Unchanged)
    setupScrollEffects() {
        // Parallax effect for hero shapes
        const handleScroll = this.debounce(() => {
            const scrolled = window.pageYOffset;
            const shapes = document.querySelectorAll('.shape');

            shapes.forEach((shape, index) => {
                const speed = 0.5 + (index * 0.1);
                const yPos = -(scrolled * speed);
                shape.style.transform = `translateY(${yPos}px) rotate(${scrolled * 0.05}deg)`;
            });
        }, 10);

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Enhanced Animations
    animateStats() {
        const stats = document.querySelectorAll('.stat-number');
        // console.log('Animating stats, found elements:', stats.length);
        if (stats.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const stat = entry.target;
                        const target = parseInt(stat.getAttribute('data-count'));
                        const suffix = stat.getAttribute('data-suffix') || '';
                        // console.log('Stat intersecting:', { target, suffix, stat });

                        if (!isNaN(target)) {
                            // Small delay to ensure visibility
                            setTimeout(() => {
                                this.animateValue(stat, 0, target, 2000, suffix);
                            }, 100);
                            observer.unobserve(stat);
                        }
                    }
                });
            },
            { threshold: 0.1 } // Lower threshold to ensure it triggers
        );

        stats.forEach(stat => observer.observe(stat));

        // Fallback: If observer doesn't trigger after 3 seconds, force show stats
        setTimeout(() => {
            // console.log('Checking fallback for stats...');
            stats.forEach(stat => {
                if (stat.textContent === '0') {
                    const target = stat.getAttribute('data-count');
                    const suffix = stat.getAttribute('data-suffix') || '';
                    // console.log('Fallback triggering for:', { target, suffix });
                    stat.textContent = target + suffix;
                }
            });
        }, 3000);
    }

    animateValue(element, start, end, duration, suffix = '') {
        // console.log('Starting animation:', { start, end, suffix });
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            element.textContent = value + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    setupIntersectionObserver() {
        if (!this.observer) {
            this.observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('active');
                            entry.target.classList.add('animate-in');
                            this.observer.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
            );
        }

        // Select all revealable elements, including dynamically added ones
        document.querySelectorAll('.reveal, .project-card, .skill-category, .feature').forEach(el => {
            this.observer.observe(el);
        });
    }

    // Enhanced Contact Form (Updated to use real endpoint)
    setupContactForm() {
        const form = document.getElementById('contactForm');
        if (!form) return;

        // Real-time validation
        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            input.addEventListener('input', () => {
                // Only validate if the field has already been marked as error
                if (input.classList.contains('error')) {
                    this.validateField(input);
                } else {
                    this.clearFieldError(input);
                }
            });
        });

        // Character counter
        const messageField = form.querySelector('#message');
        const charCounter = document.getElementById('charCount');
        if (messageField && charCounter) {
            messageField.addEventListener('input', () => {
                const length = messageField.value.length;
                charCounter.textContent = length;

                if (length > 2500) {
                    charCounter.style.color = 'var(--danger)';
                } else if (length > 2000) {
                    charCounter.style.color = 'var(--warning)';
                } else {
                    charCounter.style.color = 'var(--text-secondary)';
                }
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (this.validateForm(form)) {
                await this.submitForm(form);
            }
        });
    }

    validateForm(form) {
        let isValid = true;
        const inputs = form.querySelectorAll('input[required], textarea[required]');

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';

        this.clearFieldError(field);

        if (field.validity.valueMissing) {
            isValid = false;
            message = 'This field is required';
        } else if (field.type === 'email' && !this.isValidEmail(value)) {
            isValid = false;
            message = 'Please enter a valid email address';
        }

        if (!isValid) {
            this.showFieldError(field, message);
        }

        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showFieldError(field, message) {
        field.classList.add('error');

        // Create error message if it doesn't exist
        let errorDiv = field.parentNode.querySelector('.form-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            field.parentNode.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        // Simple style for error
        errorDiv.style.color = 'var(--danger)';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '0.25rem';
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorDiv = field.parentNode.querySelector('.form-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    async submitForm(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // --- UPDATED to use real /api/send endpoint ---
            const response = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // Success case
                this.showToast(result.message, 'success');
                form.reset();

                // Reset character counter
                const charCounter = document.getElementById('charCount');
                if (charCounter) {
                    charCounter.textContent = '0';
                    charCounter.style.color = 'var(--text-secondary)';
                }
            } else {
                // Error case
                throw new Error(result.message || 'Failed to send message.');
            }

        } catch (error) {
            console.error('Form Submission Error:', error);
            this.showToast(error.message || 'Failed to send message. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // Enhanced Back to Top (Unchanged)
    setupBackToTop() {
        const backToTop = document.getElementById('backToTop');

        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });

        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Enhanced Cursor Trail with Toggle (Unchanged)
    setupCursorTrail() {
        // Auto-disable on touch devices
        const isTouchDevice = !window.matchMedia('(pointer: fine)').matches;
        if (isTouchDevice) {
            const cursor = document.querySelector('.cursor-trail');
            if (cursor) {
                cursor.classList.add('disabled');
            }
            return;
        }

        const cursor = document.querySelector('.cursor-trail');
        const cursorToggle = document.getElementById('cursorTrailToggle');

        // Get saved preference (default: disabled)
        const savedPreference = localStorage.getItem('cursor-trail-enabled');
        let isEnabled = savedPreference === 'true';

        // Apply initial state
        this.updateCursorTrailState(isEnabled, cursor, cursorToggle);

        // Toggle button handler
        if (cursorToggle) {
            cursorToggle.addEventListener('click', () => {
                isEnabled = !isEnabled;
                localStorage.setItem('cursor-trail-enabled', isEnabled);
                this.updateCursorTrailState(isEnabled, cursor, cursorToggle);
                this.showToast(
                    `Cursor trail ${isEnabled ? 'enabled' : 'disabled'}`,
                    'info'
                );
            });
        }

        // Only setup animation if enabled
        if (isEnabled) {
            this.animateCursorTrail(cursor);
        }
    }

    updateCursorTrailState(isEnabled, cursor, toggleButton) {
        if (!cursor) return;

        if (isEnabled) {
            cursor.classList.remove('disabled');
            if (toggleButton) {
                toggleButton.classList.add('active');
            }
            this.animateCursorTrail(cursor);
        } else {
            cursor.classList.add('disabled');
            cursor.style.opacity = '0';
            if (toggleButton) {
                toggleButton.classList.remove('active');
            }
        }
    }

    animateCursorTrail(cursor) {
        if (!cursor || cursor.classList.contains('disabled')) return;

        let mouseX = 0, mouseY = 0;
        let trailX = 0, trailY = 0;

        const mouseMoveHandler = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!cursor.classList.contains('disabled')) {
                cursor.style.opacity = '1';
            }
        };

        const animate = () => {
            if (cursor.classList.contains('disabled')) return;

            trailX += (mouseX - trailX) * 0.1;
            trailY += (mouseY - trailY) * 0.1;

            cursor.style.left = trailX + 'px';
            cursor.style.top = trailY + 'px';

            requestAnimationFrame(animate);
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        animate();

        // Interactive elements
        const interactiveElements = document.querySelectorAll('a, button, .project-card, .nav-link');

        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                if (!cursor.classList.contains('disabled')) {
                    cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
                    cursor.style.background = 'var(--accent)';
                }
            });

            el.addEventListener('mouseleave', () => {
                if (!cursor.classList.contains('disabled')) {
                    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
                    cursor.style.background = 'var(--gradient-primary)';
                }
            });
        });

        document.addEventListener('mouseleave', () => {
            if (!cursor.classList.contains('disabled')) {
                cursor.style.opacity = '0';
            }
        });
    }

    // Enhanced Page Loader (Unchanged)
    setupPageLoader() {
        const loader = document.getElementById('pageLoader');
        const progressBar = document.getElementById('loaderProgress');
        const percentage = document.getElementById('loaderPercentage');
        const subtitle = document.getElementById('loaderSubtitle');

        // Prevent scroll during load
        document.body.classList.add('loading');

        // Loading messages to cycle through
        const messages = [
            'Preparing amazing experience...',
            'Loading components...',
            'Fetching portfolio data...',
            'Initializing animations...',
            'Almost there...'
        ];

        let progress = 0;
        let messageIndex = 0;

        // Animate progress bar
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) progress = 100;

            if (progressBar) progressBar.style.width = `${progress}%`;
            if (percentage) percentage.textContent = `${Math.round(progress)}%`;

            // Change message every 25%
            const newMessageIndex = Math.floor(progress / 25);
            if (newMessageIndex !== messageIndex && newMessageIndex < messages.length) {
                messageIndex = newMessageIndex;
                if (subtitle) subtitle.textContent = messages[messageIndex];
            }

            if (progress >= 100) {
                clearInterval(progressInterval);
            }
        }, 100);

        window.addEventListener('load', () => {
            // Ensure we hit 100%
            setTimeout(() => {
                if (progressBar) progressBar.style.width = '100%';
                if (percentage) percentage.textContent = '100%';
                if (subtitle) subtitle.textContent = 'Ready!';

                // Hide loader and restore scroll
                setTimeout(() => {
                    loader.classList.add('hidden');
                    document.body.classList.remove('loading');
                    clearInterval(progressInterval);
                    setTimeout(() => {
                        if (loader.parentNode) {
                            loader.remove();
                        }
                    }, 800);
                }, 500);
            }, 300);
        });

        // Fallback
        setTimeout(() => {
            if (loader && loader.parentNode && !loader.classList.contains('hidden')) {
                loader.classList.add('hidden');
                document.body.classList.remove('loading');
                clearInterval(progressInterval);
            }
        }, 8000);
    }

    // Enhanced 3D Tilt Effect
    setupTiltEffect() {
        // Must select dynamic cards
        const cards = document.querySelectorAll('#projects-container .tilt-card');

        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                if (!window.matchMedia('(hover: hover)').matches) return;

                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * 10;
                const rotateY = ((centerX - x) / centerX) * 10;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            });
        });
    }

    // Enhanced Typing Effect (Unchanged)
    setupTypingEffect() {
        const element = document.getElementById('typewriter-text');
        if (!element) return;

        // Get text from portfolioData if available, otherwise use fallback
        const text = this.portfolioData?.ui?.typewriterText || 'Digital Experiences,Innovative Solutions,Modern Products,Better Futures';
        const words = text.split(',').map(w => w.trim()).filter(w => w.length > 0);
        if (words.length === 0) return;

        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typeSpeed = 150;

        const type = () => {
            const currentWord = words[wordIndex];

            if (isDeleting) {
                element.textContent = currentWord.substring(0, charIndex - 1);
                charIndex--;
                typeSpeed = 50;
            } else {
                element.textContent = currentWord.substring(0, charIndex + 1);
                charIndex++;
                typeSpeed = 150;
            }

            if (!isDeleting && charIndex === currentWord.length) {
                typeSpeed = 2000;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                typeSpeed = 500;
            }

            setTimeout(type, typeSpeed);
        };

        type();
    }

    // Enhanced PWA Install (Unchanged)
    setupPWAInstall() {
        let deferredPrompt;
        const installBtn = document.getElementById('installApp');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.style.display = 'inline-flex';
            installBtn.classList.remove('hidden');
        });

        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;

            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                installBtn.style.display = 'none';
                this.showToast('App installed successfully!', 'success');
            }

            deferredPrompt = null;
        });

        window.addEventListener('appinstalled', () => {
            installBtn.style.display = 'none';
        });
    }

    setupOfflineDetection() {
        // Show notification when going offline
        window.addEventListener('offline', () => {
            // console.log('[App] Connection lost');
            this.showToast('You are now offline. Some features may not be available.', 'warning');
            document.body.classList.add('offline-mode');
        });

        // Show notification when coming back online
        window.addEventListener('online', () => {
            // console.log('[App] Connection restored');
            this.showToast('You are back online!', 'success');
            document.body.classList.remove('offline-mode');

            // Optionally refresh data if it wasn't loaded
            if (this.portfolioData === null) {
                this.loadPortfolioData();
            }
        });

        // Check initial state
        if (!navigator.onLine) {
            document.body.classList.add('offline-mode');
            // console.log('[App] Starting in offline mode');
        }
    }

    // Enhanced Error Handling (Unchanged)
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global Error:', event.error);
            this.trackError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled Promise Rejection:', event.reason);
            this.trackError(event.reason);
        });

        // Setup performance monitoring
        this.setupPerformanceMonitoring();

        // Setup image loading handlers
        this.setupImageLoading();
    }

    trackError(error) {
        // Error tracking for monitoring
        const errorData = {
            message: error?.message || String(error),
            stack: error?.stack,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        // console.log('Error tracked:', errorData);
        // In production, send to your error tracking service (e.g., Sentry)
    }

    setupPerformanceMonitoring() {
        // Track Largest Contentful Paint (LCP)
        try {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                // console.log('LCP:', lastEntry.startTime.toFixed(2) + 'ms');
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
            // LCP observer not supported
        }

        // Track Cumulative Layout Shift (CLS)
        try {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                // console.log('CLS:', clsValue.toFixed(4));
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
            // CLS observer not supported
        }
    }

    setupImageLoading() {
        const images = document.querySelectorAll('img[loading="lazy"]');

        images.forEach(img => {
            if (img.complete) {
                img.classList.add('loaded');
            } else {
                img.addEventListener('load', () => {
                    img.classList.add('loaded');
                });

                img.addEventListener('error', () => {
                    console.warn('Image failed to load:', img.src);
                    img.alt = 'Image not available';
                    img.classList.add('error');
                });
            }
        });
    }

    // Utility Functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Enhanced Toast System
    showToast(message, type = 'info') {
        const container = document.querySelector('.toast-container') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const icon = icons[type] || icons.info;

        toast.innerHTML = `
            <i class="fas ${icon} toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 5000);
    }

    createToastContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }
}

// Performance Optimizations
class PerformanceOptimizer {
    static init() {
        // Lazy loading is now handled by the browser `loading="lazy"` attribute
        // We will keep the intersection observer for lazy loading as a fallback
        this.lazyLoadImages();
        this.setupConnectionAwareLoading();
        this.optimizeAnimations();
    }

    static lazyLoadImages() {
        if ('loading' in HTMLImageElement.prototype) {
            // Modern browser support
            const images = document.querySelectorAll('img[loading="lazy"]');
            images.forEach(img => {
                img.addEventListener('load', () => {
                    img.classList.add('loaded');
                });
            });
        } else {
            // Fallback for older browsers
            this.lazyLoadFallback();
        }
    }

    static lazyLoadFallback() {
        // This will now also catch dynamically added images
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    // Ensure src is populated if data-src was used (though we use src directly)
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                    }
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    }

    static setupConnectionAwareLoading() {
        if (navigator.connection) {
            if (navigator.connection.saveData) {
                document.documentElement.classList.add('save-data');
            }

            if (navigator.connection.effectiveType && navigator.connection.effectiveType.includes('2g')) {
                document.documentElement.classList.add('slow-connection');
            }
        }
    }

    static optimizeAnimations() {
        // Reduce animations for users who prefer reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.classList.add('reduce-motion');
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize performance optimizations first
    PerformanceOptimizer.init();

    // Then initialize the main application
    const app = new Portfolio();

    // Observe dynamically added images for lazy loading fallback
    // This is a robust way to handle it
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.tagName === 'IMG' && node.hasAttribute('loading')) {
                    PerformanceOptimizer.lazyLoadFallback();
                } else if (node.nodeType === 1 && node.querySelector) {
                    const images = node.querySelectorAll('img[loading="lazy"]');
                    if (images.length > 0) {
                        PerformanceOptimizer.lazyLoadFallback();
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortfolioApp;
}