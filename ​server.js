const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'masar_default_secret_key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// التهيئة التلقائية لقاعدة البيانات عند بدء الخادم
const initDatabase = async () => {
    try {
        const sqlFilePath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(sqlFilePath)) {
            const sql = fs.readFileSync(sqlFilePath, 'utf8');
            await db.query(sql);
            console.log('✅ تم تجهيز جداول قاعدة البيانات بنجاح.');
        }
    } catch (err) {
        console.error('❌ خطأ أثناء تهيئة جداول قاعدة البيانات:', err.message);
    }
};

// Middleware للتحقق من صلاحيات الآدمن
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'غير مصرح: يتطلب تسجيل الدخول كآدمن' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'جلسة غير صالحة أو منتهية' });
        }
        req.user = user;
        next();
    });
};

// ==================== [ API المسارات والمصادقة ] ====================

// 1. تسجيل دخول اللوحة
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123456';

    if (password === adminPassword) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ success: true, token, message: 'تم تسجيل الدخول بنجاح' });
    }

    return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
});

// 2. جلب إعدادات الموقع العامة (رقم الواتساب)
app.get('/api/config', (req, res) => {
    res.json({
        whatsappNumber: process.env.WHATSAPP_NUMBER || '967770000000'
    });
});

// ==================== [ API الأقسام ] ====================

