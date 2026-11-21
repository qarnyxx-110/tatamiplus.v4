# اتصال فرانت‌اند Django به بک‌اند تاتامی پلاس

**مرجع قرارداد:** `Radinsharifi/Tatami-demo`، revision فعلی شاخهٔ main و قفل‌شده در CI: `20e96721cc1a589d625fecd3fffa9ec42b1fc64f`  
**سند مرجع بک‌اند:** `FRONTEND_BACKEND_HANDOFF_FA.md`  
**تاریخ تطبیق:** ۲۱ نوامبر ۲۰۲۶

## معماری قطعی

این پروژه یک برنامهٔ Django با رندر سمت سرور است؛ API مبتنی بر JSON، CORS یا احراز هویت token-based در قرارداد فعلی وجود ندارد. اتصال فرانت‌اند باید از طریق Django Templates، نام routeهای Django، فرم‌های HTML، Session، پیام‌های Django و CSRF انجام شود. HTMX یا Fetch/JSON را برای عملیاتی که endpoint آن در قرارداد تعریف نشده نسازید.

فرانت‌اند مسئول HTML، CSS، واکنش‌گرایی، دسترس‌پذیری و JavaScript کمکی است. مدل، migration، URL، View، Form، مجوز، موجودی، محاسبه مبلغ و قواعد تجاری متعلق به بک‌اند هستند.

## فایل‌های فرانت‌اند برای انتقال به مخزن بک‌اند

این مسیرها در مخزن فرانت‌اند نگهداری می‌شوند و هنگام انتقال باید به مقصد زیر کپی شوند:

| مخزن فرانت‌اند | مقصد در مخزن Django |
| --- | --- |
| `django/templates/base.html` | `templates/base.html` |
| `django/static/css/tatami.css` | `static/css/tatami.css` |
| `django/static/css/backend-templates.css` | `static/css/backend-templates.css` |
| `django/static/css/module-pages.css` | `static/css/module-pages.css` |
| `django/static/js/tatami.js` | `static/js/tatami.js` |
| `django/static/js/module-pages.js` | `static/js/module-pages.js` |

پوستهٔ فعال `base.html` فایل‌های `tatami.css`، `backend-templates.css` و `module-pages.css` و اسکریپت‌های `tatami.js` و `module-pages.js` را بارگذاری می‌کند. **عمداً `styles.css` قدیمی را بارگذاری نمی‌کند**؛ کلاس‌های قدیمی مانند `site-header`، `page-main` و `button-dark` بخشی از پوستهٔ فعال نیستند. فایل legacy را برای مسیرهای قدیمی دیگر حذف نکنید، اما آن را دوباره به `base.html` اضافه نکنید.

**محدودهٔ بستهٔ Sections:** نصب‌کنندهٔ cPanel فقط پوشهٔ Preview و ده قالب مشخص را جایگزین می‌کند و هیچ فایل static را کپی یا جایگزین نمی‌کند. در زمان نصب، فایل‌های static بالا باید از استقرار قبلی در `/home/pvchubir/tatamiplus.ir/static/` موجود و قابل دسترسی باشند؛ این پیش‌نیاز را با این بسته تغییر نمی‌دهیم.

**فونت:** در جست‌وجوی هر دو مخزن GitHub، فایل WOFF2 محلیِ قابل تأیید پیدا نشد. در این تغییر به Google Fonts وابسته نمی‌شویم و از fallback سیستم استفاده می‌شود. برای فعال‌کردن Vazirmatn/Lalezar محلی، فایل‌های مجاز WOFF2 و مجوز آن‌ها باید از مالک پروژه دریافت شود.

## قراردادهای واقعی و آمادهٔ اتصال

### احراز هویت، OTP و بازیابی رمز

**منبع تأیید:** `accounts/auth_urls.py`، `accounts/views.py` و `accounts/forms.py` در revision بک‌اندی که CI به آن قفل شده است.

