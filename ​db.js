const { Pool } = require('pg');
require('dotenv').config();

// تهيئة الاتصال بقاعدة بيانات PostgreSQL باستخدام الرابط من متغيرات البيئة
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') 
        ? false 
        : { rejectUnauthorized: false } // تفعيل SSL الآمن على خوادم Render
});

// اختبار الاتصال عند التشغيل
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات PostgreSQL:', err.stack);
    } else {
        console.log('✅ تم الاتصال بنجاح بقاعدة البيانات PostgreSQL على Render');
        release();
    }
});

// دالة تنفيذ الاستعلامات التصديرية
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
