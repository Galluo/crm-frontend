// Product Management Functions

let currentProductPage = 1;
let currentProductFilters = {};

// Initialize products page
function initProductsPage() {
    loadProducts();
    loadProductCategories();
    setupProductEventListeners();
}

// Setup event listeners for products
function setupProductEventListeners() {
    // Add product button
    document.getElementById('addProductBtn').addEventListener('click', () => {
        openProductModal();
    });

    // Search input
    document.getElementById('productSearch').addEventListener('input', debounce(() => {
        currentProductFilters.search = document.getElementById('productSearch').value;
        currentProductPage = 1;
        loadProducts();
    }, 300));

    // Category filter
    document.getElementById('categoryFilter').addEventListener('change', () => {
        currentProductFilters.category = document.getElementById('categoryFilter').value;
        currentProductPage = 1;
        loadProducts();
    });

    // Low stock filter
    document.getElementById('lowStockFilter').addEventListener('change', () => {
        currentProductFilters.low_stock = document.getElementById('lowStockFilter').checked;
        currentProductPage = 1;
        loadProducts();
    });

    // Reset filters
    document.getElementById('resetProductFilters').addEventListener('click', () => {
        document.getElementById('productSearch').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('lowStockFilter').checked = false;
        currentProductFilters = {};
        currentProductPage = 1;
        loadProducts();
    });

    // Product form submission
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);

    // Modal close events
    setupModalEvents('productModal');
}