| عملیات | Route واقعی | ورودی GET / Query | فیلدهای POST |
|---|---|---|---|
| ورود با رمز | `GET, POST /auth/login/` | `next` اختیاری | `phone`, `password`, `next_url` |
| ورود/ثبت‌نام پیامکی | `GET, POST /auth/login/sms/` | `role`، `next` اختیاری | `phone`, `role`, `next_url` |
| ارسال دوبارهٔ OTP | `POST /auth/otp/send/` | شماره از Session خوانده می‌شود | بدون فیلد شماره؛ CSRF الزامی |
| تأیید OTP | `GET, POST /auth/otp/verify/` | شماره و نقش از Session | `code` |
| تکمیل پروفایل پس از OTP | `GET, POST /auth/complete-profile/` | - | `name`, `city`, `role`, `password`, `password_confirm` |
| ساخت رمز برای حساب قدیمی | `GET, POST /auth/password/set/` | کاربر باید وارد شده باشد | `password`, `password_confirm` |
| شروع بازیابی رمز | `GET, POST /auth/password/reset/` | - | `phone` |
| تأیید بازیابی و ثبت رمز تازه | `GET, POST /auth/password/reset/confirm/` | شماره از Session خوانده می‌شود | `code`, `password`, `password_confirm` |
| خروج | `POST /accounts/logout/` | - | CSRF الزامی |

نکتهٔ مهم دربارهٔ پارامترها: نام پارامتر مقصد در Query String برابر `next` است؛ مقدار پنهان فرم پس از رندر شدن برابر `next_url` می‌شود. View بک‌اند مقصد را با `_safe_next` به همان host محدود می‌کند. پل فرانت‌اند باید فقط مسیرهای داخلی شناخته‌شده را به `next` تبدیل کند و نباید URL خارجی یا مقدار دلخواه را عبور دهد.

**تطبیق با سورس بک‌اند در revision قفل‌شدهٔ CI:** در `accounts/auth_urls.py` مسیر `/auth/login/` به `password_login` و مسیر `/auth/login/sms/` به `phone_login` متصل است. همچنین `accounts/views.py` در تابع `register()` از `reverse('phone_auth:sms_login')` استفاده می‌کند؛ بنابراین ثبت‌نام قدیمی به مسیر پیامکی می‌رود. توضیح قدیمی در فایل `FRONTEND_BACKEND_HANDOFF_FA.md` بک‌اند که `/auth/login/` را مسیر OTP معرفی می‌کند، با URLconf و Viewهای همین revision سازگار نیست. برای اتصال فرانت‌اند، URLconf و Viewهای اجرایی و آزمون قراردادی CI مرجع‌اند؛ این PR فایل بک‌اند را تغییر نمی‌دهد و اصلاح سند قدیمی باید توسط مسئول بک‌اند انجام شود.

ثبت‌نام صفحهٔ مستقل در بک‌اند ندارد. مسیر سازگاری قدیمی `/accounts/register/` به `/auth/login/sms/` هدایت می‌شود. شمارهٔ تازه پس از تأیید OTP حساب می‌سازد؛ شمارهٔ موجود به همان حساب وارد می‌شود. نقش معتبر فقط `student` یا `coach` است. نقش باشگاه در مدل کاربر وجود ندارد و نباید به‌عنوان حساب قابل ساخت معرفی شود.

ارسال مجدد از سمت سرور محدودیت زمانی دارد و کد OTP پس از ۱۲۰ ثانیه منقضی می‌شود. ارقام فارسی و عربی در فرم OTP نرمال می‌شوند. همهٔ POSTها باید با CSRF و Session واقعی Django انجام شوند.

نام‌های route معتبر عبارت‌اند از `phone_auth:login`، `phone_auth:sms_login`، `phone_auth:send_otp`، `phone_auth:verify_otp`، `phone_auth:complete_profile`، `phone_auth:set_password`، `phone_auth:password_reset` و `phone_auth:password_reset_confirm`. مسیر قدیمی `accounts:register` redirect سازگار است؛ `accounts:login` نیز redirect ورود با رمز است.

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

> **پیش‌نیاز انتشار:** پل Preview و قالب‌های این مخزن فقط با بک‌اندی کار می‌کنند که اپ Blog و URLهای `blog:list` و `blog:detail` را داشته باشد. CI آن‌ها را روی revision `20e96721cc1a589d625fecd3fffa9ec42b1fc64f` از مخزن بک‌اند آزمایش می‌کند؛ این PR و بستهٔ cPanel کد Python یا URLconf بک‌اند سرور را به‌روزرسانی نمی‌کنند. نسخهٔ فعال سرور باید جداگانه توسط مالک بک‌اند تأیید شود.

