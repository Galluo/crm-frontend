// Utility Functions

// Show/Hide loading spinner
function showLoading(show = true) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// Show toast notification
function showToast(message, type = 'info', title = null, duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="toast-icon ${iconMap[type] || iconMap.info}"></i>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    // Add close functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

// Remove toast notification
function removeToast(toast) {
    if (toast && toast.parentNode) {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            toast.parentNode.removeChild(toast);
        }, 300);
    }
}

// Format date for display
function formatDate(dateString, includeTime = false) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('ar-SA', options);
}

// Format relative time (e.g., "منذ ساعتين")
function formatRelativeTime(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    
    return formatDate(dateString);
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusMap = {
        pending: 'معلقة',
        in_progress: 'قيد التنفيذ',
        completed: 'مكتملة',
        on_hold: 'معلقة مؤقتاً'
    };
    
    return `<span class="status-badge status-${status}">${statusMap[status] || status}</span>`;
}

// Get priority badge HTML
function getPriorityBadge(priority) {
    const priorityMap = {
        low: 'منخفضة',
        medium: 'متوسطة',
        high: 'عالية',
        urgent: 'عاجلة'
    };
    
    return `<span class="priority-badge priority-${priority}">${priorityMap[priority] || priority}</span>`;
}

// Show/Hide page
function showPage(pageId) {
    // Hide all content pages
    const pages = document.querySelectorAll('.content-page');
    pages.forEach(page => page.classList.remove('active'));
    
    // Show selected page
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });
    
    // Load page-specific data
    loadPageData(pageId);
}

// Load data for specific page
async function loadPageData(pageId) {
    try {
        switch (pageId) {
            case 'dashboard':
                await loadDashboardStats();
                await loadRecentTasks();
                break;
            case 'tasks':
                await loadTasks();
                break;
            case 'notifications':
                await loadNotifications();
                break;
            case 'reports':
                await loadReportsData();
                break;
            case 'settings':
                await loadSettings();
                break;
        }
    } catch (error) {
        console.error(`Failed to load data for ${pageId}:`, error);
        showToast(`فشل في تحميل بيانات ${pageId}`, 'error');
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const stats = await api.getDashboardStats();
        
        if (stats) {
            document.getElementById('total-tasks').textContent = stats.total_tasks || 0;
            document.getElementById('completed-tasks').textContent = stats.completed_tasks || 0;
            document.getElementById('pending-tasks').textContent = stats.pending_tasks || 0;
            document.getElementById('overdue-tasks').textContent = stats.overdue_tasks || 0;
        }
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

// Load recent tasks for dashboard
async function loadRecentTasks() {
    try {
        const tasks = await api.getTasks({ limit: 5 });
        const container = document.getElementById('recent-tasks-list');
        
        if (!container) return;
        
        if (!tasks || tasks.length === 0) {
            container.innerHTML = '<p class="text-muted">لا توجد مهام حديثة</p>';
            return;
        }
        
        container.innerHTML = tasks.map(task => `
            <div class="task-item">
                <div class="task-header">
                    <div>
                        <div class="task-title">${escapeHtml(task.title)}</div>
                        <div class="task-meta">
                            ${getStatusBadge(task.status)}
                            ${getPriorityBadge(task.priority)}
                            ${task.due_date ? `<span>الاستحقاق: ${formatDate(task.due_date)}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load recent tasks:', error);
    }
}

// Update notification count
async function updateNotificationCount() {
    try {
        const response = await api.getNotificationCount();
        const badge = document.getElementById('notification-badge');
        
        if (badge && response) {
            badge.textContent = response.count || 0;
            badge.style.display = response.count > 0 ? 'inline' : 'none';
        }
    } catch (error) {
        console.error('Failed to update notification count:', error);
    }
}

// Load users for dropdowns
async function loadUsersForDropdowns() {
    try {
        const users = await api.getUsers();
        const dropdown = document.getElementById('task-assigned-to');
        
        if (dropdown && users) {
            // Clear existing options except the first one
            dropdown.innerHTML = '<option value="">غير محدد</option>';
            
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.full_name || user.username;
                dropdown.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Confirm dialog
function confirmDialog(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Modal management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Language and theme management
function toggleLanguage() {
    const body = document.body;
    const isArabic = body.getAttribute('dir') === 'rtl';
    
    if (isArabic) {
        body.setAttribute('dir', 'ltr');
        body.classList.add('lang-en');
        localStorage.setItem('language', 'en');
    } else {
        body.setAttribute('dir', 'rtl');
        body.classList.remove('lang-en');
        localStorage.setItem('language', 'ar');
    }
    
    // Update language toggle button
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.innerHTML = isArabic ? 
            '<i class="fas fa-globe"></i> العربية' : 
            '<i class="fas fa-globe"></i> English';
    }
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('theme-dark');
    
    if (isDark) {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
        localStorage.setItem('theme', 'dark');
    }
}

// Initialize theme and language from localStorage
function initializePreferences() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedLanguage = localStorage.getItem('language') || 'ar';
    
    // Apply theme
    document.body.className = `theme-${savedTheme}`;
    
    // Apply language
    if (savedLanguage === 'en') {
        document.body.setAttribute('dir', 'ltr');
        document.body.classList.add('lang-en');
    } else {
        document.body.setAttribute('dir', 'rtl');
        document.body.classList.remove('lang-en');
    }
    
    // Update language toggle button
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.innerHTML = savedLanguage === 'ar' ? 
            '<i class="fas fa-globe"></i> English' : 
            '<i class="fas fa-globe"></i> العربية';
    }
}

// Initialize preferences on page load
document.addEventListener('DOMContentLoaded', function() {
    initializePreferences();
    
    // Language toggle handler
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.addEventListener('click', toggleLanguage);
    }
});

// Navigation handler
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.dataset.page;
            if (pageId) {
                showPage(pageId);
            }
        });
    });
});

