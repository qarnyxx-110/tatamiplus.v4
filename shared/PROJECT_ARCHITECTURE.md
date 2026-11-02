# تاتامی پلاس — PROJECT_ARCHITECTURE

> وضعیت: نمونه اولیه فرانت‌اند (Frontend Prototype) · همه داده‌ها Demo · بدون Backend، Database، Authentication و پرداخت.
> نسخه پایه (Baseline): `baseline/tatami-plus.v1-baseline.html` — SHA-256 با پیشوند `6a302f101da13bcc`، ۶۲٬۷۴۲ بایت، ۲۰۷ خط. این فایل با `tatami-plus.html` کاملاً یکسان است و هیچ تغییری در سایت داده نشده است.

---

## 1. Project Overview

«تاتامی پلاس» یک پلتفرم فارسی RTL برای جودو است: آموزش ویدیویی، تورنمنت‌ها، آکادمی مربیان، فروشگاه تجهیزات، تحلیل حرکت (نمایشی) و سه نوع حساب (هنرجو، مربی، باشگاه).

- زبان و جهت: فارسی، RTL، فونت Vazirmatn (Google Fonts)
- رنگ‌ها: `#07111F` پس‌زمینه، `#0D1B2A` ثانویه، `#16A085` اصلی، `#D4A84F` طلایی، `#36C5F0` AI، `#F5F7FA` متن، `#9BA8B7` متن ثانویه
- خروجی فعلی: یک فایل HTML خودکفا (HTML + CSS + JS) که به‌صورت Artifact میزبانی شده است.

## 2. Current Architecture

- **SPA تک‌فایلی** بدون فریم‌ورک و بدون ابزار Build. رندر با Template Literal و `innerHTML`.
- **Hash Routing:** تابع `R()` مسیر را از `location.hash` می‌خواند، View مربوط را از شیء `views` صدا می‌زند، نتیجه را در `#app` می‌نویسد و ناوبری را به‌روز می‌کند. پارامتر نقش (`?role=`) از `location.search` و بخش Query هش خوانده می‌شود.
- **State:** متغیرهای سراسری (`role`, `cart`, `fav`, `saved`, `prog`, `lw`) + State صفحه‌ها (`q`, `cat`, `sort`, `FS`, `PS`, `vq`, `vcat`, `vlev`, `vsort`, `vsv`, `vopen`, `tab`, `aiS`, `aiV`). فقط بخش‌های کلید-جدول زیر در `localStorage` ذخیره می‌شوند.
- **Dataها:** آرایه‌های JS داخل همان فایل: `P` (محصولات)، `V` (ویدیوها)، `I` (مربیان)، `TN` (تورنمنت‌ها)، `STU` و `CLS` (داشبورد) و جدول‌های کمکی (`CATS`, `VC`, `VL`, `LVS`, `SZS`, `SZG`, `CCOL`, `CM`, `IL`).
- **وابستگی‌ها:** فقط `fonts.googleapis.com` / `fonts.gstatic.com`. هیچ کتابخانه JS، Backend یا API دیگری وجود ندارد.

### توابع و بلوک‌های اصلی
| بخش | توابع |
|---|---|
| روتینگ و رندر | `R`, `views`, `go`, `obs`, `act`, `sc` (اسکرول سینمایی صفحه اصلی) |
| تصویر | `ph`, `im.{p,v,t,i}`, `vimg`, `IMG_BASE`, `IMG_DATA`, `pad` |
| ذخیره‌سازی | `L`, `S`, `save` |
| نقش و داشبورد | `setRole`, `RN`, `HD`, `SB`, `BODY.{student,coach,club}`, `st`, `sec`, `rec`, `emp`, `lst`, `qa`, `cols`, `bar`, `tg` |
| فروشگاه و سبد | `pc`, `fp`, `fcount`, `chp`, `tgl`, `clr`, `cadd`, `qadd`, `addP`, `qP`, `cq`, `rm`, `tf`, `toast`, `REC` |
| ویدیوها | `vcard`, `svb`, `sv2`, `clrV`, `vupd`, `vset`, `vplay`, `vfs`, `tm`, `pf` |
| تورنمنت و AI | `tc`, `tourRow`, `aiRun` |
| کمکی | `nz` (نرمال‌سازی ی/ک)، `esc`, `num` |

## 3. Routes

