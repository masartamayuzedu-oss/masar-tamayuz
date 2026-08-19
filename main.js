/* ==========================================================================
   مَسَارُ التَّمَيُّزِ - المحرك الرئيسي للواجهة المباشرة (main.js)
   ========================================================================== */

// ==================== [ المتغيرات العامة ] ====================

let allServicesData = [];
let allCategoriesData = [];
let currentCategoryFilter = 'all';


// ==================== [ أدوات مساعدة عامة ] ====================

/**
 * إرسال طلب خدمة مباشرة عبر واتساب
 */
function sendServiceWhatsApp(serviceTitle = '') {
    const phoneNumber = '967736190956';

    const title = String(serviceTitle || 'الخدمة المطلوبة').trim();

    const message = encodeURIComponent(
        `السلام عليكم، أرغب في الاستفسار وطلب خدمة: ${title}`
    );

    window.open(
        `https://wa.me/${phoneNumber}?text=${message}`,
        '_blank'
    );
}


/**
 * إنشاء وتنبيه Toast
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');

    toast.className = `toast-notification ${
        type === 'error'
            ? 'border-rose-500'
            : 'border-gold'
    }`;

    toast.innerHTML = `
        <i class="fas ${
            type === 'error'
                ? 'fa-exclamation-circle text-rose-500'
                : 'fa-check-circle text-gold'
        } text-xl"></i>

        <span class="text-xs sm:text-sm font-bold text-white">
            ${escapeHTML(message)}
        </span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}


/**
 * حماية النصوص قبل وضعها داخل HTML
 */
function escapeHTML(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/**
 * توليد نجوم التقييم
 */
function renderRatingStars(rating = 5) {
    const numericRating = Math.max(
        0,
        Math.min(
            5,
            Math.round(parseFloat(rating) || 0)
        )
    );

    let starsHTML = '';

    for (let i = 1; i <= 5; i++) {
        if (i <= numericRating) {
            starsHTML += `
                <i class="fas fa-star text-amber-400"></i>
            `;
        } else {
            starsHTML += `
                <i class="far fa-star text-slate-300"></i>
            `;
        }
    }

    return starsHTML;
}


/**
 * تسجيل زيارة الصفحة الحالية
 */
async function recordPageVisit() {
    try {
        let pageName =
            window.location.pathname
                .split('/')
                .pop() || 'index.html';

        if (!pageName) {
            pageName = 'index.html';
        }

        /*
         * توافق مع schema:
         * home / services
         */
        if (
            pageName === 'index.html' ||
            pageName === ''
        ) {
            pageName = 'home';
        } else if (pageName === 'services.html') {
            pageName = 'services';
        }

        await fetch('/api/stats/visit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                page_name: pageName
            })
        });

    } catch (error) {
        // تجاهل أخطاء الإحصائيات حتى لا تؤثر على الموقع
        console.warn('تعذر تسجيل زيارة الصفحة:', error);
    }
}


// ==================== [ بطاقات الخدمات ] ====================

/**
 * إنشاء كارت الخدمة
 */
