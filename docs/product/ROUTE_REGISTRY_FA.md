# رجیستری مسیرها و سطح اتصال

**تاریخ ممیزی اولیه:** ۲۸ نوامبر ۲۰۲۶  
**مبنای فرانت‌اند:** 8818cd18c9f418f207f6d2049e2199eff0f30d73  
**مبنای Django:** 5f3a416d0aa5aa0363b2064ed23051a9273d8f75  
**قاعده:** این فهرست رجیستری شروع است؛ وجود route در UI به معنی وجود backend یا فعال بودن عملیاتی آن نیست.

## ۱. مسیرهای Hash فرانت‌اند

منبع allowlist فعلی: shared/src/js/shared/router.js

| گروه | Route keyهای فعلی | فایل/مالک اصلی شناخته‌شده | وضعیت اولیه |
|---|---|---|---|
| عمومی | خانه، search، dashboard | views-core.js | بخشی وابسته به دادهٔ محلی/نقش |
| حساب | login، register، password-reset، set-password، coach-apply، coach-application، profile، my-profile | auth.js و Viewهای مشترک | مسیرهای Preview باید با مسیرهای واقعی OTP تفکیک شوند |
| فروشگاه | store، product، cart، checkout | store.js، views-store.js | Django برای دامنهٔ زنده مرجع است؛ کاتالوگ باید از DB بیاید |
| باشگاه مجازی | academy، courses، episode، videos، video | views-academy.js، views-videos.js | دادهٔ دوره/ویدئو در Preview می‌تواند نمونه باشد |
| مربیان | coaches، instructor | views-coaches.js، views-portfolio.js | فهرست/پروفایل واقعی از Django |
| باشگاه و نقشه | clubs، club | views-clubs-map.js و Viewهای دیگر | نقشهٔ محلی از directory واقعی Django جداست |
| تخصصی | specialist-services، nutrition-coaches، sports-clinics، sports-psychologists | views-specialist-services.js | در View پیاده‌سازی شده؛ allowlist Router ندارد |
| خدمات هوشمند | online-coach، ai | views-online-coach.js و Viewهای مربوط | فقط طراحی/رابط؛ قرارداد عملیاتی تأیید نشده |
| محتوا | blog، tatamipedia | views-blog.js، views-tatamipedia.js | blog به Django متصل؛ tatamipedia بدون route/model متناظر |
| سایر | tournaments، tournament، gems، sponsors | Viewهای feature | اتصال و مالکیت هر route باید در Page Spec ثبت شود |

## ۲. مسیرهایی که پل Django در Preview می‌شناسد

در منطق Router/Bridge فعلی، مسیرهای متصل یا routeهای شناخته‌شده شامل مواردی مانند login، register، role، password-reset، set-password، blog، store، product، cart، checkout، coaches، academy، instructor، coach-apply، coach-application، courses، episode، club، gems، profile، my-profile و orders هستند.

این allowlist به معنی اتصال همهٔ مسیرها با یک عمق یکسان نیست. resolver بعضی مسیرها از دادهٔ واقعی Django استفاده می‌کند و بعضی مسیرهای hash از نام/slug دادهٔ محلی برای پیدا کردن معادل واقعی کمک می‌گیرند؛ اگر تطبیق یکتا نباشد باید به فهرست امن واقعی برگردد.

## ۳. قراردادهای Django تأییدشده در handoff فعلی

### احراز هویت و حساب
- GET/POST /auth/login/ و جریان OTP.
- POST /auth/otp/send/ و GET/POST /auth/otp/verify/.
- GET/POST /auth/complete-profile/.
- مسیرهای بازیابی/تنظیم رمز در handoff.
- POST /accounts/logout/ با CSRF.
- /account/ برای هاب حساب و نقش کاربر.

**نکته:** صفحهٔ ورود/ثبت‌نام باید با قرارداد OTP فعلی طراحی شود؛ ثبت‌نام مستقل قدیمی مرجع نیست. نقش‌های بک‌اند student، coach و gym هستند.

### مربی
- /coaches/ و /coaches/<profile_id>/ برای پروفایل‌های تأییدشده/منتشرشده.
- /coaches/apply/ و /coaches/application/ برای ثبت و پیگیری CoachPortfolio.
- /coaches/join/ و /coaches/join/<code>/ برای جریان دعوت، مطابق handoff.
- /coach/courses/، /coach/students/ و مسیرهای ساخت/ویرایش دوره و قسمت.
- فایل مدرک مربی خصوصی است و نباید به URL عمومی media تبدیل شود.

### فروشگاه و سفارش
- /store/، /store/<slug>/، /store/cart/.
- POST /store/cart/items/<item_id>/update/ و /remove/.
- /checkout/address/، /checkout/review/، /checkout/pay/ و /payment/callback/.
- /orders/ و /orders/<order_number>/.

