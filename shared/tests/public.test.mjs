// تست‌های سه PWA عمومی (هنرجو/مربی/باشگاه). هر PWA جداگانه گزارش می‌شود.
import {Suite,WIDTHS,OVERFLOW_JS,wait} from './helpers.mjs';
const is404=()=>/۴۰۴/.test(document.getElementById('app').innerText);
export async function runPublic(app,base,browser,opts={}){const S=new Suite('PWA '+app),denied={student:['#/role','#/my-profile','#/design-system'],coach:['#/role','#/ai','#/clubs','#/club/0','#/design-system'],club:['#/role','#/ai','#/my-profile','#/design-system']}[app];
 const ctx=await browser.newContext({viewport:{width:390,height:800},serviceWorkers:'block'});const pg=await ctx.newPage();const errs=[];
 pg.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,100)));pg.on('console',m=>{if(m.type()==='error'&&!/fonts\.g|ERR_NAME_NOT_RESOLVED|ERR_INTERNET|Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,100))});
 const go=async h=>{await pg.evaluate(x=>{location.hash=x},h);await wait(60)},T=()=>pg.evaluate(()=>document.getElementById('app').innerText),cnt=sel=>pg.locator(sel).count(),nf=()=>pg.evaluate(is404);
 await pg.goto(base+'/index.html');await wait(300);
 // --- مسیرهای معتبر/نامعتبر
 const valid=['#/','#/store','#/store/','#/product/3','#/product?id=3','#/video/3','#/video?id=3','#/blog','#/blog/uchi-mata-basics','#/blog/2','#/tournaments','#/tournament/1','#/instructor/1','#/academy','#/profile','#/gems','#/cart','#/dashboard','#/videos','#/search','#/coaches','#/coaches/sara-ahmadi','#/sponsors','#/tatamipedia','#/tatamipedia/ippon','#/tatamipedia?q=ippon&cat=refereeing','#/blog?page=2'];
 const bad=[];for(const r of valid){await go(r);if(await nf())bad.push(r)}S.ok('مسیرهای معتبر 404 نمی‌دهند ('+valid.length+' مسیر)',!bad.length,bad.join(' '));
 const invalid=['#/gems/extra','#/courses/unknown','#/episode/unknown-lesson-1','#/store/x/y','#/product/abc','#/product/1/2','#/product/999','#/product','#/product/','#/video/','#/video/99','#/video?id=','#/tournament/abc','#/tournament/99','#/tournament/','#/instructor/99','#/instructor/','#/blog/not-a-real-slug','#/blog/a/b','#/coaches/nobody','#/coaches/','#/coaches/a/b','#/tatamipedia/nobody','#/tatamipedia/','#/tatamipedia/a/b','#/nonexistent','#/a/b/c/d/e','#/'+'x'.repeat(420),'#store','#/club/99'];
 const wrong=[];for(const r of invalid){await go(r);if(!await nf())wrong.push(r.slice(0,40))}S.ok('مسیرهای نامعتبر همه 404 دارند ('+invalid.length+' مسیر)',!wrong.length,wrong.join(' '));
 await go('#/zzz');S.ok('404: دکمه «بازگشت به صفحه اصلی»',await pg.evaluate(()=>!!document.querySelector('#app a[href="#/"]')&&/بازگشت به صفحه اصلی/.test(document.getElementById('app').innerText)));
 // --- نقش‌ها
 const dwrong=[];for(const r of denied){await go(r);if(!await nf())dwrong.push(r)}S.ok('مسیرهای ممنوع این نقش 404 می‌دهند',!dwrong.length,dwrong.join(' '));
 await go('#/');const nav=await pg.evaluate(()=>[...document.querySelectorAll('#nv a')].map(a=>a.textContent.trim()));
 S.ok('منو: بلاگ، تاتامی‌پدیا، مربیان، حامیان',['بلاگ','تاتامی‌پدیا','مربیان تاتامی','حامیان تاتامی پلاس'].every(x=>nav.includes(x)),nav.join('|'));S.ok('منو: دوره‌های آموزشی',nav.includes('دوره‌ها'),nav.join('|'));
 S.ok('منو: تاریخچه جم',nav.includes('جم'),nav.join('|'));
 S.ok('جم: نشان موجودی در هدر',await pg.locator('#hgem[href="#/gems"]').count()===1);
 S.ok('منو: «باشگاه‌ها» فقط برای هنرجو/باشگاه',(app==='coach')?!nav.includes('باشگاه‌ها'):nav.includes('باشگاه‌ها'));
 const foot=await pg.evaluate(()=>[...document.querySelectorAll('footer a')].map(a=>a.textContent.trim()));S.ok('فوتر: لینک تاتامی‌پدیا و حامیان، بدون «سیستم طراحی»',foot.includes('تاتامی‌پدیا')&&foot.includes('حامیان تاتامی پلاس')&&!foot.includes('سیستم طراحی'),foot.join('|'));
 await go('#/gems');const gems=await T();S.ok('جم: صفحه تاریخچه و وضعیت عدم اتصال',gems.includes('تاریخچه تراکنش‌ها')&&gems.includes('موجودی واقعی هنوز به این نسخه متصل نشده است'));S.ok('جم: عدم نمایش تراکنش ساختگی',gems.includes('تراکنشی برای نمایش وجود ندارد'));
 await go('#/my-profile');S.ok('«پروفایل من» فقط در PWA مربی',(app==='coach')?!await nf():await nf());
 if(app!=='coach'){await go('#/coaches/sara-ahmadi');S.ok('پروفایل مربی: لینک باشگاه',await pg.evaluate(()=>!!document.querySelector('#app a[href^="#/club/"]')))}
 // --- مربیان: جست‌وجو و فیلتر
 await go('#/coaches');const c=async q=>{await pg.fill('#kfq',q);await wait(120);return cnt('#app article')};
 S.ok('مربیان: ۶ کارت',await cnt('#app article')===6);
 const cs=[['رضا',1],['کیانی',1],['  رضا   کیانی  ',1],['رضا كياني',1],['نه‌وازه',1],['نهوازه',1],['نه وازه',1],['ناژه',3],['کودکان',1],['zzzz',0]];
 for(const [q,e] of cs){const n=await c(q);S.ok(`مربیان: جست‌وجوی «${q}» ← ${e}`,n===e,'got '+n)}
 S.ok('مربیان: نتیجه خالی پیام دارد',await pg.evaluate(()=>/مربی‌ای پیدا نشد/.test(document.getElementById('app').innerText)));
 S.ok('مربیان: وضعیت جست‌وجو در آدرس',(await pg.evaluate(()=>location.hash)).includes('q=')===true);
 await pg.locator('#app button',{hasText:'پاک کردن فیلترها'}).first().click();await wait(100);S.ok('مربیان: پاک کردن فیلترها',await cnt('#app article')===6&&!(await pg.evaluate(()=>location.hash)).includes('q='));
 await pg.locator('#app .chips button',{hasText:'نه‌وازه'}).first().click();await wait(100);S.ok('مربیان: فیلتر تخصص ← ۱ و آدرس sp=',await cnt('#app article')===1&&(await pg.evaluate(()=>location.hash)).includes('sp='));
 await pg.goto(base+'/index.html'+(await pg.evaluate(()=>location.hash)));await wait(300);S.ok('مربیان: بازیابی فیلتر از آدرس (رفرش/اشتراک)',await cnt('#app article')===1);
 await go('#/coaches?sp='+encodeURIComponent('داوری و قوانین')+'&lv='+encodeURIComponent('مربی ارشد'));S.ok('مربیان: ترکیب بدون نتیجه ← پیام خالی',await pg.evaluate(()=>/مربی‌ای پیدا نشد/.test(document.getElementById('app').innerText)));
 await go('#/coaches');await pg.locator('#app article a.btn').first().click();await wait(100);S.ok('پروفایل مربی باز می‌شود',(await pg.evaluate(()=>location.hash))==='#/coaches/sara-ahmadi'&&(await T()).includes('سارا احمدی'));
 S.ok('پروفایل: عدم جعل مدرک/افتخار/تماس',(await T()).includes('هنوز افتخار یا مدرکی ثبت نشده')&&(await T()).includes('راه ارتباطی عمومی'));
 S.ok('پروفایل: عنوان صفحه اختصاصی',(await pg.title()).startsWith('سارا احمدی'));
 // --- تاتامی‌پدیا
 await go('#/tatamipedia');const tq=async q=>{await pg.fill('#tq',q);await wait(120);return cnt('#app section[aria-label="فهرست اصطلاحات"] a.card')};
 S.ok('تاتامی‌پدیا: ۴۰ اصطلاح',await tq('')===40,String(await tq('')));
 for(const [q,slug] of [['اوچی‌ماتا','uchi-mata'],['اوچیماتا','uchi-mata'],['内股','uchi-mata'],['Uchi-mata','uchi-mata'],['uchimata','uchi-mata'],['uchi mata','uchi-mata'],['Ōsoto','o-soto-gari'],['osotogari','o-soto-gari'],['برهم‌زدن تعادل','kuzushi'],['كوزوشي','kuzushi'],['ایپون','ippon']]){await tq(q);const found=await pg.evaluate(s=>!!document.querySelector('#app section[aria-label="فهرست اصطلاحات"] a[href="#/tatamipedia/'+s+'"]'),slug);S.ok(`تاتامی‌پدیا: «${q}» ← ${slug}`,found)}
 await tq('zzzzqq');S.ok('تاتامی‌پدیا: نتیجه خالی',await pg.evaluate(()=>/اصطلاحی پیدا نشد/.test(document.getElementById('app').innerText)));
 await go('#/tatamipedia?cat=refereeing');const rc=await cnt('#app section[aria-label="فهرست اصطلاحات"] a.card');S.ok('تاتامی‌پدیا: فیلتر دسته از آدرس',rc>=5&&rc<40,'n='+rc);
 await pg.locator('#app button',{hasText:'پاک کردن فیلترها'}).first().click();await wait(100);S.ok('تاتامی‌پدیا: پاک کردن فیلترها',await cnt('#app section[aria-label="فهرست اصطلاحات"] a.card')===40);
 await go('#/tatamipedia/uchi-mata');let t=await T();S.ok('اصطلاح: نام فارسی، ژاپنی، لاتین، معنی، ایمنی، مرتبط',['اوچی‌ماتا','内股','Uchi-mata','ران داخلی','نکته ایمنی','کوزوشی'].every(x=>t.includes(x)));
 S.ok('اصطلاح: عنوان ژاپنی با lang=ja، جداسازی bidi و هم‌ترازی با متن فارسی',await pg.evaluate(()=>{const e=document.querySelector('#app .tp-ja[lang="ja"]');return !!e&&getComputedStyle(e).unicodeBidi==='isolate'&&getComputedStyle(e).textAlign!=='left'}));
 await pg.locator('#app .tp-cluster a.chip',{hasText:'کوزوشی'}).first().click();await wait(100);S.ok('اصطلاح: لینک مرتبط کار می‌کند',(await pg.evaluate(()=>location.hash))==='#/tatamipedia/kuzushi');
 await go('#/tatamipedia?q='+encodeURIComponent('<img src=x onerror=window.__x=1>'));await wait(150);S.ok('تاتامی‌پدیا: XSS از آدرس/جست‌وجو اجرا نمی‌شود',!await pg.evaluate(()=>!!window.__x));
 // --- فروشگاه: کاتالوگ کارفرما
 await go('#/store');const sc=()=>cnt('#app .pg:not(section .pg) article.pcd'),prod=await pg.evaluate(()=>({n:P.length,names:new Set(P.map(p=>p.n)).size,skus:new Set(P.filter(p=>p.sku).map(p=>p.sku)).size,ref:P.filter(p=>p.ref).length,demo:P.filter(p=>p.demo).length}));
 S.ok('فروشگاه: ۵۹ محصول کاتالوگ + ۳ نمونه آزمایشی (دسته بدون کاتالوگ)، بدون نام/SKU تکراری',prod.ref===59&&prod.demo===3&&prod.names===prod.n&&prod.skus===59,JSON.stringify(prod));
 S.ok('فروشگاه: شمارنده ۶۲ محصول',(await T()).includes('۶۲ محصول'));
 S.ok('فروشگاه: برچسب «قیمت مرجع بازار» روی کارت‌ها و «نمونه آزمایشی» روی نمونه‌ها',(await T()).includes('قیمت مرجع بازار')&&(await T()).includes('نمونه آزمایشی'));
 S.ok('فروشگاه: بدون <img> شکسته (تصویری هنوز موجود نیست ← جای‌نگهدار)',await cnt('#app img')===0);
 await pg.fill('#fq','سامکو');await wait(150);const nSam=await pg.evaluate(()=>P.filter(p=>p.n.includes('سامکو')).length);S.ok('فروشگاه: جست‌وجوی «سامکو» برابر تعداد محصولات دارای این نام در داده ('+nSam+')',nSam>=4&&await cnt('#app .sl .pg article.pcd')===nSam,String(await cnt('#app .sl .pg article.pcd')));
 await pg.fill('#fq','جودو  سامکو');await wait(150);const nMulti=await pg.evaluate(()=>P.filter(p=>p.n.includes('جودو سامکو')).length);S.ok('فروشگاه: جست‌وجوی چندکلمه‌ای با فاصله اضافه ('+nMulti+' نتیجه)',nMulti>=1&&await cnt('#app .sl .pg article.pcd')===nMulti,String(await cnt('#app .sl .pg article.pcd')));
 await pg.fill('#fq','');await wait(100);
 await pg.locator('.cn .chip',{hasText:'کمربند جودو'}).first().click();await wait(150);S.ok('فروشگاه: فیلتر دسته «کمربند جودو» ← ۱۰',await cnt('#app .sl .pg article.pcd')===10);
 await pg.locator('.cn .chip',{hasText:'لباس جودو'}).first().click();await wait(150);S.ok('فروشگاه: فیلتر دسته «لباس جودو» ← ۱۳',await cnt('#app .sl .pg article.pcd')===13);
 await pg.locator('.cn .chip',{hasText:'همه'}).first().click();await wait(100);
 await pg.locator('.fbtn').click();await wait(100);await pg.fill('#pmin','20000000');await wait(150);S.ok('فروشگاه: فیلتر قیمت حداقل ۲۰ میلیون ← ۳',await cnt('#app .sl .pg article.pcd')===3,String(await cnt('#app .sl .pg article.pcd')));
 await pg.fill('#pmin','');await wait(100);await pg.locator('#sf .chip',{hasText:'XXL'}).first().click();await wait(150);S.ok('فروشگاه: فیلتر سایز XXL ← ۲',await cnt('#app .sl .pg article.pcd')===2,String(await cnt('#app .sl .pg article.pcd')));
 await pg.locator('#app button',{hasText:'پاک کردن فیلترها'}).first().click();await wait(150);S.ok('فروشگاه: پاک‌کردن فیلترها ← ۶۲',(await T()).includes('۶۲ محصول'));
 await go('#/store');S.ok('فروشگاه: پیشنهادها (۳ بخش × ۴ محصول) از کاتالوگ',await cnt('section[aria-label="تازه جودو را شروع کرده‌ام"] article')===4&&await cnt('section[aria-label="برای تمرین حرفه‌ای آماده‌ام"] article')===4&&await cnt('section[aria-label="برای مسابقه آماده می‌شوم"] article')===4);
 await go('#/product/0');t=await T();S.ok('جزئیات محصول کاتالوگ: قیمت مرجع، منبع، بدون ستاره/نظر جعلی، سایزهای نام محصول',t.includes('قیمت نهایی تاتامی پلاس نیست')&&t.includes('منبع قیمت مرجع')&&!t.includes('★')&&!/نظر\)/.test(t)&&t.includes('XXL'));
 S.ok('جزئیات: قیمت منبع ۱۴٬۵۰۰٬۰۰۰ تومان (بدون تغییر)',t.includes('۱۴٬۵۰۰٬۰۰۰ تومان'));
 await go('#/product/'+await pg.evaluate(()=>P.find(p=>p.ref&&!p.sz.length&&!p.cl.length).id));S.ok('جزئیات: محصول بدون رنگ/سایز، بخش رنگ نمایش داده نمی‌شود و افزودن به سبد کار می‌کند',!(await T()).includes('\nرنگ\n')&&await pg.evaluate(()=>{addP();return JSON.parse(localStorage.getItem('cart')).length>=1}));
 await go('#/cart');S.ok('سبد: محصول کاتالوگ با یادداشت قیمت مرجع',(await T()).includes('قیمت مرجع'));
 await pg.evaluate(()=>localStorage.clear());

 // --- کاتالوگ دوره‌های نمایشی Preview
 await go('#/courses');S.ok('دوره‌ها: فهرست سه دوره نمونه',await cnt('#app .tp-course-card')===3);
 await go('#/courses/judo-foundations');t=await T();S.ok('دوره‌ها: جزئیات، مربی و قسمت‌ها',t.includes('آشنایی با فنون پایه جودو')&&t.includes('فهرست قسمت‌ها')&&t.includes('ثبت‌نام و خرید در این نسخه انجام نمی‌شود.'));
 S.ok('دوره‌ها: ثبت‌نام واقعی غیرفعال است',await pg.locator('#app button[disabled]').count()===1);
 await go('#/episode/judo-foundations-lesson-1');t=await T();S.ok('قسمت دوره: معرفی نمونه بدون ویدئوی ساختگی',t.includes('پخش ویدئو در پیش‌نمایش فعال نیست')&&await cnt('#app video')===0);
 await go('#/episode/not-a-course-lesson-1');S.ok('قسمت نامعتبر به صفحه ۴۰۴ می‌رود',await nf());

 // --- وبلاگ
 await go('#/blog');S.ok('بلاگ: صفحه اول ۶ مقاله + صفحه‌بندی',await cnt('#app article')===6&&await cnt('.tp-pager')===1);
 await pg.locator('.tp-pager button[aria-label="صفحه ۲"]').click();await wait(100);S.ok('بلاگ: صفحه ۲ دو مقاله دارد و در آدرس است',await cnt('#app article')===2&&(await pg.evaluate(()=>location.hash)).includes('page=2'));
 await go('#/blog?q='+encodeURIComponent('اوچی ماتا'));S.ok('بلاگ: جست‌وجوی بدون نیم‌فاصله/فاصله',await cnt('#app article')>=1);
 await go('#/blog/uchi-mata-basics');S.ok('بلاگ: صفحه مقاله با slug خوانا',(await T()).includes('اوچی‌ماتا')&&(await pg.title()).includes('اوچی‌ماتا'));
 // --- حامیان
 await go('#/sponsors');S.ok('حامیان: ۶ جایگاه نمونه با برچسب «نمونه آزمایشی»',await cnt('#app .tp-sponsors li')===6&&(await T()).includes('نمونه آزمایشی'));
 // --- امنیت: داده localStorage و آدرس
 await pg.evaluate(()=>{localStorage.setItem('cart',JSON.stringify([{id:1,s:'<img src=x onerror=window.__ls=1>',c:'<b>x</b>',q:99999},{id:9999,s:'',c:'',q:1},{id:'x'},null]));localStorage.setItem('prog',JSON.stringify({3:500,abc:5,'-1':3}));localStorage.setItem('fav',JSON.stringify([1,1,'a',9999]));localStorage.setItem('saved','"nope"');localStorage.setItem('lastWatched','"<script>"');localStorage.setItem('role','"<img src=x>"')});
 await pg.goto('about:blank');await pg.goto(base+'/index.html#/cart');await wait(400);
 S.ok('امنیت: HTML تزریق‌شده از localStorage اجرا نمی‌شود',!await pg.evaluate(()=>!!window.__ls));
 S.ok('امنیت: داده نامعتبر سبد پاک‌سازی/محدود شد',await pg.evaluate(()=>{const c=JSON.parse(localStorage.getItem('cart'));return c.length===1&&c[0].id===1&&c[0].q<=50&&!/[<>]/.test(JSON.stringify(c))}));
 S.ok('امنیت: پیشرفت ویدیو در بازه ۰..۱۰۰ و کلیدهای نامعتبر حذف',await pg.evaluate(()=>{const p=JSON.parse(localStorage.getItem('prog'));return Object.keys(p).join()==='3'&&p[3]===100}));
 S.ok('امنیت: علاقه‌مندی/ذخیره‌ها اعتبارسنجی شد',await pg.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('fav')))==='[1]'&&localStorage.getItem('saved')==='[]'));
 await go('#/dashboard');S.ok('امنیت: بدون خطای JS با داده خراب',!errs.length,errs.join(' | '));
 await pg.evaluate(()=>localStorage.clear());
 await ctx.close();
 // --- واکنش‌گرایی، ID تکراری، خطاهای JS در همه عرض‌ها
 const routes=['#/','#/coaches','#/coaches/sara-ahmadi','#/sponsors','#/tatamipedia','#/tatamipedia/uchi-mata','#/blog','#/blog/uchi-mata-basics','#/store','#/product/2','#/cart','#/tournaments','#/tournament/1','#/videos','#/video/3','#/academy','#/instructor/0','#/dashboard','#/profile','#/ai','#/clubs','#/my-profile','#/nope'];
 const over=[],dup=new Set();for(const w of WIDTHS){const c2=await browser.newContext({viewport:{width:w,height:800},serviceWorkers:'block'});const p2=await c2.newPage();p2.on('pageerror',e=>errs.push('PAGEERROR@'+w+' '+String(e).slice(0,80)));await p2.goto(base+'/index.html');
  for(const r of routes){await p2.evaluate(x=>{location.hash=x},r);await wait(50);const o=await p2.evaluate(OVERFLOW_JS);if(o.o)over.push(`${w}${r}`);o.dup.forEach(d=>dup.add(r+':'+d))}await c2.close()}
 S.ok(`واکنش‌گرایی: بدون اسکرول افقی (${WIDTHS.join('/')} × ${routes.length} مسیر)`,!over.length,over.slice(0,5).join(' '));S.ok('بدون شناسه تکراری',!dup.size,[...dup].join(' '));S.ok('بدون خطای JavaScript',!errs.length,errs.slice(0,3).join(' | '));
 // --- اهداف لمسی ≥۴۴px (کنترل‌های تعاملی؛ لینک درون‌متنی مستثناست)
 const c3=await browser.newContext({viewport:{width:360,height:800},serviceWorkers:'block'});const p3=await c3.newPage();await p3.goto(base+'/index.html');const small=[];
 for(const r of ['#/coaches','#/tatamipedia','#/blog','#/store','#/product/2','#/cart','#/videos','#/dashboard','#/tournaments']){await p3.evaluate(x=>{location.hash=x},r);await wait(80);const n=await p3.evaluate(()=>[...document.querySelectorAll('#app button:not([disabled]),#app a.btn,#app .chip,#app select,#app input:not([type=checkbox]):not([type=file]),#nv a,header a,.tp-pager button')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&(b.height<43.5||b.width<43.5)&&getComputedStyle(e).visibility!=='hidden'}).map(e=>(e.tagName+'.'+e.className+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)).slice(0,50)));if(n.length)small.push(r+' '+n.slice(0,3).join(','))}
 S.ok('اهداف لمسی ≥۴۴×۴۴ در کنترل‌های مهم (۳۶۰px)',!small.length,small.join(' ; '));await c3.close();
 return S}
