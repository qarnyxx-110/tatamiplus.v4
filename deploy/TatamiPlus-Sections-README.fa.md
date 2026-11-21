# نصب بخش‌های یکپارچه‌شده تاتامی پلاس

## محتوای بسته
- نسخهٔ آمادهٔ فرانت‌اند در مسیر /home/pvchubir/tatamiplus.ir/preview/
- ده قالب HTML مشخص Django در مسیر /home/pvchubir/tatamiplus_app/templates/

## پیش‌نیاز مهم بک‌اند

این بسته کد Python، فایل URLهای Django یا اپلیکیشن Blog را نصب/به‌روزرسانی نمی‌کند. قبل از نصب روی سایت عمومی، بک‌اندِ فعال باید از قبل اپ Blog و مسیرهای `/blog/` و `/blog/<slug>/` را داشته باشد؛ قرارداد مرجع در این پروژه با commit `20e96721cc1a589d625fecd3fffa9ec42b1fc64f` از مخزن `Radinsharifi/Tatami-demo` بررسی شده است. اگر تیم بک‌اند این نسخه یا معادل سازگار آن را روی سرور منتشر نکرده، فعلاً این بسته را نصب نکنید؛ نصب آن به‌تنهایی route وبلاگ را به Django اضافه نمی‌کند.

## نصب در cPanel
1. فایل ZIP را در مسیر /home/pvchubir بارگذاری کنید.
2. در File Manager روی ZIP گزینهٔ Extract را بزنید و مقصد را همان /home/pvchubir بگذارید.
3. در Terminal فقط این دستور را اجرا کنید:

   python3 /home/pvchubir/TatamiPlus-Sections-2026-11-21/install.py

نصب‌کننده پیش از نصب، تمام فایل‌های بسته را با SHA256 کنترل می‌کند، از Preview فعلی و ده قالبی که جایگزین می‌شوند پشتیبان می‌گیرد و سپس فایل‌ها را جایگزین می‌کند.

## بررسی ZIP بدون نصب
python3 /home/pvchubir/TatamiPlus-Sections-2026-11-21/install.py --check

## بازگردانی نسخهٔ قبلی
python3 /home/pvchubir/TatamiPlus-Sections-2026-11-21/install.py --rollback

پشتیبان‌ها در /home/pvchubir/tatami_backups/ نگهداری می‌شوند.

## محدودهٔ تغییرات
این بسته فقط فرانت‌اند است. دیتابیس، migrationها، فایل .env، تنظیمات WSGI و منطق Python بک‌اند را تغییر نمی‌دهد. هیچ دادهٔ آزمایشی به دیتابیس اضافه نمی‌شود.

پس از نصب، سایت را با Ctrl+F5 بازخوانی کنید.
