// User Management Functions

let currentUserPage = 1;
let currentUserFilters = {};

// Initialize users page
function initUsersPage() {
    loadUsers();
    loadUserRoles();
    setupUserEventListeners();
}

// Setup event listeners for users
function setupUserEventListeners() {
    // Add user button
    document.getElementById('addUserBtn').addEventListener('click', () => {
        openUserModal();
    });

    // Search input
    document.getElementById('userSearch').addEventListener('input', debounce(() => {
        currentUserFilters.search = document.getElementById('userSearch').value;
        currentUserPage = 1;
        loadUsers();
    }, 300));

    // Role filter
    document.getElementById('roleFilter').addEventListener('change', () => {
        currentUserFilters.role = document.getElementById('roleFilter').value;
        currentUserPage = 1;
        loadUsers();
    });

    // Reset filters
    document.getElementById('resetUserFilters').addEventListener('click', () => {
        document.getElementById('userSearch').value = '';
        document.getElementById('roleFilter').value = '';
        currentUserFilters = {};
        currentUserPage = 1;
        loadUsers();
    });

    // User form submission
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);

    // Modal close events
    setupModalEvents('userModal');
}

// Load users from API
async function loadUsers() {
    try {
        showLoading();
        
        const params = new URLSearchParams({
            page: currentUserPage,
            per_page: 10,
            ...currentUserFilters
        });

        const response = await apiRequest(`/api/users?${params}`);
        
        if (response.users) {
            renderUsersTable(response.users);
            renderPagination('usersPagination', response.current_page, response.pages, (page) => {
                currentUserPage = page;
                loadUsers();
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('خطأ في تحميل المستخدمين', 'error');
    } finally {
        hideLoading();
    }
}

// Load user roles
async function loadUserRoles() {
    try {
        const response = await apiRequest('/api/users/roles');
        const roleFilter = document.getElementById('roleFilter');
        
        // Clear existing options except the first one
        const firstOption = roleFilter.querySelector('option');
        roleFilter.innerHTML = '';
        if (firstOption) {
            roleFilter.appendChild(firstOption);
        }
        
        response.roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.value;
            option.textContent = role.label;
            roleFilter.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading roles:', error);
    }
}

// Render users table
function renderUsersTable(users) {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        const statusClass = user.is_active ? 'active' : 'inactive';
        
        row.innerHTML = `
            <td>${escapeHtml(user.full_name)}</td>
            <td>${escapeHtml(user.username)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${getRoleText(user.role)}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${user.is_active ? 'نشط' : 'غير نشط'}
                </span>
            </td>
            <td>${user.assigned_tasks_count || 0}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewUser(${user.id})" title="عرض">
                        👁️
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="editUser(${user.id})" title="تعديل">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-info" onclick="viewUserTasks(${user.id})" title="المهام">
                        📋
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="assignTaskToUser(${user.id})" title="إسناد مهمة">
                        ➕
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})" title="حذف">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Get role text
function getRoleText(role) {
    const roleTexts = {
        'admin': 'مدير النظام',
        'manager': 'مدير',
        'sales': 'موظف مبيعات',
        'support': 'دعم فني',
        'employee': 'موظف'
    };
    return roleTexts[role] || role;
}

// Open user modal
function openUserModal(user = null) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('userModalTitle');
    const form = document.getElementById('userForm');
    const passwordField = document.getElementById('userPassword');

    if (user) {
        title.textContent = 'تعديل المستخدم';
        fillUserForm(user);
        form.dataset.userId = user.id;
        passwordField.required = false;
        passwordField.placeholder = 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية';
    } else {
        title.textContent = 'إضافة مستخدم جديد';
        form.reset();
        delete form.dataset.userId;
        passwordField.required = true;
        passwordField.placeholder = '';
    }

    showModal(modal);
}

// Fill user form with data
function fillUserForm(user) {
    document.getElementById('userUsername').value = user.username || '';
    document.getElementById('userFullName').value = user.full_name || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userRole').value = user.role || 'employee';
    document.getElementById('userActive').checked = user.is_active !== false;
}

// Handle user form submission
async function handleUserSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Convert checkbox to boolean
    data.is_active = formData.has('is_active');
    
    // Remove password if empty for updates
    if (form.dataset.userId && !data.password) {
        delete data.password;
    }
    
    try {
        showLoading();
        
        let response;
        if (form.dataset.userId) {
            // Update existing user
            response = await apiRequest(`/api/users/${form.dataset.userId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            // Create new user
            response = await apiRequest('/api/users', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        
        showToast(form.dataset.userId ? 'تم تحديث المستخدم بنجاح' : 'تم إضافة المستخدم بنجاح', 'success');
        hideModal('userModal');
        loadUsers();
        
    } catch (error) {
        console.error('Error saving user:', error);
        showToast('خطأ في حفظ المستخدم', 'error');
    } finally {
        hideLoading();
    }
}

// View user details
async function viewUser(userId) {
    try {
        const user = await apiRequest(`/api/users/${userId}`);
        
        const details = `
            <div class="user-details">
                <h3>${escapeHtml(user.full_name)}</h3>
                <p><strong>اسم المستخدم:</strong> ${escapeHtml(user.username)}</p>
                <p><strong>البريد الإلكتروني:</strong> ${escapeHtml(user.email)}</p>
                <p><strong>الدور:</strong> ${getRoleText(user.role)}</p>
                <p><strong>الحالة:</strong> ${user.is_active ? 'نشط' : 'غير نشط'}</p>
                <p><strong>المهام المسندة:</strong> ${user.assigned_tasks_count || 0}</p>
                <p><strong>تاريخ الإنشاء:</strong> ${formatDate(user.created_at)}</p>
                <p><strong>آخر تحديث:</strong> ${formatDate(user.updated_at)}</p>
            </div>
        `;
        
        showAlert('تفاصيل المستخدم', details);
        
    } catch (error) {
        console.error('Error viewing user:', error);
        showToast('خطأ في عرض تفاصيل المستخدم', 'error');
    }
}

// Edit user
async function editUser(userId) {
    try {
        const user = await apiRequest(`/api/users/${userId}`);
        openUserModal(user);
    } catch (error) {
        console.error('Error loading user for edit:', error);
        showToast('خطأ في تحميل بيانات المستخدم', 'error');
    }
}

// View user tasks
async function viewUserTasks(userId) {
    try {
        const response = await apiRequest(`/api/users/${userId}/tasks`);
        
        // Switch to tasks page with user filter
        currentTaskFilters.assigned_to = userId;
        showPage('tasks');
        
        // Update tasks filter
        document.getElementById('assigneeFilter').value = userId;
        loadTasks();
        
    } catch (error) {
        console.error('Error loading user tasks:', error);
        showToast('خطأ في تحميل مهام المستخدم', 'error');
    }
}

// Assign task to user
async function assignTaskToUser(userId) {
    try {
        // Get available tasks
        const tasksResponse = await apiRequest('/api/tasks?status=pending&assigned_to=');
        
        if (!tasksResponse.tasks || tasksResponse.tasks.length === 0) {
            showToast('لا توجد مهام متاحة للإسناد', 'info');
            return;
        }
        
        // Create task selection dialog
        const taskOptions = tasksResponse.tasks.map(task => 
            `<option value="${task.id}">${escapeHtml(task.title)}</option>`
        ).join('');
        
        const taskSelect = `
            <div class="form-group">
                <label for="taskToAssign">اختر المهمة:</label>
                <select id="taskToAssign" class="form-control">
                    <option value="">اختر مهمة</option>
                    ${taskOptions}
                </select>
            </div>
        `;
        
        const result = await showPrompt('إسناد مهمة', taskSelect);
        
        if (result) {
            const taskId = document.getElementById('taskToAssign').value;
            if (!taskId) {
                showToast('يرجى اختيار مهمة', 'error');
                return;
            }
            
            await apiRequest(`/api/users/${userId}/assign-task`, {
                method: 'POST',
                body: JSON.stringify({ task_id: parseInt(taskId) })
            });
            
            showToast('تم إسناد المهمة بنجاح', 'success');
            loadUsers();
        }
        
    } catch (error) {
        console.error('Error assigning task:', error);
        showToast('خطأ في إسناد المهمة', 'error');
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    try {
        showLoading();
        
        await apiRequest(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        showToast('تم حذف المستخدم بنجاح', 'success');
        loadUsers();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('خطأ في حذف المستخدم', 'error');
    } finally {
        hideLoading();
    }
}

// Load employees for dropdowns
async function loadEmployeesForDropdown(selectElement) {
    try {
        const response = await apiRequest('/api/users/employees');
        
        // Clear existing options except the first one
        const firstOption = selectElement.querySelector('option');
        selectElement.innerHTML = '';
        if (firstOption) {
            selectElement.appendChild(firstOption);
        }
        
        response.employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.full_name} (${getRoleText(employee.role)})`;
            selectElement.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading employees for dropdown:', error);
    }
}

// Show prompt dialog
function showPrompt(title, content) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-primary" id="promptOk">موافق</button>
                    <button type="button" class="btn btn-secondary" id="promptCancel">إلغاء</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        showModal(modal);
        
        document.getElementById('promptOk').addEventListener('click', () => {
            hideModal(modal);
            document.body.removeChild(modal);
            resolve(true);
        });
        
        document.getElementById('promptCancel').addEventListener('click', () => {
            hideModal(modal);
            document.body.removeChild(modal);
            resolve(false);
        });
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            hideModal(modal);
            document.body.removeChild(modal);
            resolve(false);
        });
    });
}