// Load products from API
async function loadProducts() {
    try {
        showLoading();
        
        const params = new URLSearchParams({
            page: currentProductPage,
            per_page: 10,
            ...currentProductFilters
        });

        const response = await apiRequest(`/api/products?${params}`);
        
        if (response.products) {
            renderProductsTable(response.products);
            renderPagination('productsPagination', response.current_page, response.pages, (page) => {
                currentProductPage = page;
                loadProducts();
            });
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('خطأ في تحميل المنتجات', 'error');
    } finally {
        hideLoading();
    }
}

// Load product categories
async function loadProductCategories() {
    try {
        const response = await apiRequest('/api/products/categories');
        const categoryFilter = document.getElementById('categoryFilter');
        
        // Clear existing options except the first one
        const firstOption = categoryFilter.querySelector('option');
        categoryFilter.innerHTML = '';
        if (firstOption) {
            categoryFilter.appendChild(firstOption);
        }
        
        response.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Render products table
function renderProductsTable(products) {
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';

    products.forEach(product => {
        const row = document.createElement('tr');
        const stockClass = product.stock_quantity <= 10 ? 'low-stock' : '';
        const statusClass = product.is_active ? 'active' : 'inactive';
        
        row.innerHTML = `
            <td>${escapeHtml(product.name)}</td>
            <td>${product.category || '-'}</td>
            <td>${formatCurrency(product.price)}</td>
            <td class="${stockClass}">${product.stock_quantity}</td>
            <td>${product.sku || '-'}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${product.is_active ? 'نشط' : 'غير نشط'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewProduct(${product.id})" title="عرض">
                        👁️
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="editProduct(${product.id})" title="تعديل">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-info" onclick="adjustStock(${product.id})" title="تعديل المخزون">
                        📦
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})" title="حذف">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Open product modal
function openProductModal(product = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');

    if (product) {
        title.textContent = 'تعديل المنتج';
        fillProductForm(product);
        form.dataset.productId = product.id;
    } else {
        title.textContent = 'إضافة منتج جديد';
        form.reset();
        delete form.dataset.productId;
    }

    showModal(modal);
}

// Fill product form with data
function fillProductForm(product) {
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.price || '';
    document.getElementById('productStock').value = product.stock_quantity || 0;
    document.getElementById('productSku').value = product.sku || '';
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productActive').checked = product.is_active !== false;
}

// Handle product form submission
async function handleProductSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Convert checkbox to boolean
    data.is_active = formData.has('is_active');
    
    // Convert numeric fields
    data.price = parseFloat(data.price);
    data.stock_quantity = parseInt(data.stock_quantity) || 0;
    
    try {
        showLoading();
        
        let response;
        if (form.dataset.productId) {
            // Update existing product
            response = await apiRequest(`/api/products/${form.dataset.productId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            // Create new product
            response = await apiRequest('/api/products', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        
        showToast(form.dataset.productId ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح', 'success');
        hideModal('productModal');
        loadProducts();
        loadProductCategories(); // Refresh categories
        
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('خطأ في حفظ المنتج', 'error');
    } finally {
        hideLoading();
    }
}

// View product details
async function viewProduct(productId) {
    try {
        const product = await apiRequest(`/api/products/${productId}`);
        
        const details = `
            <div class="product-details">
                <h3>${escapeHtml(product.name)}</h3>
                <p><strong>الوصف:</strong> ${product.description || '-'}</p>
                <p><strong>السعر:</strong> ${formatCurrency(product.price)}</p>
                <p><strong>الكمية المتوفرة:</strong> ${product.stock_quantity}</p>
                <p><strong>رمز المنتج:</strong> ${product.sku || '-'}</p>
                <p><strong>الفئة:</strong> ${product.category || '-'}</p>
                <p><strong>الحالة:</strong> ${product.is_active ? 'نشط' : 'غير نشط'}</p>
                <p><strong>تاريخ الإنشاء:</strong> ${formatDate(product.created_at)}</p>
                <p><strong>آخر تحديث:</strong> ${formatDate(product.updated_at)}</p>
            </div>
        `;
        
        showAlert('تفاصيل المنتج', details);
        
    } catch (error) {
        console.error('Error viewing product:', error);
        showToast('خطأ في عرض تفاصيل المنتج', 'error');
    }
}

// Edit product
async function editProduct(productId) {
    try {
        const product = await apiRequest(`/api/products/${productId}`);
        openProductModal(product);
    } catch (error) {
        console.error('Error loading product for edit:', error);
        showToast('خطأ في تحميل بيانات المنتج', 'error');
    }
}

// Adjust stock
async function adjustStock(productId) {
    try {
        const product = await apiRequest(`/api/products/${productId}`);
        
        const adjustment = prompt(`الكمية الحالية: ${product.stock_quantity}\nأدخل التعديل (+ للزيادة، - للنقصان):`);
        
        if (adjustment === null) return;
        
        const adjustmentValue = parseInt(adjustment);
        if (isNaN(adjustmentValue)) {
            showToast('يرجى إدخال رقم صحيح', 'error');
            return;
        }
        
        const reason = prompt('سبب التعديل (اختياري):') || '';
        
        await apiRequest(`/api/products/${productId}/adjust-stock`, {
            method: 'POST',
            body: JSON.stringify({
                adjustment: adjustmentValue,
                reason: reason
            })
        });
        
        showToast('تم تعديل المخزون بنجاح', 'success');
        loadProducts();
        
    } catch (error) {
        console.error('Error adjusting stock:', error);
        showToast('خطأ في تعديل المخزون', 'error');
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    try {
        showLoading();
        
        await apiRequest(`/api/products/${productId}`, {
            method: 'DELETE'
        });
        
        showToast('تم حذف المنتج بنجاح', 'success');
        loadProducts();
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('خطأ في حذف المنتج', 'error');
    } finally {
        hideLoading();
    }
}

// Load products for dropdowns
async function loadProductsForDropdown(selectElement) {
    try {
        const response = await apiRequest('/api/products?per_page=100&is_active=true');
        
        // Clear existing options except the first one
        const firstOption = selectElement.querySelector('option');
        selectElement.innerHTML = '';
        if (firstOption) {
            selectElement.appendChild(firstOption);
        }
        
        response.products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} - ${formatCurrency(product.price)} (متوفر: ${product.stock_quantity})`;
            option.dataset.price = product.price;
            option.dataset.stock = product.stock_quantity;
            selectElement.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading products for dropdown:', error);
    }
}

// Check low stock products
async function checkLowStockProducts() {
    try {
        const response = await apiRequest('/api/products/low-stock');
        
        if (response.count > 0) {
            const productNames = response.products.map(p => p.name).join(', ');
            showToast(`تنبيه: ${response.count} منتج بمخزون منخفض: ${productNames}`, 'warning', 10000);
        }
        
    } catch (error) {
        console.error('Error checking low stock:', error);
    }
}

