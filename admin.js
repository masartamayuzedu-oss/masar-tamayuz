/* ==========================================================================
   مَسَارُ التَّمَيُّزِ - وحدة إدارة لوحة التحكم (admin.js)
   ========================================================================== */

// التوكن والممتلكات العامة
let adminToken = localStorage.getItem('masar_admin_token') || '';
let currentAdminServices = [];

// ==================== [ أدوات مساعدة وتنبيهات ] ====================

/**
 * دالة التنبيهات الخاصة باللوحة (Toast)
 */
function showAdminToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type === 'error' ? 'border-rose-500' : 'border-gold'}`;
    toast.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-exclamation-circle text-rose-500' : 'fa-check-circle text-gold'} text-xl"></i>
        <span class="text-xs sm:text-sm font-bold text-white">${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/**
 * تجهيز رأس الطلبات المحمية بـ Token
 */
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
    };
}

// ==================== [ 1. المصادقة والتحقق من الجلسة ] ====================

/**
 * معالجة تسجيل الدخول للوحة التحكم
 */
async function handleAdminLogin(event) {
    event.preventDefault();
    const passwordInput = document.getElementById('admin-password-input');
    const errorMsg = document.getElementById('login-error-msg');
    const password = passwordInput.value.trim();

    if (!password) return;

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const result = await response.json();

        if (result.success && result.token) {
            adminToken = result.token;
            localStorage.setItem('masar_admin_token', adminToken);
            errorMsg.classList.add('hidden');
            passwordInput.value = '';
            showAdminToast('تم تسجيل الدخول بنجاح');
            showDashboard();
        } else {
            errorMsg.textContent = result.message || 'كلمة المرور غير صحيحة';
            errorMsg.classList.remove('hidden');
        }
    } catch (error) {
        showAdminToast('تعذر الاتصال بالخادم أثناء تسجيل الدخول', 'error');
    }
}

/**
 * تسجيل الخروج من اللوحة
 */
function logoutAdmin() {
    adminToken = '';
    localStorage.removeItem('masar_admin_token');
    showAdminToast('تم تسجيل الخروج بنجاح');
    showLoginForm();
}

/**
 * إظهار واجهة اللوحة وتفريغ البيانات
 */
function showDashboard() {
    document.getElementById('admin-login-section').classList.add('hidden');
    document.getElementById('admin-dashboard-section').classList.remove('hidden');
    document.getElementById('admin-logout-btn').classList.remove('hidden');

    loadAdminStats();
    loadAdminCategories();
    loadAdminServicesTable();
}

/**
 * إظهار شاشة تسجيل الدخول
 */
function showLoginForm() {
    document.getElementById('admin-login-section').classList.remove('hidden');
    document.getElementById('admin-dashboard-section').classList.add('hidden');
    document.getElementById('admin-logout-btn').classList.add('hidden');
}

/**
 * فحص حالة التوكن عند التحميل
 */
function checkAuthStatus() {
    if (adminToken && adminToken.trim() !== '') {
        showDashboard();
    } else {
        showLoginForm();
    }
}

// ==================== [ 2. التبويبات والإحصائيات ] ====================

/**
 * التبديل بين تبويبات اللوحة
 */
function switchTab(tabName) {
    const servicesTabBtn = document.getElementById('tab-btn-services');
    const worksTabBtn = document.getElementById('tab-btn-works');
    const servicesContent = document.getElementById('tab-content-services');
    const worksContent = document.getElementById('tab-content-works');

    if (tabName === 'services') {
        servicesTabBtn.classList.add('active', 'border-b-2', 'border-slate-900', 'text-slate-900');
        servicesTabBtn.classList.remove('text-slate-500');
        worksTabBtn.classList.remove('active', 'border-b-2', 'border-slate-900', 'text-slate-900');
        worksTabBtn.classList.add('text-slate-500');

        servicesContent.classList.remove('hidden');
        worksContent.classList.add('hidden');
    } else if (tabName === 'works') {
        worksTabBtn.classList.add('active', 'border-b-2', 'border-slate-900', 'text-slate-900');
        worksTabBtn.classList.remove('text-slate-500');
        servicesTabBtn.classList.remove('active', 'border-b-2', 'border-slate-900', 'text-slate-900');
        servicesTabBtn.classList.add('text-slate-500');

        worksContent.classList.remove('hidden');
        servicesContent.classList.add('hidden');
    }
}

/**
 * جلب الإحصائيات الشاملة للمنصة
 */
async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats', { headers: getAuthHeaders() });
        const result = await response.json();

        if (result.success && result.stats) {
            document.getElementById('stat-total-services').textContent = result.stats.totalServices || 0;
            document.getElementById('stat-total-works').textContent = result.stats.totalWorks || 0;
            document.getElementById('stat-total-reviews').textContent = result.stats.totalReviews || 0;
            document.getElementById('stat-total-views').textContent = result.stats.totalViews || 0;
        }
    } catch (e) {
        // التجاهل الصامت
    }
}

// ==================== [ 3. إدارة الخدمات والأقسام ] ====================

/**
 * جلب الأقسام وتعبئتها في القائمة المنسدلة للنموذج
 */
async function loadAdminCategories() {
    try {
        const response = await fetch('/api/categories');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('service-category-select');
            select.innerHTML = '<option value="" disabled selected>اختر القسم المباشر...</option>';

            result.data.forEach(cat => {
                select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
        }
    } catch (e) {
        showAdminToast('تعذر تحميل الأقسام', 'error');
    }
}

/**
 * جلب جميع الخدمات وعرضها في الجدول المخصص
 */
async function loadAdminServicesTable() {
    const tbody = document.getElementById('admin-services-table-body');
    const worksSelect = document.getElementById('work-service-select');

    try {
        const response = await fetch('/api/services?include_hidden=true');
        const result = await response.json();

        if (result.success) {
            currentAdminServices = result.data;

            // تحديث خيارات اختيار الخدمة في نموذج الأعمال السابقة
            if (worksSelect) {
                worksSelect.innerHTML = '<option value="" disabled selected>اختر الخدمة...</option>';
                currentAdminServices.forEach(s => {
                    worksSelect.innerHTML += `<option value="${s.id}">${s.title}</option>`;
                });
            }

            if (currentAdminServices.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="p-8 text-center text-slate-400 text-xs">
                            لا توجد أي خدمات مضافة حتى الآن.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = '';
            currentAdminServices.forEach(service => {
                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50 transition">
                        <td class="p-4">
                            <div class="font-bold text-slate-900">${service.title}</div>
                            <div class="text-[11px] text-slate-400 font-mono">${service.slug}</div>
                        </td>
                        <td class="p-4">
                            <span class="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full">
                                ${service.category_name || 'عام'}
                            </span>
                        </td>
                        <td class="p-4 font-bold text-slate-600">
                            <i class="fas fa-eye text-slate-400 ml-1"></i>${service.views_count || 0}
                        </td>
                        <td class="p-4">
                            ${service.is_published 
                                ? '<span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">منشور</span>'
                                : '<span class="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full">مخفي</span>'
                            }
                        </td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="editService(${service.id})" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs transition" title="تعديل">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="toggleServicePublish(${service.id})" class="p-2 ${service.is_published ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'} rounded-lg text-xs transition" title="${service.is_published ? 'إخفاء' : 'إظهار'}">
                                    <i class="fas ${service.is_published ? 'fa-eye-slash' : 'fa-eye'}"></i>
                                </button>
                                <button onclick="deleteService(${service.id})" class="p-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs transition" title="حذف">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (e) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-rose-500 text-xs">
                    خطأ أثناء تحميل الخدمات.
                </td>
            </tr>
        `;
    }
}

