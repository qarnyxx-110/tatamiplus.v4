# اتصال فرانت‌اند Django به بک‌اند تاتامی پلاس

**مرجع قرارداد:** `Radinsharifi/Tatami-demo`، شاخه `main`  
**سند مرجع بک‌اند:** `FRONTEND_BACKEND_HANDOFF_FA.md`  
**تاریخ تطبیق:** ۱۵ نوامبر ۲۰۲۶

## معماری قطعی

این پروژه یک برنامهٔ Django با رندر سمت سرور است؛ API مبتنی بر JSON، CORS یا احراز هویت token-based در قرارداد فعلی وجود ندارد. اتصال فرانت‌اند باید از طریق Django Templates، نام routeهای Django، فرم‌های HTML، Session، پیام‌های Django و CSRF انجام شود. HTMX یا Fetch/JSON را برای عملیاتی که endpoint آن در قرارداد تعریف نشده نسازید.

فرانت‌اند مسئول HTML، CSS، واکنش‌گرایی، دسترس‌پذیری و JavaScript کمکی است. مدل، migration، URL، View، Form، مجوز، موجودی، محاسبه مبلغ و قواعد تجاری متعلق به بک‌اند هستند.

## فایل‌های فرانت‌اند برای انتقال به مخزن بک‌اند

این مسیرها در مخزن فرانت‌اند نگهداری می‌شوند و هنگام انتقال باید به مقصد زیر کپی شوند:

| مخزن فرانت‌اند | مقصد در مخزن Django |
| --- | --- |
| `django/templates/base.html` | `templates/base.html` |
| `django/static/css/backend-templates.css` | `static/css/backend-templates.css` |
| `django/static/css/tatami.css` | `static/css/tatami.css` |
| `django/static/js/tatami.js` | `static/js/tatami.js` |

فایل `static/css/styles.css` فعلی بک‌اند حفظ می‌شود و باید پیش از فایل‌های جدید بارگذاری شود؛ این فایل همچنان کلاس‌های قالب‌های فعلی را تأمین می‌کند. پوستهٔ جدید سپس CSS مشترک و لایهٔ سازگاری قالب‌های Django را بارگذاری می‌کند.

**فونت:** در جست‌وجوی هر دو مخزن GitHub، فایل WOFF2 محلیِ قابل تأیید پیدا نشد. در این تغییر به Google Fonts وابسته نمی‌شویم و از fallback سیستم استفاده می‌شود. برای فعال‌کردن Vazirmatn/Lalezar محلی، فایل‌های مجاز WOFF2 و مجوز آن‌ها باید از مالک پروژه دریافت شود.

## قراردادهای واقعی و آمادهٔ اتصال

### احراز هویت با OTP

| عملیات | Route | فیلدهای واقعی |
| --- | --- | --- |
| ورود/ثبت‌نام | `GET, POST /auth/login/` | `phone`, `role` (فقط `student` یا `coach`), `next_url` |
| ارسال مجدد | `POST /auth/otp/send/` | شماره در Session؛ CSRF الزامی |
| تأیید کد | `GET, POST /auth/otp/verify/` | `code`، دقیقاً ۵ رقم |
| تکمیل پروفایل | `GET, POST /auth/complete-profile/` | `name`, `city`, `role` |
| خروج | `POST /accounts/logout/` | CSRF الزامی |

ثبت‌نام صفحهٔ جداگانه ندارد. شمارهٔ همراه موجود وارد همان حساب می‌شود؛ شمارهٔ جدید پس از OTP حساب می‌سازد. ارسال مجدد از سمت سرور محدودیت ۶۰ ثانیه دارد؛ کد پس از ۱۲۰ ثانیه منقضی می‌شود. ارقام فارسی و عربی توسط فرم سرور پذیرفته و نرمال می‌شوند. نقش باشگاه در بک‌اند وجود ندارد؛ آن را در UI به‌عنوان حساب قابل ساخت نمایش ندهید.

نام‌های route معتبر عبارت‌اند از `phone_auth:login`، `phone_auth:send_otp`، `phone_auth:verify_otp` و `phone_auth:complete_profile`. مسیرهای قدیمی `accounts:register` و `accounts:login` فقط redirect سازگار هستند.

### مربیان

