# ماتریس پوشش طراحی صفحه‌ها

**مبنای Router:** شاخهٔ `design/new-design-system`، فایل `shared/src/js/shared/router.js` در HEAD ممیزی‌شده  
**مبنای backend:** `Radinsharifi/Tatami-demo@5f3a416d0aa5aa0363b2064ed23051a9273d8f75`  
**وضعیت این نسخه:** فهرست شروع؛ تا تکمیل Page Spec و تست، هیچ ردیفی «تمام‌شده» نیست.

## راهنمای وضعیت

- **موجود:** View یا Template در کد وجود دارد.
- **طراحی‌نشده:** برای صفحهٔ هدفمند، Page Spec و حالت‌های آن تکمیل نشده است.
- **متصل:** وجود مسیر و اتصال باید با آزمون جاری تأیید شود؛ صرف وجود در handoff کافی نیست.
- **UI-only:** طراحی می‌شود، اما endpoint یا قرارداد عملیاتی پیدا نشده است.
- **مسدود:** وابسته به route/Bridge، قالب frontend-owned یا تصمیم قراردادی.

## ۱. خانه و محتوای عمومی

| شناسه | صفحه | مسیر/route | مالک فعلی | منبع داده/واقعیت | طراحی و اولویت |
|---|---|---|---|---|---|
| PG-001 | خانه عمومی | `#/` | `views-core.js` + `content.js` | فید مربیان/فروشگاه از Django؛ آمار و برخی کارت‌ها محلی | Spec v0.1 ثبت شد؛ تأیید طراحی و سپس پیاده‌سازی |
| PG-002 | جست‌وجو | `#/search` | `views-core.js` و Viewهای feature | ترکیبی؛ هر گروه منبع و fallback جدا دارد | نیازمند Spec؛ نتیجهٔ نمونه از نتیجهٔ Django جدا |
| PG-003 | راهنمای طراحی | `#/design-system` | وضعیت Build فعلی deny | سند/کامپوننت؛ مسیر فعلاً مسدود | فقط ابزار داخلی؛ تعیین مسیر/اجازه پیش از فعال‌سازی |
| PG-004 | 404 | route نامعتبر | `views.nf` | محلی | نیازمند حالت‌های امن و مسیر بازگشت |

## ۲. حساب و احراز هویت

| شناسه | صفحه | مسیر/route | مالک/قرارداد | وضعیت اولیه | اولویت |
|---|---|---|---|---|---|
| PG-010 | ورود با رمز | `#/login` → `/auth/login/` | Django | اتصال Bridge باید با تست جاری تأیید شود | P0 |
| PG-011 | ورود/ثبت‌نام پیامکی | `#/register` → `/auth/login/sms/` | Django OTP | فلو واحد؛ ثبت‌نام جداگانه نیست | P0 |
| PG-012 | انتخاب نقش | `#/role` در جریان ویژهٔ live Preview | نقش‌های student/coach/gym | mapping نقش در طراحی لازم است؛ Router hash مستقل ندارد | P0 |
| PG-013 | بازیابی رمز | `#/password-reset` | Django | قرارداد در handoff موجود | P1 |
| PG-014 | تنظیم رمز | `#/set-password` | Django | دسترسی وابسته به session/token معتبر | P1 |
| PG-015 | تکمیل پروفایل | URL مستقیم Django | Django | route hash عمومی مستقل ندارد | P0 |
| PG-016 | هاب حساب | `#/profile` و `#/my-profile` | `views-new.js` و `views-coaches.js` با هم‌پوشانی | مالک نهایی route باید در Build تست شود | P0 |
| PG-017 | خروج | POST `/accounts/logout/` | Django | CSRF/session | P1 |

## ۳. فروشگاه و سفارش

