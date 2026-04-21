/**
 * API Client — Backend communication layer
 */

const API_BASE = '';

const Api = {
    /**
     * Generic fetch wrapper with error handling.
     */
    async request(endpoint, options = {}) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                headers: { 'Content-Type': 'application/json', ...options.headers },
                ...options,
            });
            const data = await res.json();
            if (!res.ok || data.status === 'error') {
                throw new Error(data.message || `Request failed (${res.status})`);
            }
            return data;
        } catch (err) {
            console.error(`API Error [${endpoint}]:`, err);
            throw err;
        }
    },

    /** Generate synthetic dataset */
    async generateData() {
        return this.request('/api/generate', { method: 'POST' });
    },

    /** Upload customer + transaction files */
    async uploadData(customerFile, transactionFile) {
        const form = new FormData();
        form.append('customers', customerFile);
        form.append('transactions', transactionFile);
        const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok || data.status === 'error') throw new Error(data.message || 'Upload failed');
        return data;
    },

    /** Get Elbow Method data */
    async getElbow() {
        return this.request('/api/elbow');
    },

    /** Run segmentation with given k */
    async runSegmentation(k) {
        return this.request('/api/segment', {
            method: 'POST',
            body: JSON.stringify({ k }),
        });
    },

    /** Get segment profiles */
    async getSegments() {
        return this.request('/api/segments');
    },

    /** Get customer list */
    async getCustomers() {
        return this.request('/api/customers');
    },

    /** Get demographic breakdown */
    async getDemographics() {
        return this.request('/api/demographics');
    },

    /** Get purchase patterns */
    async getPatterns() {
        return this.request('/api/patterns');
    },
};