- فهرست عمومی: `GET /coaches/` با route name برابر `coaches:directory`.
- پروفایل عمومی: `GET /coaches/<profile_id>/` با route name برابر `coaches:profile_detail`; فقط درخواست‌های تأییدشده و پروفایل‌های منتشرشده قابل مشاهده‌اند.
- درخواست مربی: `GET, POST /coaches/apply/`؛ فیلدهای `coaching_level`, `specializations`, `years_experience`, `club_name`, `certificate_details`, `certificate_document`. فرم فایل باید `multipart/form-data` باشد؛ مدرک PDF/JPG/JPEG/PNG و حداکثر ۱۰ مگابایت.
- وضعیت درخواست: `GET /coaches/application/`.
- ویرایش پروفایل: `GET, POST /coaches/portfolio/`.
- پنل دوره‌ها: namespace برابر `coach_panel`; فهرست `coach_panel:course_list`، ایجاد `coach_panel:course_create`، ویرایش `coach_panel:course_edit`.
- مدیریت کد دعوت: namespace برابر `coach_students`; فهرست `coach_students:list` و فعال/غیرفعال‌کردن کد با POST و CSRF.

پروفایل عمومی مربی توسط تیم منتشر می‌شود؛ ارسال درخواست به‌تنهایی آن را عمومی نمی‌کند.

### فروشگاه و سبد خرید

- فهرست: `GET /store/` با پارامترهای GET برابر `query`, `category`, `size`, `color`, `training_level`, `min_price`, `max_price`, `sort`, `page`.
- مرتب‌سازی معتبر: `price_asc`, `price_desc`, `name`.
- جزئیات و افزودن به سبد: `GET, POST /store/<slug>/`; فیلدهای POST برابر `variant` (شناسهٔ تنوع) و `quantity` (عدد صحیح مثبت).
- سبد: `GET /store/cart/`; مهمان با Session و کاربر واردشده با حساب ذخیره می‌شود. ادغام سبد مهمان پس از ورود توسط بک‌اند انجام می‌شود.
- به‌روزرسانی: `POST /store/cart/items/<item_id>/update/` با فیلد `quantity`.
- حذف: `POST /store/cart/items/<item_id>/remove/`.
- همهٔ فرم‌های POST باید CSRF داشته باشند. قیمت، موجودی و جمع سبد فقط از سرور معتبرند؛ هیچ مبلغی از مرورگر ارسال یا به‌عنوان مرجع مالی استفاده نشود.

صفحه‌بندی فعلی بک‌اند ۱۲ محصول در هر صفحه است. تا وقتی بک‌اند تغییر نکند، UI نباید ادعای ۲۴ محصول در هر صفحه داشته باشد. کاتالوگ واقعی در وضعیت فعلی خالی است و تصاویر/نگاشت کاتالوگ هنوز در workspace بک‌اند نیستند؛ empty state باید طبیعی باشد.

### Checkout و پرداخت

- نشانی: `GET, POST /checkout/address/`; انتخاب نشانی موجود با `address_id` یا ثبت نشانی جدید با فیلدهای `receiver_name`, `receiver_phone`, `province`, `city`, `full_address`, `postal_code`, `is_default`.
- بازبینی: `GET /checkout/review/`; مقدارهای `items`, `address`, `subtotal`, `shipping`, `total`, `problems` از context می‌آیند.
- پرداخت: `POST /checkout/pay/` با CSRF؛ هیچ مبلغی از فرم خوانده نمی‌شود.
- callback: `GET /payment/callback/`; فقط نتیجهٔ verify سمت سرور وضعیت را تعیین می‌کند.
- درگاه mock: `/payment/mock/<authority>/` فقط در DEBUG قابل دسترسی است.
- تاریخچه و جزئیات سفارش: `orders:list` و `orders:detail`.

هزینهٔ ارسال فعلی مقدار جایگزین ۵۰٬۰۰۰ تومان است و پیش از انتشار تجاری باید توسط مالک محصول تأیید شود. درگاه واقعی در تنظیم فعلی وجود ندارد؛ `MockGateway` در محیط توسعه قابل استفاده است. در محیط production تا تنظیم امن درگاه واقعی نباید وضعیت پرداخت موفق نمایش داده شود. دکمهٔ پرداخت باید فقط در صفحهٔ بازبینی و مطابق `problems` سرور نمایش داده شود.

