# وضعیت اتصال قابلیت‌ها به Django

**مبنای بررسی:** دست‌نویس handoff فارسی در مخزن Radinsharifi/Tatami-demo، شاخهٔ main، commit 5f3a416d0aa5aa0363b2064ed23051a9273d8f75.  
**توجه:** «قرارداد وجود دارد» به معنی تست زنده یا تأیید دسترسی روی سایت نیست.

| قابلیت | شواهد قرارداد | وضعیت اتصال در فرانت‌اند طبق مبنای معماری | تصمیم طراحی |
|---|---|---|---|
| خانه و محتوای عمومی | GET / | Template سرور دارد؛ وضعیت دقیق پوسته باید بررسی شود | طراحی مستقل |
| ورود/ثبت‌نام و حساب | `/auth/login/` ورود با رمز؛ `/auth/login/sms/` ورود/ثبت‌نام پیامکی؛ `/auth/otp/verify/` تأیید کد؛ complete-profile و password routes | قالب login در شاخهٔ طراحی اکنون با `mode=password|sms` دو فرم مستقل و action صحیح دارد؛ workflow قرارداد Django موفق، template compilation و ۵۷ تست بک‌اند موفق؛ آزمون زندهٔ OTP/SMS روی دامنه هنوز انجام نشده | اصلاح کد P0 و آزمون قراردادی/سروری CI موفق؛ تأیید نهایی UX و SMS واقعی روی دامنه باقی است |
| فهرست و پروفایل مربی | /coaches/ و جزئیات | متصل طبق معماری، فقط دادهٔ منتشرشده | دادهٔ واقعی؛ empty state |
| درخواست و وضعیت مربی | /coaches/apply/ و application/ | bridge route موجود | فرم و status واقعی |
| فروشگاه و سبد | /store/، detail، cart و POSTها | متصل؛ مرجع قیمت/موجودی Django | دادهٔ واقعی؛ کاتالوگ خالی را درست نمایش بده |
| Checkout و پرداخت | /checkout/ و callback | متصل؛ gateway آزمایشی | طراحی تمام حالت‌ها، عدم ادعای پرداخت واقعی |
| سفارش‌ها | /orders/ و detail | مسیر bridge شناخته شده | فقط سفارش همان کاربر |
| باشگاه مجازی | /club/، دوره، قسمت و خرید | بخشی متصل؛ فقط published واقعی | بدون نمایش دورهٔ نمونه به‌عنوان واقعی |
| پنل دورهٔ مربی | /coach/courses/ و /coach/students/ | وجود قرارداد؛ نگاشت کامل Bridge نیاز ممیزی دارد | طراحی role-gated |
| جم | /account/gems/ | متصل طبق معماری | ledger واقعی؛ خرج‌کردن ناقص |
| بلاگ | /blog/ و detail | متصل | فقط published |
| باشگاه فیزیکی | /gyms/، detail، new، panel و coach actions | Template و Bridge در فرانت‌اند کامل نیست | طراحی کامل؛ اتصال مسدود تا تکمیل لایهٔ فرانت‌اند |
| خدمات تخصصی | endpoint تأییدشده در handoff فعلی موجود نیست | فقط UI | طراحی با empty state |
| مربی آنلاین و AI | endpoint عملیاتی تأیید نشده | فقط UI | طراحی؛ بدون تحلیل ساختگی |
| نقشه و مکان‌یابی باشگاه | مسیر/قرارداد جست‌وجوی جغرافیایی تأیید نشده | نمونهٔ فرانت‌اندی | عدم نمایش مختصات/فاصلهٔ واقعی‌نما |
| تاتامی‌پدیا | مدل/route متناظر در Django فعلی ندارد | فقط Frontend | برچسب محتوا/نمونه و جداسازی |
| پنل مارکتینگ | API JSON/CORS فعلی وجود ندارد؛ CMS از Admin | کلاینت فرانت‌اند ممکن است حالت demo/api داشته باشد | طراحی UI؛ اتصال به قرارداد فعلی ادعا نشود |

