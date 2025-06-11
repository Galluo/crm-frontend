// Order Management Functions

let currentOrderPage = 1;
let currentOrderFilters = {};
let orderItems = [];

// Initialize orders page
function initOrdersPage() {
    loadOrders();
    loadCustomersForOrderDropdown();
    setupOrderEventListeners();
}

// Setup event listeners for orders
function setupOrderEventListeners() {
    // Add order button
    document.getElementById('addOrderBtn').addEventListener('click', () => {
        openOrderModal();
    });

    // Status filter
    document.getElementById('orderStatusFilter').addEventListener('change', () => {
        currentOrderFilters.status = document.getElementById('orderStatusFilter').value;
        currentOrderPage = 1;
        loadOrders();
    });

    // Customer filter
    document.getElementById('orderCustomerFilter').addEventListener('change', () => {
        currentOrderFilters.customer_id = document.getElementById('orderCustomerFilter').value;
        currentOrderPage = 1;
        loadOrders();
    });

    // Reset filters
    document.getElementById('resetOrderFilters').addEventListener('click', () => {
        document.getElementById('orderStatusFilter').value = '';
        document.getElementById('orderCustomerFilter').value = '';
        currentOrderFilters = {};
        currentOrderPage = 1;
        loadOrders();
    });

    // Order form submission
    document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);

    // Add order item button
    document.getElementById('addOrderItemBtn').addEventListener('click', addOrderItem);

    // Modal close events
    setupModalEvents('orderModal');
}