export async function runPwa(app,base,browser,altRoot){const S=new Suite('PWA-فنی '+app);
 const ctx=await browser.newContext({viewport:{width:390,height:800},serviceWorkers:'allow'});const pg=await ctx.newPage();await pg.goto(base+'/index.html');
 const man=await pg.evaluate(()=>fetch('manifest.webmanifest').then(r=>r.json()));
 S.ok('Manifest: fa/rtl/standalone/id/start_url/scope',man.lang==='fa'&&man.dir==='rtl'&&man.display==='standalone'&&man.scope==='./'&&man.id==='./'&&man.name.startsWith('Tatami Plus'),JSON.stringify([man.lang,man.dir,man.display,man.start_url]));
 S.ok('Manifest: آیکون ۱۹۲/۵۱۲/maskable',['192x192','512x512'].every(s=>man.icons.some(i=>i.sizes===s))&&man.icons.some(i=>i.purpose==='maskable'));
 let ok=true;for(const i of man.icons)if(await pg.evaluate(u=>fetch(u).then(r=>r.status),i.src)!==200)ok=false;S.ok('آیکون‌ها 200',ok);
 S.ok('offline.html موجود',await pg.evaluate(()=>fetch('offline.html').then(r=>r.status))===200);
 await pg.evaluate(()=>navigator.serviceWorker.ready.then(()=>1));await wait(900);await pg.reload();await wait(500);
 const keys=await pg.evaluate(()=>caches.keys());S.ok('Service Worker فعال و Cache نسخه‌دار ساخته شد',keys.length===1&&new RegExp('^tatami-'+app+'-[0-9a-f]{10}$').test(keys[0]),keys.join());
 const cdp=await ctx.newCDPSession(pg);try{const r=await cdp.send('Page.getInstallabilityErrors');S.ok('Chromium: بدون خطای نصب‌پذیری (localhost)',!r.installabilityErrors.length,JSON.stringify(r.installabilityErrors))}catch(e){S.ok('Chromium installability',false,e.message)}
 await ctx.setOffline(true);try{await pg.reload({timeout:8000});await wait(400);S.ok('آفلاین: رفرش برنامه',await pg.evaluate(()=>document.getElementById('app').innerHTML.length)>500);await pg.evaluate(()=>{location.hash='#/tatamipedia/ippon'});await wait(100);S.ok('آفلاین: تاتامی‌پدیا',(await pg.evaluate(()=>document.getElementById('app').innerText)).includes('ایپون'))}catch(e){S.ok('آفلاین: رفرش',false,e.message.slice(0,80))}
 try{await pg.goto(base+'/coaches/sara-ahmadi/',{timeout:8000});await wait(700);S.ok('آفلاین: ورود مستقیم /coaches/<slug>/',(await pg.evaluate(()=>document.getElementById('app')&&document.getElementById('app').innerText)||'').includes('سارا احمدی'))}catch(e){S.ok('آفلاین: ورود مستقیم /coaches/<slug>/',false,e.message.slice(0,80))}
 await ctx.setOffline(false);
 // به‌روزرسانی: نسخه جدید Build ← نام Cache جدید، حذف Cache قدیمی، محتوای جدید
 if(altRoot){const before=keys[0];altRoot.use();await pg.goto(base+'/index.html');await wait(1200);await pg.reload();let after=[];for(let i=0;i<20;i++){await wait(400);after=await pg.evaluate(()=>caches.keys());if(after.length===1&&after[0]!==before)break}
  S.ok('به‌روزرسانی: Cache نسخه جدید جایگزین قدیمی شد',after.length===1&&after[0]!==before,before+' → '+after.join());S.ok('به‌روزرسانی: محتوای نسخه جدید نمایش داده می‌شود',await pg.evaluate(()=>document.documentElement.outerHTML.includes('UPDATE_MARKER')));altRoot.reset()}
 // صفحه‌های پوششی و ریدایرکت‌ها
 const get=async p=>{const r=await pg.request.get(base+p,{maxRedirects:0});return{s:r.status(),t:await r.text()}};
 let r=await get('/coaches/');S.ok('/coaches/ ← صفحه پوششی به فهرست مربیان',r.s===200&&r.t.includes('#/coaches'));r=await get('/coaches');S.ok('/coaches (بدون اسلش) ← ریدایرکت ۳۰۱ به /coaches/',r.s===301);
 r=await get('/tatamipedia/ippon/');S.ok('صفحه پوششی اصطلاح: عنوان/توضیح و Redirect',r.s===200&&r.t.includes('ایپون')&&r.t.includes('og:title')&&r.t.includes('#/tatamipedia/ippon'));
 S.ok('صفحه پوششی بدون SITE_URL: canonical/og:url/og:image ساخته نمی‌شود (دامنه جعل نمی‌شود)',!r.t.includes('canonical')&&!r.t.includes('og:url')&&!r.t.includes('og:image'));
 await ctx.close();return S}
