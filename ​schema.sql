-- 1. جدول الأقسام الرئيسية
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT 'fa-folder',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. جدول الخدمات
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    short_description TEXT NOT NULL,
    full_description TEXT,
    cover_image_url TEXT,
    price_info VARCHAR(100) DEFAULT 'حسب الاتفاق',
    execution_time VARCHAR(100) DEFAULT 'حسب الموعد النهائي',
    is_published BOOLEAN DEFAULT true,
    views_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. جدول الأعمال السابقة المرتبطة بالخدمات
CREATE TABLE IF NOT EXISTS works (
    id SERIAL PRIMARY KEY,
    service_id INT REFERENCES services(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. جدول التقييمات
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    service_id INT REFERENCES services(id) ON DELETE CASCADE,
    student_name VARCHAR(100) NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. جدول إحصائيات زوار الموقع
CREATE TABLE IF NOT EXISTS site_stats (
    id SERIAL PRIMARY KEY,
    page_name VARCHAR(100) NOT NULL,
    views_count INT DEFAULT 1,
    last_visited TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إضافة الأقسام الرئيسية الافتراضية
INSERT INTO categories (name, slug, icon, description) VALUES
('📚 الخدمات الأكاديمية', 'academic', 'fa-book-open', 'حل واجبات، تكليفات، أنشطة، وتقارير أكاديمية'),
('🎓 مشاريع الطلاب', 'student-projects', 'fa-graduation-cap', 'مشاريع مواد، أفكار وتوثيق مشاريع تخرج'),
('💻 البرمجة وتقنية المعلومات', 'programming', 'fa-code', 'مشاريع Python, Java, قواعد بيانات، ومواقع'),
('📊 الإحصاء وتحليل البيانات', 'statistics', 'fa-chart-bar', 'تحليل Excel, SPSS, ورسوم بيانية'),
('🎨 التصميم والعروض', 'design', 'fa-palette', 'عروض PowerPoint, أفيشات، وبوستر المناقشة'),
('🗺️ الهندسة والمخططات', 'engineering', 'fa-drafting-compass', 'مخططات AutoCAD, Revit, وخرائط GIS'),
('🎓 الدراسات العليا', 'postgraduate', 'fa-university', 'مقترحات أبحاث، خطط، وتنسيق رسائل'),
('📄 الخدمات الطلابية', 'general-services', 'fa-file-alt', 'نماذج، خطوط، وتنسيق المستندات')
ON CONFLICT (slug) DO NOTHING;