### باشگاه مجازی و دوره‌ها

- فهرست دوره‌ها: `GET /club/`; فیلترهای `coach`, `level`, `q`, `page`.
- مربی: `GET /club/coach/<profile_id>/`.
- جزئیات: `GET /club/course/<str:slug>/`; برای slug فارسی URL را با `{% url 'club:course_detail' course.slug %}` بسازید.
- خرید: `POST /club/course/<slug>/buy/` با CSRF.
- پخش: `GET /club/episode/<episode_id>/`; منبع ویدیو فقط از `club:episode_stream` و بعد از بررسی مجوز خوانده شود.
- ثبت اتمام: `POST /club/episode/<episode_id>/complete/` با CSRF؛ عملیات idempotent است.
- پنل مربی: namespace `coach_panel`; فایل‌های دوره/قسمت با `multipart/form-data` ارسال می‌شوند. فیلدهای دوره `title`, `slug`, `description`, `level`, `price`, `cover`; فیلدهای قسمت `title`, `order`, `duration`, `is_free`, `video_file`.

فقط دوره‌های منتشرشده نمایش داده می‌شوند. قسمت اول رایگان است. ویدیوهای پولی URL عمومی ندارند و مسیر stream مجوز را دوباره بررسی می‌کند.

### جم

- تاریخچه: `GET /account/gems/` با route name `gems:history`.
- context شامل `gem_balance` است.
- مقدارهای کسب جم از `GemRule` و ledger سمت سرور می‌آیند؛ در CSS/JS مقدار ثابت یا گردش ساختگی اضافه نشود.
- خرج جم هنوز در Checkout فعال نیست.

## مواردی که هنوز بک‌اند ندارند

داشبوردهای واقعی هنرجو و مربی، برنامهٔ کلاس‌ها، نظرها، جست‌وجوی جغرافیایی باشگاه‌ها، خرج جم در Checkout، حساب مستقل باشگاه، درگاه پرداخت واقعی و کاتالوگ واقعی محصولات در وضعیت فعلی آماده نیستند. این بخش‌ها باید hidden/disabled یا با برچسب نمایشی صریح باقی بمانند؛ صفحهٔ نقشهٔ باشگاه‌ها در Preview به معنی وجود endpoint جغرافیایی در Django نیست.

## چک‌لیست اتصال و تست مشترک

1. انتقال فایل‌های فرانت‌اند از جدول بالا به مقصدهای متناظر در مخزن Django.
2. اجرای `python manage.py check` و `python manage.py test` در مخزن بک‌اند.
3. بررسی OTP: شمارهٔ تازه، شمارهٔ موجود، کد اشتباه، انقضا، resend و خروج POST.
4. بررسی مجوز: هنرجو نتواند به پنل مربی برسد؛ مربی تأییدنشده پروفایل عمومی/دورهٔ عمومی نداشته باشد.
5. بررسی فروشگاه: فیلتر GET، انتخاب تنوع، سبد مهمان، ادغام پس از ورود، افزایش تعداد و خطای موجودی.
6. بررسی Checkout: کاربر بدون ورود/سبد/نشانی به مقصد درست هدایت شود؛ قیمت و هزینهٔ ارسال از سرور بیایند؛ callback تکراری دوبار موجودی کم نکند.
7. بررسی دوره: دورهٔ غیرمنتشرشده نمایش داده نشود؛ stream پولی برای کاربر بدون مجوز ۴۰۳ بدهد؛ ثبت اتمام تکراری فقط یک‌بار جم ثبت کند.
8. بررسی جم: ماندهٔ هدر با تاریخچه برابر باشد.
9. تست واکنش‌گرایی در عرض‌های ۳۶۰، ۳۹۰، ۷۶۸ و ۱۰۲۴ پیکسل و با keyboard/focus و reduced-motion.

## نکتهٔ اتصال و تشخیص داده

این پروژه API عمومی JSON ندارد؛ اتصال تولیدی از طریق همان routeها و قالب‌های Django انجام می‌شود. بنابراین صفحهٔ اصلی برای پیش‌نمایش کارت‌ها HTML همان‌مبدأ صفحات واقعی را می‌خواند و صفحات فهرست/جزئیات/فرم‌ها مستقیماً با context و فرم‌های Django رندر می‌شوند. CORS، endpoint ساختگی یا fallback به دادهٔ محلی برای محتوای عملیاتی اضافه نکنید.