function createServiceCardHTML(service) {
    const ratingValue = parseFloat(
        service.avg_rating || 5.0
    ).toFixed(1);

    const coverImage =
        service.cover_image_url &&
        String(service.cover_image_url).trim() !== ''
            ? String(service.cover_image_url).trim()
            : null;

    const serviceTitle = escapeHTML(
        service.title || 'خدمة'
    );

    const serviceSlug = encodeURIComponent(
        service.slug || ''
    );

    const categoryName = escapeHTML(
        service.category_name || 'خدمة أكاديمية'
    );

    const shortDescription = escapeHTML(
        service.short_description || ''
    );

    const reviewsCount =
        Number(service.reviews_count) || 0;

    const viewsCount =
        Number(service.views_count) || 0;

    const serviceId =
        Number(service.id) || 0;

    const coverHTML = coverImage
        ? `
            <div class="h-44 w-full bg-slate-900 overflow-hidden relative">

                <img
                    src="${escapeHTML(coverImage)}"
                    alt="${serviceTitle}"
                    class="w-full h-full object-cover transition duration-500 hover:scale-105"
                    loading="lazy"
                    onerror="this.style.display='none'"
                >

                <span class="absolute top-3 right-3 text-[11px] font-bold text-slate-900 bg-gold/90 backdrop-blur-md px-3 py-1 rounded-full shadow-md">
                    ${categoryName}
                </span>

            </div>
        `
        : `
            <div class="p-6 pb-0">
                <div class="flex items-center justify-between">

                    <span class="text-xs font-bold text-petrol bg-petrol/10 px-3 py-1 rounded-full">
                        ${categoryName}
                    </span>

                </div>
            </div>
        `;

    return `
        <div
            class="service-card bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
            data-service-id="${serviceId}"
        >

            <div>

                ${coverHTML}

                <div class="p-6 space-y-3">

                    <h3 class="text-lg font-bold text-slate-900 leading-snug hover:text-petrol transition">

                        <a
                            href="service-details.html?slug=${serviceSlug}"
                        >
                            ${serviceTitle}
                        </a>

                    </h3>

                    <p class="text-slate-600 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                        ${shortDescription}
                    </p>

                </div>

            </div>


            <div class="p-6 pt-0 space-y-4">

                <div class="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">

                    <span class="flex items-center gap-1.5 font-bold text-slate-700">

                        <i class="fas fa-star text-amber-400"></i>

                        <span>
                            ${ratingValue}
                        </span>

                        <span class="text-slate-400 font-normal">
                            (${reviewsCount})
                        </span>

                    </span>


                    <span class="text-slate-400 text-[11px]">

                        <i class="fas fa-eye ml-1"></i>

                        ${viewsCount}

                    </span>

                </div>


                <div class="grid grid-cols-2 gap-2">

                    <a
                        href="service-details.html?slug=${serviceSlug}"
                        class="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs text-center transition flex items-center justify-center gap-1"
                    >
                        <span>التفاصيل</span>

                        <i class="fas fa-arrow-left text-[10px]"></i>
                    </a>


                    <button
                        type="button"
                        onclick="sendServiceWhatsAppById(${serviceId})"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs text-center transition flex items-center justify-center gap-1 shadow-md shadow-emerald-900/10"
                    >

                        <i class="fab fa-whatsapp text-sm"></i>

                        <span>طلب مباشر</span>

                    </button>

                </div>

            </div>

        </div>
    `;
}


/**
 * إرسال واتساب اعتمادًا على ID الخدمة
 * أفضل من وضع اسم الخدمة مباشرة داخل onclick
 */
function sendServiceWhatsAppById(serviceId) {
    const service = allServicesData.find(
        item => Number(item.id) === Number(serviceId)
    );

    if (!service) {
        showToast(
            'تعذر العثور على بيانات الخدمة',
            'error'
        );
        return;
    }

    sendServiceWhatsApp(service.title);
}


// ==================== [ الصفحة الرئيسية ] ====================

/**
 * تحميل الخدمات المميزة
 */
