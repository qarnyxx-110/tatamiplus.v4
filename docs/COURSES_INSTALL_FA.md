# راهنمای نصب بستهٔ فرانت‌اند دوره‌ها

## مسیرهای بسته

- django/templates/base.html
- django/templates/components/course_card.html
- django/templates/components/course_episode_row.html
- django/templates/club/list.html
- django/templates/club/coach_detail.html
- django/templates/club/course_detail.html
- django/templates/club/episode.html
- django/templates/coach/courses.html
- django/templates/coach/course_form.html
- django/static/css/courses.css
- django/static/js/course-ui.js
- docs/COURSES_FRONTEND_HANDOFF_FA.md

## محل کپی در مخزن

محتویات پوشهٔ django/templates/ در همین مخزن در django/templates/ و محتویات django/static/ در django/static/ قرار می‌گیرند.

## محل کپی در ZIP مستقل بک‌اند

ZIP مستقل Tatami-demo-main.zip پوشه‌های templates/ و static/ را مستقیماً در ریشه دارد. برای ادغام این patch در آن پروژه، پیشوند django/ را از مسیرهای بسته حذف کنید:
- django/templates/... به Tatami-demo-main/templates/...
- django/static/... به Tatami-demo-main/static/...

فایل base موجود در ساختار Django integration مخزن به‌روزرسانی شده است. اگر نسخهٔ مستقل Tatami-demo-main را هدف می‌گیرید، فایل base آن از قالب قدیمی styles.css استفاده می‌کند؛ ابتدا باید آن base را با layout جدید هماهنگ کنید یا نسخهٔ یکپارچه‌سازی موجود در django/templates/base.html را همراه فایل‌های static متناظر استفاده کنید.

## محدودیت اتصال

این بسته فقط رابط کاربری و رفتار مرورگر است. اپ/مدل/فرم/URL دوره‌ها، رابطهٔ enrollment، خرید و ذخیره‌سازی ویدئو در بک‌اند بررسی‌شده وجود ندارد. پیش از انتشار، موارد مشخص‌شده در COURSES_FRONTEND_HANDOFF_FA.md باید در بک‌اند پیاده‌سازی و تأیید شوند. خرید ساختگی یا دسترسی جعلی ایجاد نمی‌شود.