// جلب جميع الأقسام
app.get('/api/categories', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM categories ORDER BY id ASC');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== [ API الخدمات ] ====================

// جلب جميع الخدمات (مع إمكانية الفلترة حسب القسم)
app.get('/api/services', async (req, res) => {
    try {
        const { category_slug, include_hidden } = req.query;
        let queryText = `
            SELECT s.*, c.name as category_name, c.slug as category_slug,
            COALESCE(AVG(r.rating), 5.0) as avg_rating,
            COUNT(DISTINCT r.id) as reviews_count,
            COUNT(DISTINCT w.id) as works_count
            FROM services s
            LEFT JOIN categories c ON s.category_id = c.id
            LEFT JOIN reviews r ON s.id = r.service_id AND r.is_approved = true
            LEFT JOIN works w ON s.id = w.service_id
        `;
        
        const params = [];
        const conditions = [];

        if (include_hidden !== 'true') {
            conditions.push('s.is_published = true');
        }

        if (category_slug) {
            params.push(category_slug);
            conditions.push(`c.slug = $${params.length}`);
        }

        if (conditions.length > 0) {
            queryText += ' WHERE ' + conditions.join(' AND ');
        }

        queryText += ' GROUP BY s.id, c.id ORDER BY s.created_at DESC';

        const result = await db.query(queryText, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// جلب تفاصيل خدمة واحدة عبر الـ Slug + رفع عداد المشاهدات
app.get('/api/services/slug/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        // زيادة عداد المشاهدات
        await db.query('UPDATE services SET views_count = views_count + 1 WHERE slug = $1', [slug]);

        // جلب بيانات الخدمة
        const serviceResult = await db.query(`
            SELECT s.*, c.name as category_name, c.slug as category_slug
            FROM services s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.slug = $1
        `, [slug]);

        if (serviceResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
        }

        const service = serviceResult.rows[0];

        // جلب الأعمال السابقة الملحقة
        const worksResult = await db.query('SELECT * FROM works WHERE service_id = $1 ORDER BY display_order ASC, id DESC', [service.id]);

        // جلب التقييمات المعتمدة
        const reviewsResult = await db.query('SELECT * FROM reviews WHERE service_id = $1 AND is_approved = true ORDER BY id DESC', [service.id]);

        res.json({
            success: true,
            data: {
                ...service,
                works: worksResult.rows,
                reviews: reviewsResult.rows
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// إضافة خدمة جديدة (آدمن)
app.post('/api/admin/services', verifyAdmin, async (req, res) => {
    try {
        const {
            category_id,
            title,
            slug,
            short_description,
            full_description,
            cover_image_url,
            price_info,
            execution_time,
            is_published
        } = req.body;

        const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9أ-ي]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();

        const result = await db.query(`
            INSERT INTO services 
            (category_id, title, slug, short_description, full_description, cover_image_url, price_info, execution_time, is_published)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            category_id,
            title,
            generatedSlug,
            short_description,
            full_description || '',
            cover_image_url || '',
            price_info || 'حسب الاتفاق',
            execution_time || 'حسب الموعد النهائي',
            is_published !== undefined ? is_published : true
        ]);

        res.json({ success: true, message: 'تمت إضافة الخدمة بنجاح', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// تعديل خدمة (آدمن)
app.put('/api/admin/services/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            category_id,
            title,
            slug,
            short_description,
            full_description,
            cover_image_url,
            price_info,
            execution_time,
            is_published
        } = req.body;

        const result = await db.query(`
            UPDATE services 
            SET category_id = $1, title = $2, slug = $3, short_description = $4, full_description = $5,
                cover_image_url = $6, price_info = $7, execution_time = $8, is_published = $9
            WHERE id = $10
            RETURNING *
        `, [
            category_id, title, slug, short_description, full_description,
            cover_image_url, price_info, execution_time, is_published, id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
        }

        res.json({ success: true, message: 'تم تحديث الخدمة بنجاح', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// تبديل حالة النشر (آدمن)
app.patch('/api/admin/services/:id/toggle', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            UPDATE services SET is_published = NOT is_published WHERE id = $1 RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
        }

        res.json({ success: true, message: 'تم تغيير حالة الخدمة', is_published: result.rows[0].is_published });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// حذف خدمة (آدمن)
app.delete('/api/admin/services/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM services WHERE id = $1', [id]);
        res.json({ success: true, message: 'تم حذف الخدمة بنجاح' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== [ API الأعمال السابقة ] ====================

// جلب الأعمال السابقة لخدمة معينة
app.get('/api/works/service/:serviceId', async (req, res) => {
    try {
        const { serviceId } = req.params;
        const result = await db.query('SELECT * FROM works WHERE service_id = $1 ORDER BY display_order ASC, id DESC', [serviceId]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// إضافة عمل سابق (آدمن)
app.post('/api/admin/works', verifyAdmin, async (req, res) => {
    try {
        const { service_id, title, image_url, description, display_order } = req.body;

        const result = await db.query(`
            INSERT INTO works (service_id, title, image_url, description, display_order)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [service_id, title, image_url, description || '', display_order || 0]);

        res.json({ success: true, message: 'تمت إضافة العمل بنجاح', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// حذف عمل سابق (آدمن)
app.delete('/api/admin/works/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM works WHERE id = $1', [id]);
        res.json({ success: true, message: 'تم حذف العمل بنجاح' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== [ API التقييمات ] ====================

// إضافة تقييم جديد من الطالب
app.post('/api/reviews', async (req, res) => {
    try {
        const { service_id, student_name, rating, comment } = req.body;

        const result = await db.query(`
            INSERT INTO reviews (service_id, student_name, rating, comment, is_approved)
            VALUES ($1, $2, $3, $4, true)
            RETURNING *
        `, [service_id, student_name || 'طالب جامعي', rating || 5, comment || '']);

        res.json({ success: true, message: 'شكراً لك! تم إضافة تقييمك بنجاح', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// حذف تقييم (آدمن)
app.delete('/api/admin/reviews/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM reviews WHERE id = $1', [id]);
        res.json({ success: true, message: 'تم حذف التقييم بنجاح' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== [ API الإحصائيات وإضافة الزيارات ] ====================

// تسجيل زيارة صفحة
app.post('/api/stats/visit', async (req, res) => {
    try {
        const { page_name } = req.body;
        const page = page_name || 'home';

        await db.query(`
            INSERT INTO site_stats (page_name, views_count)
            VALUES ($1, 1)
            ON CONFLICT (id) DO NOTHING
        `, [page]);

        await db.query(`
            UPDATE site_stats SET views_count = views_count + 1, last_visited = CURRENT_TIMESTAMP
            WHERE page_name = $1
        `, [page]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// جلب إحصائيات لوحة التحكم الشاملة (آدمن)
app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
    try {
        const servicesCount = await db.query('SELECT COUNT(*) FROM services');
        const worksCount = await db.query('SELECT COUNT(*) FROM works');
        const reviewsCount = await db.query('SELECT COUNT(*) FROM reviews');
        const totalViews = await db.query('SELECT SUM(views_count) FROM services');

        res.json({
            success: true,
            stats: {
                totalServices: parseInt(servicesCount.rows[0].count),
                totalWorks: parseInt(worksCount.rows[0].count),
                totalReviews: parseInt(reviewsCount.rows[0].count),
                totalViews: parseInt(totalViews.rows[0].sum || 0)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// توجيه كل الصفحات العادية لمجلد الجذر
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// بدء تشغيل الخادم
app.listen(PORT, async () => {
    console.log(`🚀 الخادم يعمل بنجاح على المنفذ: ${PORT}`);
    await initDatabase();
});