async function loadFeaturedServices() {
    const container =
        document.getElementById('featured-services') ||
        document.getElementById('services-grid-container');

    if (!container) {
        return;
    }

    try {
        const response = await fetch('/api/services');

        if (!response.ok) {
            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }

        const result = await response.json();

        if (
            result.success &&
            Array.isArray(result.data) &&
            result.data.length > 0
        ) {
            container.innerHTML = '';

            const featuredList =
                result.data.slice(0, 6);

            featuredList.forEach(service => {
                container.insertAdjacentHTML(
                    'beforeend',
                    createServiceCardHTML(service)
                );
            });

        } else {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-200/80 p-8">

                    <i class="fas fa-box-open text-4xl text-slate-300 mb-3 block"></i>

                    <p class="text-slate-500 font-bold text-sm">
                        لا توجد خدمات معروضة حالياً.
                    </p>

                </div>
            `;
        }

    } catch (error) {

        console.error(
            'loadFeaturedServices error:',
            error
        );

        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-rose-500 font-bold text-sm">

                تعذر جلب الخدمات.
                يرجى إعادة المحاولة لاحقاً.

            </div>
        `;
    }
}


// ==================== [ صفحة الخدمات ] ====================

/**
 * تحميل الأقسام والخدمات
 */
async function loadServicesPageData() {
    const gridContainer =
        document.getElementById('all-services-grid') ||
        document.getElementById('services-grid-container');

    if (!gridContainer) {
        console.warn(
            'لم يتم العثور على حاوية الخدمات'
        );
        return;
    }

    try {

        const [
            categoriesRes,
            servicesRes
        ] = await Promise.all([
            fetch('/api/categories'),
            fetch('/api/services')
        ]);

        if (!categoriesRes.ok) {
            throw new Error(
                `Categories HTTP Error: ${categoriesRes.status}`
            );
        }

        if (!servicesRes.ok) {
            throw new Error(
                `Services HTTP Error: ${servicesRes.status}`
            );
        }

        const categoriesData =
            await categoriesRes.json();

        const servicesData =
            await servicesRes.json();


        // الأقسام
        if (
            categoriesData.success &&
            Array.isArray(categoriesData.data)
        ) {
            allCategoriesData =
                categoriesData.data;

            renderCategoryFilterButtons();
        }


        // الخدمات
        if (
            servicesData.success &&
            Array.isArray(servicesData.data)
        ) {
            allServicesData =
                servicesData.data;

            renderFilteredServices();

        } else {

            gridContainer.innerHTML = `
                <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-200">

                    <i class="fas fa-box-open text-4xl text-slate-300 mb-3"></i>

                    <p class="text-slate-500 font-bold text-sm">
                        لا توجد خدمات متاحة حالياً.
                    </p>

                </div>
            `;
        }

    } catch (error) {

        console.error(
            'loadServicesPageData error:',
            error
        );

        gridContainer.innerHTML = `
            <div class="col-span-full text-center py-12 text-rose-500 font-bold text-sm">

                حدث خطأ أثناء تحميل دليل الخدمات.

                <br>

                <span class="text-xs text-slate-400">
                    يرجى تحديث الصفحة والمحاولة مرة أخرى.
                </span>

            </div>
        `;
    }
}


/**
 * إنشاء أزرار الأقسام
 */
function renderCategoryFilterButtons() {
    const buttonsContainer =
        document.getElementById(
            'category-filter-buttons'
        );

    if (!buttonsContainer) {
        return;
    }

    let buttonsHTML = `
        <button
            type="button"
            onclick="filterServicesByCategory('all', this)"
            class="category-btn active bg-slate-900 text-gold px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-800 flex items-center gap-2 shadow-sm"
        >

            <i class="fas fa-th-large"></i>

            <span>الكل</span>

        </button>
    `;


    allCategoriesData.forEach(category => {

        const slug = escapeHTML(
            category.slug || ''
        );

        const name = escapeHTML(
            category.name || 'قسم'
        );

        const icon = escapeHTML(
            category.icon || 'fa-folder'
        );

        buttonsHTML += `
            <button
                type="button"
                onclick="filterServicesByCategory('${slug}', this)"
                class="category-btn bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-300/60 hover:bg-slate-300 flex items-center gap-2"
            >

                <i class="fas ${icon}"></i>

                <span>${name}</span>

            </button>
        `;
    });


    buttonsContainer.innerHTML =
        buttonsHTML;
}


/**
 * فلترة الخدمات حسب القسم
 */
function filterServicesByCategory(
    categorySlug,
    buttonElement
) {
    currentCategoryFilter =
        categorySlug || 'all';


    document
        .querySelectorAll('.category-btn')
        .forEach(button => {

            button.classList.remove(
                'active',
                'bg-slate-900',
                'text-gold',
                'border-slate-800'
            );

            button.classList.add(
                'bg-slate-200',
                'text-slate-700',
                'border-slate-300/60'
            );
        });


    if (buttonElement) {

        buttonElement.classList.remove(
            'bg-slate-200',
            'text-slate-700',
            'border-slate-300/60'
        );

        buttonElement.classList.add(
            'active',
            'bg-slate-900',
            'text-gold',
            'border-slate-800'
        );
    }


    renderFilteredServices();
}


/**
 * عرض الخدمات بعد البحث والفلترة
 */
function renderFilteredServices() {
    const gridContainer =
        document.getElementById('all-services-grid') ||
        document.getElementById('services-grid-container');

    if (!gridContainer) {
        return;
    }


    const searchInput =
        document.getElementById(
            'service-search-input'
        );

    const searchQuery =
        searchInput
            ? searchInput.value.trim().toLowerCase()
            : '';


    let filtered =
        Array.isArray(allServicesData)
            ? [...allServicesData]
            : [];


    // فلترة القسم
    if (
        currentCategoryFilter !== 'all'
    ) {
        filtered = filtered.filter(service =>
            String(
                service.category_slug || ''
            ).toLowerCase() ===
            String(
                currentCategoryFilter
            ).toLowerCase()
        );
    }


    // فلترة البحث
    if (searchQuery !== '') {

        filtered = filtered.filter(service => {

            const title =
                String(
                    service.title || ''
                ).toLowerCase();

            const shortDescription =
                String(
                    service.short_description || ''
                ).toLowerCase();

            const fullDescription =
                String(
                    service.full_description || ''
                ).toLowerCase();

            return (
                title.includes(searchQuery) ||
                shortDescription.includes(searchQuery) ||
                fullDescription.includes(searchQuery)
            );
        });
    }


    // لا توجد نتائج
    if (filtered.length === 0) {

        gridContainer.innerHTML = `
            <div class="col-span-full text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8">

                <i class="fas fa-search-minus text-4xl text-slate-300 mb-3 block"></i>

                <p class="text-slate-600 font-bold text-sm">
                    لم نجد أي خدمة تطابق اختيارك أو كلمة البحث.
                </p>

                <button
                    type="button"
                    onclick="resetFilters()"
                    class="mt-4 text-xs font-bold text-petrol underline"
                >
                    إعادة عرض جميع الخدمات
                </button>

            </div>
        `;

        return;
    }


    // عرض النتائج
    gridContainer.innerHTML = '';

    filtered.forEach(service => {

        gridContainer.insertAdjacentHTML(
            'beforeend',
            createServiceCardHTML(service)
        );

    });
}


/**
 * إعادة تعيين البحث والفلترة
 */
function resetFilters() {
    const searchInput =
        document.getElementById(
            'service-search-input'
        );

    if (searchInput) {
        searchInput.value = '';
    }


    currentCategoryFilter = 'all';


    const allButtons =
        document.querySelectorAll(
            '.category-btn'
        );

    if (allButtons.length > 0) {

        filterServicesByCategory(
            'all',
            allButtons[0]
        );

    } else {

        renderFilteredServices();
    }
}


// ==================== [ تفاصيل الخدمة ] ====================

/**
 * تحميل تفاصيل الخدمة
 */
async function loadServiceDetailsPage() {
    const detailsContainer =
        document.getElementById(
            'service-details-container'
        );

    const loadingState =
        document.getElementById(
            'service-loading-state'
        );


    if (!detailsContainer) {
        return;
    }


    const urlParams =
        new URLSearchParams(
            window.location.search
        );

    const slug =
        urlParams.get('slug');


    if (!slug) {

        window.location.href =
            'services.html';

        return;
    }


    try {

        const response =
            await fetch(
                `/api/services/slug/${encodeURIComponent(slug)}`
            );


        if (!response.ok) {
            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }


        const result =
            await response.json();


        if (
            !result.success ||
            !result.data
        ) {

            if (loadingState) {

                loadingState.innerHTML = `
                    <div class="py-12 text-rose-500 font-bold text-sm text-center">

                        عذراً، الخدمة المطلوبة غير موجودة أو تم حذفها.

                        <br>

                        <a
                            href="services.html"
                            class="inline-block mt-4 bg-slate-900 text-gold px-6 py-2.5 rounded-xl font-bold text-xs"
                        >
                            العودة للخدمات
                        </a>

                    </div>
                `;
            }

            return;
        }


        const service =
            result.data;


        document.title =
            `${service.title} | مَسَارُ التَّمَيُّزِ`;


        // القسم
        const categoryBadge =
            document.getElementById(
                'service-category-badge'
            );

        if (categoryBadge) {
            categoryBadge.textContent =
                service.category_name ||
                'خدمة أكاديمية';
        }


        const categoryName =
            document.getElementById(
                'detail-category-name'
            );

        if (categoryName) {
            categoryName.textContent =
                service.category_name ||
                'خدمة أكاديمية';
        }


        // العنوان
        const titleElement =
            document.getElementById(
                'detail-service-title'
            );

        if (titleElement) {
            titleElement.textContent =
                service.title || '';
        }


        // التقييم
        const ratingElement =
            document.getElementById(
                'detail-avg-rating'
            );

        if (ratingElement) {
            ratingElement.textContent =
                parseFloat(
                    service.avg_rating || 5.0
                ).toFixed(1);
        }


        // المشاهدات
        const viewsElement =
            document.getElementById(
                'detail-views-count'
            );

        if (viewsElement) {
            viewsElement.textContent =
                service.views_count || 0;
        }


        // الأعمال
        const worksElement =
            document.getElementById(
                'detail-works-count'
            );

        if (worksElement) {

            worksElement.textContent =
                Array.isArray(service.works)
                    ? service.works.length
                    : 0;
        }


        // الوصف
        const fullDescription =
            document.getElementById(
                'detail-full-description'
            );

        if (fullDescription) {

            fullDescription.textContent =
                service.full_description ||
                service.short_description ||
                '';
        }


        // السعر
        const priceElement =
            document.getElementById(
                'detail-price-info'
            );

        if (priceElement) {

            priceElement.textContent =
                service.price_info ||
                'حسب الاتفاق';
        }


        // مدة التنفيذ
        const timeElement =
            document.getElementById(
                'detail-execution-time'
            );

        if (timeElement) {

            timeElement.textContent =
                service.execution_time ||
                'حسب الموعد النهائي';
        }


        // صورة الغلاف
        if (
            service.cover_image_url &&
            String(
                service.cover_image_url
            ).trim() !== ''
        ) {

            const coverBox =
                document.getElementById(
                    'detail-cover-container'
                );

            const coverImg =
                document.getElementById(
                    'detail-cover-img'
                );


            if (
                coverBox &&
                coverImg
            ) {

                coverImg.src =
                    service.cover_image_url;

                coverImg.alt =
                    service.title || '';

                coverBox.classList.remove(
                    'hidden'
                );
            }
        }


        // زر واتساب
        const whatsappBtn =
            document.getElementById(
                'service-whatsapp-btn'
            );

        if (whatsappBtn) {

            whatsappBtn.onclick = () => {
                sendServiceWhatsApp(
                    service.title
                );
            };
        }


        // ID التقييم
        const reviewServiceIdInput =
            document.getElementById(
                'review-service-id'
            );

        if (reviewServiceIdInput) {

            reviewServiceIdInput.value =
                service.id;
        }


        // الأعمال
        renderServiceWorksList(
            Array.isArray(service.works)
                ? service.works
                : []
        );


        // التقييمات
        renderServiceReviewsList(
            Array.isArray(service.reviews)
                ? service.reviews
                : []
        );


        // إخفاء التحميل وإظهار التفاصيل
        if (loadingState) {
            loadingState.classList.add(
                'hidden'
            );
        }

        detailsContainer.classList.remove(
            'hidden'
        );


    } catch (error) {

        console.error(
            'loadServiceDetailsPage error:',
            error
        );


        if (loadingState) {

            loadingState.innerHTML = `
                <div class="py-12 text-rose-500 font-bold text-sm text-center">

                    تعذر تحميل تفاصيل الخدمة.

                    <br>

                    <span class="text-xs text-slate-400">
                        يرجى المحاولة مرة أخرى.
                    </span>

                </div>
            `;
        }
    }
}


/**
 * عرض الأعمال السابقة
 */
function renderServiceWorksList(works) {
    const container =
        document.getElementById(
            'service-works-grid'
        );

    const badgeCount =
        document.getElementById(
            'works-badge-count'
        );


    if (!container) {
        return;
    }


    if (badgeCount) {

        badgeCount.textContent =
            `${works.length} نماذج`;
    }


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

        const imageUrl =
            escapeHTML(
                work.image_url || ''
            );

        const title =
            escapeHTML(
                work.title || 'نموذج عمل'
            );

        const description =
            escapeHTML(
                work.description || ''
            );


        container.insertAdjacentHTML(
            'beforeend',
            `
                <div class="bg-lightbg rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm space-y-3">

                    <div class="h-48 w-full bg-slate-900 overflow-hidden relative">

                        ${
                            imageUrl
                                ? `
                                    <img
                                        src="${imageUrl}"
                                        alt="${title}"
                                        class="w-full h-full object-cover transition duration-300 hover:scale-105"
                                        loading="lazy"
                                    >
                                `
                                : `
                                    <div class="w-full h-full flex items-center justify-center text-slate-500">
                                        <i class="fas fa-image text-3xl"></i>
                                    </div>
                                `
                        }

                    </div>


                    <div class="p-4 space-y-2">

                        <h4 class="font-bold text-slate-900 text-sm">
                            ${title}
                        </h4>

                        ${
                            description
                                ? `
                                    <p class="text-slate-500 text-xs leading-relaxed">
                                        ${description}
                                    </p>
                                `
                                : ''
                        }

                    </div>

                </div>
            `
        );
    });
}