/**
 * معاينة صورة غلاف الخدمة
 */
function previewCoverImage(url) {
    const previewBox = document.getElementById('cover-preview-box');
    const previewImg = document.getElementById('cover-preview-img');

    if (url && url.trim() !== '') {
        previewImg.src = url.trim();
        previewBox.classList.remove('hidden');
    } else {
        previewBox.classList.add('hidden');
    }
}

/**
 * إعادة تعيين نموذج الخدمة إلى الوضع الافتراضي (إضافة)
 */
function resetServiceForm() {
    document.getElementById('add-edit-service-form').reset();
    document.getElementById('form-service-id').value = '';
    document.getElementById('service-published-checkbox').checked = true;
    document.getElementById('service-form-title').innerHTML = '<i class="fas fa-plus-circle text-gold"></i><span>إضافة خدمة جديدة للموقع</span>';
    document.getElementById('save-service-btn-text').textContent = 'حفظ ونشر الخدمة';
    document.getElementById('cover-preview-box').classList.add('hidden');
}

/**
 * معالجة إضافة أو تعديل خدمة
 */
async function handleServiceSubmit(event) {
    event.preventDefault();

    const serviceId = document.getElementById('form-service-id').value;
    const categoryId = document.getElementById('service-category-select').value;
    const title = document.getElementById('service-title-input').value.trim();
    const slug = document.getElementById('service-slug-input').value.trim();
    const coverUrl = document.getElementById('service-image-url-input').value.trim();
    const price = document.getElementById('service-price-input').value.trim();
    const time = document.getElementById('service-time-input').value.trim();
    const shortDesc = document.getElementById('service-short-desc-input').value.trim();
    const fullDesc = document.getElementById('service-full-desc-input').value.trim();
    const isPublished = document.getElementById('service-published-checkbox').checked;

    if (!categoryId || !title || !shortDesc) {
        showAdminToast('يرجى تعبئة كافة الحقول المطلوبة', 'error');
        return;
    }

    const payload = {
        category_id: parseInt(categoryId),
        title,
        slug,
        cover_image_url: coverUrl,
        price_info: price || 'حسب الاتفاق',
        execution_time: time || 'حسب الموعد النهائي',
        short_description: shortDesc,
        full_description: fullDesc,
        is_published: isPublished
    };

    const isEdit = serviceId && serviceId !== '';
    const url = isEdit ? `/api/admin/services/${serviceId}` : '/api/admin/services';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            showAdminToast(isEdit ? 'تم تحديث بيانات الخدمة بنجاح' : 'تمت إضافة الخدمة الجديدة بنجاح');
            resetServiceForm();
            loadAdminServicesTable();
            loadAdminStats();
        } else {
            showAdminToast(result.message || 'حدث خطأ أثناء الحفظ', 'error');
        }
    } catch (error) {
        showAdminToast('تعذر الحفظ، يرجى إعادة المحاولة', 'error');
    }
}

