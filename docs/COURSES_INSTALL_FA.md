# راهنمای نصب بستهٔ فرانت‌اند دوره‌ها

مخزن GitHub این فایل‌ها را زیر پوشهٔ django/ نگه می‌دارد. فایل ZIP تحویلی برای ادغام مستقیم در ریشهٔ پروژهٔ Django چیده شده و مسیرهای آن با templates/ و static/ شروع می‌شوند.

## مسیرهای داخل ZIP قابل بارگذاری

- templates/base.html
- templates/components/course_card.html
- templates/components/course_episode_row.html
- templates/club/list.html
- templates/club/coach_detail.html
- templates/club/course_detail.html
- templates/club/episode.html
- templates/coach/courses.html
- templates/coach/course_form.html
- static/css/courses.css
- static/js/course-ui.js
- docs/COURSES_FRONTEND_HANDOFF_FA.md

## مقصد نصب

ZIP را در ریشهٔ پروژهٔ Django استخراج و فایل‌ها را با پوشه‌های موجود ادغام کنید. از ساخت مسیرهای تودرتو مانند templates/templates یا static/static خودداری کنید.

نسخهٔ base.html داخل ZIP برای بک‌اند مستقل Tatami-demo-main.zip ساخته شده و از static/css/styles.css فعلی آن پروژه استفاده می‌کند. نسخهٔ ثبت‌شده در GitHub در django/templates/base.html بخشی از ساختار Django integration مخزن است و از tatami.css استفاده می‌کند؛ این دو base برای دو مقصد متفاوت‌اند و نباید با هم جایگزین شوند.

## محدودیت اتصال

بک‌اند بررسی‌شده اپ/مدل/فرم/URL دوره‌ها، رابطهٔ enrollment، خرید و ذخیره‌سازی ویدئو را ندارد. صفحات پس از افزودن URLها و contextهای مستندشده در COURSES_FRONTEND_HANDOFF_FA.md قابل اجرا خواهند شد. خرید ساختگی یا دسترسی جعلی ایجاد نمی‌شود.