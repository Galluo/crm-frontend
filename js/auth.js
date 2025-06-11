// Authentication Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    // Check if user is authenticated
    async checkAuth() {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
            this.isAuthenticated = false;
            return false;
        }

        try {
            const response = await api.getCurrentUser();
            if (response && response.user) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                return true;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
        }

        this.isAuthenticated = false;
        return false;
    }

    // Login user
    async login(username, password) {
        try {
            showLoading(true);
            
            const response = await api.login(username, password);
            
            if (response && response.user) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                
                // Update UI with user info
                this.updateUserUI();
                
                // Show main app
                this.showMainApp();
                
                // Load initial data
                await this.loadInitialData();
                
                showToast('تم تسجيل الدخول بنجاح', 'success');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Login failed:', error);
            showToast(error.message || 'فشل في تسجيل الدخول', 'error');
            return false;
        } finally {
            showLoading(false);
        }
    }

    // Logout user
    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.currentUser = null;
            this.isAuthenticated = false;
            this.showLoginPage();
            showToast('تم تسجيل الخروج بنجاح', 'info');
        }
    }

    // Update user interface with current user info
    updateUserUI() {
        if (this.currentUser) {
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = this.currentUser.full_name || this.currentUser.username;
            }
        }
    }

    // Show login page
    showLoginPage() {
        document.getElementById('login-page').classList.add('active');
        document.getElementById('main-app').classList.remove('active');
        
        // Clear form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.reset();
        }
        
        // Hide error message
        const errorElement = document.getElementById('login-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    // Show main application
    showMainApp() {
        document.getElementById('login-page').classList.remove('active');
        document.getElementById('main-app').classList.add('active');
        
        // Show dashboard by default
        showPage('dashboard');
    }

    // Load initial data after login
    async loadInitialData() {
        try {
            // Load dashboard stats
            await loadDashboardStats();
            
            // Load notification count
            await updateNotificationCount();
            
            // Load users for dropdowns (if admin)
            if (this.currentUser && this.currentUser.role === 'admin') {
                await loadUsersForDropdowns();
            }
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    // Check if current user is admin
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
}

// Create global auth manager instance
window.authManager = new AuthManager();

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                showLoginError('يرجى إدخال اسم المستخدم وكلمة المرور');
                return;
            }
            
            const success = await authManager.login(username, password);
            
            if (!success) {
                showLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
            }
        });
    }
    
    // Logout button handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            authManager.logout();
        });
    }
    
    // User menu toggle
    const userMenuToggle = document.querySelector('.user-menu-toggle');
    const userMenu = document.querySelector('.user-menu');
    
    if (userMenuToggle && userMenu) {
        userMenuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenu.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function() {
            userMenu.classList.remove('active');
        });
    }
});

// Show login error message
function showLoginError(message) {
    const errorElement = document.getElementById('login-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', async function() {
    showLoading(true);
    
    try {
        const isAuthenticated = await authManager.checkAuth();
        
        if (isAuthenticated) {
            authManager.showMainApp();
            await authManager.loadInitialData();
        } else {
            authManager.showLoginPage();
        }
    } catch (error) {
        console.error('Auth initialization failed:', error);
        authManager.showLoginPage();
    } finally {
        showLoading(false);
    }
});