| Hash | صفحه | توضیح |
|---|---|---|
| `#/` | خانه | Hero، بخش سینمایی سه تکنیک، امکانات |
| `#/role` | انتخاب نقش | هنرجو / مربی / باشگاه |
| `#/dashboard` (+`?role=student|coach|club`) | داشبورد | سه نسخه بر اساس نقش |
| `#/store` | فروشگاه | جستجو، فیلتر، مرتب‌سازی، پیشنهادها |
| `#/product/ID` یا `#/product?id=ID` | جزئیات محصول | شناسه نامعتبر ← «محصولی پیدا نشد» |
| `#/cart` | سبد خرید | |
| `#/tournaments` | تورنمنت‌ها | تب پیش‌رو / جاری / برگزارشده |
| `#/tournament/ID` | جزئیات تورنمنت | دسته‌ها، برنامه، شرکت‌کنندگان |
| `#/videos` | ویدیوهای ضبط‌شده | جستجو، فیلتر، ادامه تماشا |
| `#/video/ID` یا `#/video?id=ID` | جزئیات ویدیو | شناسه نامعتبر ← «ویدیویی پیدا نشد» |
| `#/academy` | آکادمی اساتید | |
| `#/instructor/ID` | پروفایل مربی | |
| `#/ai` | آنالیز هوش مصنوعی | نمایشی |
| `#/search` | — | فقط به `#/store` هدایت می‌کند |

**ناوبری بالا:** خانه، فروشگاه، تورنمنت‌ها، ویدیوهای ضبط‌شده، آنالیز هوش مصنوعی، آکادمی اساتید، جستجو، سبد خرید، ورود / ثبت‌نام (به `#/role`).
**منطق اولین بازدید:** اگر `role` ذخیره نشده باشد، یک‌بار به `#/role` هدایت می‌شود.

**مشکلات شناخته‌شده (دست نخورده):** `#/product/` (اسلش پایانی بدون شناسه) محصول ۰ را نشان می‌دهد؛ در `#/tournament/ID` و `#/instructor/ID` شناسه نامعتبر (مثلاً `999` یا `abc`) اصلاً اعتبارسنجی نمی‌شود و در تست کدی به خطای JavaScript (صفحه خالی) می‌رسد؛ `#/tournament/` و `#/instructor/` هم مورد ۰ را نشان می‌دهند.

## 4. Main Features

- **نقش‌ها و داشبورد:** سه تجربه جدا با آمار، نمودار CSS، فهرست‌ها، دسترسی سریع و حالت‌های خالی.
- **فروشگاه:** ۲۴ محصول، ۸ دسته، جستجو، فیلتر (دسته، قیمت، سایز، رنگ، سطح، علاقه‌مندی)، ۴ مرتب‌سازی، کارت محصول، جزئیات (گالری، سایز، رنگ، تعداد، مشخصات، راهنمای سایز، مرتبط)، سبد، پیشنهادهای سه‌گانه.
- **ویدیوها:** ۱۲ ویدیو، جستجو (عنوان/مربی/دسته)، دسته، سطح، ذخیره‌شده‌ها، ۴ مرتب‌سازی، «ادامه تماشا»، پخش‌کننده نمونه (بدون ویدیوی واقعی)، ثبت پیشرفت.
- **تورنمنت‌ها، آکادمی:** ۶ تورنمنت، ۶ مربی، پروفایل و دوره‌ها.
- **AI Analysis:** فقط رابط نمایشی؛ اعداد ساختگی‌اند و هیچ مدلی اجرا نمی‌شود.
- **تصاویر:** سیستم اسلات (`<figure class="ph">` + `<img>` با `onerror`)؛ بدون فایل واقعی، گرادیان نشان داده می‌شود.
- **دسترس‌پذیری و Responsive:** `aria-*`، `prefers-reduced-motion`، Breakpointهای ۹۰۰/۷۶۰/۶۰۰/۳۵۹ پیکسل.

## 5. LocalStorage Keys

| کلید | ساختار | استفاده | معادل آینده |
|---|---|---|---|
| `role` | `"student"|"coach"|"club"` | نقش انتخابی | `users.role` |
| `cart` | `[{id, s, c, q}]` (محصول، سایز، رنگ، تعداد) | سبد | `carts` / `cart_items` |
| `fav` | `[productId]` | علاقه‌مندی محصول | `favorites` |
| `saved` | `[videoId]` | ویدیوهای ذخیره‌شده | `saved_videos` |
| `prog` | `{videoId: 0..100}` | پیشرفت تماشا | `video_progress` |
| `lastWatched` | `videoId` | آخرین ویدیوی باز شده | `video_progress.last_watched_at` |

