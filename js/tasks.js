// Task Management Functions

let currentTasks = [];
let currentFilters = {};

// Load and display tasks
async function loadTasks(filters = {}) {
    try {
        showLoading(true);
        
        const tasks = await api.getTasks(filters);
        currentTasks = tasks || [];
        currentFilters = filters;
        
        displayTasks(currentTasks);
        
    } catch (error) {
        console.error('Failed to load tasks:', error);
        showToast('فشل في تحميل المهام', 'error');
    } finally {
        showLoading(false);
    }
}

// Display tasks in table
function displayTasks(tasks) {
    const tbody = document.getElementById('tasks-table-body');
    if (!tbody) return;
    
    if (!tasks || tasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-tasks" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 15px;"></i>
                    <p style="color: var(--text-muted);">لا توجد مهام</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = tasks.map(task => `
        <tr data-task-id="${task.id}">
            <td>
                <div class="task-title">${escapeHtml(task.title)}</div>
                ${task.description ? `<div class="task-description" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;">${escapeHtml(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</div>` : ''}
            </td>
            <td>${task.assigned_to_name || 'غير محدد'}</td>
            <td>${getStatusBadge(task.status)}</td>
            <td>${getPriorityBadge(task.priority)}</td>
            <td>${task.due_date ? formatDate(task.due_date) : 'غير محدد'}</td>
            <td>
                <div class="task-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editTask(${task.id})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTask(${task.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Show add task modal
function showAddTaskModal() {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const title = document.getElementById('task-modal-title');
    
    if (modal && form && title) {
        title.textContent = 'إضافة مهمة جديدة';
        form.reset();
        document.getElementById('task-id').value = '';
        showModal('task-modal');
    }
}

// Edit task
async function editTask(taskId) {
    try {
        showLoading(true);
        
        const task = await api.getTask(taskId);
        
        if (task) {
            const modal = document.getElementById('task-modal');
            const form = document.getElementById('task-form');
            const title = document.getElementById('task-modal-title');
            
            if (modal && form && title) {
                title.textContent = 'تعديل المهمة';
                
                // Fill form with task data
                document.getElementById('task-id').value = task.id;
                document.getElementById('task-title').value = task.title || '';
                document.getElementById('task-description').value = task.description || '';
                document.getElementById('task-status').value = task.status || 'pending';
                document.getElementById('task-priority').value = task.priority || 'medium';
                document.getElementById('task-assigned-to').value = task.assigned_to || '';
                document.getElementById('task-due-date').value = task.due_date || '';
                
                showModal('task-modal');
            }
        }
    } catch (error) {
        console.error('Failed to load task for editing:', error);
        showToast('فشل في تحميل بيانات المهمة', 'error');
    } finally {
        showLoading(false);
    }
}

// Delete task
async function deleteTask(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    const taskTitle = task ? task.title : 'المهمة';
    
    confirmDialog(`هل أنت متأكد من حذف المهمة "${taskTitle}"؟`, async () => {
        try {
            showLoading(true);
            
            await api.deleteTask(taskId);
            
            showToast('تم حذف المهمة بنجاح', 'success');
            
            // Reload tasks
            await loadTasks(currentFilters);
            
            // Update dashboard stats
            await loadDashboardStats();
            
        } catch (error) {
            console.error('Failed to delete task:', error);
            showToast('فشل في حذف المهمة', 'error');
        } finally {
            showLoading(false);
        }
    });
}

// Save task (create or update)
async function saveTask(formData) {
    try {
        showLoading(true);
        
        const taskId = formData.get('id');
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            status: formData.get('status'),
            priority: formData.get('priority'),
            assigned_to: formData.get('assigned_to') || null,
            due_date: formData.get('due_date') || null
        };
        
        // Remove empty values
        Object.keys(taskData).forEach(key => {
            if (taskData[key] === '' || taskData[key] === null) {
                if (key !== 'assigned_to' && key !== 'due_date') {
                    delete taskData[key];
                }
            }
        });
        
        let result;
        if (taskId) {
            // Update existing task
            result = await api.updateTask(parseInt(taskId), taskData);
            showToast('تم تحديث المهمة بنجاح', 'success');
        } else {
            // Create new task
            result = await api.createTask(taskData);
            showToast('تم إضافة المهمة بنجاح', 'success');
        }
        
        // Hide modal
        hideModal('task-modal');
        
        // Reload tasks
        await loadTasks(currentFilters);
        
        // Update dashboard stats
        await loadDashboardStats();
        
        // Update notification count
        await updateNotificationCount();
        
        return result;
        
    } catch (error) {
        console.error('Failed to save task:', error);
        showToast(error.message || 'فشل في حفظ المهمة', 'error');
        throw error;
    } finally {
        showLoading(false);
    }
}

// Apply filters to tasks
async function applyTaskFilters() {
    const filters = {
        status: document.getElementById('status-filter').value,
        priority: document.getElementById('priority-filter').value,
        search: document.getElementById('search-input').value.trim()
    };
    
    // Remove empty filters
    Object.keys(filters).forEach(key => {
        if (!filters[key]) {
            delete filters[key];
        }
    });
    
    await loadTasks(filters);
}

// Reset task filters
async function resetTaskFilters() {
    document.getElementById('status-filter').value = '';
    document.getElementById('priority-filter').value = '';
    document.getElementById('search-input').value = '';
    
    await loadTasks();
}

// Initialize task management
document.addEventListener('DOMContentLoaded', function() {
    // Add task button
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', showAddTaskModal);
    }
    
    // Task form submission
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            // Validate required fields
            const title = formData.get('title').trim();
            if (!title) {
                showToast('عنوان المهمة مطلوب', 'error');
                return;
            }
            
            try {
                await saveTask(formData);
            } catch (error) {
                // Error already handled in saveTask
            }
        });
    }
    
    // Modal close handlers
    const modalCloseButtons = document.querySelectorAll('.modal-close, .modal-cancel');
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });
    
    // Close modal when clicking outside
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideModal(this.id);
            }
        });
    });
    
    // Filter handlers
    const statusFilter = document.getElementById('status-filter');
    const priorityFilter = document.getElementById('priority-filter');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const resetBtn = document.getElementById('reset-filters-btn');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyTaskFilters);
    }
    
    if (priorityFilter) {
        priorityFilter.addEventListener('change', applyTaskFilters);
    }
    
    if (searchInput) {
        // Debounced search
        const debouncedSearch = debounce(applyTaskFilters, 500);
        searchInput.addEventListener('input', debouncedSearch);
        
        // Search on Enter key
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyTaskFilters();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', applyTaskFilters);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetTaskFilters);
    }
});

// Make functions globally available
window.editTask = editTask;
window.deleteTask = deleteTask;

