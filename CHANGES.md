# فهرست تغییرات (مرحله تثبیت + تاتامی‌پدیا + پنل مارکتینگ)

نسخه قبل از تغییرات برای بازگشت: `tatami-plus-coaches-sponsors.zip` (تحویل قبلی).

## اضافه‌شده
- **تاتامی‌پدیا:** `src/data/tatamipedia.json`، `js/shared/views-tatamipedia.js`، مسیرهای `#/tatamipedia[/<slug>]`، منو/فوتر/صفحه خانه، صفحه‌های پوششی `/tatamipedia/…`.
- **بلاگ:** `js/shared/views-blog.js` (slug خوانا، صفحه‌بندی، وضعیت در آدرس، اتصال اختیاری به API)، `js/shared/api.js`.
- **پنل مارکتینگ (رابط):** `src/marketing.html`، `css/marketing.css`، `js/marketing/{util,demo-store,api-client,editor,views,main}.js`، `src/data/blog-seed.json`.
- **امنیت و کیفیت:** `js/lib/text.js` (`nz`، `esc`، `sanitizeHtml`)، `js/shared/state-guard.js`.
- **تست و ابزار:** `tests/{helpers,public.test,marketing.test,run-all}.mjs`، `tools/mock-api-server.mjs`.
- **مستندات:** `docs/*`، `README.md`، `CHANGES.md`، این بسته.

## تغییرکرده
- `build.js` بازنویسی: خروجی‌ها (marketing/preview)، نسخه Cache سرویس‌ورکر از هش Build، صفحه‌های پوششی با `SITE_URL`، فونت محلی، `TP_API_BASE`.
- `public/sw.js` (فقط صفحه ریشه به‌عنوان index کش می‌شود)، `design/tokens.json` (حذف ۶ توکن بی‌استفاده).
- `css/ui.css` (اهداف لمسی ۴۴px، تاتامی‌پدیا/مقاله)، `components-ui.js` (`hashParams/setHashParams`، modal با اعتبارسنجی)، `core.js`/`content.js` (یک منبع داده برای مربیان آکادمی و مربیان تاتامی از `coaches.json`)، `views-coaches.js` (فیلتر در آدرس)، `views-store.js` (escape گزینه‌های سبد)، `views-new.js`، `router.js` (مسیرهای slug، طول مسیر)، `index.html`.
- `data/coaches.json`: فیلدهای آکادمی افزوده و `instructorId` حذف شد (تکرار داده رفع شد).
- `DESIGN_SYSTEM.md` (ادعای Cache فونت اصلاح شد)، `SKILL.md`، `TEST_REPORT.md`.

## رفتارهای تغییرکرده (آگاه باشید)
- بلاگ: ۶ مقاله در هر صفحه با صفحه‌بندی؛ آدرس مقاله `#/blog/<slug>` (شناسه عددی نمونه هم کار می‌کند).
- فیلتر مربیان وضعیتش را در آدرس نگه می‌دارد و با ورود به `#/coaches` بدون پارامتر پاک می‌شود.
- مسیر `#/coaches/` و `/tatamipedia/` صفحه پوششی دارند؛ مسیر دارای بخش اضافه همچنان 404 است.
## تصاویر واقعی کاتالوگ فروشگاه — ۲۰۲۶-۱۰-۲۲
- ۵۹ تصویر دریافت‌شده در `shared/public/assets/images/products/` با تطبیق دقیق URL تصویر هر محصول به SKU/slot مربوطه نگاشت شدند.
- چهار فایل که محتوای JPEG داشتند ولی پسوند/Content-Type آن‌ها WebP گزارش شده بود، برای سازگاری با پسوند مقصد به WebP تبدیل شدند.
- گزارش نگاشت در `product-image-mapping.csv` و `product-image-mapping.json` قرار گرفت.
- Build برای هر سه PWA و پنل مارکتینگ اجرا شد؛ Build اکنون دارایی‌های تصاویر را برای `preview/assets/` نیز کپی می‌کند.
- تست مرورگر کامل اجرا نشد، چون وابستگی Playwright در محیط موجود نبود؛ بررسی ساختاری و اعتبارسنجی فایل‌ها جداگانه انجام شد.


## اصلاحات فلو فروشگاه — ۲۰۲۶-۱۰-۲۲
- دکمه ادامه از سبد خرید به مسیر `#/checkout` متصل شد.
- مسیر آزمایشی سه‌مرحله‌ای اضافه شد: اطلاعات گیرنده/نشانی، بازبینی اقلام و مبلغ، و صفحه نتیجه نمایشی.
- اعتبارسنجی اولیه فیلدهای ضروری، شماره موبایل و کد پستی اضافه شد.
- در تمام مراحل روشن است که سفارش/پرداخت واقعی انجام نمی‌شود؛ اتصال به API سفارش، محاسبه هزینه ارسال و درگاه پرداخت همچنان لازم است.
- مسیر `checkout` به فهرست مسیرهای مجاز روتر افزوده شد.
- Build هر سه PWA و پیش‌نمایش موفق بود؛ بررسی نحوی JavaScript خروجی‌ها موفق بود. آزمون Playwright اجرا نشد چون وابستگی در محیط فعلی نصب/قابل‌دسترسی نیست.
