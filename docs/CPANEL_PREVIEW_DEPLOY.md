# انتشار خودکار نسخه Preview روی cPanel

این گردش‌کار فقط نسخه استاتیک پیش‌نمایش را منتشر می‌کند؛ به قالب‌های Django، پنل‌های Student/Coach/Club، دامنه اصلی یا دیتابیس دست نمی‌زند.

## محدوده انتشار

- سورس Build: `shared/src/`
- اسکریپت Build: `shared/build.js`
- خروجی Build: `shared/dist/preview/`
- مقصد وب: پوشه `public_html/preview/` روی هاست
- مقصد FTP در گردش‌کار: ریشه حساب FTP محدودشده (`./`)

**نکته امنیتی:** یک حساب FTP مستقل بسازید که پوشه خانه/Directory آن دقیقاً پوشه `public_html/preview` باشد. گردش‌کار با `server-dir: ./` کار می‌کند تا حساب FTP نتواند به سایر فایل‌های سایت دسترسی داشته باشد. از حساب اصلی cPanel یا FTPای که به کل `public_html` دسترسی دارد استفاده نکنید.

## ۱) ساخت حساب محدود در cPanel

1. وارد cPanel شوید و به **Files → FTP Accounts** بروید.
2. یک حساب جدید مخصوص GitHub Actions بسازید.
3. در فیلد **Directory** مسیر `public_html/preview` را انتخاب/وارد کنید.
4. رمز قوی و یکتا بسازید و آن را فقط در GitHub Secret ذخیره کنید.
5. پس از ساخت، کنار همان حساب روی **Configure FTP Client** بزنید و مقادیر بخش **Manual Settings** را بردارید.
6. برای اتصال رمزگذاری‌شده FTPS، از Server/Hostname ارائه‌شده در همان بخش استفاده کنید؛ صرفاً فرض نکنید نام دامنه اصلی همان FTP hostname است. پورت معمولاً 21 است، اما مقدار هاست ملاک نهایی است.

این حساب باید فقط بتواند داخل `public_html/preview/` فایل ایجاد/به‌روزرسانی کند.

## ۲) افزودن GitHub Secrets

در مخزن GitHub به مسیر **Settings → Secrets and variables → Actions → New repository secret** بروید و سه Secret زیر را اضافه کنید:

| نام Secret | مقدار |
|---|---|
| `FTP_SERVER` | Server/Hostname در Manual Settings بخش Configure FTP Client |
| `FTP_USERNAME` | نام کاربری کامل حساب FTP جدید |
| `FTP_PASSWORD` | رمز همان حساب FTP |

مقادیر را در چت، فایل سورس، یا commit قرار ندهید. پورت پیش‌فرض گردش‌کار 21 است. اگر cPanel در Manual Settings پورت دیگری برای FTPS اعلام کرد، در GitHub به مسیر **Settings → Secrets and variables → Actions → Variables → New repository variable** بروید و متغیر اختیاری `FTP_PORT` را با همان عدد بسازید. گردش‌کار FTPS رمزگذاری‌شده را با اعتبارسنجی گواهی فعال می‌کند. اگر هاست FTPS را پشتیبانی نمی‌کند، پیش از تغییر پروتکل باید اطلاعات فنی میزبان بررسی شود؛ FTP ساده رمز را رمزگذاری نمی‌کند.

## ۳) فعال‌سازی

1. این Pull Request را بررسی و در صورت تأیید به `main` ادغام کنید.
2. بعد از افزودن سه Secret، از **Actions → Build and deploy Tatami Plus preview to cPanel → Run workflow** یک بار انتشار را دستی اجرا کنید.
3. اجرای سبز workflow فقط موفقیت Build و انتقال FTP را نشان می‌دهد؛ سپس URL عمومی را در مرورگر بررسی کنید:
   `https://tatamiplus.ir/preview/`

پس از ادغام، تغییرات بعدی در `shared/src/` یا `shared/build.js` با push به `main` به‌صورت خودکار Build و منتشر می‌شوند.

## رفتار محافظتی

- در Pull Request فقط Build و اعتبارسنجی انجام می‌شود؛ آپلود انجام نمی‌شود.
- تا پیش از تنظیم سه Secret، انتشار به‌صورت امن Skip می‌شود.
- `dangerous-clean-slate` خاموش است و حساب FTP نیز باید فقط به پوشه Preview محدود باشد.
- فایل‌های Django و سایر پوشه‌های خروجی در مقصد FTP این workflow قرار ندارند.
- این workflow عمداً checkout/cart/payment نمایشی را به سرویس واقعی تبدیل نمی‌کند و صرفاً فایل‌های فرانت‌اند Preview را منتشر می‌کند.