مطابق درخواست‌های قبلی، نام کلیدهای `saved` و `prog` برای سازگاری با داشبورد حفظ شده است.

## 6. Frontend / Backend Separation

**همه چیز فعلاً Frontend/Demo است:**

| حوزه | وضعیت |
|---|---|
| Authentication | ندارد؛ نقش فقط یک مقدار `localStorage` است |
| Database | ندارد؛ همه داده‌ها آرایه‌های داخل فایل |
| سبد و علاقه‌مندی | فقط مرورگر؛ بین دستگاه‌ها همگام نمی‌شود |
| پرداخت | ندارد؛ دکمه «ادامه خرید» فقط هشدار می‌دهد |
| موجودی، قیمت، نظرات، امتیاز | نمایشی (تولیدشده با فرمول) |
| ویدیو | بدون فایل ویدیو؛ پخش‌کننده نمایشی؛ بازدیدها نمایشی |
| تورنمنت | بدون ثبت‌نام واقعی؛ شرکت‌کنندگان از لیست مربیان ساخته می‌شوند |
| آکادمی/مربیان | نام‌ها و تخصص‌ها فرضی |
| داشبورد | همه آمار نمایشی؛ دکمه‌های مدیریتی فقط اسکرول یا لینک |
| AI Analysis | کاملاً ساختگی؛ هیچ تحلیل واقعی انجام نمی‌شود |
| تصاویر | فقط اسلات؛ فایل واقعی وجود ندارد |

## 7. Data Models (پیشنهادی)

نمونه‌های آماده در پوشه `seed/` (با نام‌گذاری camelCase مناسب API):

```
User            {id, role, name, phone, email?, createdAt}
Profile         {userId, belt, level, coachId?, clubId?}
Club            {id, name, ownerId, city}
Coach           {id, userId, specialty, teachingLevel, bio}
Product         {id, name, categoryId, priceToman, stock, level, sizes[], colors[], description, usage, images[]}
Category        {id, type: product|video, name}
Order/OrderItem {id, userId, status, items[{productId,size,color,qty,unitPrice}]}
Video           {id, title, categoryId, level, durationSec, instructorId, description, assetId, status}
VideoProgress   {userId, videoId, percent, lastWatchedAt, saved}
Tournament      {id, name, status, startDate, location, weightClasses[], clubId}
Registration    {id, tournamentId, userId, weightClass, status}
ClassSession    {id, clubId, coachId, time, level, capacity, status}
Analysis        {id, userId, videoAssetId, status, result(json)}   // آینده
Asset           {id, kind, key, mime, size, ownerId, license}
```

فایل‌های seed: `products.json`، `videos.json`، `instructors.json`، `tournaments.json`، `dashboard-demo.json`، `taxonomy.json`. برای ورود به Database کافی است Script مهاجرت همین JSONها را بخواند.

## 8. API Structure (پیشنهادی، REST + JSON، پیشوند `/api/v1`)

```
POST /auth/otp/request · POST /auth/otp/verify · POST /auth/logout · GET /me · PATCH /me
GET  /products?q&category&min&max&size&color&level&sort&page
GET  /products/:id · GET /products/:id/related
GET/POST/PATCH/DELETE /cart/items · GET/POST/DELETE /favorites/:productId
POST /orders (بعد از پرداخت) · GET /orders
GET  /videos?q&category&level&saved&sort&page · GET /videos/:id
PUT  /videos/:id/progress · PUT/DELETE /videos/:id/save · GET /me/continue-watching
GET  /tournaments?status · GET /tournaments/:id · POST /tournaments/:id/registrations
GET  /instructors · GET /instructors/:id
GET  /dashboard/:role
POST /uploads/sign (آدرس امضاشده آپلود)
/admin/* (CRUD محصول، ویدیو، تورنمنت، مربی، کاربر؛ نیازمند نقش admin)
```

## 9. Database Structure (پیشنهادی)

