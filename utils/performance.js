/**
 * Performance Monitoring Utility
 * Tracks Core Web Vitals, errors, and API performance
 */

// Development mode check - set to false to disable all info logs
const isDev = false;

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            lcp: null,
            fid: null,
            cls: 0,
            apiCalls: {}
        };
        this.errors = [];
        this.init();
    }

    init() {
        if (typeof window === 'undefined') return;

        this.trackCoreWebVitals();
        this.trackErrors();
        this.trackPageLoad();

        if (isDev) console.log('[PerformanceMonitor] Initialized');
    }

    trackCoreWebVitals() {
        if (!('PerformanceObserver' in window)) {
            console.warn('[PerformanceMonitor] PerformanceObserver not supported');
            return;
        }

        try {
            // Largest Contentful Paint (LCP)
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.lcp = Math.round(lastEntry.renderTime || lastEntry.loadTime);

                if (this.metrics.lcp > 2500) {
                    console.warn(`[Performance] LCP is slow: ${this.metrics.lcp}ms (should be < 2500ms)`);
                } else if (isDev) {
                    console.log(`[Performance] LCP: ${this.metrics.lcp}ms ✓`);
                }
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

            // First Input Delay (FID)
            const fidObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    this.metrics.fid = Math.round(entry.processingStart - entry.startTime);

                    if (this.metrics.fid > 100) {
                        console.warn(`[Performance] FID is slow: ${this.metrics.fid}ms (should be < 100ms)`);
                    } else if (isDev) {
                        console.log(`[Performance] FID: ${this.metrics.fid}ms ✓`);
                    }
                });
            });
            fidObserver.observe({ type: 'first-input', buffered: true });

            // Cumulative Layout Shift (CLS) - Only log once
            let clsScore = 0;
            let clsLogged = false;
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsScore += entry.value;
                    }
                }
                this.metrics.cls = Math.round(clsScore * 1000) / 1000;

                // Only log warning once when threshold exceeded
                if (this.metrics.cls > 0.1 && !clsLogged) {
                    console.warn(`[Performance] CLS is high: ${this.metrics.cls} (should be < 0.1)`);
                    clsLogged = true;
                }
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });

        } catch (error) {
            console.error('[PerformanceMonitor] Error tracking Core Web Vitals:', error);
        }
    }

    trackErrors() {
        // JavaScript errors
        window.addEventListener('error', (event) => {
            const error = {
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString()
            };

            this.logError(error);
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            const error = {
                type: 'Unhandled Promise Rejection',
                reason: event.reason?.toString() || 'Unknown',
                timestamp: new Date().toISOString()
            };

            this.logError(error);
        });
    }

    trackPageLoad() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                const domContentLoadedTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;

                if (isDev) {
                    console.log(`[Performance] Page Load: ${pageLoadTime}ms`);
                    console.log(`[Performance] DOM Content Loaded: ${domContentLoadedTime}ms`);
                }

                this.metrics.pageLoad = pageLoadTime;
                this.metrics.domContentLoaded = domContentLoadedTime;
            }, 0);
        });
    }

    logError(error) {
        this.errors.push(error);
        console.error('[Error Logged]:', error);

        // Store in localStorage (keep last 50 errors)
        try {
            const storedErrors = JSON.parse(localStorage.getItem('portfolio_errors') || '[]');
            storedErrors.push(error);

            // Keep only last 50 errors to avoid storage bloat
            if (storedErrors.length > 50) {
                storedErrors.shift();
            }

            localStorage.setItem('portfolio_errors', JSON.stringify(storedErrors));
        } catch (e) {
            console.error('[PerformanceMonitor] Failed to store error:', e);
        }
    }

    trackAPICall(endpoint, startTime) {
        const duration = Math.round(performance.now() - startTime);

        if (!this.metrics.apiCalls[endpoint]) {
            this.metrics.apiCalls[endpoint] = [];
        }

        this.metrics.apiCalls[endpoint].push({
            duration,
            timestamp: Date.now()
        });

        // Log slow API calls
        if (duration > 1000) {
            console.warn(`[API] Slow response from ${endpoint}: ${duration}ms`);
        } else if (isDev) {
            console.log(`[API] ${endpoint}: ${duration}ms`);
        }

        return duration;
    }

    getMetrics() {
        return {
            coreWebVitals: {
                lcp: this.metrics.lcp,
                fid: this.metrics.fid,
                cls: this.metrics.cls
            },
            performance: {
                pageLoad: this.metrics.pageLoad,
                domContentLoaded: this.metrics.domContentLoaded
            },
            apiCalls: this.metrics.apiCalls,
            errors: this.errors,
            errorCount: this.errors.length
        };
    }

    getStoredErrors() {
        try {
            return JSON.parse(localStorage.getItem('portfolio_errors') || '[]');
        } catch {
            return [];
        }
    }

    clearStoredErrors() {
        try {
            localStorage.removeItem('portfolio_errors');
            this.errors = [];
            if (isDev) console.log('[PerformanceMonitor] Stored errors cleared');
        } catch (e) {
            console.error('[PerformanceMonitor] Failed to clear errors:', e);
        }
    }

    logMetricsToConsole() {
        if (!isDev) return;
        const metrics = this.getMetrics();
        console.group('[Performance Metrics Summary]');
        console.log('Core Web Vitals:', metrics.coreWebVitals);
        console.log('Performance:', metrics.performance);
        console.log('API Calls:', metrics.apiCalls);
        console.log('Error Count:', metrics.errorCount);
        console.groupEnd();
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}