// Load orders from API
async function loadOrders() {
    try {
        showLoading();
        
        const params = new URLSearchParams({
            page: currentOrderPage,
            per_page: 10,
            ...currentOrderFilters
        });

        const response = await apiRequest(`/api/orders?${params}`);
        
        if (response.orders) {
            renderOrdersTable(response.orders);
            renderPagination('ordersPagination', response.current_page, response.pages, (page) => {
                currentOrderPage = page;
                loadOrders();
            });
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('خطأ في تحميل الطلبات', 'error');
    } finally {
        hideLoading();
    }
}

// Load customers for order dropdown
async function loadCustomersForOrderDropdown() {
    try {
        const response = await apiRequest('/api/customers?per_page=100');
        const customerFilter = document.getElementById('orderCustomerFilter');
        const orderCustomer = document.getElementById('orderCustomer');
        
        // Update filter dropdown
        const firstOption = customerFilter.querySelector('option');
        customerFilter.innerHTML = '';
        if (firstOption) {
            customerFilter.appendChild(firstOption);
        }
        
        // Update order form dropdown
        const firstOrderOption = orderCustomer.querySelector('option');
        orderCustomer.innerHTML = '';
        if (firstOrderOption) {
            orderCustomer.appendChild(firstOrderOption);
        }
        
        response.customers.forEach(customer => {
            // Filter dropdown
            const filterOption = document.createElement('option');
            filterOption.value = customer.id;
            filterOption.textContent = customer.name;
            customerFilter.appendChild(filterOption);
            
            // Order form dropdown
            const orderOption = document.createElement('option');
            orderOption.value = customer.id;
            orderOption.textContent = customer.name;
            orderCustomer.appendChild(orderOption);
        });
        
    } catch (error) {
        console.error('Error loading customers for dropdown:', error);
    }
}

// Render orders table
function renderOrdersTable(orders) {
    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = '';

    orders.forEach(order => {
        const row = document.createElement('tr');
        const statusClass = getOrderStatusClass(order.status);
        
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${escapeHtml(order.customer_name || 'غير محدد')}</td>
            <td>${formatDate(order.order_date)}</td>
            <td>${formatCurrency(order.total_amount || 0)}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${getOrderStatusText(order.status)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewOrder(${order.id})" title="عرض">
                        👁️
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="editOrder(${order.id})" title="تعديل">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-info" onclick="updateOrderStatus(${order.id})" title="تحديث الحالة">
                        🔄
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteOrder(${order.id})" title="حذف">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Get order status class
function getOrderStatusClass(status) {
    const statusClasses = {
        'pending': 'warning',
        'processing': 'info',
        'shipped': 'primary',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return statusClasses[status] || 'secondary';
}

// Get order status text
function getOrderStatusText(status) {
    const statusTexts = {
        'pending': 'معلق',
        'processing': 'قيد المعالجة',
        'shipped': 'تم الشحن',
        'completed': 'مكتمل',
        'cancelled': 'ملغى'
    };
    return statusTexts[status] || status;
}

// Open order modal
function openOrderModal(order = null) {
    const modal = document.getElementById('orderModal');
    const title = document.getElementById('orderModalTitle');
    const form = document.getElementById('orderForm');

    if (order) {
        title.textContent = 'تعديل الطلب';
        fillOrderForm(order);
        form.dataset.orderId = order.id;
    } else {
        title.textContent = 'إنشاء طلب جديد';
        form.reset();
        orderItems = [];
        renderOrderItems();
        delete form.dataset.orderId;
    }

    showModal(modal);
    
    // Load products for order items
    loadProductsForOrderItems();
}

// Fill order form with data
async function fillOrderForm(order) {
    document.getElementById('orderCustomer').value = order.customer_id || '';
    document.getElementById('orderStatus').value = order.status || 'pending';
    document.getElementById('orderNotes').value = order.notes || '';
    
    // Load order items
    try {
        const orderDetails = await apiRequest(`/api/orders/${order.id}`);
        orderItems = orderDetails.order_items || [];
        renderOrderItems();
    } catch (error) {
        console.error('Error loading order items:', error);
        orderItems = [];
    }
}

// Load products for order items
async function loadProductsForOrderItems() {
    try {
        const response = await apiRequest('/api/products?per_page=100&is_active=true');
        window.availableProducts = response.products || [];
    } catch (error) {
        console.error('Error loading products for order items:', error);
        window.availableProducts = [];
    }
}

// Add order item
function addOrderItem() {
    const newItem = {
        id: Date.now(), // Temporary ID for new items
        product_id: '',
        product_name: '',
        quantity: 1,
        price_at_order: 0
    };
    
    orderItems.push(newItem);
    renderOrderItems();
}

// Remove order item
function removeOrderItem(index) {
    orderItems.splice(index, 1);
    renderOrderItems();
}

// Render order items
function renderOrderItems() {
    const container = document.getElementById('orderItemsList');
    container.innerHTML = '';
    
    orderItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'order-item';
        itemDiv.innerHTML = `
            <div class="order-item-row">
                <div class="form-group">
                    <label>المنتج:</label>
                    <select class="form-control product-select" data-index="${index}">
                        <option value="">اختر المنتج</option>
                        ${window.availableProducts ? window.availableProducts.map(product => 
                            `<option value="${product.id}" data-price="${product.price}" data-stock="${product.stock_quantity}" 
                             ${item.product_id == product.id ? 'selected' : ''}>
                                ${product.name} - ${formatCurrency(product.price)} (متوفر: ${product.stock_quantity})
                            </option>`
                        ).join('') : ''}
                    </select>
                </div>
                <div class="form-group">
                    <label>الكمية:</label>
                    <input type="number" class="form-control quantity-input" data-index="${index}" 
                           value="${item.quantity}" min="1">
                </div>
                <div class="form-group">
                    <label>السعر:</label>
                    <input type="number" class="form-control price-input" data-index="${index}" 
                           value="${item.price_at_order}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>المجموع:</label>
                    <span class="item-total">${formatCurrency(item.quantity * item.price_at_order)}</span>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-danger btn-sm" onclick="removeOrderItem(${index})">
                        حذف
                    </button>
                </div>
            </div>
        `;
        container.appendChild(itemDiv);
    });
    
    // Add event listeners for order items
    setupOrderItemEventListeners();
    updateOrderTotal();
}

// Setup event listeners for order items
function setupOrderItemEventListeners() {
    // Product selection
    document.querySelectorAll('.product-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const selectedOption = e.target.selectedOptions[0];
            
            if (selectedOption && selectedOption.value) {
                orderItems[index].product_id = selectedOption.value;
                orderItems[index].product_name = selectedOption.textContent.split(' - ')[0];
                orderItems[index].price_at_order = parseFloat(selectedOption.dataset.price) || 0;
                
                // Update price input
                const priceInput = document.querySelector(`.price-input[data-index="${index}"]`);
                if (priceInput) {
                    priceInput.value = orderItems[index].price_at_order;
                }
                
                updateOrderTotal();
            }
        });
    });
    
    // Quantity change
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            orderItems[index].quantity = parseInt(e.target.value) || 1;
            updateOrderTotal();
        });
    });
    
    // Price change
    document.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            orderItems[index].price_at_order = parseFloat(e.target.value) || 0;
            updateOrderTotal();
        });
    });
}

