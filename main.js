/* ==========================================================================
   مَسَارُ التَّمَيُّزِ - المحرك الرئيسي للواجهة المباشرة (main.js)
   ========================================================================== */

// متغيرات عامة لتخزين البيانات عند تصفح صفحة الخدمات
let allServicesData = [];
let allCategoriesData = [];
let currentCategoryFilter = 'all';

// ==================== [ أدوات مساعدة العامة ] ====================

/**
 * دالة إرسال الطلب المباشر عبر الواتساب
 */
function sendServiceWhatsApp(serviceTitle) {
    const phoneNumber = "967770000000"; // استبدله برقمك إن أردت
    const message = encodeURIComponent(`السلام عليكم، أرغب في الاستفسار وطلب خدمة: ${serviceTitle}`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
}

/**
 * دالة إنشاء وتنبيه التوست (Toast Notification)
 */
function showToast(message, type = 'success') {
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
 * توليد نجوم التقييم كـ HTML
 */
function renderRatingStars(rating = 5) {
    const numericRating = Math.round(parseFloat(rating) || 5);
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= numericRating) {
            starsHTML += '<i class="fas fa-star text-amber-400"></i>';
        } else {
            starsHTML += '<i class="far fa-star text-slate-300"></i>';
        }
    }
    return starsHTML;
}

/**
 * تسجيل زيارة الصفحة الحالية تلقائياً في الإحصائيات
 */
async function recordPageVisit() {
    try {
        let pageName = window.location.pathname.split('/').pop() || 'index.html';
        if (pageName === '') pageName = 'index.html';
        
        await fetch('/api/stats/visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page_name: pageName })
        });
    } catch (e) {
        // التجاهل الصامت لأخطاء تسجيل الزيارات
    }
}

/**
 * توليد كارت الخدمة بأسلوب موحد وجذاب
 */
function createServiceCardHTML(service) {
    const ratingValue = parseFloat(service.avg_rating || 5.0).toFixed(1);
    const coverImage = service.cover_image_url && service.cover_image_url.trim() !== '' 
        ? service.cover_image_url 
        : null;

    return `
        <div class="service-card bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div>
                ${coverImage ? `
                    <div class="h-44 w-full bg-slate-900 overflow-hidden relative">
                        <img src="${coverImage}" alt="${service.title}" class="w-full h-full object-cover transition duration-500 hover:scale-105">
                        <span class="absolute top-3 right-3 text-[11px] font-bold text-slate-900 bg-gold/90 backdrop-blur-md px-3 py-1 rounded-full shadow-md">
                            ${service.category_name || 'خدمة أكاديمية'}
                        </span>
                    </div>
                ` : ''}

                <div class="p-6 space-y-3">
                    ${!coverImage ? `
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-petrol bg-petrol/10 px-3 py-1 rounded-full">
                                ${service.category_name || 'خدمة أكاديمية'}
                            </span>
                        </div>
                    ` : ''}

                    <h3 class="text-lg font-bold text-slate-900 leading-snug hover:text-petrol transition">
                        <a href="service-details.html?slug=${service.slug}">${service.title}</a>
                    </h3>

                    <p class="text-slate-600 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                        ${service.short_description}
                    </p>
                </div>
            </div>

            <div class="p-6 pt-0 space-y-4">
                <div class="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <span class="flex items-center gap-1.5 font-bold text-slate-700">
                        <i class="fas fa-star text-amber-400"></i>
                        <span>${ratingValue}</span>
                        <span class="text-slate-400 font-normal">(${service.reviews_count || 0})</span>
                    </span>
                    <span class="text-slate-400 text-[11px]">
                        <i class="fas fa-eye ml-1"></i>${service.views_count || 0}
                    </span>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <a href="service-details.html?slug=${service.slug}" class="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs text-center transition flex items-center justify-center gap-1">
                        <span>التفاصيل</span>
                        <i class="fas fa-arrow-left text-[10px]"></i>
                    </a>
                    <button onclick="sendServiceWhatsApp('${service.title.replace(/'/g, "\\'")}')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs text-center transition flex items-center justify-center gap-1 shadow-md shadow-emerald-900/10">
                        <i class="fab fa-whatsapp text-sm"></i>
                        <span>طلب مباشر</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ==================== [ 1. منطق الصفحة الرئيسية (index.html) ] ====================

async function loadFeaturedServices() {
    const container = document.getElementById('featured-services') || document.getElementById('services-grid-container');
    if (!container) return;

    try {
        const response = await fetch('/api/services');
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            container.innerHTML = '';
            const featuredList = result.data.slice(0, 6);
            featuredList.forEach(service => {
                container.innerHTML += createServiceCardHTML(service);
            });
        } else {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-200/80 p-8">
                    <i class="fas fa-box-open text-4xl text-slate-300 mb-3 block"></i>
                    <p class="text-slate-500 font-bold text-sm">لا توجد خدمات معروضة حالياً.</p>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-rose-500 font-bold text-sm">
                تعذر جلب الخدمات. يرجى إعادة المحاولة لاحقاً.
            </div>
        `;
    }
}

