// ===== API Module =====
// Handles all API calls and data fetching

export class PortfolioAPI {
    constructor() {
        this.baseURL = '';
        this.cache = new Map();
    }

    /**
     * Fetch with retry logic
     */
    async fetchWithRetry(url, options = {}, retries = 3) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            if (retries > 0) {
                console.log(`Retrying... (${4 - retries}/3)`);
                await new Promise(resolve =>
                    setTimeout(resolve, (4 - retries) * 1000)
                );
                return this.fetchWithRetry(url, options, retries - 1);
            }
            throw error;
        }
    }

    /**
     * Load portfolio data from server
     */
    async loadPortfolioData() {
        const cacheKey = 'portfolio-data';

        // Check cache first
        if (this.cache.has(cacheKey)) {
            console.log('Using cached portfolio data');
            return this.cache.get(cacheKey);
        }

        try {
            const data = await this.fetchWithRetry('/api/portfolio-data');
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Failed to load portfolio data:', error);
            throw error;
        }
    }

    /**
     * Send contact form
     */
    async sendContactForm(formData) {
        try {
            const response = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to send message');
            }

            return result;
        } catch (error) {
            console.error('Contact form error:', error);
            throw error;
        }
    }

    /**
     * Send chat message
     */
    async sendChatMessage(message, context = '') {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, context })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Chat error');
            }

            return result;
        } catch (error) {
            console.error('Chat error:', error);
            throw error;
        }
    }
}
