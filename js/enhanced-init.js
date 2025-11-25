// ===== Main Integration Script =====
// Initializes all enhanced features

document.addEventListener('DOMContentLoaded', () => {
    console.log('Portfolio Enhanced Features Loading...');

    // Initialize GSAP Animations
    initializeAnimations();

    // Initialize Skill Charts
    initializeSkillCharts();

    // Initialize Enhanced PWA
    initializeServiceWorker();

    // Initialize other features after animations load
    setTimeout(() => {
        initializeCounters();
    }, 500);
});

/**
 * Initialize GSAP scroll animations
 */
function initializeAnimations() {
    // GSAP temporarily disabled - was causing button visibility issues
    console.log('GSAP animations disabled');
    /*
    if (typeof GSAPAnimations !== 'undefined' && typeof gsap !== 'undefined') {
        console.log('Initializing GSAP animations...');
        const animations = new GSAPAnimations();
        window.portfolioAnimations = animations;
    } else {
        console.warn('GSAP not loaded, animations disabled');
    }
    */
}

/**
 * Initialize skill visualization charts
 */
function initializeSkillCharts() {
    // Wait for skills section to be visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                createSkillCharts();
                observer.disconnect();
            }
        });
    }, { threshold: 0.2 });

    const skillsSection = document.getElementById('skills');
    if (skillsSection) {
        observer.observe(skillsSection);
    }
}

/**
 * Create skill visualization charts
 */
function createSkillCharts() {
    if (typeof SkillChart === 'undefined') {
        console.warn('SkillChart module not loaded');
        return;
    }

    // Add canvas elements for charts if they don't exist
    const skillsContainer = document.querySelector('.skills-grid');
    if (!skillsContainer) return;

    // Create enhanced chart container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'skill-chart-container';
    chartContainer.style.cssText = `
        grid-column: 1 / -1;
        margin-top: 3rem;
        padding: 3rem;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
        border-radius: 1.5rem;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    `;

    // Make responsive for mobile
    if (window.innerWidth < 768) {
        chartContainer.style.padding = '1.5rem';
        chartContainer.style.marginTop = '2rem';
    }

    const chartHeader = document.createElement('div');
    chartHeader.style.cssText = 'text-align: center; margin-bottom: 2.5rem;';

    const chartTitle = document.createElement('h3');
    chartTitle.textContent = '📊 Skill Proficiency Overview';
    chartTitle.style.cssText = `
        font-size: 1.75rem;
        font-weight: 700;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 0.5rem;
    `;

    const chartSubtitle = document.createElement('p');
    chartSubtitle.textContent = 'Hover over bars to see proficiency levels';
    chartSubtitle.style.cssText = `
        color: #94a3b8;
        font-size: 0.875rem;
        margin: 0;
    `;

    chartHeader.appendChild(chartTitle);
    chartHeader.appendChild(chartSubtitle);

    const canvas = document.createElement('canvas');
    canvas.id = 'skillChart';

    // Responsive height
    const canvasHeight = window.innerWidth < 768 ? '350px' : '450px';

    canvas.style.cssText = `
        width: 100%;
        height: ${canvasHeight};
        display: block;
        cursor: pointer;
    `;

    chartContainer.appendChild(chartHeader);
    chartContainer.appendChild(canvas);
    skillsContainer.appendChild(chartContainer);

    // Comprehensive skills data - customize to match your actual skills
    const skills = [
        { name: 'React', level: 92 },
        { name: 'JavaScript', level: 95 },
        { name: 'Node.js', level: 88 },
        { name: 'TypeScript', level: 85 },
        { name: 'MongoDB', level: 82 },
        { name: 'CSS/SCSS', level: 90 },
        { name: 'Git', level: 87 },
        { name: 'REST APIs', level: 91 }
    ];

    // Create the chart with enhanced colors
    const chart = new SkillChart('skillChart', skills, {
        type: 'bar',
        colors: [
            '#6366f1', // Indigo
            '#8b5cf6', // Purple
            '#06b6d4', // Cyan
            '#10b981', // Emerald
            '#f59e0b', // Amber
            '#ef4444', // Red
            '#ec4899', // Pink
            '#3b82f6'  // Blue
        ],
        animate: true,
        interactive: true
    });

    chart.start();
}

/**
 * Initialize enhanced service worker with better caching
 */
function initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration);

                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 Service Worker update found');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker available
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch(error => {
                console.error('❌ Service Worker registration failed:', error);
            });

        // Handle offline/online status
        window.addEventListener('online', () => {
            console.log('✅ Back online');
            showToast('You are back online!', 'success');
        });

        window.addEventListener('offline', () => {
            console.log('⚠️ Gone offline');
            showToast('You are offline. Some features may be unavailable.', 'warning');
        });
    }
}

/**
 * Show update notification
 */
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-glass);
        backdrop-filter: blur(20px);
        padding: 1rem 2rem;
        border-radius: 1rem;
        border: 1px solid var(--border-color);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        display: flex;
        gap: 1rem;
        align-items: center;
    `;

    notification.innerHTML = `
        <span style="color: var(--text-primary);">A new version is available!</span>
        <button onclick="location.reload()" style="
            padding: 0.5rem 1rem;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-weight: 600;
        ">Update</button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => notification.remove(), 10000);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const colors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: ${colors[type]};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;

    toast.textContent = message;
    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Initialize animated counters for stats
 */
function initializeCounters() {
    const stats = document.querySelectorAll('.stat-number');

    stats.forEach(stat => {
        const targetText = stat.textContent;
        const target = parseInt(targetText.replace(/\D/g, ''));
        const suffix = targetText.replace(/\d/g, '');

        if (target && window.portfolioAnimations) {
            window.portfolioAnimations.animateCounter(stat, target, suffix);
        }
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