// ==================== [ 2. منطق صفحة الخدمات (services.html) ] ====================

async function loadServicesPageData() {
    const gridContainer = document.getElementById('all-services-grid') || document.getElementById('services-grid-container');
    if (!gridContainer) return;

    try {
        const [categoriesRes, servicesRes] = await Promise.all([
            fetch('/api/categories'),
            fetch('/api/services')
        ]);

        const categoriesData = await categoriesRes.json();
        const servicesData = await servicesRes.json();

        if (categoriesData.success) {
            allCategoriesData = categoriesData.data;
            renderCategoryFilterButtons();
        }

        if (servicesData.success) {
            allServicesData = servicesData.data;
            renderFilteredServices();
        }
    } catch (error) {
        gridContainer.innerHTML = `
            <div class="col-span-full text-center py-12 text-rose-500 font-bold text-sm">
                حدث خطأ أثناء تحميل دليل الخدمات. يرجى تحديث الصفحة.
            </div>
        `;
    }
}

function renderCategoryFilterButtons() {
    const buttonsContainer = document.getElementById('category-filter-buttons');
    if (!buttonsContainer) return;

    let buttonsHTML = `
        <button onclick="filterServicesByCategory('all', this)" class="category-btn active bg-slate-900 text-gold px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-800 flex items-center gap-2 shadow-sm">
            <i class="fas fa-th-large"></i>
            <span>الكل</span>
        </button>
    `;

    allCategoriesData.forEach(cat => {
        buttonsHTML += `
            <button onclick="filterServicesByCategory('${cat.slug}', this)" class="category-btn bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-300/60 hover:bg-slate-300 flex items-center gap-2">
                <i class="fas ${cat.icon || 'fa-folder'}"></i>
                <span>${cat.name}</span>
            </button>
        `;
    });

    buttonsContainer.innerHTML = buttonsHTML;
}

function filterServicesByCategory(categorySlug, buttonElement) {
    currentCategoryFilter = categorySlug;

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-slate-900', 'text-gold', 'border-slate-800');
        btn.classList.add('bg-slate-200', 'text-slate-700', 'border-slate-300/60');
    });

    buttonElement.classList.remove('bg-slate-200', 'text-slate-700', 'border-slate-300/60');
    buttonElement.classList.add('active', 'bg-slate-900', 'text-gold', 'border-slate-800');

    renderFilteredServices();
}

function renderFilteredServices() {
    const gridContainer = document.getElementById('all-services-grid') || document.getElementById('services-grid-container');
    const searchInput = document.getElementById('service-search-input');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (!gridContainer) return;

    let filtered = allServicesData;

    if (currentCategoryFilter !== 'all') {
        filtered = filtered.filter(s => s.category_slug === currentCategoryFilter);
    }

    if (searchQuery !== '') {
        filtered = filtered.filter(s => 
            s.title.toLowerCase().includes(searchQuery) || 
            s.short_description.toLowerCase().includes(searchQuery) ||
            (s.full_description && s.full_description.toLowerCase().includes(searchQuery))
        );
    }

    if (filtered.length === 0) {
        gridContainer.innerHTML = `
            <div class="col-span-full text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8">
                <i class="fas fa-search-minus text-4xl text-slate-300 mb-3 block"></i>
                <p class="text-slate-600 font-bold text-sm">لم نجد أي خدمة تطابق اختيارك أو كلمة البحث.</p>
                <button onclick="resetFilters()" class="mt-4 text-xs font-bold text-petrol underline">إعادة عرض جميع الخدمات</button>
            </div>
        `;
        return;
    }

    gridContainer.innerHTML = '';
    filtered.forEach(service => {
        gridContainer.innerHTML += createServiceCardHTML(service);
    });
}

