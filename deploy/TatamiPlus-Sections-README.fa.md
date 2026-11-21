# نصب بخش‌های یکپارچه‌شده تاتامی پلاس

## محتوای بسته
- نسخهٔ آمادهٔ فرانت‌اند در مسیر /home/pvchubir/tatamiplus.ir/preview/
- ده قالب HTML مشخص Django در مسیر /home/pvchubir/tatamiplus_app/templates/

**نکتهٔ static:** این بسته هیچ فایل CSS/JS، فونت یا پوشهٔ `static/` را تغییر نمی‌دهد. چون قالب‌های نصب‌شونده از این فایل‌های موجود استفاده می‌کنند، همهٔ موارد زیر باید از استقرار قبلی در مسیر `/home/pvchubir/tatamiplus.ir/static/` وجود داشته باشند و از مرورگر پاسخ HTTP 200 بدهند:

- CSS: `css/tatami.css`، `css/backend-templates.css`، `css/module-pages.css`، `css/home-restored.css` و `css/reference-store.css`
- JavaScript: `js/tatami.js`، `js/module-pages.js`، `js/home-restored.js` و `js/reference-store.js`
- دادهٔ کاتالوگ مرجع: `data/reference-store-catalog.json`

پیش‌نیازهای بالا در مسیر فایل‌های هاست نیز باید موجود باشند. نصب‌کننده آن‌ها را در مرحلهٔ --preflight بررسی می‌کند؛ این مرحله فقط خواندنی است و هیچ فایلی را تغییر نمی‌دهد. پس از پیش‌بررسی، نشانی‌های متناظر زیر دامنهٔ https://tatamiplus.ir/static/ را نیز باز کنید و پاسخ HTTP 200 را ببینید. اگر فایل یا نشانی‌ای موجود نیست، نصب را متوقف کنید؛ ابتدا باید مسئول استقرار staticهای سازگار را منتشر کند. نصب‌کننده عمداً static root را دست نمی‌زند.

## پیش‌نیاز مهم بک‌اند

این بسته کد Python، فایل URLهای Django یا اپلیکیشن Blog را نصب/به‌روزرسانی نمی‌کند. قبل از نصب روی سایت عمومی، بک‌اندِ فعال باید از قبل اپ Blog و مسیرهای `/blog/` و `/blog/<slug>/` را داشته باشد؛ قرارداد مرجع در این پروژه با commit `20e96721cc1a589d625fecd3fffa9ec42b1fc64f` از مخزن `Radinsharifi/Tatami-demo` بررسی شده است. اگر تیم بک‌اند این نسخه یا معادل سازگار آن را روی سرور منتشر نکرده، فعلاً این بسته را نصب نکنید؛ نصب آن به‌تنهایی route وبلاگ را به Django اضافه نمی‌کند.

## نصب در cPanel
1. فایل ZIP را در مسیر /home/pvchubir بارگذاری کنید.
2. در File Manager آن را Extract کنید و مقصد را دقیقاً /home/pvchubir بگذارید.
3. در Terminal، ابتدا سلامت خود ZIP را بررسی کنید:

   python3 /home/pvchubir/TatamiPlus-Sections-2026-11-21/install.py --check

4. پیش‌بررسی مسیرهای cPanel و فایل‌های static را اجرا کنید:

   python3 /home/pvchubir/TatamiPlus-Sections-2026-11-21/install.py --preflight

5. فقط وقتی هر دو دستور قبلی موفق شدند و نشانی‌های static پاسخ ۲۰۰ می‌دهند، نصب را اجرا کنید:

   python3 /home/pvchubir/TatamiPlus-Sections-2026-11-21/install.py

**اگر --check یا --preflight خطا داد، دستور نصب را اجرا نکنید.** خطا را برای بررسی بفرستید. پیش‌بررسی و بررسی ZIP هیچ فایلی از سایت را تغییر نمی‌دهند.

نصب‌کننده پیش از جایگزینی، از Preview فعلی و ده قالبی که تغییر می‌کنند پشتیبان می‌گیرد. static root دست‌نخورده می‌ماند.

## بازگردانی نسخهٔ قبلی
در صورت نیاز به بازگشت، این دستور را اجرا کنید:

python3 /home/pvchubir/TatamiPlus-Sections-2026-11-21/install.py --rollback

پشتیبان‌ها در /home/pvchubir/tatami_backups/ نگهداری می‌شوند.

## محدودهٔ تغییرات
این بسته فقط فرانت‌اند است. دیتابیس، migrationها، فایل .env، تنظیمات WSGI و منطق Python بک‌اند را تغییر نمی‌دهد. هیچ دادهٔ آزمایشی به دیتابیس اضافه نمی‌شود.

پس از نصب، سایت را با Ctrl+F5 بازخوانی کنید.