| شناسه | صفحه | مسیر | مالک/منبع | وضعیت اولیه | اولویت |
|---|---|---|---|---|---|
| PG-020 | فهرست فروشگاه | `#/store` → `/store/` | Django در live Preview؛ Catalog محلی در PWA | کاتالوگ backend طبق handoff خالی است | P0 |
| PG-021 | جزئیات محصول | `#/product/<id-or-slug>` → resolver امن Django | Django | شناسه باید از لینک واقعی پیدا شود؛ حدس ممنوع | P0 |
| PG-022 | سبد خرید | `#/cart` → `/store/cart/` | Django در Preview؛ state محلی در PWA | مهمان و واردشده؛ موجودی سرور | P0 |
| PG-023 | نشانی Checkout | `#/checkout` → `/checkout/address/` | Django | نشانی معتبر و خطاهای فرم | P0 |
| PG-024 | بازبینی Checkout | مسیر Django | Django | قیمت/ارسال از سرور | P0 |
| PG-025 | انتقال به درگاه | `/checkout/pay/` | Django + gateway آزمایشی | POST باید redirect native را حفظ کند | P0 |
| PG-026 | نتیجه و Callback | `/payment/callback/` و سفارش | Django | موفقیت تنها با تأیید سرور | P0 |
| PG-027 | فهرست سفارش‌ها | `#/orders` در واگذاری ویژهٔ live | Django | کلید در MAXSEG مستقل نیست؛ تست bridge لازم | P1 |
| PG-028 | جزئیات سفارش | `/orders/<order_number>/` | Django | مالکیت سرور | P1 |

## ۴. مربیان و باشگاه مجازی

| شناسه | صفحه | مسیر | مالک/منبع | وضعیت اولیه | اولویت |
|---|---|---|---|---|---|
| PG-030 | فهرست مربیان | `#/coaches` → `/coaches/` | Django published در Preview | empty state برای کاتالوگ خالی | P0 |
| PG-031 | پروفایل مربی | `#/coaches/<slug>` یا `#/instructor/<id>` | resolver از فهرست واقعی | تطبیق باید یکتا باشد | P1 |
| PG-032 | درخواست مربی | `#/coach-apply` → `/coaches/apply/` | Django CoachPortfolio | فرم و وضعیت دقیق | P1 |
| PG-033 | پیگیری درخواست | `#/coach-application` → `/coaches/application/` | Django | pending/approved/rejected/resubmitted | P1 |
| PG-034 | دعوت مربی | `#/coach-invite/<code>` مورد انتظار | Bridge resolver دارد، allowlist/واگذاری ناقص | مسدود تا route test | P1 |
| PG-035 | فهرست دوره‌ها | `#/courses` → `/club/` | Django published | فهرست خالی واقعی مجاز است | P1 |
| PG-036 | جزئیات/صفحه مربی دوره | `#/courses/<slug>` یا مقصد امن | Django | slug فقط از لینک معتبر | P1 |
| PG-037 | قسمت/پخش | `#/episode/<slug>` | Django protected stream | مجوز ویدئو با سرور | P1 |
| PG-038 | ویدیوهای ضبط‌شدهٔ نمونه | `#/videos` و `#/video/<id>` | دادهٔ محلی Preview/PWA | برچسب نمونه؛ هیچ شمارندهٔ واقعی‌نما | P2 |
| PG-039 | پنل دوره مربی | URLهای `/coach/courses/` و فرزندان | Django | Contract-only تا تست Bridge/Template | P1 |
| PG-040 | هنرجوهای مربی | `/coach/students/` | Django | رابطه فقط از invite ساخته می‌شود | P2 |

## ۵. باشگاه ورزشی و نقش‌ها