/**
 * عرض التقييمات
 */
function renderServiceReviewsList(reviews) {
    const container =
        document.getElementById(
            'service-reviews-list'
        );


    if (!container) {
        return;
    }


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

        const studentName =
            escapeHTML(
                review.student_name ||
                'طالب جامعي'
            );

        const comment =
            escapeHTML(
                review.comment || ''
            );


        container.insertAdjacentHTML(
            'beforeend',
            `
                <div class="p-4 bg-lightbg rounded-2xl border border-slate-200/80 space-y-2">

                    <div class="flex items-center justify-between">

                        <span class="font-bold text-slate-900 text-xs">
                            ${studentName}
                        </span>

                        <div class="text-xs flex gap-0.5">

                            ${renderRatingStars(
                                review.rating
                            )}

                        </div>

                    </div>


                    ${
                        comment
                            ? `
                                <p class="text-slate-600 text-xs leading-relaxed">
                                    ${comment}
                                </p>
                            `
                            : ''
                    }

                </div>
            `
        );
    });
}


// ==================== [ التقييمات ] ====================

/**
 * إرسال تقييم جديد
 */
async function handleReviewSubmit(event) {
    event.preventDefault();


    const serviceIdElement =
        document.getElementById(
            'review-service-id'
        );

    const studentNameElement =
        document.getElementById(
            'review-student-name'
        );

    const ratingElement =
        document.getElementById(
            'review-rating'
        );

    const commentElement =
        document.getElementById(
            'review-comment'
        );


    if (!serviceIdElement) {
        return;
    }


    const serviceId =
        serviceIdElement.value;


    const studentName =
        studentNameElement
            ? studentNameElement.value.trim()
            : '';


    const rating =
        ratingElement
            ? ratingElement.value
            : 5;


    const comment =
        commentElement
            ? commentElement.value.trim()
            : '';


    if (!serviceId) {

        showToast(
            'تعذر تحديد الخدمة',
            'error'
        );

        return;
    }


    if (!studentName) {

        showToast(
            'يرجى إدخال الاسم',
            'error'
        );

        return;
    }


    try {

        const response =
            await fetch(
                '/api/reviews',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        service_id:
                            parseInt(
                                serviceId
                            ),

                        student_name:
                            studentName,

                        rating:
                            parseInt(
                                rating
                            ),

                        comment:
                            comment
                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }


        const result =
            await response.json();


        if (result.success) {

            showToast(
                'شكراً لك! تم إضافة تقييمك بنجاح'
            );


            const form =
                document.getElementById(
                    'add-review-form'
                );

            if (form) {
                form.reset();
            }


            const urlParams =
                new URLSearchParams(
                    window.location.search
                );

            const slug =
                urlParams.get('slug');


            if (slug) {

                await loadServiceDetailsPage();
            }


        } else {

            showToast(
                result.message ||
                'حدث خطأ أثناء إرسال التقييم',
                'error'
            );
        }


    } catch (error) {

        console.error(
            'handleReviewSubmit error:',
            error
        );

        showToast(
            'تعذر إرسال التقييم، يرجى المحاولة لاحقاً',
            'error'
        );
    }
}


