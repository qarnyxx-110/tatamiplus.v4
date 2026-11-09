# قرارداد فرانت‌اند دوره‌ها و پنل مربی

این سند قرارداد لازم برای اتصال شش صفحهٔ دوره‌ها به Django را مشخص می‌کند. این بسته فقط template/CSS/JavaScript است؛ ایجاد مدل، migration، view، URL، فرم و مجوز دسترسی جزو تغییرات فرانت‌اند نیست.

## الگوی معماری

- رندر صفحه با Django Templates انجام می‌شود؛ هیچ SPA، API مستقل یا دادهٔ ساختگی در مرورگر اضافه نشده است.
- تمام فرم‌های تغییردهنده با POST و csrf_token هستند.
- فیلتر فهرست دوره‌ها با GET است و Query String قابل اشتراک می‌ماند.
- هزینه فقط از context سرور نمایش داده می‌شود؛ قیمت از فرم یا JavaScript ارسال/محاسبه نمی‌شود.
- episode.can_watch فقط برای نمایش و انتخاب مسیر در UI استفاده می‌شود. بررسی واقعی permission باید در view انجام شود.

## صفحه‌ها و URL nameهای مورد انتظار

| Template | URL name پیشنهادی | Context اصلی |
| --- | --- | --- |
| club/list.html | club:list | courses, coaches, levels, filters, page_obj |
| club/coach_detail.html | club:coach_detail | coach, courses, page_obj |
| club/course_detail.html | club:course_detail | course, episodes, is_enrolled, first_watchable_episode |
| club/episode.html | club:episode | course, episode, episodes, next_episode |
| coach/courses.html | coaches:courses | courses, page_obj |
| coach/course_form.html | coaches:course_form | course, form, episode_formset, video_allowed_extensions, video_max_size_bytes |

URL nameهای club:* و coaches:courses/coaches:course_form در بک‌اند بررسی‌شده موجود نیستند و باید توسط بک‌اند اضافه/تأیید شوند. هیچ route یا view در این patch ساخته نشده است.

## فیلدهای context مورد استفاده

### فهرست دوره‌ها

هر course باید دارای slug, title, level, level_label, episode_count, short_description, price, currency_label, cover_url یا cover_image, first_episode_free و coach باشد.
هر coach باید دارای slug, display_name و photo_url یا photo باشد.
levels یک لیست از زوج‌های value/label است؛ filters دیکشنری q, coach, level است؛ page_obj شیء Django Paginator است.
Query stringهای مصرفی: q, coach, level, page.

### معرفی مربی و دوره‌ها

coach باید دارای display_name, slug, headline, biography, photo_url یا photo, level_label و specialty_label باشد. courses و page_obj مانند صفحهٔ فهرست هستند.

### جزئیات دوره

course باید دارای slug, title, description, level, level_label, episode_count, price, currency_label, cover_url یا cover_image, cover_alt, first_episode_free و coach باشد.
episodes مجموعه‌ای از قسمت‌ها با slug, title, order, duration, is_free و can_watch است.
is_enrolled یک boolean است؛ first_watchable_episode اولین قسمت قابل تماشای این کاربر یا None است.
برای مسیر خرید، نام club:course_purchase و پارامتر slug به‌صورت اختیاری reverse می‌شود. در نبود این URL، دکمهٔ خرید غیرفعال است.

### صفحهٔ قسمت

episode دارای slug, title, description, duration, can_watch و در صورت مجاز بودن video_url یا video است؛ video_mime_type و poster_url اختیاری‌اند.
episodes فهرست تمام قسمت‌ها و next_episode قسمت بعدی یا None است.
فایل ویدئو تنها وقتی episode.can_watch درست است در عنصر video با controls، controlsList="nodownload" و playsinline قرار می‌گیرد.

### پنل دوره‌های مربی

courses هر مورد دارای title, status (draft, review, published), level, level_label, episode_count, updated_at, edit_url و در صورت انتشار public_url باشد.
page_obj برای صفحه‌بندی اختیاری است.

### فرم دوره و قسمت‌ها

form یک Django Form دوره است. نام‌های پیشنهادی: title, description, level, price, cover_image, status.
episode_formset یک inline formset دارای management_form، فیلد hidden به نام order و فیلد video_file برای هر قسمت است. فیلدهای پیشنهادی قسمت: title, description, is_free, order, video_file؛ can_delete=True.
برای آپلود، video_allowed_extensions باید لیستی مانند ['.mp4', '.webm'] و video_max_size_bytes سقف بایت تأییدشدهٔ سمت سرور باشد. این مقادیر نمونهٔ تنظیم‌اند و باید با محدودیت واقعی سرور یکسان شوند.
view باید multipart/form-data، request.FILES، اعتبارسنجی فرمت/اندازه، ذخیرهٔ فایل و formset، و رندر خطاهای Django را پشتیبانی کند. XHR در فرانت‌اند فقط برای نمایش progress است.

## اقلامی که بک‌اند باید پیش از فعال‌سازی تأیید کند

1. ساختار مدل Course و Episode، مالکیت مربی، وضعیت‌های draft/review/published و قواعد انتشار.
2. رابطهٔ ثبت‌نام/خرید و منبع حقیقت is_enrolled و episode.can_watch.
3. قیمت و واحد پول و route خرید؛ این UI پرداخت یا سفارش واقعی ایجاد نمی‌کند.
4. مسیر امن ذخیره‌سازی/دریافت ویدئو، فرمت‌های مجاز و حداکثر حجم؛ فایل خصوصی نباید با مسیر عمومی و بدون کنترل مجوز ارائه شود.
5. URLها، نام فیلدهای Form/FormSet و قواعد مجوز برای ایجاد/ویرایش دوره.
6. سیاست قسمت رایگان؛ پیشنهاد template این است که is_free و permission نهایی در view لحاظ شوند، نه اینکه شمارهٔ قسمت در JavaScript ملاک شود.

## امنیت و اعتبارسنجی

- can_watch در UI کنترل دسترسی واقعی نیست. view باید قبل از ارائهٔ فایل ویدئو permission را بررسی کند.
- قیمت، مالکیت، وضعیت انتشار، اندازه و نوع فایل باید در سرور دوباره اعتبارسنجی شوند.
- فرم POST بدون CSRF ارسال نمی‌شود.
- نوار progress نشان‌دهندهٔ bytes ارسالی مرورگر است، نه تأیید ذخیره‌سازی نهایی سرور.