function resetFilters() {
    const searchInput = document.getElementById('service-search-input');
    if (searchInput) searchInput.value = '';
    
    const allBtn = document.querySelector('.category-btn');
    if (allBtn) filterServicesByCategory('all', allBtn);
}

// ==================== [ 3. منطق صفحة تفاصيل الخدمة (service-details.html) ] ====================

async function loadServiceDetailsPage() {
    const detailsContainer = document.getElementById('service-details-container');
    const loadingState = document.getElementById('service-loading-state');
    if (!detailsContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) {
        window.location.href = 'services.html';
        return;
    }

    try {
        const response = await fetch(`/api/services/slug/${encodeURIComponent(slug)}`);
        const result = await response.json();

        if (!result.success || !result.data) {
            loadingState.innerHTML = `
                <div class="py-12 text-rose-500 font-bold text-sm text-center">
                    عذراً، الخدمة المطلوبة غير موجودة أو تم حذفها.
                    <br>
                    <a href="services.html" class="inline-block mt-4 bg-slate-900 text-gold px-6 py-2.5 rounded-xl font-bold text-xs">العودة للخدمات</a>
                </div>
            `;
            return;
        }

        const service = result.data;

        document.title = `${service.title} | مَسَارُ التَّمَيُّزِ`;
        
        if (document.getElementById('service-category-badge')) document.getElementById('service-category-badge').textContent = service.category_name || 'خدمة أكاديمية';
        if (document.getElementById('detail-category-name')) document.getElementById('detail-category-name').textContent = service.category_name || 'خدمة أكاديمية';
        if (document.getElementById('detail-service-title')) document.getElementById('detail-service-title').textContent = service.title;
        if (document.getElementById('detail-avg-rating')) document.getElementById('detail-avg-rating').textContent = parseFloat(service.avg_rating || 5.0).toFixed(1);
        if (document.getElementById('detail-views-count')) document.getElementById('detail-views-count').textContent = service.views_count || 1;
        if (document.getElementById('detail-works-count')) document.getElementById('detail-works-count').textContent = service.works ? service.works.length : 0;
        if (document.getElementById('detail-full-description')) document.getElementById('detail-full-description').textContent = service.full_description || service.short_description;
        if (document.getElementById('detail-price-info')) document.getElementById('detail-price-info').textContent = service.price_info || 'حسب الاتفاق';
        if (document.getElementById('detail-execution-time')) document.getElementById('detail-execution-time').textContent = service.execution_time || 'حسب الموعد النهائي';

        if (service.cover_image_url && service.cover_image_url.trim() !== '') {
            const coverBox = document.getElementById('detail-cover-container');
            const coverImg = document.getElementById('detail-cover-img');
            if (coverBox && coverImg) {
                coverImg.src = service.cover_image_url;
                coverImg.alt = service.title;
                coverBox.classList.remove('hidden');
            }
        }

        const whatsappBtn = document.getElementById('service-whatsapp-btn');
        if (whatsappBtn) {
            whatsappBtn.onclick = () => sendServiceWhatsApp(service.title);
        }

        const reviewServiceIdInput = document.getElementById('review-service-id');
        if (reviewServiceIdInput) {
            reviewServiceIdInput.value = service.id;
        }

        renderServiceWorksList(service.works || []);
        renderServiceReviewsList(service.reviews || []);

        loadingState.classList.add('hidden');
        detailsContainer.classList.remove('hidden');

    } catch (error) {
        if (loadingState) {
            loadingState.innerHTML = `
                <div class="py-12 text-rose-500 font-bold text-sm text-center">
                    تعذر تحميل تفاصيل الخدمة. يرجى المحاولة مرة أخرى.
                </div>
            `;
        }
    }
}

