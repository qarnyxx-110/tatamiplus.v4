# قرارداد API (برای پیاده‌سازی بک‌اند توسط تیم شما)

**وضعیت:** این پروژه بک‌اند ندارد. این سند قراردادی است که کلاینت پنل مارکتینگ (`marketing/`) و اتصال عمومی بلاگ/تاتامی‌پدیا (`student|coach|club/`) از قبل بر پایه آن نوشته و با سرور آزمایشی `tools/mock-api-server.mjs` (فقط ابزار تست، نه بک‌اند محصول) آزمایش شده‌اند. بک‌اند واقعی باید همین رفتار را داشته باشد.

پیشوند: `TP_API_BASE` هنگام Build (مثلاً `/api/v1`). همه پاسخ‌ها JSON UTF-8. خطا: `{"errors":{field:"پیام"|[..], "_":"پیام کلی"}}` یا `{"detail":"پیام"}` با کد ۴۰۰/۴۰۱/۴۰۳/۴۰۴/۴۰۹/۴۱۳.

## ۱. عمومی (بدون ورود) — فقط GET، CORS: `Access-Control-Allow-Origin` برای دامنه PWAها
| درخواست | پاسخ |
|---|---|
| `GET /public/articles?page=&page_size=&q=&category=` | `{count, results:[{id, slug, title, excerpt, body_html, cover_image_url, author_name, category:{name,slug}, tags:[{name}], published_at}]}` |
| `GET /public/articles/{slug}` | یک مقاله یا ۴۰۴ |
| `GET /public/glossary/categories` | `{results:[{slug,name,name_ja,romaji,order}]}` |
| `GET /public/glossary/terms?page_size=` | `{count, results:[{slug,name_fa,name_ja,romaji,meaning,description,usage,safety,categories:[slug],related:[slug],featured,image_url}]}` |

**قواعد الزامی:** فقط `status=published` یا `scheduled` با `publish_at <= now` برگردد؛ پیش‌نویس و زمان‌بندی‌شده آینده هرگز. `body_html` باید در **بک‌اند پاک‌سازی (sanitize) شود**؛ کلاینت هم دوباره پاک می‌کند اما تنها دفاع نیست. ترتیب مقاله‌ها: جدیدترین انتشار اول.

## ۲. احراز هویت (نشست Cookie + CSRF پیشنهادی)
- `POST /auth/login {username,password}` ← `200 {user:{username,display_name,permissions:[...]}}` + Cookie نشست `HttpOnly; SameSite=Lax; Secure` + کوکی CSRF قابل‌خواندن (`csrftoken`). خطا: `401`.
- `GET /auth/me` ← `{user}` یا `401`. `POST /auth/logout` ← `204`.
- همه درخواست‌های غیر GET در `/cms/*` باید هدر `X-CSRFToken` معتبر داشته باشند (در غیر این صورت ۴۰۳). Rate limit روی login.

## ۳. مدیریت (نیازمند ورود + مجوز — **همه در بک‌اند اعمال شود**)
مجوزها (نقش «marketing» مستقل از هنرجو/مربی/باشگاه؛ بدون دسترسی به کاربران، پرداخت، تنظیمات):
`articles.manage`، `articles.delete`، `glossary.manage`، `glossary.delete`، `media.upload`. حساب بدون مجوز: ۴۰۳.

| درخواست | توضیح |
|---|---|
| `GET /cms/articles?q=&status=&category=&page=&page_size=` | `{count,results}`؛ هر مقاله: `id, slug, title, excerpt, body_html, cover_image_url, author_name, category, tags:[string], seo_title, seo_description, status(draft|published|scheduled), publish_at, published_at, updated_at` |
| `POST /cms/articles` · `GET/PUT /cms/articles/{id}` | اعتبارسنجی: `title` الزامی؛ `slug` یکتا، الگو `^[\p{L}\p{N}]+(-[\p{L}\p{N}]+)*$`؛ خطای فیلدی `400 {errors:{slug:"…"}}` |
| `DELETE /cms/articles/{id}` | فقط `articles.delete` |
| `POST /cms/articles/{id}/publish {publish_at?}` | بدون زمان یا زمان گذشته ← `published`؛ زمان آینده ← `scheduled` (انتشار خودکار توسط سرور) |
| `POST /cms/articles/{id}/unpublish` | ← `draft` |
| `GET /cms/article-categories` | `{results:[{id,name,slug}]}` |
| `POST /cms/media` (multipart `file`) | فقط JPEG/PNG/WebP **با بررسی محتوای واقعی فایل (magic bytes) نه فقط پسوند**، حداکثر ۲ مگابایت؛ `201 {id,url}`؛ خطا ۴۰۰/۴۱۳ با `{errors:{file}}` |
| `GET/POST /cms/glossary/terms` · `GET/PUT/DELETE /cms/glossary/terms/{id}` | فیلدها: `slug (^[a-z0-9]+(-[a-z0-9]+)*$ یکتا), name_fa*, name_ja, romaji*, meaning*, description, usage, safety, categories:[slug], related:[slug], featured, status(draft|published), image_url`؛ انتشار بدون دسته ← ۴۰۰ |
| `GET/POST /cms/glossary/categories` · `PUT/DELETE /cms/glossary/categories/{id}` | حذف دسته دارای اصطلاح ← ۴۰۰ |

## ۴. ملاحظات پیاده‌سازی Django (پیشنهاد، پیاده‌سازی‌نشده)
Group «marketing» با مجوزهای بالا؛ `is_staff=False` تا به Django Admin راه نداشته باشد؛ مدل‌های Article/ArticleCategory/Tag/GlossaryTerm/GlossaryCategory/MediaAsset؛ `publish_at` + بررسی `now()` در Queryset عمومی (یا Task زمان‌بندی)؛ پاک‌سازی HTML با کتابخانه allowlist؛ ذخیره رسانه روی Object Storage؛ آدرس مقاله `/blog/<slug>`.
