/* ==========================================================================
   مَسَارُ التَّمَيُّزِ - وحدة التكامل والربط مع واتساب (whatsapp.js)
   ========================================================================== */

// رقم الواتساب الافتراضي (في حال لم يتم الجلب من الخادم بعد)
let globalWhatsAppNumber = "967736190956";

/**
 * جلب إعدادات الرقم الرسمي من API الخادم عند تحميل الصفحة
 */
async function fetchWhatsAppConfig() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const data = await response.json();
            if (data.whatsappNumber) {
                // إزالة أي علامة + أو مسافات إضافية
                globalWhatsAppNumber = data.whatsappNumber.replace(/[^0-9]/g, '');
            }
        }
    } catch (error) {
        console.warn('⚠️ تعذر جلب رقم الواتساب من الخادم، سيتم استخدام الرقم الافتراضي:', error.message);
    }
}

/**
 * دالة إنشاء رابط واتساب ديناميكي مع نص الرسالة المشفرة
 * @param {string} messageText - النص المراد إرساله
 * @returns {string} رابط wa.me المكتمل
 */
function buildWhatsAppUrl(messageText) {
    const encodedMessage = encodeURIComponent(messageText);
    return `https://wa.me/${globalWhatsAppNumber}?text=${encodedMessage}`;
}

/**
 * فتح محادثة الواتساب العامة لتقديم الاستفسارات وطلب الخدمات
 */
function sendGeneralWhatsApp() {
    const defaultMsg = "السلام عليكم، أرغب في الاستفسار عن الخدمات الطلابية والأكاديمية المتاحة لدى منصة مَسَارُ التَّمَيُّزِ.";
    const url = buildWhatsAppUrl(defaultMsg);
    window.open(url, '_blank');
}

/**
 * فتح محادثة الواتساب المخصصة لخدمة محددة عبر اسم الخدمة
 * @param {string} serviceTitle - عنوان الخدمة المطلوبة
 */
function sendServiceWhatsApp(serviceTitle) {
    const serviceName = serviceTitle || "خدمة أكاديمية";
    const customMsg = `السلام عليكم، أرغب في الاستفسار وطلب خدمة: (${serviceName}) لدى منصة مَسَارُ التَّمَيُّزِ.`;
    const url = buildWhatsAppUrl(customMsg);
    window.open(url, '_blank');
}

// تشغيل جلب الرقم المباشر فور تحميل السكريبت
document.addEventListener('DOMContentLoaded', () => {
    fetchWhatsAppConfig();
});

// إتاحة الدوال على المستوى العام (Global Scope) لتعمل مع الأحداث المباشرة (onclick)
window.sendGeneralWhatsApp = sendGeneralWhatsApp;
window.sendServiceWhatsApp = sendServiceWhatsApp;
window.buildWhatsAppUrl = buildWhatsAppUrl;
