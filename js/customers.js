// Customer Management Functions

let currentCustomerPage = 1;
let currentCustomerFilters = {};

// Initialize customers page
function initCustomersPage() {
    loadCustomers();
    setupCustomerEventListeners();
}

// Setup event listeners for customers
function setupCustomerEventListeners() {
    // Add customer button
    document.getElementById('addCustomerBtn').addEventListener('click', () => {
        openCustomerModal();
    });

    // Search input
    document.getElementById('customerSearch').addEventListener('input', debounce(() => {
        currentCustomerFilters.search = document.getElementById('customerSearch').value;
        currentCustomerPage = 1;
        loadCustomers();
    }, 300));

    // Reset filters
    document.getElementById('resetCustomerFilters').addEventListener('click', () => {
        document.getElementById('customerSearch').value = '';
        currentCustomerFilters = {};
        currentCustomerPage = 1;
        loadCustomers();
    });

    // Customer form submission
    document.getElementById('customerForm').addEventListener('submit', handleCustomerSubmit);

    // Modal close events
    setupModalEvents('customerModal');
}

// Load customers from API
async function loadCustomers() {
    try {
        showLoading();
        
        const params = new URLSearchParams({
            page: currentCustomerPage,
            per_page: 10,
            ...currentCustomerFilters
        });

        const response = await apiRequest(`/api/customers?${params}`);
        
        if (response.customers) {
            renderCustomersTable(response.customers);
            renderPagination('customersPagination', response.current_page, response.pages, (page) => {
                currentCustomerPage = page;
                loadCustomers();
            });
        }
    } catch (error) {
        console.error('Error loading customers:', error);
        showToast('خطأ في تحميل العملاء', 'error');
    } finally {
        hideLoading();
    }
}

// Render customers table
function renderCustomersTable(customers) {
    const tbody = document.querySelector('#customersTable tbody');
    tbody.innerHTML = '';

    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(customer.name)}</td>
            <td>${customer.email || '-'}</td>
            <td>${customer.phone || '-'}</td>
            <td>${customer.company || '-'}</td>
            <td>${customer.total_orders || 0}</td>
            <td>${formatCurrency(customer.total_amount || 0)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewCustomer(${customer.id})" title="عرض">
                        👁️
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="editCustomer(${customer.id})" title="تعديل">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-info" onclick="viewCustomerOrders(${customer.id})" title="الطلبات">
                        🛒
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="viewCustomerTasks(${customer.id})" title="المهام">
                        📋
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})" title="حذف">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Open customer modal
function openCustomerModal(customer = null) {
    const modal = document.getElementById('customerModal');
    const title = document.getElementById('customerModalTitle');
    const form = document.getElementById('customerForm');

    if (customer) {
        title.textContent = 'تعديل العميل';
        fillCustomerForm(customer);
        form.dataset.customerId = customer.id;
    } else {
        title.textContent = 'إضافة عميل جديد';
        form.reset();
        delete form.dataset.customerId;
    }

    showModal(modal);
}

// Fill customer form with data
function fillCustomerForm(customer) {
    document.getElementById('customerName').value = customer.name || '';
    document.getElementById('customerEmail').value = customer.email || '';
    document.getElementById('customerPhone').value = customer.phone || '';
    document.getElementById('customerCompany').value = customer.company || '';
    document.getElementById('customerAddress').value = customer.address || '';
    document.getElementById('customerNotes').value = customer.notes || '';
}

// Handle customer form submission
async function handleCustomerSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        showLoading();
        
        let response;
        if (form.dataset.customerId) {
            // Update existing customer
            response = await apiRequest(`/api/customers/${form.dataset.customerId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            // Create new customer
            response = await apiRequest('/api/customers', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        
        showToast(form.dataset.customerId ? 'تم تحديث العميل بنجاح' : 'تم إضافة العميل بنجاح', 'success');
        hideModal('customerModal');
        loadCustomers();
        
    } catch (error) {
        console.error('Error saving customer:', error);
        showToast('خطأ في حفظ العميل', 'error');
    } finally {
        hideLoading();
    }
}

// View customer details
async function viewCustomer(customerId) {
    try {
        const customer = await apiRequest(`/api/customers/${customerId}`);
        
        // Create a detailed view modal or navigate to a detail page
        const details = `
            <div class="customer-details">
                <h3>${escapeHtml(customer.name)}</h3>
                <p><strong>البريد الإلكتروني:</strong> ${customer.email || '-'}</p>
                <p><strong>الهاتف:</strong> ${customer.phone || '-'}</p>
                <p><strong>الشركة:</strong> ${customer.company || '-'}</p>
                <p><strong>العنوان:</strong> ${customer.address || '-'}</p>
                <p><strong>ملاحظات:</strong> ${customer.notes || '-'}</p>
                <p><strong>تاريخ الإنشاء:</strong> ${formatDate(customer.created_at)}</p>
                <p><strong>آخر تحديث:</strong> ${formatDate(customer.updated_at)}</p>
            </div>
        `;
        
        showAlert('تفاصيل العميل', details);
        
    } catch (error) {
        console.error('Error viewing customer:', error);
        showToast('خطأ في عرض تفاصيل العميل', 'error');
    }
}

// Edit customer
async function editCustomer(customerId) {
    try {
        const customer = await apiRequest(`/api/customers/${customerId}`);
        openCustomerModal(customer);
    } catch (error) {
        console.error('Error loading customer for edit:', error);
        showToast('خطأ في تحميل بيانات العميل', 'error');
    }
}

// View customer orders
async function viewCustomerOrders(customerId) {
    try {
        const response = await apiRequest(`/api/customers/${customerId}/orders`);
        
        // Switch to orders page with customer filter
        currentCustomerFilters.customer_id = customerId;
        showPage('orders');
        
        // Update orders filter
        document.getElementById('orderCustomerFilter').value = customerId;
        loadOrders();
        
    } catch (error) {
        console.error('Error loading customer orders:', error);
        showToast('خطأ في تحميل طلبات العميل', 'error');
    }
}

// View customer tasks
async function viewCustomerTasks(customerId) {
    try {
        const response = await apiRequest(`/api/customers/${customerId}/tasks`);
        
        // Switch to tasks page with customer filter
        currentTaskFilters.customer_id = customerId;
        showPage('tasks');
        
        // Update tasks filter
        document.getElementById('customerFilter').value = customerId;
        loadTasks();
        
    } catch (error) {
        console.error('Error loading customer tasks:', error);
        showToast('خطأ في تحميل مهام العميل', 'error');
    }
}

// Delete customer
async function deleteCustomer(customerId) {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    try {
        showLoading();
        
        await apiRequest(`/api/customers/${customerId}`, {
            method: 'DELETE'
        });
        
        showToast('تم حذف العميل بنجاح', 'success');
        loadCustomers();
        
    } catch (error) {
        console.error('Error deleting customer:', error);
        showToast('خطأ في حذف العميل', 'error');
    } finally {
        hideLoading();
    }
}

// Load customers for dropdowns
async function loadCustomersForDropdown(selectElement) {
    try {
        const response = await apiRequest('/api/customers?per_page=100');
        
        // Clear existing options except the first one
        const firstOption = selectElement.querySelector('option');
        selectElement.innerHTML = '';
        if (firstOption) {
            selectElement.appendChild(firstOption);
        }
        
        response.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            selectElement.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading customers for dropdown:', error);
    }
}

