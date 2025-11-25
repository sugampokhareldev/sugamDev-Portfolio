/**
 * Enhanced Micro-Animations
 * Additional interactions and effects for the portfolio
 */

(function () {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        setupStaggeredAnimations();
        setupMagneticButtons();
        setupEnhancedForms();
    }

    /**
     * Staggered Animations for Lists
     */
    function setupStaggeredAnimations() {
        const staggerContainers = document.querySelectorAll('.about-features, .skill-tags, .project-tech');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const children = entry.target.children;
                    Array.from(children).forEach((child, index) => {
                        child.style.opacity = '0';
                        child.style.transform = 'translateY(20px)';
                        child.style.animation = `fadeInUp 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards`;
                        child.style.animationDelay = `${index * 0.1}s`;
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        staggerContainers.forEach(container => observer.observe(container));

        // Add keyframe animation
        if (!document.getElementById('stagger-animation')) {
            const style = document.createElement('style');
            style.id = 'stagger-animation';
            style.textContent = `
                @keyframes fadeInUp {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Magnetic Buttons (Desktop Only)
     */
    function setupMagneticButtons() {
        // Only on devices with fine pointer (desktop)
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        const magneticBtns = document.querySelectorAll('.btn-primary, .btn-secondary');

        magneticBtns.forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const deltaX = (x - centerX) / centerX * 8;
                const deltaY = (y - centerY) / centerY * 8;

                btn.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }

    /**
     * Enhanced Form Interactions
     */
    function setupEnhancedForms() {
        const formInputs = document.querySelectorAll('.form-group input, .form-group textarea');

        formInputs.forEach(input => {
            // Add focus lift effect
            input.addEventListener('focus', () => {
                const formGroup = input.closest('.form-group');
                if (formGroup) {
                    formGroup.classList.add('focused');
                }
            });

            input.addEventListener('blur', () => {
                const formGroup = input.closest('.form-group');
                if (formGroup && !input.value) {
                    formGroup.classList.remove('focused');
                }
            });

            // Check if input has value on load
            if (input.value) {
                const formGroup = input.closest('.form-group');
                if (formGroup) {
                    formGroup.classList.add('focused');
                }
            }
        });
    }

})();