PostgreSQL، کلید اصلی UUID، زمان‌ها `timestamptz`، قیمت به‌صورت عدد صحیح (تومان). جدول‌های کلیدی: `users`, `profiles`, `clubs`, `coaches`, `categories`, `products`, `product_variants`, `carts`, `cart_items`, `favorites`, `orders`, `order_items`, `videos`, `video_progress`, `saved_videos`, `tournaments`, `tournament_registrations`, `class_sessions`, `assets`, `analyses`, `audit_logs`. فهرست‌ها برای جستجو: `pg_trgm` یا Full-Text Search؛ ایندکس روی `(category, level)`، `status`، `created_at`.

## 10. Authentication Architecture

- ورود با OTP پیامکی (مناسب بازار ایران) و/یا ایمیل؛ نشست با Cookie امن `HttpOnly` یا JWT کوتاه‌مدت + Refresh Token.
- **RBAC:** نقش‌ها `student`, `coach`, `club`, `admin`. نقشِ کلاینت (`localStorage.role`) فقط برای رابط است؛ مجوزها سمت سرور بررسی شوند.
- Rate limit روی ارسال OTP، CSRF برای Cookie، لاگ حسابرسی برای پنل مدیریت.

## 11. File / Image Storage Architecture

- Object Storage (سازگار با S3) + CDN. کلید فایل‌ها همان ساختار فعلی: `images/judo/`, `products/`, `videos/`, `instructors/`, `tournaments/` (`manifest.json` موجود شامل فیلد مجوز/منبع/عکاس).
- آپلود با Presigned URL؛ تولید خودکار اندازه‌ها (WebP/AVIF) و برش مطابق نسبت‌های فعلی (۱۶:۱۰، ۴:۳، ۱۶:۹، ۴:۵).
- ویدیو: سرویس Streaming با HLS (یا Cloudflare Stream / Mux / زیرساخت داخلی در صورت الزام اقامت داده)، آدرس‌های امضاشده.
- در حالت فعلی `IMG_BASE` و `IMG_DATA` محل جایگزینی تصاویر هستند.

## 12. Cloud Deployment Architecture (پیشنهادی)

```
Browser ── CDN/Edge ── Frontend (Static یا SSR)
                    └─ API (Node/TypeScript) ── PostgreSQL
                                           ├─ Redis (نشست، Rate limit، کش)
                                           ├─ Object Storage + CDN (تصویر/ویدیو)
                                           └─ Queue/Worker (پردازش ویدیو، تحلیل AI در آینده)
```

- محیط‌ها: Development / Staging / Production، با CI/CD، متغیرهای محیطی و مدیریت Secret.
- مانیتورینگ: لاگ ساخت‌یافته، Error Tracking، Backup روزانه Database.
- توجه: لینک Artifact فعلی فقط برای **پیش‌نمایش** است. در نسخه Cloud فایل‌های `assets/` باید روی هاست واقعی قرار بگیرند.

## 13. مراحل پیشنهادی توسعه بعدی

1. **تقسیم کد بدون تغییر ظاهر:** جدا کردن `index.html`، `styles.css`، `app.js` و ماژول‌ها (`data/`, `views/`, `state/`) و اجرای تست رگرسیون با مقایسه خروجی با Baseline.
2. **Deploy استاتیک:** انتقال به هاست/CDN با دامنه، فعال‌سازی HTTPS و `assets/images/` واقعی.
3. **Backend و Database:** اسکیمای بخش ۹، Migration از `seed/*.json`، API فقط‌خواندنی برای محصول، ویدیو، تورنمنت و مربی؛ جایگزینی آرایه‌های Demo با `fetch`.
4. **Authentication و نقش‌ها:** OTP، نشست، RBAC و انتقال سبد، علاقه‌مندی، ذخیره‌ها و پیشرفت از `localStorage` به سرور (با ادغام اولیه).
5. **آپلود و پنل مدیریت:** مدیریت محصول، ویدیو، تورنمنت، مربی و تصاویر.
6. **سفارش و پرداخت:** درگاه پرداخت، موجودی واقعی، پیگیری سفارش.
7. **ویدیوی واقعی:** HLS، پیشرفت واقعی، بازدیدهای واقعی.
8. **تورنمنت و داشبورد واقعی:** ثبت‌نام، کلاس‌ها و آمار از Database.
9. **تحلیل حرکت (AI):** فقط پس از تصمیم محصولی؛ با برچسب شفاف و بدون ادعای نتیجه نمایشی به‌عنوان واقعی.
10. **امنیت، تست و عملکرد:** تست Browser واقعی (۳۲۰ تا ۱۴۴۰)، دسترس‌پذیری، سئو و Analytics.

