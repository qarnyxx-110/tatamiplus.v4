// کاتالوگ دوره‌ها برای نمایش عمومی Preview — داده‌ها نمونه‌اند و از بک‌اند دریافت نمی‌شوند.
const TP_DEMO_COURSES=[
 {slug:'judo-foundations',title:'آشنایی با فنون پایه جودو',level:'مبتدی',coachIndex:0,hue:214,description:'نمونه‌ای از ساختار یک دوره آموزشی؛ توضیحات و فهرست قسمت‌ها برای نمایش رابط کاربری نوشته شده‌اند.',lessons:[
  {title:'آشنایی با تاتامی و ساختار تمرین',summary:'نمونه توضیح قسمت اول برای نمایش چیدمان صفحه دوره.'},
  {title:'آمادگی و جابه‌جایی پایه',summary:'نمونه توضیح قسمت دوم؛ محتوای آموزشی نهایی باید توسط مربی تأیید شود.'},
  {title:'آشنایی با فنون پایه',summary:'نمونه توضیح قسمت سوم؛ ویدئوی واقعی در این نسخه ارائه نشده است.'}
 ]},
 {slug:'judo-conditioning',title:'آمادگی جسمانی ویژه جودو',level:'متوسط',coachIndex:1,hue:168,description:'نمونه صفحه دوره برای نمایش دسته‌بندی، سطح و معرفی مربی در نسخه عمومی.',lessons:[
  {title:'آماده‌سازی بدن پیش از تمرین',summary:'توضیح نمونه برای نمایش اطلاعات هر قسمت.'},
  {title:'تمرین قدرت و پایداری',summary:'توضیح نمونه؛ برنامه تمرینی نهایی باید با نظر مربی تدوین شود.'}
 ]},
 {slug:'competition-preparation',title:'آمادگی برای مسابقه',level:'پیشرفته',coachIndex:2,hue:34,description:'نمونه دوره برای نمایش مسیر دسترسی به دوره‌ها و فهرست قسمت‌ها.',lessons:[
  {title:'مرور هدفمند پیش از مسابقه',summary:'متن نمونه برای معرفی موضوع این قسمت.'},
  {title:'آشنایی با فضای مسابقه',summary:'متن نمونه؛ جزئیات نهایی پس از تأیید مربی جایگزین می‌شود.'}
 ]}
];
const tpDemoCourse=slug=>TP_DEMO_COURSES.find(c=>c.slug===String(slug||''));
const tpDemoCoach=c=>c?({name:[c.firstName,c.lastName].filter(Boolean).join(' '),slug:c.slug}):null;
function tpCourseCard(c){
 const coach=tpDemoCoach(COACHES[c.coachIndex]);
 return `<article class="card tp-course-card">
  ${ph(c.hue,'پیش‌نمایش دوره','r169')}
  <div class="b"><div class="tp-cluster"><span class="tag g">${esc(c.level)}</span><span class="tag m">نمونه نمایشی</span></div>
  <h2 style="font-size:var(--tp-font-size-lg);margin-top:var(--tp-space-sm)">${esc(c.title)}</h2>
  <p class="mu sm">${esc(c.description)}</p>
  <p class="mu sm">${coach?`مربی: ${esc(coach.name)}`:'معرفی مربی در دست تکمیل'}</p>
  <div class="tp-cluster"><span class="mu sm">${F(c.lessons.length)} قسمت نمونه</span><a class="btn s" href="#/courses/${c.slug}">مشاهده دوره</a></div></div>
 </article>`;
}
function tpCourseList(){
 PT={t:'دوره‌های آموزشی',d:'فهرست نمایشی دوره‌های آموزشی تاتامی پلاس'};
 return `<div class="w"><h1>دوره‌های آموزشی</h1><p class="mu">دوره‌ها و قسمت‌ها در این صفحه برای نمایش رابط کاربری نمونه‌سازی شده‌اند.</p>
 <div class="d-c" role="note"><b>نسخه پیش‌نمایش</b><p class="mu sm" style="margin:var(--tp-space-2xs) 0 0">اطلاعات دوره‌ها نمونه است؛ ثبت‌نام، خرید، دسترسی به محتوای قفل‌شده و پخش ویدئوی واقعی هنوز به بک‌اند و قرارداد نهایی نیاز دارند.</p></div>
 <div class="pg" style="margin-top:var(--tp-space-lg)">${TP_DEMO_COURSES.map(tpCourseCard).join('')}</div></div>`;
}
function tpCourseDetail(slug){
 const c=tpDemoCourse(slug);if(!c)return nfp('دوره‌ای پیدا نشد','#/courses','مشاهده دوره‌ها');
 const coach=tpDemoCoach(COACHES[c.coachIndex]);
 PT={t:c.title,d:'جزئیات نمونه دوره آموزشی'};
 return `<div class="w"><p class="mu sm"><a href="#/courses">دوره‌های آموزشی</a> / ${esc(c.title)}</p>
 <div class="two" style="align-items:start;margin-top:var(--tp-space-md)"><section><div class="ph r169" style="--h:${c.hue}"><figcaption>پیش‌نمایش دوره · محتوای نمونه</figcaption></div>
 <div class="tp-cluster" style="margin-top:var(--tp-space-md)"><span class="tag g">${esc(c.level)}</span><span class="tag m">نمونه نمایشی</span></div>
 <h1>${esc(c.title)}</h1><p class="mu">${esc(c.description)}</p>
 ${coach?`<a class="rec" href="#/coaches/${encodeURIComponent(coach.slug)}"><b>مربی دوره: ${esc(coach.name)}</b><span>مشاهده پروفایل مربی</span></a>`:''}
 </section><aside class="d-c"><h2>اطلاعات دوره</h2><div class="rw2"><span class="mu">سطح</span><b>${esc(c.level)}</b></div><div class="rw2"><span class="mu">قسمت‌ها</span><b>${F(c.lessons.length)}</b></div><div class="rw2"><span class="mu">وضعیت</span><b>پیش‌نمایش</b></div>
 <button class="btn" type="button" disabled title="ثبت‌نام پس از اتصال بک‌اند فعال می‌شود">ثبت‌نام در دوره</button>
 <p class="mu sm" style="margin-top:var(--tp-space-sm)">ثبت‌نام و خرید در این نسخه انجام نمی‌شود.</p></aside></div>
 <section class="d-s"><h2>فهرست قسمت‌ها</h2>${c.lessons.map((x,i)=>`<a class="rec" href="#/episode/${c.slug}-lesson-${i+1}"><b>قسمت ${F(i+1)}: ${esc(x.title)}</b><span>مشاهده معرفی قسمت</span></a>`).join('')}</section>
 <p class="mu sm">قسمت‌ها محتوای نمونه‌اند و وضعیت دسترسی یا خرید واقعی را نشان نمی‌دهند.</p></div>`;
}
function tpEpisodeDetail(raw){
 const m=/^([a-z0-9-]+)-lesson-(\d+)$/.exec(String(raw||''));
 const c=m&&tpDemoCourse(m[1]),n=m?Number(m[2]):0,lesson=c&&c.lessons[n-1];
 if(!c||!lesson)return nfp('قسمتی پیدا نشد','#/courses','بازگشت به دوره‌ها');
 PT={t:lesson.title,d:'معرفی نمونه قسمت دوره'};
 return `<div class="w"><p class="mu sm"><a href="#/courses">دوره‌ها</a> / <a href="#/courses/${c.slug}">${esc(c.title)}</a></p>
 <h1>قسمت ${F(n)}: ${esc(lesson.title)}</h1>
 <div class="d-c" style="margin-top:var(--tp-space-md)"><b>پخش ویدئو در پیش‌نمایش فعال نیست</b><p class="mu" style="margin:var(--tp-space-xs) 0 0">${esc(lesson.summary)}</p>
 <p class="mu sm" style="margin-top:var(--tp-space-sm)">این صفحه فقط برای نمایش ساختار صفحه قسمت ساخته شده است؛ فایل ویدئو، خرید دوره و مجوز مشاهده به بک‌اند نیاز دارند.</p></div>
 <div class="tp-cluster" style="margin-top:var(--tp-space-md)"><a class="btn o" href="#/courses/${c.slug}">بازگشت به فهرست قسمت‌ها</a><a class="btn" href="#/courses">همه دوره‌ها</a></div></div>`;
}
Object.assign(views,{
academy:()=>`<div class="w"><h1>آکادمی اساتید</h1><p class="mu">مربیان و پروفایل‌ها فرضی و نمایشی هستند.</p><div class="grid">${I.map(ic).join('')}</div></div>`,
 courses:(n,raw)=>raw===undefined?tpCourseList():tpCourseDetail(raw),
 episode:(n,raw)=>tpEpisodeDetail(raw),
});