قیمت، تنوع، موجودی، هزینه و وضعیت پرداخت را مرورگر تعیین نمی‌کند. خرید و نتیجهٔ پرداخت باید به پاسخ معتبر Django/درگاه متکی باشد.

### باشگاه مجازی و دوره
- /club/، /club/coach/<profile_id>/ و /club/course/<slug>/.
- مسیر خرید دوره، تماشای قسمت، stream خصوصی و ثبت اتمام قسمت.
- مسیرهای پنل مربی برای دوره/قسمت و هنرجوها.

پخش قسمت پولی فقط از مسیر محافظت‌شدهٔ stream و با مجوز سرور انجام می‌شود؛ URL مستقیم فایل ویدیو نباید ساخته شود.

### باشگاه ورزشی
- /gyms/، /gyms/<gym_id>/، /gyms/new/ و /gyms/panel/.
- مسیرهای پنل برای افزودن/پیوند/حذف/قطع پیوند مربی.
- نقش رسمی Django برابر gym است. PWA فعلی club را به‌عنوان role دارد؛ این دو نباید بدون adapter/تصمیم روشن یکی فرض شوند.

### جم و محتوا
- /account/gems/ دفتر تراکنش و موجودی جم.
- /blog/ و /blog/<slug>/ برای پست‌های منتشرشده.
- نوشتن و مدیریت محتوای بلاگ از Django Admin است.

## ۴. شکاف‌ها و اولویت‌های ممیزی

| اولویت | شکاف | اثر | اقدام فرانت‌اند |
|---|---|---|---|
| P0 | چهار route خدمات تخصصی در View تعریف شده اما در MAXSEG نیستند | Router آن‌ها را به not-found می‌فرستد | اصلاح allowlist و افزودن تست route |
| P0 | مسیرهای gyms در Bridge/Template coverage کامل نیستند | باشگاه واقعی Django از مسیر clubs نمونه قابل دسترسیِ یکپارچه نیست | تکمیل طراحی/رجیستری، سپس route mapping و قالب‌های مجاز |
| P1 | role=club در PWA در برابر role=gym در Django | انتخاب نقش، منو و کنترل دسترسی ناسازگار می‌شود | تعیین mapping صریح و طراحی حالت‌های انتقال |
| P1 | design-system در build config از Preview منع شده، در حالی که سند آن را راهنمای زنده Preview معرفی می‌کند | راهنمای طراحی ممکن است قابل دسترسی نباشد | تصمیم: ابزار توسعه داخلی یا صفحهٔ عمومی؟ سپس هماهنگ‌سازی |
| P1 | چند View کلیدهای routes مشترک مانند club، academy یا profile را تعریف می‌کنند | ترتیب Object.assign/Build می‌تواند مالک نهایی را تغییر دهد | استخراج مالک نهایی هر route و یک منبع route registry |
| P1 | docs/API_CONTRACT.md و marketing API client ممکن است API JSON را القا کنند | خطر پیاده‌سازی اتصال جعلی | صرفاً قرارداد تاریخی/تستی تلقی شود تا backend آن را تأیید کند |
| P1 | auth.js و dashboard-kit دارای state یا مقادیر محلی‌اند | احتمال نمایش هویت/آمار غیرواقعی | تفکیک PWA مستقل از Preview متصل به Django |
| P1 | MockGateway در پرداخت | خطر پیام موفقیتِ گمراه‌کننده | همهٔ حالت‌های پرداخت را طراحی کن؛ موفقیت فقط با نتیجهٔ تأییدشده |
| P2 | صفحه‌های فاقد endpoint، از جمله مربی آنلاین، AI، نقشهٔ جغرافیایی و دانشنامه | ظاهر ممکن است با قابلیت عملیاتی اشتباه شود | طراحی کامل با empty/disabled state روشن |

## ۵. سیاست ثبت هر Route

برای هر route باید این اطلاعات تکمیل شود:
- نام صفحه و هدف کاربر؛
- route hash و URL واقعی مستقیم؛
- نقش مجاز و حالت مهمان؛
- فایل View و ترتیب بارگذاری آن در shared/build.js؛
- مالک render و root DOM؛
- URLهای Django و روش HTTP؛
- نام دقیق فیلدهای Form، CSRF و redirect؛
- منبع داده و وضعیت اتصال؛
- حالت‌های loading/empty/error/success/forbidden؛
- تست‌های مستقیم، ناوبری و رگرسیون.

**هیچ صفحه‌ای صرفاً به‌خاطر وجود نام route، متصل تلقی نمی‌شود.**