### وبلاگ

- فهرست مطالب منتشرشده: `GET /blog/` با route name برابر `blog:list`.
- جزئیات مطلب: `GET /blog/<str:slug>/` با route name برابر `blog:detail`؛ تبدیل‌کنندهٔ `str` برای slugهای فارسی هم پشتیبانی می‌شود.
- فقط رکوردهای `is_published=True` از View عمومی برمی‌گردند؛ draft و مطلب منتشرنشده با 404 پاسخ می‌گیرند.
- این صفحات با Django Template رندر می‌شوند؛ در revision فعلی endpoint عمومی JSON برای وبلاگ تعریف نشده است.
- جست‌وجوی سراسری Preview در دامنهٔ زنده، مقاله‌های seed محلی را به‌عنوان مطلب واقعی نمایش نمی‌دهد؛ تا زمان اضافه‌شدن قرارداد جست‌وجوی سمت سرور، جست‌وجوی گروه ادغام‌شده فقط تاتامی‌پدیای محلی را بررسی می‌کند.
- **وضعیت Preview:** مسیرهای `#/blog` و `#/blog/<slug>` اکنون از طریق `django-route-bridge.js` به صفحات واقعی Django متصل‌اند؛ فهرست و جزئیات فقط محتوای منتشرشده را نشان می‌دهند. تاتامی‌پدیا همچنان دادهٔ مستقل Preview است و به‌عنوان مطلب منتشرشدهٔ Django معرفی نمی‌شود.
- تاتامی‌پدیا در revision فعلی بک‌اند معادل مستقیمی ندارد و تا ایجاد قرارداد واقعی، بخش مستقل فرانت‌اندی/نمایشی باقی می‌ماند.

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

کد اتصال در فایل منبع shared/src/js/shared/django-route-bridge.js نگهداری می‌شود و shared/build.js آن را در انتهای کد JavaScript خروجی Preview قرار می‌دهد. فایل‌های preview/index.html و shared/dist/preview/index.html خروجی Build هستند؛ نباید آن‌ها را دستی ویرایش کرد، چون اجرای Build تغییرات مستقیم را بازنویسی می‌کند.

| مسیر hash در Preview | مقصد واقعی Django |
| --- | --- |
| #/store | /store/؛ فیلترهای پشتیبانی‌شده به query string سرور منتقل می‌شوند |
| #/product/<id> | نام محصول صرفاً برای یافتن کارت همان محصول در HTML واقعی Django به کار می‌رود؛ اگر تطبیق یکتا پیدا نشود، جست‌وجوی سرور با نام محصول باز می‌شود. صفحه جزئیات و قیمت محلی به‌عنوان داده واقعی استفاده نمی‌شوند |
| #/cart | /store/cart/ |
| #/checkout | /checkout/address/ |
| #/login | /auth/login/؛ ورود با رمز |
| #/register و #/role | /auth/login/sms/؛ ثبت‌نام/ورود پیامکی، نقش معتبر student یا coach و مقصد داخلی امن حفظ می‌شوند |
| #/password-reset | /auth/password/reset/ |
| #/set-password | /auth/password/set/؛ فقط کاربر واردشدهٔ واجد شرایط |
| #/coaches | /coaches/ |
| #/coach-apply | /coaches/apply/ |
| #/coach-application | /coaches/application/ |
| #/courses | /club/؛ فهرست دوره‌های منتشرشده |
| #/courses/<slug> | عنوان نمونه فقط برای یافتن دوره هم‌نام و یکتای منتشرشده در HTML واقعی استفاده می‌شود؛ در غیر این صورت جست‌وجوی سرور با عنوان دوره باز می‌شود |
| #/episode/<slug>-lesson-<n> | به صفحه جزئیات دوره واقعی هم‌نام هدایت می‌شود؛ شماره قسمت نمونه هرگز به شناسه دیتابیس تعبیر نمی‌شود |
| #/club | /club/؛ فهرست دوره‌های واقعی |
| #/blog و #/blog/<slug> | /blog/ و /blog/<str:slug>/؛ مطالب منتشرشدهٔ Django از طریق پل Preview نمایش داده می‌شوند |
| #/tatamipedia | معادل Django ندارد؛ فعلاً در Preview باقی می‌ماند |
| #/gems | /account/gems/ |
| #/profile و #/my-profile | /account/ |
| #/orders | /orders/ |