function renderServiceWorksList(works) {
    const container = document.getElementById('service-works-grid');
    const badgeCount = document.getElementById('works-badge-count');
    if (!container) return;

    if (badgeCount) badgeCount.textContent = `${works.length} نماذج`;

    if (works.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 bg-lightbg rounded-2xl border border-slate-200/80 text-slate-500 text-xs">
                لا تتوفر نماذج أعمال معروضة لهذه الخدمة حالياً.
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    works.forEach(work => {
        container.innerHTML += `
            <div class="bg-lightbg rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm space-y-3">
                <div class="h-48 w-full bg-slate-900 overflow-hidden relative">
                    <img src="${work.image_url}" alt="${work.title}" class="w-full h-full object-cover transition duration-300 hover:scale-105">
                </div>
                <div class="p-4 space-y-2">
                    <h4 class="font-bold text-slate-900 text-sm">${work.title}</h4>
                    ${work.description ? `<p class="text-slate-500 text-xs leading-relaxed">${work.description}</p>` : ''}
                </div>
            </div>
        `;
    });
}

function renderServiceReviewsList(reviews) {
    const container = document.getElementById('service-reviews-list');
    if (!container) return;

    if (reviews.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6 bg-lightbg rounded-2xl border border-slate-200/80 text-slate-500 text-xs">
                كن أول من يضيف تقييماً لهذه الخدمة!
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    reviews.forEach(review => {
        container.innerHTML += `
            <div class="p-4 bg-lightbg rounded-2xl border border-slate-200/80 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-900 text-xs">${review.student_name || 'طالب جامعي'}</span>
                    <div class="text-xs flex gap-0.5">${renderRatingStars(review.rating)}</div>
                </div>
                ${review.comment ? `<p class="text-slate-600 text-xs leading-relaxed">${review.comment}</p>` : ''}
            </div>
        `;
    });
}

/**
 * إرسال تقييم جديد من الطالب
 */
async function handleReviewSubmit(event) {
    event.preventDefault();

    const serviceId = document.getElementById('review-service-id').value;
    const studentName = document.getElementById('review-student-name').value.trim();
    const rating = document.getElementById('review-rating').value;
    const comment = document.getElementById('review-comment').value.trim();

    if (!serviceId) return;

    try {
        const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: parseInt(serviceId),
                student_name: studentName,
                rating: parseInt(rating),
                comment: comment
            })
        });

        const result = await response.json();

        if (result.success) {
            showToast('شكراً لك! تم إضافة تقييمك بنجاح');
            document.getElementById('add-review-form').reset();
            const urlParams = new URLSearchParams(window.location.search);
            const slug = urlParams.get('slug');
            if (slug) loadServiceDetailsPage();
        } else {
            showToast(result.message || 'حدث خطأ أثناء إرسال التقييم', 'error');
        }
    } catch (error) {
        showToast('تعذر إرسال التقييم، يرجى المحاولة لاحقاً', 'error');
    }
}

// ==================== [ التهيئة المستندة لحدث تحميل DOM ] ====================

document.addEventListener('DOMContentLoaded', () => {
    recordPageVisit();

    const path = window.location.pathname;
    const href = window.location.href;

    // دعم مسارات الاستضافات سواء بـ .html أو بدونه
    if (path.includes('services') || href.includes('services')) {
        loadServicesPageData();

        const searchInput = document.getElementById('service-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', renderFilteredServices);
        }
    } else if (path.includes('service-details') || href.includes('service-details')) {
        loadServiceDetailsPage();
    } else {
        loadFeaturedServices();
    }
});

// إتاحة الدوال على نطاق النافذة العامة
window.sendServiceWhatsApp = sendServiceWhatsApp;
window.filterServicesByCategory = filterServicesByCategory;
window.resetFilters = resetFilters;
window.handleReviewSubmit = handleReviewSubmit;