// Update order total
function updateOrderTotal() {
    const total = orderItems.reduce((sum, item) => {
        return sum + (item.quantity * item.price_at_order);
    }, 0);
    
    document.getElementById('orderTotalAmount').textContent = formatCurrency(total);
}

// Handle order form submission
async function handleOrderSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Add order items
    data.items = orderItems.filter(item => item.product_id).map(item => ({
        product_id: parseInt(item.product_id),
        quantity: parseInt(item.quantity),
        price: parseFloat(item.price_at_order)
    }));
    
    if (data.items.length === 0) {
        showToast('يجب إضافة منتج واحد على الأقل', 'error');
        return;
    }
    
    try {
        showLoading();
        
        let response;
        if (form.dataset.orderId) {
            // Update existing order
            response = await apiRequest(`/api/orders/${form.dataset.orderId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            // Create new order
            response = await apiRequest('/api/orders', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        
        showToast(form.dataset.orderId ? 'تم تحديث الطلب بنجاح' : 'تم إنشاء الطلب بنجاح', 'success');
        hideModal('orderModal');
        loadOrders();
        
    } catch (error) {
        console.error('Error saving order:', error);
        showToast('خطأ في حفظ الطلب', 'error');
    } finally {
        hideLoading();
    }
}

// View order details
async function viewOrder(orderId) {
    try {
        const order = await apiRequest(`/api/orders/${orderId}`);
        
        const itemsHtml = order.order_items.map(item => `
            <tr>
                <td>${escapeHtml(item.product_name)}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.price_at_order)}</td>
                <td>${formatCurrency(item.quantity * item.price_at_order)}</td>
            </tr>
        `).join('');
        
        const details = `
            <div class="order-details">
                <h3>طلب رقم #${order.id}</h3>
                <p><strong>العميل:</strong> ${escapeHtml(order.customer_name || 'غير محدد')}</p>
                <p><strong>تاريخ الطلب:</strong> ${formatDate(order.order_date)}</p>
                <p><strong>الحالة:</strong> ${getOrderStatusText(order.status)}</p>
                <p><strong>ملاحظات:</strong> ${order.notes || '-'}</p>
                
                <h4>عناصر الطلب:</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>المنتج</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                            <th>المجموع</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <p><strong>المجموع الإجمالي:</strong> ${formatCurrency(order.total_amount)}</p>
                <p><strong>تاريخ الإنشاء:</strong> ${formatDate(order.created_at)}</p>
                <p><strong>آخر تحديث:</strong> ${formatDate(order.updated_at)}</p>
            </div>
        `;
        
        showAlert('تفاصيل الطلب', details);
        
    } catch (error) {
        console.error('Error viewing order:', error);
        showToast('خطأ في عرض تفاصيل الطلب', 'error');
    }
}

// Edit order
async function editOrder(orderId) {
    try {
        const order = await apiRequest(`/api/orders/${orderId}`);
        openOrderModal(order);
    } catch (error) {
        console.error('Error loading order for edit:', error);
        showToast('خطأ في تحميل بيانات الطلب', 'error');
    }
}

// Update order status
async function updateOrderStatus(orderId) {
    const newStatus = prompt('أدخل الحالة الجديدة:\npending - معلق\nprocessing - قيد المعالجة\nshipped - تم الشحن\ncompleted - مكتمل\ncancelled - ملغى');
    
    if (!newStatus) return;
    
    const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
        showToast('حالة غير صحيحة', 'error');
        return;
    }
    
    try {
        showLoading();
        
        await apiRequest(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        showToast('تم تحديث حالة الطلب بنجاح', 'success');
        loadOrders();
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showToast('خطأ في تحديث حالة الطلب', 'error');
    } finally {
        hideLoading();
    }
}

// Delete order
async function deleteOrder(orderId) {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟ سيتم استرداد المخزون. لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    try {
        showLoading();
        
        await apiRequest(`/api/orders/${orderId}`, {
            method: 'DELETE'
        });
        
        showToast('تم حذف الطلب بنجاح', 'success');
        loadOrders();
        
    } catch (error) {
        console.error('Error deleting order:', error);
        showToast('خطأ في حذف الطلب', 'error');
    } finally {
        hideLoading();
    }
}