این پل درخواست HTML هم‌مبدأ را دریافت می‌کند، اما محتوا را داخل همان ناحیهٔ #app پوسته Preview نمایش می‌دهد؛ کاربر برای دیدن صفحهٔ فروشگاه، دوره، مربی یا حساب از پوستهٔ اصلی خارج نمی‌شود.



**استثنای پرداخت:** فرم `POST /checkout/pay/` با ارسال عادی مرورگر انجام می‌شود، نه XHR؛ چون پاسخ View به درگاه پرداخت خارجی Redirect می‌کند و XHR نمی‌تواند نتیجهٔ cross-origin را به‌صورت امن به جریان ناوبری کاربر تبدیل کند. سایر فرم‌های POST مجاز همچنان با XHR، Session و CSRF پردازش و در پوستهٔ Preview نمایش داده می‌شوند. هنگام انتقال به درگاه، مرورگر عمداً از `/preview/` خارج می‌شود؛ صفحهٔ نتیجه از پاسخ واقعی Django می‌آید. کوکی Session مرورگر به Django می‌رسد و POSTها با فرم‌های واقعی، CSRF و اعتبارسنجی سمت سرور پردازش می‌شوند. هیچ endpoint JSON، CORS، قیمت، موجودی یا منطق مالی در مرورگر اضافه نمی‌شود.

نقشه باشگاه‌ها، داشبوردهای برنامه‌ریزی‌نشده، مربی آنلاین، آنالیز هوش مصنوعی و سایر ماژول‌های بدون قرارداد واقعی عمداً به مسیر Django هدایت نمی‌شوند و در Preview باقی می‌مانند.

### ترتیب انتشار پل

1. فایل‌های Django مجاز در deploy/frontend-manifest.json به اپ Django منتقل شوند؛ فایل‌های متعلق به بک‌اند حفظ شوند.
2. collectstatic اجرا و مسیرهای /store/، /store/cart/، /auth/login/ و /club/ روی دامنه آزمایش شوند.
3. قالب‌های `django/templates/blog/` و مسیرهای `#/blog`/`#/blog/<slug>` از طریق پل Preview به صفحات منتشرشده Django متصل شده‌اند؛ این تغییرات فقط پس از عبور از CI قابل انتشارند.
4. workflow ساخت Preview اجرا شود و artifact تولیدشده شامل کد اتصال inline در index.html باشد.
5. فقط خروجی Build تأییدشده در مسیر عمومی preview/ منتشر شود. فایل‌های preview را دستی ویرایش نکنید.
6. مسیرهای hash جدول بالا آزمایش شوند و /preview/ بدون hash همچنان صفحه اصلی موجود را نشان دهد.

اگر کاتالوگ فروش فعال در دیتابیس خالی باشد، قالب فروشگاه می‌تواند کاتالوگ مرجع بازار را فقط در یک بخش جدا و با برچسب «غیرقابل خرید» نمایش دهد. این داده‌ها نباید به Product/Variant دیتابیس، قیمت فروش، موجودی، سبد یا Checkout تبدیل شوند. قیمت‌ها مرجع و تاریخ‌دارند؛ تصاویر و اطلاعات فروشنده تا تأیید مجوز منتشر نمی‌شوند. داده‌های مربیان و دوره‌های نمونهٔ فرانت‌اند نیز واقعی نیستند و نباید به‌عنوان محتوای منتشرشده نمایش داده شوند.


## نمایش محتوای Django در پوسته Preview

در شاخهٔ فرانت‌اند، پل مسیرها محتوای HTML واقعی همان‌مبدأ Django را داخل ناحیهٔ `#app` در پوسته Preview رندر می‌کند؛ URL اصلی مرورگر در `/preview/#...` باقی می‌ماند. لینک‌ها و فرم‌های همان‌مبدأ از طریق Session و CSRF واقعی به Django ارسال می‌شوند. این روش API جدید، داده ساختگی یا منطق تجاری جدید ایجاد نمی‌کند. فایل‌های اصلی Django حذف نمی‌شوند؛ صرفاً پوسته و محتوای آن‌ها در رابط مشترک نمایش داده می‌شود.
