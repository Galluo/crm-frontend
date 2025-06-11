// Notification Management Functions

let currentNotifications = [];

// Load and display notifications
async function loadNotifications() {
    try {
        showLoading(true);
        
        const notifications = await api.getNotifications();
        currentNotifications = notifications || [];
        
        displayNotifications(currentNotifications);
        
    } catch (error) {
        console.error('Failed to load notifications:', error);
        showToast('فشل في تحميل الإشعارات', 'error');
    } finally {
        showLoading(false);
    }
}

// Display notifications
function displayNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-bell-slash" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-muted); margin-bottom: 10px;">لا توجد إشعارات</h3>
                <p style="color: var(--text-muted);">ستظهر الإشعارات الجديدة هنا</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.is_read ? '' : 'unread'}" data-notification-id="${notification.id}">
            <div class="notification-header">
                <div>
                    <div class="notification-title">${escapeHtml(notification.title)}</div>
                    <div class="notification-time">${formatRelativeTime(notification.created_at)}</div>
                </div>
                <div class="notification-actions">
                    ${!notification.is_read ? `
                        <button class="btn btn-sm btn-secondary" onclick="markNotificationRead(${notification.id})" title="تمييز كمقروء">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="notification-message">${escapeHtml(notification.message)}</div>
            ${notification.related_task_id ? `
                <div class="notification-actions" style="margin-top: 15px;">
                    <button class="btn btn-sm btn-primary" onclick="viewRelatedTask(${notification.related_task_id})" title="عرض المهمة">
                        <i class="fas fa-eye"></i>
                        عرض المهمة
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Mark notification as read
async function markNotificationRead(notificationId) {
    try {
        await api.markNotificationRead(notificationId);
        
        // Update local notification
        const notification = currentNotifications.find(n => n.id === notificationId);
        if (notification) {
            notification.is_read = true;
        }
        
        // Update display
        displayNotifications(currentNotifications);
        
        // Update notification count
        await updateNotificationCount();
        
        showToast('تم تمييز الإشعار كمقروء', 'success');
        
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
        showToast('فشل في تمييز الإشعار كمقروء', 'error');
    }
}

// Mark all notifications as read
async function markAllNotificationsRead() {
    try {
        showLoading(true);
        
        await api.markAllNotificationsRead();
        
        // Update local notifications
        currentNotifications.forEach(notification => {
            notification.is_read = true;
        });
        
        // Update display
        displayNotifications(currentNotifications);
        
        // Update notification count
        await updateNotificationCount();
        
        showToast('تم تمييز جميع الإشعارات كمقروءة', 'success');
        
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        showToast('فشل في تمييز الإشعارات كمقروءة', 'error');
    } finally {
        showLoading(false);
    }
}

// Clear read notifications
async function clearReadNotifications() {
    const readCount = currentNotifications.filter(n => n.is_read).length;
    
    if (readCount === 0) {
        showToast('لا توجد إشعارات مقروءة للحذف', 'info');
        return;
    }
    
    confirmDialog(`هل أنت متأكد من حذف ${readCount} إشعار مقروء؟`, async () => {
        try {
            showLoading(true);
            
            await api.deleteReadNotifications();
            
            // Remove read notifications from local array
            currentNotifications = currentNotifications.filter(n => !n.is_read);
            
            // Update display
            displayNotifications(currentNotifications);
            
            showToast('تم حذف الإشعارات المقروءة بنجاح', 'success');
            
        } catch (error) {
            console.error('Failed to clear read notifications:', error);
            showToast('فشل في حذف الإشعارات المقروءة', 'error');
        } finally {
            showLoading(false);
        }
    });
}

// View related task
async function viewRelatedTask(taskId) {
    try {
        // Switch to tasks page
        showPage('tasks');
        
        // Wait a moment for the page to load
        setTimeout(async () => {
            // Load tasks and highlight the specific task
            await loadTasks();
            
            // Scroll to and highlight the task
            const taskRow = document.querySelector(`tr[data-task-id="${taskId}"]`);
            if (taskRow) {
                taskRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                taskRow.style.backgroundColor = 'var(--primary-bg-light)';
                
                // Remove highlight after 3 seconds
                setTimeout(() => {
                    taskRow.style.backgroundColor = '';
                }, 3000);
            }
        }, 100);
        
    } catch (error) {
        console.error('Failed to view related task:', error);
        showToast('فشل في عرض المهمة المرتبطة', 'error');
    }
}

// Auto-refresh notifications
function startNotificationRefresh() {
    // Refresh notifications every 60 seconds
    setInterval(async () => {
        try {
            await updateNotificationCount();
            
            // If we're on the notifications page, refresh the list
            const notificationsPage = document.getElementById('notifications-page');
            if (notificationsPage && notificationsPage.classList.contains('active')) {
                await loadNotifications();
            }
        } catch (error) {
            console.error('Failed to auto-refresh notifications:', error);
        }
    }, 60000); // 60 seconds
}

// Initialize notification management
document.addEventListener('DOMContentLoaded', function() {
    // Mark all as read button
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllNotificationsRead);
    }
    
    // Clear read notifications button
    const clearReadBtn = document.getElementById('clear-read-btn');
    if (clearReadBtn) {
        clearReadBtn.addEventListener('click', clearReadNotifications);
    }
    
    // Start auto-refresh when authenticated
    if (authManager && authManager.isAuthenticated) {
        startNotificationRefresh();
    }
});

// Make functions globally available
window.markNotificationRead = markNotificationRead;
window.viewRelatedTask = viewRelatedTask;

// Start notification refresh after authentication
document.addEventListener('DOMContentLoaded', function() {
    // Wait for auth to be ready
    const checkAuth = setInterval(() => {
        if (window.authManager && authManager.isAuthenticated) {
            startNotificationRefresh();
            clearInterval(checkAuth);
        }
    }, 1000);
});