/**
 * جلب بيانات خدمة معينة وملء النموذج للتعديل
 */
function editService(id) {
    const service = currentAdminServices.find(s => s.id === id);
    if (!service) return;

    document.getElementById('form-service-id').value = service.id;
    document.getElementById('service-category-select').value = service.category_id;
    document.getElementById('service-title-input').value = service.title;
    document.getElementById('service-slug-input').value = service.slug;
    document.getElementById('service-image-url-input').value = service.cover_image_url || '';
    document.getElementById('service-price-input').value = service.price_info || '';
    document.getElementById('service-time-input').value = service.execution_time || '';
    document.getElementById('service-short-desc-input').value = service.short_description;
    document.getElementById('service-full-desc-input').value = service.full_description || '';
    document.getElementById('service-published-checkbox').checked = service.is_published;

    document.getElementById('service-form-title').innerHTML = '<i class="fas fa-edit text-gold"></i><span>تعديل بيانات الخدمة</span>';
    document.getElementById('save-service-btn-text').textContent = 'تحديث وتعديل الخدمة';

    previewCoverImage(service.cover_image_url);

    // التمرير للنموذج أعلى الصفحة
    window.scrollTo({ top: 200, behavior: 'smooth' });
}

/**
 * تبديل حالة إظهار/إخفاء الخدمة
 */
async function toggleServicePublish(id) {
    try {
        const response = await fetch(`/api/admin/services/${id}/toggle`, {
            method: 'PATCH',
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            showAdminToast('تم تغيير حالة عرض الخدمة');
            loadAdminServicesTable();
        } else {
            showAdminToast(result.message || 'تعذر تغيير الحالة', 'error');
        }
    } catch (error) {
        showAdminToast('خطأ أثناء التواصل مع الخادم', 'error');
    }
}

/**
 * حذف خدمة نهائياً
 */
async function deleteService(id) {
    if (!confirm('هل أنت تأكد من رغبتك في حذف هذه الخدمة وكافة أعمالها وتقييماتها الملحقة نهائياً؟')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/services/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            showAdminToast('تم حذف الخدمة بنجاح');
            loadAdminServicesTable();
            loadAdminStats();
        } else {
            showAdminToast(result.message || 'تعذر حذف الخدمة', 'error');
        }
    } catch (error) {
        showAdminToast('حدث خطأ أثناء الحذف', 'error');
    }
}

// ==================== [ 4. إدارة الأعمال السابقة (Works) ] ====================

/**
 * معالجة إضافة نموذج عمل سابق
 */
async function handleWorkSubmit(event) {
    event.preventDefault();

    const serviceId = document.getElementById('work-service-select').value;
    const title = document.getElementById('work-title-input').value.trim();
    const imageUrl = document.getElementById('work-image-url-input').value.trim();
    const description = document.getElementById('work-desc-input').value.trim();

    if (!serviceId || !title || !imageUrl) {
        showAdminToast('يرجى اختيار الخدمة وإدخال العنوان ورابط الصورة', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/works', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                service_id: parseInt(serviceId),
                title,
                image_url: imageUrl,
                description
            })
        });

        const result = await response.json();

        if (result.success) {
            showAdminToast('تم ربط نموذج العمل السابق بالخدمة بنجاح');
            document.getElementById('add-work-form').reset();
            loadAdminStats();
        } else {
            showAdminToast(result.message || 'حدث خطأ أثناء إضافة العمل', 'error');
        }
    } catch (error) {
        showAdminToast('تعذر حفظ نموذج العمل السابق', 'error');
    }
}

// ==================== [ التهيئة والتشغيل المباشر ] ====================

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});

// إتاحة الدوال على نطاق النافذة العامة
window.handleAdminLogin = handleAdminLogin;
window.logoutAdmin = logoutAdmin;
window.switchTab = switchTab;
window.previewCoverImage = previewCoverImage;
window.resetServiceForm = resetServiceForm;
window.handleServiceSubmit = handleServiceSubmit;
window.editService = editService;
window.toggleServicePublish = toggleServicePublish;
window.deleteService = deleteService;
window.handleWorkSubmit = handleWorkSubmit;