| شناسه | صفحه | مسیر | مالک/منبع | وضعیت اولیه | اولویت |
|---|---|---|---|---|---|
| PG-050 | نقشهٔ نمونه باشگاه‌ها | `#/clubs` | `views-clubs-map.js` | دادهٔ local؛ فاصله/مختصات واقعی‌نما ممنوع | P2 |
| PG-051 | جزئیات باشگاه نمونه | `#/club/<id>` | View محلی | از Django `/club/` دوره‌ها تفکیک بماند | P2 |
| PG-052 | فهرست باشگاه‌های واقعی | `/gyms/` | Django active gyms | Blocked: Router/Bridge ندارد | P0 |
| PG-053 | جزئیات باشگاه واقعی | `/gyms/<gym_id>/` | Django active gym | Blocked: route mapping/Template coverage | P0 |
| PG-054 | ساخت باشگاه | `/gyms/new/` | Django OTP + form | Contract-only؛ UI باید فیلد/خطای واقعی را حفظ کند | P1 |
| PG-055 | پنل باشگاه | `/gyms/panel/` | Django role=gym | Bridge و قالب frontend-owned نیاز ممیزی | P1 |
| PG-056 | مدیریت مربی باشگاه | POSTهای add/link/remove/unlink | Django | تأیید و خطای فیلدی | P1 |

## ۶. خدمات، محتوا و سایر صفحات

| شناسه | صفحه | مسیر | مالک/منبع | وضعیت اولیه | اولویت |
|---|---|---|---|---|---|
| PG-060 | مربی آنلاین | `#/online-coach` | `views-online-coach.js` | UI-only؛ دوربین lifecycle دارد | P1 |
| PG-061 | تحلیل هوشمند AI | `#/ai` | View فعلی | UI-only؛ هیچ تحلیل ساختگی/ادعای AI | P2 |
| PG-062 | خدمات تخصصی | `#/specialist-services` | `views-specialist-services.js` | UI-only، Router مجاز | P2 |
| PG-063 | مربیان تغذیه | `#/nutrition-coaches` | همان View | UI-only | P2 |
| PG-064 | کلینیک‌های ورزشی | `#/sports-clinics` | همان View | UI-only | P2 |
| PG-065 | روان‌شناسان ورزشی | `#/sports-psychologists` | همان View | UI-only | P2 |
| PG-066 | بلاگ | `#/blog` و جزئیات slug | Django published در Preview | فقط محتوای منتشرشده | P1 |
| PG-067 | تاتامی‌پدیا | `#/tatamipedia` و جزئیات | Frontend-only | محتوا باید وضعیت منبع/نمونه را روشن کند | P2 |
| PG-068 | مسابقات | `#/tournaments` و جزئیات | داده/تعامل محلی فعلی | backend contract تأیید نشده | P2 |
| PG-069 | جم | `#/gems` → `/account/gems/` | Django ledger | کسب جم واقعی؛ خرج در Checkout کامل نیست | P1 |
| PG-070 | حامیان | `#/sponsors` | View محلی | محتوای ثابت/تأییدشده؛ CTA واقعی | P2 |
| PG-071 | پنل مارکتینگ | Build مستقل | `marketing/*` | demo/API client؛ اتصال Django وجود ندارد | P2 |
| PG-072 | Django Admin | `/admin/` | Backend-native + CSS مجاز | طراحی workflow جدید در این مخزن خارج از محدوده | P2 |

## ۷. ترتیب طراحی پیشنهادی

1. خانه و Shell عمومی (PG-001).
2. ورود/ثبت‌نام OTP، تکمیل پروفایل و هاب حساب (PG-010 تا PG-017).
3. فروشگاه تا نتیجهٔ سفارش (PG-020 تا PG-028).
4. فهرست و پروفایل مربیان، ثبت و پیگیری مربی (PG-030 تا PG-034).
5. باشگاه مجازی، قسمت و پنل مربی (PG-035 تا PG-040).
6. فهرست/جزئیات/ساخت/پنل باشگاه (PG-052 تا PG-056).
7. جم، وبلاگ و سایر محتوا.
8. قابلیت‌های UI-only و پنل‌های مستقل.

هر صفحه با `PAGE_SPEC_TEMPLATE_FA.md` مشخصات می‌گیرد و سپس وارد طراحی بصری می‌شود.
