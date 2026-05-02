// ===== Error Handler Module =====
// Comprehensive error boundary and error handling system

export class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 50;
        this.setupGlobalHandlers();
    }

    /**
     * Setup global error handlers
     */
    setupGlobalHandlers() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.logError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                timestamp: new Date().toISOString()
            });

            // Show user-friendly message
            this.showErrorToast('An error occurred. We\'re working on it.');
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || event.reason,
                timestamp: new Date().toISOString()
            });

            // Show user-friendly message
            this.showErrorToast('A network error occurred. Please check your connection.');
        });

        // Handle resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.logError({
                    type: 'Resource Loading Error',
                    resource: event.target.src || event.target.href,
                    timestamp: new Date().toISOString()
                });
            }
        }, true);
    }

    /**
     * Log error to console and store
     */
    logError(errorData) {
        console.error('[Error Handler]', errorData);

        // Store error (limit to maxErrors)
        this.errors.push(errorData);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // In production, you could send to error tracking service
        if (this.shouldReportError(errorData)) {
            this.reportError(errorData);
        }
    }

    /**
     * Check if error should be reported to server
     */
    shouldReportError(errorData) {
        // Don't report in development
        if (window.location.hostname === 'localhost') {
            return false;
        }

        // Only report critical errors
        return errorData.type !== 'Resource Loading Error';
    }

    /**
     * Report error to server (placeholder)
     */
    async reportError(errorData) {
        try {
            // In production, send to error tracking service
            // await fetch('/api/log-error', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(errorData)
            // });
            console.log('Error would be reported in production:', errorData);
        } catch (err) {
            console.error('Failed to report error:', err);
        }
    }

    /**
     * Show error toast to user
     */
    showErrorToast(message) {
        // Use the global showToast function if available
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        } else {
            console.error(message);
        }
    }

    /**
     * Try/catch wrapper with error handling
     */
    async tryCatch(fn, errorMessage = 'An error occurred') {
        try {
            return await fn();
        } catch (error) {
            this.logError({
                type: 'Caught Error',
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            this.showErrorToast(errorMessage);
            throw error;
        }
    }

    /**
     * Get all stored errors
     */
    getErrors() {
        return this.errors;
    }

    /**
     * Clear error log
     */
    clearErrors() {
        this.errors = [];
    }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.errorHandler = errorHandler;
}
