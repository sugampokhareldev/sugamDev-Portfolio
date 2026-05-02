// ===== Forms Module =====
// Handles form validation and submission

export class FormsHandler {
    constructor(api) {
        this.api = api;
        this.forms = new Map();
    }

    /**
     * Setup contact form
     */
    setupContactForm() {
        const form = document.getElementById('contactForm');
        if (!form) return;

        // Store form reference
        this.forms.set('contact', form);

        // Real-time validation
        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => {
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

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.validateForm(form)) {
                await this.submitContactForm(form);
            }
        });
    }

    /**
     * Validate entire form
     */
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

    /**
     * Validate single field
     */
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

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Show field error
     */
    showFieldError(field, message) {
        field.classList.add('error');

        let errorDiv = field.parentNode.querySelector('.form-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            field.parentNode.appendChild(errorDiv);
        }

        errorDiv.textContent = message;
        errorDiv.style.color = 'var(--danger)';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '0.25rem';
    }

    /**
     * Clear field error
     */
    clearFieldError(field) {
        field.classList.remove('error');
        const errorDiv = field.parentNode.querySelector('.form-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    /**
     * Submit contact form
     */
    async submitContactForm(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const result = await this.api.sendContactForm(data);

            // Success
            if (window.showToast) {
                window.showToast(result.message || 'Message sent successfully!', 'success');
            }
            form.reset();

            // Reset character counter
            const charCounter = document.getElementById('charCount');
            if (charCounter) {
                charCounter.textContent = '0';
                charCounter.style.color = 'var(--text-secondary)';
            }

        } catch (error) {
            if (window.showToast) {
                window.showToast(error.message || 'Failed to send message. Please try again.', 'error');
            }
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}