برای پیش‌نمایش صفحهٔ اصلی، selectorهای واقعی قالب‌ها عبارت‌اند از:
- محصولات: `.tp-product-grid > .tp-product-card`
- دوره‌ها: `.tp-course-grid > .tp-course-card`
- مربیان: `.tp-coaches > li`

آزمون تعداد کارت‌ها باید همین selectorها را به‌کار ببرد؛ جست‌وجوی کلاس‌های قدیمی مانند `.product-item`، `.coach-row` یا `.course-row` برای قالب‌های جدید معتبر نیست. نبود کارت فقط وقتی empty state واقعی همان صفحه نیز دیده شود، به معنی خالی‌بودن نتیجهٔ query است.

قالب تاریخچهٔ جم باید در مسیر واقعی `templates/gems/history.html` قرار گیرد و از context بک‌اند یعنی `page`، `balance` و `rules` استفاده کند. فایل‌های checkout، OTP و تکمیل پروفایل که در این بسته نیستند، متعلق به بک‌اند هستند و باید بدون جایگزینی/حذف حفظ شوند.

## پل مسیرهای Preview به صفحات واقعی Django

فایل استاتیک preview/index.html اسکریپت preview/assets/django-route-bridge.js را بارگذاری می‌کند. این اسکریپت فقط مسیرهای دارای قرارداد واقعی را به صفحات Django هدایت می‌کند؛ API جدید، CORS، احراز هویت توکنی یا منطق مالی در مرورگر ایجاد نمی‌کند.

| مسیر hash در Preview | مقصد واقعی Django |
| --- | --- |
| #/store | /store/؛ فیلترهای پشتیبانی‌شده به query string سرور منتقل می‌شوند |
| #/product/<id> | نام محصول محلی فقط برای یافتن همان محصول در HTML فروشگاه استفاده می‌شود؛ مقصد نهایی slug واقعی Django است. در نبود تطبیق، جست‌وجوی واقعی نام محصول اجرا می‌شود |
| #/cart | /store/cart/ |
| #/checkout | /checkout/address/ |
| #/login، #/register و #/role | /auth/login/ |
| #/coaches | /coaches/ |
| #/coach-apply و #/coach-application | /coaches/apply/ |
| #/courses | /club/ |
| #/episode/<id> با شناسه عددی | /club/episode/<id>/ |
| #/gems | /account/gems/ |
| #/profile و #/my-profile | /account/ |
| #/orders | /orders/ |

این پل از navigation هم‌مبدأ استفاده می‌کند؛ بنابراین کوکی Session مرورگر به Django می‌رسد و POSTها همچنان از فرم‌های رندرشدهٔ Django، توکن CSRF و اعتبارسنجی سرور استفاده می‌کنند. اسکریپت هیچ قیمت، موجودی، سبد یا تراکنشی را در مرورگر معتبر نمی‌داند.

ماژول‌هایی که در قرارداد بک‌اند وجود ندارند (از جمله نقشه جغرافیایی باشگاه‌ها، داشبوردهای برنامه‌ریزی‌نشده، مربی آنلاین و خرج جم در Checkout) عمداً به مسیر Django هدایت نمی‌شوند و نباید به‌عنوان قابلیت عملیاتی بک‌اند معرفی شوند.

### ترتیب انتشار پل

1. ابتدا فایل‌های django/templates و django/static مجاز در deploy/frontend-manifest.json به اپ Django منتقل شوند؛ فایل‌های backend-owned حفظ شوند.
2. سپس collectstatic اجرا و /store/، /store/cart/، /auth/login/ و /club/ روی دامنه آزمایش شوند.
3. بعد فقط دو فایل preview/index.html و preview/assets/django-route-bridge.js در مسیر عمومی preview/ جایگزین/اضافه شوند.
4. در پایان، مسیرهای hash جدول بالا در مرورگر آزمایش شوند. /preview/ بدون hash باید همچنان همان صفحهٔ اصلی قبلی را نمایش دهد.

اگر کاتالوگ محصول در دیتابیس خالی باشد، فروشگاه باید empty state واقعی Django را نشان دهد؛ هیچ‌گاه برای پرکردن صفحه به کاتالوگ محلی نمایشی برنگردد.
