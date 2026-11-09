# تحویل فرانت‌اند نقشه و جستجوی باشگاه‌ها با نشان

## محدودهٔ مرحله
این تغییر مرحلهٔ ۶ سند «تاتامی پلاس — تسک‌های فرانت‌اند این هفته» است. کار فرانت‌اند شامل صفحهٔ جستجوی باشگاه، فهرست/نقشه در دسکتاپ و تب فهرست/نقشه در موبایل، فیلترهای GET، مکان‌یابی نزدیک من، اتصال کلاینتی به Neshan Leaflet Web SDK و کارت جزئیات باشگاه است.

## فایل‌های Preview استاتیک
- `shared/src/js/shared/views-clubs-map.js`: رابط فهرست و جزئیات، فیلترها، geolocation و adapter نقشهٔ نشان.
- `shared/src/js/shared/router.js`: مقداردهی نقشه بعد از رندر route.
- `shared/src/js/shared/core.js` و `shared/build.js`: منو/باندل (در مرحلهٔ بعد باید لینک باشگاه حفظ شود؛ route فعلی وجود دارد).
- `shared/src/index.html`: بارگذاری فایل تنظیمات عمومی Neshan.
- `shared/public/assets/neshan-config.js`: محل تنظیم Web Key و endpoint عمومی باشگاه‌ها.
- `shared/src/css/ui.css`: استایل واکنش‌گرای فهرست، فیلتر و نقشه.
- `shared/tests/public.test.mjs`: تست مسیر و حالت‌های بدون مختصات واقعی.

## فایل‌های Django Templates
- `django/templates/clubs/search.html`: فهرست، فرم GET، فیلتر شهر/جنسیت/شعاع، تب موبایل و نقشه.
- `django/templates/clubs/detail.html`: مشخصات باشگاه، تماس، مربیان، نقشهٔ کوچک و لینک مسیریابیِ تحویل‌شده از بک‌اند.
- `django/templates/base.html`: بلوک‌های اختیاری `extra_head` و `extra_scripts`.
- `django/static/css/clubs-map.css`: استایل مستقل صفحات باشگاه.
- `django/static/js/clubs-map.js`: لود SDK، marker، popup، geolocation و highlight کارت.

## کلید نشان
فقط **Web SDK Key** مخصوص وب و محدودشده به دامنهٔ دقیق سایت را استفاده کنید. Service Key یا کلید API سمت سرور نباید در JavaScript، HTML، GitHub یا ZIP عمومی قرار گیرد.

در Preview، فایل `shared/public/assets/neshan-config.js` را بعد از دریافت Web Key محدودشده به دامنه و آماده‌شدن endpoint پر کنید:
- `window.TP_NESHAN_WEB_KEY`
- `window.TP_CLUBS_JSON_URL`

تا زمان دریافت این دو مقدار، صفحه پیام راهنما نشان می‌دهد و marker یا موقعیت جعلی تولید نمی‌کند.

## قرارداد JSON مورد انتظار فرانت‌اند
فرانت‌اند از URL پیکربندی‌شده با پارامترهای GET زیر درخواست می‌فرستد:
- `query`: جستجوی نام باشگاه یا مربی
- `city`: شناسه/مقدار شهر
- `gender`: مقدار `men` یا `women` یا خالی
- `radius_km`: یکی از ۲، ۵، ۱۰، ۲۵
- `lat` و `lng`: موقعیت کاربر، در صورت اجازهٔ geolocation

پاسخ می‌تواند آرایهٔ مستقیم یا شیء دارای `results` باشد. هر باشگاه باید حداقل این فیلدها را داشته باشد:
| فیلد | توضیح |
|---|---|
| `id` | شناسهٔ یکتا؛ باید با `data-club-id` کارت همان باشگاه یکی باشد. |
| `name` | نام باشگاه |
| `latitude` و `longitude` | مختصات معتبر جغرافیایی |
| `city` | شهر |
| `detail_url` | مسیر داخلی جزئیات یا URL معتبر جزئیات |
| `distance_km` | اختیاری؛ اگر ارسال نشود و lat/lng کاربر باشد، فرانت فاصله را تقریبی محاسبه می‌کند. |
| `gender` / `gender_label` | دادهٔ لازم برای فیلتر و برچسب جنسیت |
| `address` و `phone` | اختیاری برای popup/جزئیات |

## قرارداد context قالب Django
### `clubs/search.html`
- `clubs`: صفحهٔ جاری یا فهرست باشگاه‌ها با فیلدهای `id`، `name`، `city`، `address`، `distance_km`، `gender_label`، `detail_url`.
- `page_obj`: شیء صفحه‌بندی Django، در صورت استفاده از pagination.
- `cities`: iterable با `value` و `label`.
- `filters`: مقادیر انتخاب‌شدهٔ `city` و `gender`.
- `radius_km` و `radius_index`: مقدار شعاع و index کنترل range.
- `lat` و `lng`: مختصات جستجوی فعلی.
- `neshan_web_key`: Web Key محدودشده به دامنه (از settings/context امن).
- `clubs_json_url`: URL endpoint JSON که باید توسط بک‌اند تعریف شود.
- `querystring_without_page`: query string فعلی بدون page برای لینک pagination.

### `clubs/detail.html`
- `club`: شیء باشگاه با `name`، `city`، `description`، `address`، `phone`، `latitude`، `longitude`، `gender_label`، `cover_url`، `coaches` و `neshan_directions_url`.
- `neshan_web_key`: Web Key محدودشده به دامنه.
- `clubs_search_url`: URL فهرست باشگاه‌ها.

`neshan_directions_url` عمداً از context می‌آید. فرانت‌اند URL deep link نشان را حدس نمی‌زند و URL ناقص یا نامعتبر نمی‌سازد.

## محدودیت‌های فعلی و کار بک‌اند
در مخزن بک‌اند بررسی‌شده، اپ باشگاه، مدل مختصات، فیلد جنسیت، نشانی/تلفن باشگاه، endpoint JSON و URL مسیریابی نشان وجود ندارد. فایل‌های backend تغییر نکرده‌اند. برای اتصال زنده، بک‌اند باید مدل/دادهٔ تأییدشده، URL، JSON response و contextهای بالا را ارائه کند. تا قبل از آن:
- اطلاعات شش باشگاه Preview دادهٔ نمونه است.
- دادهٔ فعلی مختصات یا جنسیت ندارد؛ فیلترهای فاصله/جنسیت فقط کنترل رابط هستند و با پیام واضح غیرفعال می‌مانند.
- marker ساختگی روی نقشه قرار نمی‌گیرد.
- موقعیت کاربر فقط پس از مجوز مرورگر گرفته می‌شود؛ اگر رد شود، انتخاب شهر در دسترس می‌ماند.
- هیچ ویو، مدل، URLConf، endpoint یا مایگریشن Python در این تغییر ایجاد نشده است.

## مسیر نصب
### Preview روی cPanel
محتوای ZIP مرحله را در `public_html/preview/` استخراج کنید؛ `index.html` باید مستقیماً در ریشهٔ همان پوشه باشد.

### پروژهٔ Django
پوشه‌های داخل `django/` را با مسیرهای متناظر پروژهٔ واقعی ادغام کنید:
- `django/templates/clubs/` → `templates/clubs/`
- `django/templates/base.html` → `templates/base.html`
- `django/static/css/clubs-map.css` → `static/css/clubs-map.css`
- `django/static/js/clubs-map.js` → `static/js/clubs-map.js`

پس از اضافه شدن URL و context واقعی توسط بک‌اند، `python manage.py check` و تست‌های پروژه اجرا شوند.
