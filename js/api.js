// API Configuration
const API_BASE_URL = 'https://crm-backend-om3t.onrender.com/api';

// API Helper Functions
class API {
    constructor() {
        this.token = localStorage.getItem('access_token');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('access_token', token);
        } else {
            localStorage.removeItem('access_token');
        }
    }

    // Get authentication headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // Handle authentication errors
            if (response.status === 401) {
                this.setToken(null);
                window.location.reload();
                return null;
            }

            // Handle other errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            // Handle empty responses
            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint) {
        return this.request(endpoint, {
            method: 'GET'
        });
    }

    // POST request
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // Authentication methods
    async login(username, password) {
        const response = await this.post('/auth/login', {
            username,
            password
        });
        
        if (response && response.access_token) {
            this.setToken(response.access_token);
        }
        
        return response;
    }

    async logout() {
        try {
            await this.post('/auth/logout', {});
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.setToken(null);
        }
    }

    async getCurrentUser() {
        return this.get('/auth/me');
    }

    // User management methods
    async getUsers() {
        return this.get('/users');
    }

    async createUser(userData) {
        return this.post('/users', userData);
    }

    async updateUser(userId, userData) {
        return this.put(`/users/${userId}`, userData);
    }

    async deleteUser(userId) {
        return this.delete(`/users/${userId}`);
    }

    // Task management methods
    async getTasks(filters = {}) {
        const params = new URLSearchParams();
        
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                params.append(key, filters[key]);
            }
        });
        
        const queryString = params.toString();
        const endpoint = queryString ? `/tasks?${queryString}` : '/tasks';
        
        return this.get(endpoint);
    }

    async getTask(taskId) {
        return this.get(`/tasks/${taskId}`);
    }

    async createTask(taskData) {
        return this.post('/tasks', taskData);
    }

    async updateTask(taskId, taskData) {
        return this.put(`/tasks/${taskId}`, taskData);
    }

    async deleteTask(taskId) {
        return this.delete(`/tasks/${taskId}`);
    }

    // Notification methods
    async getNotifications(unreadOnly = false, limit = null) {
        const params = new URLSearchParams();
        
        if (unreadOnly) {
            params.append('unread_only', 'true');
        }
        
        if (limit) {
            params.append('limit', limit.toString());
        }
        
        const queryString = params.toString();
        const endpoint = queryString ? `/notifications?${queryString}` : '/notifications';
        
        return this.get(endpoint);
    }

    async getNotificationCount() {
        return this.get('/notifications/count');
    }

    async markNotificationRead(notificationId) {
        return this.put(`/notifications/${notificationId}/read`, {});
    }

    async markAllNotificationsRead() {
        return this.put('/notifications/mark-all-read', {});
    }

    async deleteReadNotifications() {
        return this.delete('/notifications/read');
    }

    // Reports and statistics methods
    async getTasksSummaryReport(startDate = null, endDate = null) {
        const params = new URLSearchParams();
        
        if (startDate) {
            params.append('start_date', startDate);
        }
        
        if (endDate) {
            params.append('end_date', endDate);
        }
        
        const queryString = params.toString();
        const endpoint = queryString ? `/reports/tasks-summary?${queryString}` : '/reports/tasks-summary';
        
        return this.get(endpoint);
    }

    async exportTasksSummaryCSV(startDate = null, endDate = null) {
        const params = new URLSearchParams();
        
        if (startDate) {
            params.append('start_date', startDate);
        }
        
        if (endDate) {
            params.append('end_date', endDate);
        }
        
        const queryString = params.toString();
        const endpoint = queryString ? `/reports/tasks-summary/csv?${queryString}` : '/reports/tasks-summary/csv';
        
        // Handle file download
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            headers: this.getHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Failed to export CSV');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `tasks_summary_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    }

    async getDashboardStats() {
        return this.get('/stats/dashboard');
    }

    async getTasksByStatus() {
        return this.get('/stats/tasks-by-status');
    }

    async getTasksByPriority() {
        return this.get('/stats/tasks-by-priority');
    }

    // Settings methods
    async getSettings() {
        return this.get('/settings');
    }

    async updateSettings(settings) {
        return this.put('/settings', settings);
    }

    async getSetting(key) {
        return this.get(`/settings/${key}`);
    }

    async updateSetting(key, value, description = null) {
        const data = { value };
        if (description) {
            data.description = description;
        }
        return this.put(`/settings/${key}`, data);
    }
}

// Create global API instance
window.api = new API();

