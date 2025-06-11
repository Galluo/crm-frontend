// Main Application JavaScript

// Global variables
let currentUser = null;
let currentPage = 'dashboard';
let loadingCount = 0;

// Application initialization
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize the application
async function initializeApp() {
    try {
        // Check if user is logged in
        const token = localStorage.getItem('authToken');
        if (!token) {
            showLoginPage();
            return;
        }

        // Verify token and get user info
        const user = await getCurrentUser();
        if (!user) {
            showLoginPage();
            return;
        }

        currentUser = user;
        showMainApp();
        
        // Load initial data
        await loadDashboardData();
        
        // Setup periodic updates
        setupPeriodicUpdates();
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showLoginPage();
    }
}

// Show login page
function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.querySelector('.navbar').style.display = 'none';
    document.querySelector('.main-content').style.display = 'none';
    
    // Hide all other pages
    document.querySelectorAll('.page:not(#loginPage)').forEach(page => {
        page.classList.remove('active');
    });
}

// Show main application
function showMainApp() {
    document.getElementById('loginPage').classList.remove('active');
    document.querySelector('.navbar').style.display = 'flex';
    document.querySelector('.main-content').style.display = 'block';
    
    // Update user info in navbar
    document.getElementById('currentUserName').textContent = currentUser.full_name;
    
    // Show/hide admin features
    if (currentUser.role === 'admin' || currentUser.role === 'manager') {
        document.getElementById('usersNavLink').style.display = 'block';
    }
    
    // Setup navigation
    setupNavigation();
    
    // Show dashboard by default
    showPage('dashboard');
}

// Setup navigation
function setupNavigation() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.dataset.page;
            if (page) {
                showPage(page);
            }
        });
    });

    // User menu
    document.getElementById('userMenuBtn').addEventListener('click', () => {
        const menu = document.getElementById('userMenu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Language toggle
    document.getElementById('languageToggle').addEventListener('click', toggleLanguage);

    // Close user menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-user')) {
            document.getElementById('userMenu').style.display = 'none';
        }
    });
}

// Show specific page
function showPage(pageName) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    // Hide all pages
    document.querySelectorAll('.page:not(#loginPage)').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const targetPage = document.getElementById(`${pageName}Page`);
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = pageName;

        // Initialize page-specific functionality
        initializePage(pageName);
    }
}

// Initialize page-specific functionality
async function initializePage(pageName) {
    switch (pageName) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'customers':
            initCustomersPage();
            break;
        case 'products':
            initProductsPage();
            break;
        case 'orders':
            initOrdersPage();
            break;
        case 'tasks':
            initTasksPage();
            break;
        case 'users':
            if (currentUser.role === 'admin' || currentUser.role === 'manager') {
                initUsersPage();
            }
            break;
        case 'chat':
            initChatPage();
            break;
        case 'notifications':
            initNotificationsPage();
            break;
        case 'reports':
            initReportsPage();
            break;
        case 'settings':
            initSettingsPage();
            break;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading();
        
        const [stats, recentTasks, recentOrders] = await Promise.all([
            apiRequest('/api/dashboard/stats'),
            apiRequest('/api/dashboard/recent-tasks'),
            apiRequest('/api/dashboard/recent-orders')
        ]);

        // Update statistics
        updateDashboardStats(stats);
        
        // Update recent items
        updateRecentTasks(recentTasks.tasks || []);
        updateRecentOrders(recentOrders.orders || []);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('خطأ في تحميل بيانات لوحة التحكم', 'error');
    } finally {
        hideLoading();
    }
}

// Update dashboard statistics
function updateDashboardStats(stats) {
    document.getElementById('totalCustomers').textContent = stats.total_customers || 0;
    document.getElementById('totalProducts').textContent = stats.total_products || 0;
    document.getElementById('totalOrders').textContent = stats.total_orders || 0;
    document.getElementById('totalRevenue').textContent = formatCurrency(stats.total_revenue || 0);
    document.getElementById('pendingTasks').textContent = stats.pending_tasks || 0;
    document.getElementById('inProgressTasks').textContent = stats.in_progress_tasks || 0;
    document.getElementById('completedTasks').textContent = stats.completed_tasks || 0;
    document.getElementById('totalTasks').textContent = stats.total_tasks || 0;
}

// Update recent tasks
function updateRecentTasks(tasks) {
    const container = document.getElementById('recentTasks');
    container.innerHTML = '';

    if (tasks.length === 0) {
        container.innerHTML = '<p class="no-data">لا توجد مهام حديثة</p>';
        return;
    }

    tasks.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'recent-item';
        taskDiv.innerHTML = `
            <div class="item-content">
                <h4>${escapeHtml(task.title)}</h4>
                <p>${task.description ? escapeHtml(task.description.substring(0, 100)) + '...' : ''}</p>
                <div class="item-meta">
                    <span class="status-badge ${task.status}">${getTaskStatusText(task.status)}</span>
                    <span class="priority-badge ${task.priority}">${getTaskPriorityText(task.priority)}</span>
                    ${task.due_date ? `<span class="due-date">الاستحقاق: ${formatDate(task.due_date)}</span>` : ''}
                </div>
            </div>
        `;
        container.appendChild(taskDiv);
    });
}