// ==================== [ التهيئة ] ====================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        // تسجيل الزيارة
        recordPageVisit();


        const path =
            window.location.pathname;

        const href =
            window.location.href;


        /*
         * تحديد الصفحة الحالية
         */

        // صفحة الخدمات
        if (
            path.includes('services') ||
            href.includes('services.html')
        ) {

            loadServicesPageData();


            const searchInput =
                document.getElementById(
                    'service-search-input'
                );


            if (searchInput) {

                searchInput.addEventListener(
                    'input',
                    renderFilteredServices
                );
            }


            return;
        }


        // صفحة تفاصيل الخدمة
        if (
            path.includes(
                'service-details'
            ) ||
            href.includes(
                'service-details.html'
            )
        ) {

            loadServiceDetailsPage();

            return;
        }


        // الصفحة الرئيسية
        loadFeaturedServices();
    }
);


// ==================== [ إتاحة الدوال للـ HTML ] ====================

window.sendServiceWhatsApp =
    sendServiceWhatsApp;

window.sendServiceWhatsAppById =
    sendServiceWhatsAppById;

window.filterServicesByCategory =
    filterServicesByCategory;

window.resetFilters =
    resetFilters;

window.handleReviewSubmit =
    handleReviewSubmit;

window.showToast =
    showToast;
