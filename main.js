/* ==========================================================================
   مَسَارُ التَّمَيُّزِ
   المحرك الرئيسي للموقع - main.js
   ========================================================================== */


/* ==========================================================================
   1. المتغيرات العامة
   ========================================================================== */

let allServicesData = [];
let allCategoriesData = [];
let currentCategoryFilter = 'all';


/* ==========================================================================
   2. أدوات مساعدة عامة
   ========================================================================== */


/**
 * إرسال طلب خدمة عبر واتساب
 */
function sendServiceWhatsApp(serviceTitle) {

    const phoneNumber = '967736190956';

    const message = encodeURIComponent(
        `السلام عليكم، أرغب في الاستفسار وطلب خدمة: ${serviceTitle}`
    );

    window.open(
        `https://wa.me/${phoneNumber}?text=${message}`,
        '_blank'
    );
}


/**
 * إرسال رسالة واتساب عامة
 */
function sendGeneralWhatsApp() {

    const phoneNumber = '967736190956';

    window.open(
        `https://wa.me/${phoneNumber}`,
        '_blank'
    );
}


/**
 * إنشاء إشعار Toast
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
            ${message}
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
 * توليد نجوم التقييم
 */
function renderRatingStars(rating = 5) {

    const numericRating = Math.min(
        5,
        Math.max(
            1,
            Math.round(parseFloat(rating) || 5)
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


/* ==========================================================================
   3. تسجيل زيارة الصفحة
   ========================================================================== */

async function recordPageVisit() {

    try {

        let pageName =
            window.location.pathname
                .split('/')
                .pop();

        if (!pageName) {
            pageName = 'index.html';
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

        // لا نوقف الموقع إذا فشل تسجيل الزيارة
        console.warn(
            'تعذر تسجيل زيارة الصفحة:',
            error
        );
    }
}


/* ==========================================================================
   4. إنشاء بطاقة الخدمة
   ========================================================================== */

function createServiceCardHTML(service) {

    const ratingValue =
        parseFloat(service.avg_rating || 5.0).toFixed(1);

    const coverImage =
        service.cover_image_url &&
        String(service.cover_image_url).trim() !== ''
            ? service.cover_image_url
            : null;

    const title =
        service.title || 'خدمة بدون عنوان';

    const shortDescription =
        service.short_description || 'لا يوجد وصف للخدمة.';

    const categoryName =
        service.category_name || 'خدمة أكاديمية';

    const slug =
        service.slug || '';

    const reviewsCount =
        service.reviews_count || 0;

    const viewsCount =
        service.views_count || 0;

    /*
     * حماية بسيطة للنص الذي سيتم إرساله إلى onclick
     */
    const safeTitle =
        String(title)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;');

    return `

        <div class="service-card bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">

            <div>

                ${
                    coverImage
                        ? `
                            <div class="h-44 w-full bg-slate-900 overflow-hidden relative">

                                <img
                                    src="${coverImage}"
                                    alt="${title}"
                                    class="w-full h-full object-cover transition duration-500 hover:scale-105"
                                >

                                <span class="absolute top-3 right-3 text-[11px] font-bold text-slate-900 bg-gold/90 backdrop-blur-md px-3 py-1 rounded-full shadow-md">
                                    ${categoryName}
                                </span>

                            </div>
                        `
                        : ''
                }


                <div class="p-6 space-y-3">

                    ${
                        !coverImage
                            ? `
                                <div class="flex items-center justify-between">

                                    <span class="text-xs font-bold text-petrol bg-petrol/10 px-3 py-1 rounded-full">
                                        ${categoryName}
                                    </span>

                                </div>
                            `
                            : ''
                    }


                    <h3 class="text-lg font-bold text-slate-900 leading-snug hover:text-petrol transition">

                        <a
                            href="service-details.html?slug=${encodeURIComponent(slug)}"
                        >
                            ${title}
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
                        href="service-details.html?slug=${encodeURIComponent(slug)}"
                        class="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs text-center transition flex items-center justify-center gap-1"
                    >

                        <span>
                            التفاصيل
                        </span>

                        <i class="fas fa-arrow-left text-[10px]"></i>

                    </a>


                    <button
                        type="button"
                        onclick="sendServiceWhatsApp('${safeTitle}')"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs text-center transition flex items-center justify-center gap-1 shadow-md shadow-emerald-900/10"
                    >

                        <i class="fab fa-whatsapp text-sm"></i>

                        <span>
                            طلب مباشر
                        </span>

                    </button>

                </div>

            </div>

        </div>

    `;
}


/* ==========================================================================
   5. الصفحة الرئيسية
   ========================================================================== */

async function loadFeaturedServices() {

    const container =
        document.getElementById('featured-services') ||
        document.getElementById('services-grid-container');

    /*
     * الصفحة الرئيسية الحالية التي أرسلتها لا تحتوي على
     * featured-services، لذلك لا نفعل شيئاً هنا.
     */
    if (!container) {
        return;
    }

    try {

        const response =
            await fetch('/api/services');

        if (!response.ok) {
            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }

        const result =
            await response.json();

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
            'خطأ في تحميل الخدمات المميزة:',
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


/* ==========================================================================
   6. تحميل صفحة الخدمات
   ========================================================================== */

async function loadServicesPageData() {

    const gridContainer =
        document.getElementById('all-services-grid') ||
        document.getElementById('services-grid-container');

    if (!gridContainer) {
        console.warn(
            'لم يتم العثور على شبكة الخدمات.'
        );
        return;
    }

    try {

        /*
         * جلب التصنيفات والخدمات معاً
         */
        const [
            categoriesRes,
            servicesRes
        ] = await Promise.all([

            fetch('/api/categories'),

            fetch('/api/services')

        ]);


        /*
         * التحقق من نجاح HTTP
         */
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


        /* ==============================
           التصنيفات
           ============================== */

        if (
            categoriesData.success &&
            Array.isArray(categoriesData.data)
        ) {

            allCategoriesData =
                categoriesData.data;

            renderCategoryFilterButtons();

        } else {

            console.warn(
                'لم يتم تحميل التصنيفات.',
                categoriesData
            );
        }


        /* ==============================
           الخدمات
           ============================== */

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
            'خطأ في تحميل دليل الخدمات:',
            error
        );

        gridContainer.innerHTML = `

            <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-rose-200">

                <i class="fas fa-triangle-exclamation text-4xl text-rose-400 mb-3"></i>

                <p class="text-rose-500 font-bold text-sm">
                    حدث خطأ أثناء تحميل دليل الخدمات.
                </p>

                <p class="text-slate-400 text-xs mt-2">
                    تأكد من تشغيل الخادم وواجهات API.
                </p>

                <button
                    type="button"
                    onclick="loadServicesPageData()"
                    class="mt-4 bg-petrol text-gold px-5 py-2.5 rounded-xl text-xs font-bold"
                >
                    إعادة المحاولة
                </button>

            </div>

        `;
    }
}


/* ==========================================================================
   7. إنشاء أزرار التصنيفات
   ========================================================================== */

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
            class="category-btn active bg-slate-900 text-gold px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-800 flex items-center gap-2 shadow-sm whitespace-nowrap"
        >

            <i class="fas fa-th-large"></i>

            <span>
                الكل
            </span>

        </button>

    `;


    allCategoriesData.forEach(category => {

        const slug =
            category.slug || '';

        const name =
            category.name || 'تصنيف';

        const icon =
            category.icon || 'fa-folder';


        buttonsHTML += `

            <button
                type="button"
                onclick="filterServicesByCategory('${slug}', this)"
                class="category-btn bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-300/60 hover:bg-slate-300 flex items-center gap-2 whitespace-nowrap"
            >

                <i class="fas ${icon}"></i>

                <span>
                    ${name}
                </span>

            </button>

        `;

    });


    buttonsContainer.innerHTML =
        buttonsHTML;
}


/* ==========================================================================
   8. فلترة الخدمات حسب التصنيف
   ========================================================================== */

function filterServicesByCategory(
    categorySlug,
    buttonElement
) {

    currentCategoryFilter =
        categorySlug || 'all';


    /*
     * تحديث شكل الأزرار
     */
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


    /*
     * تفعيل الزر الحالي
     */
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


/* ==========================================================================
   9. البحث + فلترة الخدمات
   ========================================================================== */

function renderFilteredServices() {

    const gridContainer =
        document.getElementById('all-services-grid') ||
        document.getElementById('services-grid-container');

    const searchInput =
        document.getElementById(
            'service-search-input'
        );


    if (!gridContainer) {
        return;
    }


    const searchQuery =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : '';


    let filtered =
        Array.isArray(allServicesData)
            ? [...allServicesData]
            : [];


    /*
     * فلترة التصنيف
     */
    if (
        currentCategoryFilter &&
        currentCategoryFilter !== 'all'
    ) {

        filtered =
            filtered.filter(service => {

                return (
                    service.category_slug ===
                    currentCategoryFilter
                );

            });
    }


    /*
     * فلترة البحث
     */
    if (searchQuery !== '') {

        filtered =
            filtered.filter(service => {

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

                const categoryName =
                    String(
                        service.category_name || ''
                    ).toLowerCase();


                return (

                    title.includes(searchQuery) ||

                    shortDescription.includes(searchQuery) ||

                    fullDescription.includes(searchQuery) ||

                    categoryName.includes(searchQuery)

                );

            });
    }


    /*
     * لا توجد نتائج
     */
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


    /*
     * عرض الخدمات
     */
    gridContainer.innerHTML = '';

    filtered.forEach(service => {

        gridContainer.insertAdjacentHTML(
            'beforeend',
            createServiceCardHTML(service)
        );

    });
}


/* ==========================================================================
   10. إعادة ضبط البحث والتصنيفات
   ========================================================================== */

function resetFilters() {

    const searchInput =
        document.getElementById(
            'service-search-input'
        );

    if (searchInput) {
        searchInput.value = '';
    }


    currentCategoryFilter =
        'all';


    const allButton =
        document.querySelector(
            '#category-filter-buttons .category-btn'
        );


    if (allButton) {

        filterServicesByCategory(
            'all',
            allButton
        );

    } else {

        renderFilteredServices();

    }
}


/* ==========================================================================
   11. صفحة تفاصيل الخدمة
   ========================================================================== */

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


        /*
         * عنوان الصفحة
         */
        document.title =
            `${service.title} | مَسَارُ التَّمَيُّزِ`;


        /*
         * تعبئة البيانات
         */

        setText(
            'service-category-badge',
            service.category_name ||
            'خدمة أكاديمية'
        );

        setText(
            'detail-category-name',
            service.category_name ||
            'خدمة أكاديمية'
        );

        setText(
            'detail-service-title',
            service.title
        );

        setText(
            'detail-avg-rating',
            parseFloat(
                service.avg_rating || 5
            ).toFixed(1)
        );

        setText(
            'detail-views-count',
            service.views_count || 1
        );

        setText(
            'detail-works-count',
            service.works
                ? service.works.length
                : 0
        );

        setText(
            'detail-full-description',
            service.full_description ||
            service.short_description ||
            ''
        );

        setText(
            'detail-price-info',
            service.price_info ||
            'حسب الاتفاق'
        );

        setText(
            'detail-execution-time',
            service.execution_time ||
            'حسب الموعد النهائي'
        );


        /*
         * صورة الغلاف
         */

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


        /*
         * زر واتساب
         */

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


        /*
         * ID التقييم
         */

        const reviewServiceIdInput =
            document.getElementById(
                'review-service-id'
            );


        if (reviewServiceIdInput) {

            reviewServiceIdInput.value =
                service.id;

        }


        /*
         * الأعمال
         */

        renderServiceWorksList(
            service.works || []
        );


        /*
         * التقييمات
         */

        renderServiceReviewsList(
            service.reviews || []
        );


        /*
         * إظهار الصفحة
         */

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
            'خطأ في تحميل تفاصيل الخدمة:',
            error
        );


        if (loadingState) {

            loadingState.innerHTML = `

                <div class="py-12 text-rose-500 font-bold text-sm text-center">

                    تعذر تحميل تفاصيل الخدمة.

                    <br>

                    يرجى المحاولة مرة أخرى.

                </div>

            `;
        }
    }
}


/**
 * تعيين نص لعنصر بأمان
 */
function setText(elementId, value) {

    const element =
        document.getElementById(elementId);

    if (element) {

        element.textContent =
            value ?? '';

    }
}


/* ==========================================================================
   12. نماذج الأعمال
   ========================================================================== */

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


    const safeWorks =
        Array.isArray(works)
            ? works
            : [];


    if (badgeCount) {

        badgeCount.textContent =
            `${safeWorks.length} نماذج`;

    }


    if (safeWorks.length === 0) {

        container.innerHTML = `

            <div class="col-span-full text-center py-8 bg-lightbg rounded-2xl border border-slate-200/80 text-slate-500 text-xs">

                لا تتوفر نماذج أعمال معروضة لهذه الخدمة حالياً.

            </div>

        `;

        return;
    }


    container.innerHTML = '';


    safeWorks.forEach(work => {

        container.insertAdjacentHTML(
            'beforeend',
            `

                <div class="bg-lightbg rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm space-y-3">

                    <div class="h-48 w-full bg-slate-900 overflow-hidden relative">

                        <img
                            src="${work.image_url || ''}"
                            alt="${work.title || ''}"
                            class="w-full h-full object-cover transition duration-300 hover:scale-105"
                        >

                    </div>

                    <div class="p-4 space-y-2">

                        <h4 class="font-bold text-slate-900 text-sm">
                            ${work.title || ''}
                        </h4>

                        ${
                            work.description
                                ? `
                                    <p class="text-slate-500 text-xs leading-relaxed">
                                        ${work.description}
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


/* ==========================================================================
   13. تقييمات الخدمة
   ========================================================================== */

function renderServiceReviewsList(reviews) {

    const container =
        document.getElementById(
            'service-reviews-list'
        );


    if (!container) {
        return;
    }


    const safeReviews =
        Array.isArray(reviews)
            ? reviews
            : [];


    if (safeReviews.length === 0) {

        container.innerHTML = `

            <div class="text-center py-6 bg-lightbg rounded-2xl border border-slate-200/80 text-slate-500 text-xs">

                كن أول من يضيف تقييماً لهذه الخدمة!

            </div>

        `;

        return;
    }


    container.innerHTML = '';


    safeReviews.forEach(review => {

        container.insertAdjacentHTML(
            'beforeend',
            `

                <div class="p-4 bg-lightbg rounded-2xl border border-slate-200/80 space-y-2">

                    <div class="flex items-center justify-between">

                        <span class="font-bold text-slate-900 text-xs">

                            ${review.student_name || 'طالب جامعي'}

                        </span>

                        <div class="text-xs flex gap-0.5">

                            ${renderRatingStars(
                                review.rating
                            )}

                        </div>

                    </div>

                    ${
                        review.comment
                            ? `
                                <p class="text-slate-600 text-xs leading-relaxed">
                                    ${review.comment}
                                </p>
                            `
                            : ''
                    }

                </div>

            `
        );

    });
}


/* ==========================================================================
   14. إرسال تقييم جديد
   ========================================================================== */

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


    if (
        !serviceIdElement ||
        !studentNameElement ||
        !ratingElement ||
        !commentElement
    ) {

        showToast(
            'تعذر العثور على حقول التقييم.',
            'error'
        );

        return;
    }


    const serviceId =
        serviceIdElement.value;

    const studentName =
        studentNameElement.value.trim();

    const rating =
        ratingElement.value;

    const comment =
        commentElement.value.trim();


    if (!serviceId) {

        showToast(
            'معرف الخدمة غير موجود.',
            'error'
        );

        return;
    }


    if (!studentName) {

        showToast(
            'يرجى كتابة اسمك.',
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
                                serviceId,
                                10
                            ),

                        student_name:
                            studentName,

                        rating:
                            parseInt(
                                rating,
                                10
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


            /*
             * إعادة تحميل تفاصيل الخدمة
             */
            setTimeout(() => {

                loadServiceDetailsPage();

            }, 500);


        } else {

            showToast(
                result.message ||
                'حدث خطأ أثناء إرسال التقييم',
                'error'
            );
        }


    } catch (error) {

        console.error(
            'خطأ في إرسال التقييم:',
            error
        );


        showToast(
            'تعذر إرسال التقييم، يرجى المحاولة لاحقاً',
            'error'
        );
    }
}


/* ==========================================================================
   15. تحديد الصفحة الحالية
   ========================================================================== */

function getCurrentPage() {

    const path =
        window.location.pathname
            .toLowerCase();


    /*
     * إزالة / من نهاية المسار
     */
    const cleanPath =
        path.replace(/\/+$/, '');


    const pageName =
        cleanPath
            .split('/')
            .pop();


    return pageName || 'index.html';
}


/* ==========================================================================
   16. تشغيل الموقع
   ========================================================================== */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        console.log(
            'main.js تم تحميله بنجاح'
        );


        /*
         * تسجيل الزيارة
         */
        recordPageVisit();


        const currentPage =
            getCurrentPage();


        console.log(
            'الصفحة الحالية:',
            currentPage
        );


        /* ==========================================
           صفحة الخدمات
           ========================================== */

        if (
            currentPage === 'services.html' ||
            currentPage === 'services'
        ) {

            console.log(
                'تشغيل صفحة الخدمات...'
            );


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


        /* ==========================================
           صفحة تفاصيل الخدمة
           ========================================== */

        if (
            currentPage === 'service-details.html' ||
            currentPage === 'service-details'
        ) {

            console.log(
                'تشغيل صفحة تفاصيل الخدمة...'
            );


            loadServiceDetailsPage();


            return;
        }


        /* ==========================================
           الصفحة الرئيسية
           ========================================== */

        if (
            currentPage === 'index.html' ||
            currentPage === ''
        ) {

            console.log(
                'تشغيل الصفحة الرئيسية...'
            );


            loadFeaturedServices();

            return;
        }


        /*
         * أي صفحة أخرى
         */
        console.log(
            'لا توجد وظائف خاصة لهذه الصفحة.'
        );

    }
);


/* ==========================================================================
   17. إتاحة الدوال للـ HTML
   ========================================================================== */

window.sendServiceWhatsApp =
    sendServiceWhatsApp;

window.sendGeneralWhatsApp =
    sendGeneralWhatsApp;

window.filterServicesByCategory =
    filterServicesByCategory;

window.resetFilters =
    resetFilters;

window.handleReviewSubmit =
    handleReviewSubmit;

window.loadServicesPageData =
    loadServicesPageData;

window.loadServiceDetailsPage =
    loadServiceDetailsPage;