// Update recent orders
function updateRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = '<p class="no-data">لا توجد طلبات حديثة</p>';
        return;
    }

    orders.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'recent-item';
        orderDiv.innerHTML = `
            <div class="item-content">
                <h4>طلب #${order.id}</h4>
                <p>العميل: ${escapeHtml(order.customer_name || 'غير محدد')}</p>
                <div class="item-meta">
                    <span class="status-badge ${getOrderStatusClass(order.status)}">${getOrderStatusText(order.status)}</span>
                    <span class="amount">${formatCurrency(order.total_amount || 0)}</span>
                    <span class="date">${formatDate(order.order_date)}</span>
                </div>
            </div>
        `;
        container.appendChild(orderDiv);
    });
}

// Setup periodic updates
function setupPeriodicUpdates() {
    // Update notifications every 30 seconds
    setInterval(async () => {
        try {
            await updateNotificationCount();
            
            // Check for low stock if on products page
            if (currentPage === 'products') {
                await checkLowStockProducts();
            }
        } catch (error) {
            console.error('Error in periodic update:', error);
        }
    }, 30000);

    // Update dashboard every 5 minutes
    setInterval(async () => {
        if (currentPage === 'dashboard') {
            await loadDashboardData();
        }
    }, 300000);
}

// Update notification count
async function updateNotificationCount() {
    try {
        const response = await apiRequest('/api/notifications/unread-count');
        const count = response.count || 0;
        
        const badge = document.getElementById('notificationCount');
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
        
    } catch (error) {
        console.error('Error updating notification count:', error);
    }
}

// Logout function
async function logout() {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error('Error during logout:', error);
    } finally {
        localStorage.removeItem('authToken');
        currentUser = null;
        
        // Stop chat polling
        if (typeof stopChatPolling === 'function') {
            stopChatPolling();
        }
        
        showLoginPage();
        showToast('تم تسجيل الخروج بنجاح', 'success');
    }
}

// Toggle language
function toggleLanguage() {
    const currentLang = document.body.dataset.lang || 'ar';
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    
    document.body.dataset.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    
    // Update button text
    document.getElementById('languageToggle').textContent = newLang === 'ar' ? 'English' : 'العربية';
    
    // Save preference
    localStorage.setItem('language', newLang);
    
    showToast(newLang === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language changed to English', 'success');
}

// Initialize settings page
function initSettingsPage() {
    loadSettings();
    setupSettingsEventListeners();
}

// Load settings
function loadSettings() {
    // Load saved settings
    const language = localStorage.getItem('language') || 'ar';
    const theme = localStorage.getItem('theme') || 'light';
    const companyName = localStorage.getItem('companyName') || '';
    const currency = localStorage.getItem('currency') || 'SAR';
    const lowStockThreshold = localStorage.getItem('lowStockThreshold') || '10';

    document.getElementById('languageSelect').value = language;
    document.getElementById('themeSelect').value = theme;
    document.getElementById('companyName').value = companyName;
    document.getElementById('currency').value = currency;
    document.getElementById('lowStockThreshold').value = lowStockThreshold;
}

// Setup settings event listeners
function setupSettingsEventListeners() {
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    
    // Theme change
    document.getElementById('themeSelect').addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });
    
    // Language change
    document.getElementById('languageSelect').addEventListener('change', (e) => {
        const newLang = e.target.value;
        document.body.dataset.lang = newLang;
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    });
}

// Save settings
function saveSettings() {
    const settings = {
        language: document.getElementById('languageSelect').value,
        theme: document.getElementById('themeSelect').value,
        companyName: document.getElementById('companyName').value,
        currency: document.getElementById('currency').value,
        lowStockThreshold: document.getElementById('lowStockThreshold').value
    };

    // Save to localStorage
    Object.keys(settings).forEach(key => {
        localStorage.setItem(key, settings[key]);
    });

    // Apply theme
    applyTheme(settings.theme);

    showToast('تم حفظ الإعدادات بنجاح', 'success');
}

// Apply theme
function applyTheme(theme) {
    document.body.className = document.body.className.replace(/theme-\w+/, `theme-${theme}`);
    localStorage.setItem('theme', theme);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    // Apply saved language
    const savedLang = localStorage.getItem('language') || 'ar';
    document.body.dataset.lang = savedLang;
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showToast('حدث خطأ غير متوقع', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showToast('حدث خطأ في الاتصال', 'error');
});