## 14. ساختار پوشه‌های فعلی

```
tatami-plus.html                      ← نسخه زنده (Artifact)
baseline/tatami-plus.v1-baseline.html ← نسخه پایه (کپی یکسان)
seed/*.json                           ← دادهٔ Demo در قالب مناسب Database
assets/images/{judo,products,videos,instructors,tournaments}/ + manifest.json + README.md
PROJECT_ARCHITECTURE.md
```

---

## 15. به‌روزرسانی نسخه ۲ (v2)

### ساختار ماژولار (بدون Framework، بدون وابستگی)
```
src/index.html            ← پوسته (header, main, footer)
src/css/app.css
src/js/shared/            ← مشترک بین هر سه PWA آینده
  core.js components.js dashboard-kit.js content.js store.js videos.js
  views-core.js (خانه، نقش، داشبورد) views-store.js views-tournaments.js
  views-videos.js views-academy.js views-new.js (بلاگ، باشگاه‌ها، مربی، پروفایل، AI، 404)
  router.js
src/js/student/student.js ← BODY.student (داشبورد هنرجو)
src/js/coach/coach.js     ← BODY.coach
src/js/club/club.js       ← BODY.club
public/                   ← manifest، sw.js، offline.html، icons، assets/images
build.js                  ← node build.js ← dist/index.html + کپی public/
```
Build فقط الحاق فایل‌ها است (بدون Minify). برای ساخت سه PWA مستقل، `build.js` را سه بار با `shared + {student|coach|club}` و Manifest جدا اجرا کنید.

### مسیرهای اضافه‌شده
`#/blog`, `#/blog/ID`, `#/clubs`, `#/club/ID`, `#/profile` و صفحه 404 برای هر مسیر ناشناخته. شناسه‌ها اکنون فقط با عدد صحیح غیرمنفی معتبر هستند و در همه مسیرهای جزئیات (محصول، ویدیو، تورنمنت، مربی، مقاله، باشگاه) پیام «پیدا نشد» نمایش داده می‌شود.

### رفتار نقش‌ها
هنرجو پس از انتخاب نقش به `#/` می‌رود (داشبورد از «پروفایل» در دسترس است). مربی و باشگاه به `#/dashboard` می‌روند. بلاگ و باشگاه‌ها برای هر سه نقش باز است.

### PWA
`manifest.webmanifest` (RTL، فارسی، standalone، آیکون ۱۹۲/۵۱۲/maskable)، `sw.js` (Cache شل برنامه، شبکه‌اول برای ناوبری، `offline.html`)، تگ‌های `theme-color` و `apple-touch-icon`. Service Worker فقط روی HTTPS/localhost کار می‌کند و در نسخه Artifact غیرفعال است.

### شناخته‌شده‌ها
تصاویر هنوز فقط اسلات هستند؛ داده‌ها Demo؛ `build.js` Minify نمی‌کند؛ PWA در مرورگر و دستگاه واقعی تست نشده.

---

## 17. نسخه Design System + مربیان/حامیان
ساختار: `src/design/tokens.json` (منبع توکن)، `src/css/{base,components,ui}.css`، `src/js/ui/components-ui.js`، `src/data/{coaches,sponsors}.json`، `views-coaches.js`، `views-sponsors.js`، `views-styleguide.js` (فقط Preview). جزئیات در `DESIGN_SYSTEM.md` و `COACHES_SPONSORS.md`.

---

## 18. مرحله تثبیت، تاتامی‌پدیا و رابط پنل مارکتینگ
خروجی‌ها: `student/ coach/ club/` (PWA)، `marketing/` (رابط مدیریت محتوا، بدون سرویس‌ورکر)، `preview/`. پنل مارکتینگ عمداً در سه PWA تکرار نشده است. لایه داده: `js/shared/api.js` (عمومی) و `js/marketing/{demo-store,api-client}.js` (دو آداپتور با رابط یکسان: نمایشی/API). قرارداد بک‌اند: `docs/API_CONTRACT.md`. بک‌اند در این پروژه پیاده‌سازی نشده است.