## ۱. مواردی که باید پیش از اتصال رفع/تصمیم‌گیری شوند

1. **P0 ورود پیامکی، اصلاح کد انجام شد:** قالب frontend-owned بر اساس `mode` دو فرم جدا دارد؛ password به `phone_auth:login` و SMS به `phone_auth:sms_login` POST می‌کند. تست قراردادی، بررسی routeها، compile قالب‌ها و ۵۷ تست بک‌اند در CI موفق بوده‌اند. بررسی نحوی bundleهای چهار خروجی و Service Workerهای سه PWA نیز موفق است؛ اما QA کامل مرورگری PWA هنوز به‌علت شکست یک آزمون اندازهٔ هدف لمسی در `#/video/3` و سه آزمون فنی چرخه/منابع Service Worker سبز نیست. آزمون زندهٔ OTP/SMS روی دامنه همچنان لازم است.
2. **تعارض handoff و کد:** فایل handoff در بخش ورود، `/auth/login/` را گاهی OTP توصیف می‌کند؛ اما `accounts/auth_urls.py` و `accounts/views.py` فعلی `/auth/login/` را `password_login` و `/auth/login/sms/` را `phone_login` ثبت می‌کنند. مبنای طراحی فعلاً کد جاری است؛ handoff باید با مالک بک‌اند همسان شود.
3. قالب تکمیل پروفایل پنج فیلد دارد: name، city، role، password و password_confirm؛ توضیح قدیمی handoff فقط سه فیلد پایه را نام برده بود.
4. View تأیید OTP مقدار `resend_in` را به قالب نمی‌دهد؛ شمارش معکوس ظاهری نباید از نظر UI معادل مجوز سرور تلقی شود.
5. routeهای تخصصی در MAXSEG ثبت شده‌اند، اما در handoff فعلی endpoint عملیاتی برای آن‌ها یافت نشده است؛ وضعیت آن‌ها UI-only می‌ماند.
6. مسیرهای `/gyms/` در Django و Templateهای backend وجود دارند، اما Router/Bridge فرانت‌اند آن‌ها را پوشش نمی‌دهد و در مخزن فرانت‌اند نیز پوشش قالب‌های اختصاصی gyms کامل نیست.
7. تفاوت role=club در PWA و role=gym در Django باید با mapping صریح و بدون جعل نقش حل شود.
8. Design System راهنمای زنده را در Preview معرفی می‌کند، اما `preview.deny` در Build آن را بسته است.
9. چند View مالک routeهای هم‌نام هستند؛ ترتیب Object.assign در Build باید برای routeهای متداخل در رجیستری ثبت شود.
10. مسیر `coach-invite` در resolver دیده می‌شود ولی route allowlist و واگذاری زندهٔ Preview آن کامل نیست.
11. پنل بازاریابی نباید بر API فرضی یا mock server به‌عنوان production تکیه کند.
12. داده‌های نمونهٔ dashboard، courses، coach، store، map و video باید از مسیرهای متصل production جدا باشند.
13. در پرداخت MockGateway فقط یک محیط/درگاه آزمایشی است.

## ۲. تعریف وضعیت اتصال

- **Connected:** قرارداد server-rendered و اتصال front-end در مسیر مورد نظر مستند و تست شده است.
- **Contract-only:** مسیر و رفتار در handoff وجود دارد؛ اتصال Preview هنوز اثبات نشده.
- **UI-only:** رابط وجود دارد یا طراحی می‌شود؛ backend operational contract یافت نشده.
- **Blocked:** اتصال به تصمیم/تغییر بک‌اند یا پوشش Template/Bridge نیاز دارد.
- **Needs verification:** منابع کد نشان می‌دهند اتصال وجود دارد، اما آزمون زنده یا رگرسیون روی commit جاری ثبت نشده.

