// تست‌های پنل مارکتینگ: حالت API (در برابر سرور آزمایشی tools/mock-api-server.mjs — بک‌اند واقعی نیست) و حالت نمایشی.
import {Suite,WIDTHS,OVERFLOW_JS,wait} from './helpers.mjs';
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const api=(pg,m,p,b)=>pg.evaluate(async([m,p,b])=>{const c=document.cookie.split('; ').find(x=>x.startsWith('csrftoken='));const r=await fetch('/api/v1'+p,{method:m,credentials:'same-origin',headers:{'Content-Type':'application/json',...(c&&m!=='GET'?{'X-CSRFToken':c.split('=')[1]}:{})},body:b?JSON.stringify(b):undefined});let j=null;try{j=await r.json()}catch{}return{s:r.status,j}},[m,p,b]);
async function login(pg,base,u,p){await pg.goto(base+'/marketing/index.html#/');await wait(300);await pg.fill('#lu',u);await pg.fill('#lp',p);await pg.click('button.btn:has-text("ورود")');await wait(500)}
const txt=pg=>pg.evaluate(()=>document.getElementById('app').innerText);
export async function runMarketingApi(base,pubBase,browser){const S=new Suite('پنل مارکتینگ (API آزمایشی)');
 await (await fetch(base+'/__reset')).text();
 const openPub=async h=>{await pp.goto('about:blank');await pp.goto(pubBase+'/index.html');await pp.evaluate(x=>{location.hash=x},h);await pp.reload();await wait(1300)};
 const ctx=await browser.newContext({viewport:{width:1280,height:900}}),pg=await ctx.newPage(),errs=[];pg.on('pageerror',e=>errs.push(String(e).slice(0,100)));pg.on('console',m=>{if(m.type()==='error'&&!/fonts\.g|ERR_NAME|ERR_INTERNET|status of 40[0-9]/.test(m.text()))errs.push(m.text().slice(0,100))});
 // ورود
 await pg.goto(base+'/marketing/index.html');await wait(400);S.ok('بدون ورود: فرم ورود نمایش داده می‌شود',await pg.locator('#lu').count()===1);
 const marketingToggle=pg.locator('#lp').locator('xpath=..').locator('.tp-pw-b');
 S.ok('ورود مارکتینگ: دکمه نمایش رمز همیشه قابل مشاهده است',await marketingToggle.count()===1&&await marketingToggle.isVisible()&&await marketingToggle.textContent()==='نمایش');
 await marketingToggle.click();S.ok('ورود مارکتینگ: نمایش و مخفی‌کردن رمز کار می‌کند',await pg.locator('#lp').getAttribute('type')==='text'&&await marketingToggle.textContent()==='پنهان');
 await marketingToggle.click();S.ok('ورود مارکتینگ: مخفی‌سازی مجدد رمز',await pg.locator('#lp').getAttribute('type')==='password'&&await marketingToggle.textContent()==='نمایش');
 S.ok('بدون ورود: API مدیریتی ← ۴۰۱',(await api(pg,'GET','/cms/articles')).s===401);
 await pg.fill('#lu',pg.url()&&'marketing');await pg.fill('#lp','bad');await pg.click('button.btn:has-text("ورود")');await wait(400);S.ok('رمز اشتباه ← پیام خطا',(await txt(pg)).includes('درست نیست'));
 await login(pg,base,'student','student123');S.ok('هنرجو: ورود می‌شود اما مقالات «دسترسی ندارید»',(await pg.goto(base+'/marketing/index.html#/articles'),await wait(400),(await txt(pg)).includes('دسترسی ندارید')));
 S.ok('هنرجو: API مقالات و اصطلاحات ← ۴۰۳ (کنترل واقعی در بک‌اند)',(await api(pg,'GET','/cms/articles')).s===403&&(await api(pg,'POST','/cms/glossary/terms',{})).s===403&&(await api(pg,'POST','/cms/articles',{title:'x',slug:'x'})).s===403);
 await pg.click('button:has-text("خروج")');await wait(400);
 // مارکتینگ
 await login(pg,base,'marketing','marketing123');S.ok('مارکتینگ: ورود موفق و منوی پنل',(await txt(pg)).includes('پنل مارکتینگ')&&(await txt(pg)).includes('مقاله‌های منتشرشده'));
 S.ok('CSRF: درخواست نوشتن بدون هدر ← ۴۰۳',await pg.evaluate(async()=>(await fetch('/api/v1/cms/articles',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{"title":"x","slug":"x"}'})).status)===403);
 // ایجاد مقاله
 await pg.goto(base+'/marketing/index.html#/articles/new');await wait(400);
 await pg.fill('#f-title','مقاله آزمایشی تست پنل');S.ok('slug خودکار از عنوان',(await pg.inputValue('#f-slug'))==='مقاله-آزمایشی-تست-پنل');
 await pg.fill('#f-slug','test-panel-article');await pg.fill('#f-excerpt','خلاصه مقاله آزمایشی');await pg.fill('#f-category','آموزش');await pg.fill('#f-tags','جودو، آزمایش');
 await pg.click('#rte');await pg.keyboard.type('بند اول متن فارسی');await pg.keyboard.press('Enter');await pg.keyboard.type('تیتر نمونه');await pg.click('button[data-cmd="h2"]');await pg.keyboard.press('Enter');await pg.keyboard.type('مورد فهرست');await pg.click('button[data-cmd="ul"]');
 S.ok('ویرایشگر: تیتر و فهرست ساخته می‌شود',await pg.evaluate(()=>!!document.querySelector('#rte h2')&&!!document.querySelector('#rte ul li')));
 await pg.setInputFiles('#f-cover',{name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('hello')});await wait(300);S.ok('بارگذاری: فایل غیرتصویری رد می‌شود',(await pg.locator('.tp-toast').innerText()).includes('فقط تصویر'));
 await pg.setInputFiles('#f-cover',{name:'big.png',mimeType:'image/png',buffer:Buffer.concat([PNG,Buffer.alloc(2.5*1024*1024)])});await wait(300);S.ok('بارگذاری: حجم بیش از ۲ مگابایت رد می‌شود',(await pg.locator('.tp-toast').innerText()).includes('۲ مگابایت'));
 await pg.setInputFiles('#f-cover',{name:'ok.png',mimeType:'image/png',buffer:PNG});await wait(500);S.ok('بارگذاری: تصویر معتبر پیش‌نمایش می‌شود',await pg.locator('#cover-box img.mk-cover').count()===1);
 await pg.fill('#f-seo_title','عنوان سئو');await pg.fill('#f-seo_description','توضیحات متا');
 await pg.click('button:has-text("ذخیره پیش‌نویس")');await wait(600);const id=(await pg.evaluate(()=>location.hash)).split('/').pop();S.ok('ذخیره پیش‌نویس: آدرس ویرایش و پیام موفقیت',/^\d+$/.test(id)&&(await pg.locator('.tp-toast').innerText()).includes('ذخیره شد'),await pg.evaluate(()=>location.hash));
 let a=(await api(pg,'GET','/cms/articles/'+id)).j;S.ok('داده در بک‌اند ذخیره شد (تیتر، خلاصه، دسته، برچسب، SEO، تصویر)',a&&a.status==='draft'&&a.excerpt&&a.category==='آموزش'&&a.tags.length===2&&a.seo_title==='عنوان سئو'&&a.cover_image_url.startsWith('/media/')&&a.body_html.includes('<h2>'),JSON.stringify(a).slice(0,150));
 const pubSlugs=async()=>{const r=await fetch(base+'/api/v1/public/articles?page_size=100');return(await r.json()).results.map(x=>x.slug)};
 S.ok('پیش‌نویس در API عمومی دیده نمی‌شود',!(await pubSlugs()).includes('test-panel-article'));
 const pc=await browser.newContext({viewport:{width:390,height:800},serviceWorkers:'block'}),pp=await pc.newPage();await openPub('#/blog');await wait(900);
 S.ok('پیش‌نویس در وبلاگ عمومی دیده نمی‌شود',!(await pp.evaluate(()=>document.body.innerText)).includes('مقاله آزمایشی تست پنل'));
 await pg.click('button:has-text("پیش‌نمایش")');await wait(200);S.ok('پیش‌نمایش پیش از انتشار',(await pg.locator('#tpm').innerText()).includes('بند اول متن فارسی')&&(await pg.locator('#tpm').innerText()).includes('تیتر نمونه'));await pg.keyboard.press('Escape');
 // انتشار
 await pg.click('button:has-text("انتشار")');await wait(700);S.ok('انتشار: وضعیت منتشرشده',(await txt(pg)).includes('منتشرشده')&&(await pubSlugs()).includes('test-panel-article'));
 await openPub('#/blog');await wait(1200);S.ok('وبلاگ عمومی: مقاله منتشرشده خودکار در فهرست',(await pp.evaluate(()=>document.body.innerText)).includes('مقاله آزمایشی تست پنل'));
 await openPub('#/blog/test-panel-article');await wait(1200);const bt=await pp.evaluate(()=>document.getElementById('app').innerText);S.ok('وبلاگ عمومی: صفحه اختصاصی با slug، متن فارسی و تیتر',bt.includes('بند اول متن فارسی')&&bt.includes('تیتر نمونه')&&await pp.evaluate(()=>!!document.querySelector('.tp-article h2')));
 S.ok('وبلاگ عمومی: عنوان صفحه',(await pp.title()).includes('مقاله آزمایشی تست پنل'));
 // ماندگاری پس از رفرش
 await pg.reload();await wait(700);S.ok('رفرش: هنوز وارد است و مقاله و متن ماندگار است',(await pg.inputValue('#f-title'))==='مقاله آزمایشی تست پنل'&&(await pg.evaluate(()=>document.querySelector('#rte').innerText)).includes('بند اول'));
 // ویرایش
 await pg.fill('#f-title','عنوان ویرایش‌شده');await pg.click('button:has-text("ذخیره پیش‌نویس")');await wait(600);await pg.goto(pubBase+'/index.html#/blog/test-panel-article');await openPub('#/blog');await wait(1200);S.ok('ویرایش: تغییر عنوان در وبلاگ عمومی دیده می‌شود',(await pp.evaluate(()=>document.body.innerText)).includes('عنوان ویرایش‌شده'));
 // لغو انتشار
 await pg.goto(base+'/marketing/index.html#/articles/'+id);await wait(500);await pg.click('button:has-text("لغو انتشار")');await wait(600);S.ok('لغو انتشار: از API عمومی حذف می‌شود',!(await pubSlugs()).includes('test-panel-article'));
 // زمان‌بندی
 await pg.goto(base+'/marketing/index.html#/articles/new');await wait(400);await pg.fill('#f-title','مقاله زمان‌بندی‌شده');await pg.fill('#f-slug','scheduled-one');await pg.click('#rte');await pg.keyboard.type('متن');const fut=new Date(Date.now()+86400000).toISOString().slice(0,16);await pg.fill('#f-publish_at',fut);await pg.click('button:has-text("انتشار")');await wait(800);
 S.ok('زمان‌بندی: وضعیت «زمان‌بندی‌شده» و عدم نمایش عمومی',(await txt(pg)).includes('زمان‌بندی‌شده')&&!(await pubSlugs()).includes('scheduled-one'));
 // یکتایی slug
 await pg.goto(base+'/marketing/index.html#/articles/new');await wait(400);await pg.fill('#f-title','مقاله تکراری');await pg.fill('#f-slug','scheduled-one');await pg.click('#rte');await pg.keyboard.type('متن');await pg.click('button:has-text("ذخیره پیش‌نویس")');await wait(600);
 S.ok('slug تکراری ← خطا کنار فیلد (aria-invalid) و ذخیره نمی‌شود',(await txt(pg)).includes('قبلاً استفاده')&&await pg.evaluate(()=>document.querySelector('#f-slug').getAttribute('aria-invalid')==='true'));
 await pg.fill('#f-slug','bad slug!!');await pg.click('button:has-text("ذخیره پیش‌نویس")');await wait(500);S.ok('slug نامعتبر ← خطای اعتبارسنجی فرم',(await txt(pg)).includes('فقط شامل حرف'));
 // فهرست: جست‌وجو و فیلتر
 await pg.goto(base+'/marketing/index.html#/articles');await wait(500);await pg.fill('#aq','زمان‌بندی');await wait(500);S.ok('فهرست: جست‌وجو',(await pg.locator('.mk-row').count())===1);
 await pg.fill('#aq','');await wait(500);await pg.selectOption('#as','scheduled');await wait(500);S.ok('فهرست: فیلتر وضعیت',(await pg.locator('.mk-row').count())===1);
 await pg.selectOption('#as','');await wait(400);await pg.fill('#aq','zzzzqqq');await wait(500);S.ok('فهرست: نتیجه خالی',(await txt(pg)).includes('مقاله‌ای پیدا نشد'));
 await pg.fill('#aq','');await wait(500);S.ok('فهرست: صفحه‌بندی (بیش از ۸ مقاله)',await pg.locator('.tp-pager').count()===1);
 // حذف با تأیید
 await pg.goto(base+'/marketing/index.html#/articles/'+id);await wait(500);await pg.click('button:has-text("حذف مقاله")');await wait(200);await pg.click('#tpm button:has-text("انصراف")');await wait(200);S.ok('حذف: انصراف مقاله را نگه می‌دارد',(await api(pg,'GET','/cms/articles/'+id)).s===200);
 await pg.click('button:has-text("حذف مقاله")');await wait(200);await pg.click('#tpm button:has-text("حذف مقاله")');await wait(600);S.ok('حذف با تأیید: مقاله حذف و بازگشت به فهرست',(await api(pg,'GET','/cms/articles/'+id)).s===404&&(await pg.evaluate(()=>location.hash))==='#/articles');
 // اصطلاحات
 await pg.goto(base+'/marketing/index.html#/tatamipedia/new');await wait(400);await pg.fill('#f-name_fa','تست‌وازه');await pg.fill('#f-romaji','Test-waza');await pg.fill('#f-slug','test-waza');await pg.fill('#f-meaning','معنی آزمایشی');await pg.fill('#f-name_ja','テスト');await pg.selectOption('#f-status','published');
 await pg.click('button:has-text("ذخیره")');await wait(500);S.ok('اصطلاح منتشرشده بدون دسته ← خطای اعتبارسنجی',(await txt(pg)).includes('حداقل یک دسته'));
 await pg.check('input[name="tcat"][value="refereeing"]');await pg.click('button:has-text("ذخیره")');await wait(700);S.ok('اصطلاح: ذخیره و انتشار',(await txt(pg)).includes('ویرایش اصطلاح'));
 const tpdPub=async()=>(await(await fetch(base+'/api/v1/public/glossary/terms?page_size=500')).json()).results.map(t=>t.slug);S.ok('اصطلاح منتشرشده در API عمومی است',(await tpdPub()).includes('test-waza'));
 await openPub('#/tatamipedia/test-waza');await wait(1300);S.ok('صفحه عمومی تاتامی‌پدیا: اصطلاح جدید با نام ژاپنی و فارسی',(await pp.evaluate(()=>document.getElementById('app').innerText)).includes('تست‌وازه')&&(await pp.evaluate(()=>document.getElementById('app').innerText)).includes('テスト'));
 await pg.selectOption('#f-status','draft');await pg.click('button:has-text("ذخیره")');await wait(600);S.ok('اصطلاح پیش‌نویس از API عمومی حذف می‌شود',!(await tpdPub()).includes('test-waza'));
 await pg.goto(base+'/marketing/index.html#/tatamipedia');await wait(500);await pg.fill('#tq','test-waza');await wait(500);S.ok('اصطلاحات: جست‌وجو با لاتین',(await pg.locator('.mk-row').count())===1);
 await pg.goto(base+'/marketing/index.html#/tatamipedia-categories');await wait(500);S.ok('دسته‌ها: فهرست ۱۰ دسته',(await pg.locator('.mk-row').count())===10);
 await pg.click('button:has-text("حذف")');await wait(200);await pg.click('#tpm button:has-text("حذف")');await wait(500);S.ok('دسته دارای اصطلاح حذف نمی‌شود',(await api(pg,'GET','/cms/glossary/categories')).j.results.length===10);
 // حذف اصطلاح
 await pg.goto(base+'/marketing/index.html#/tatamipedia');await wait(400);await pg.fill('#tq','test-waza');await wait(500);await pg.click('.mk-row a:has-text("ویرایش")');await wait(500);await pg.click('button:has-text("حذف")');await wait(200);await pg.click('#tpm button:has-text("حذف اصطلاح")');await wait(600);S.ok('حذف اصطلاح با تأیید',!(await api(pg,'GET','/cms/glossary/terms?q=test-waza')).j.results.length);
 // مجوز: ویراستار بدون حق حذف
 await pg.click('button:has-text("خروج")');await wait(400);await login(pg,base,'editor','editor123');
 await pg.goto(base+'/marketing/index.html#/articles/1');await wait(500);S.ok('ویراستار: دکمه حذف نمایش داده نمی‌شود',await pg.locator('button:has-text("حذف مقاله")').count()===0);
 S.ok('ویراستار: DELETE مستقیم ← ۴۰۳ در بک‌اند',(await api(pg,'DELETE','/cms/articles/1')).s===403&&(await api(pg,'DELETE','/cms/glossary/terms/1')).s===403);
 // sanitizer
 await pp.goto('about:blank');await pp.goto(pubBase+'/index.html');const clean=await pp.evaluate(()=>sanitizeHtml('<p onclick="x()">a</p><script>1</script><a href="javascript:alert(1)">l</a><a href="https://e.test">ok</a><img src=x onerror=1><img src="/m.png"><iframe src="//x"></iframe><style>*{}</style><h2>t</h2><svg onload=1></svg>'));
 S.ok('پاک‌ساز HTML: script/onclick/onerror/javascript:/iframe/style/svg حذف و h2/لینک امن حفظ',!/script|onclick|onerror|javascript:|iframe|<style|svg/i.test(clean)&&clean.includes('<h2>t</h2>')&&clean.includes('rel="noopener noreferrer nofollow"'),clean);
 // کانال مستقیم: HTML خطرناک ذخیره‌شده توسط بک‌اند نمایش داده نمی‌شود
 await openPub('#/blog');await wait(500);S.ok('پنل مارکتینگ: بدون خطای JS',!errs.length,errs.slice(0,3).join(' | '));
 // واکنش‌گرایی پنل
 const over=[];for(const w of WIDTHS){const c=await browser.newContext({viewport:{width:w,height:800}}),p=await c.newPage();await p.goto(base+'/marketing/index.html#/');await wait(250);await p.fill('#lu','marketing');await p.fill('#lp','marketing123');await p.click('button.btn:has-text("ورود")');await wait(500);
  for(const r of ['#/','#/articles','#/articles/1','#/articles/new','#/tatamipedia','#/tatamipedia/1','#/tatamipedia-categories']){await p.evaluate(x=>{location.hash=x},r);await wait(250);const o=await p.evaluate(OVERFLOW_JS);if(o.o)over.push(w+r);if(o.dup.length)over.push('dup '+r+o.dup)}await c.close()}
 S.ok('پنل: بدون اسکرول افقی/ID تکراری در ۷ عرض',!over.length,over.slice(0,4).join(' '));
 await ctx.close();await pc.close();return S}
export async function runMarketingDemo(base,browser){const S=new Suite('پنل مارکتینگ (حالت نمایشی)');
 const ctx=await browser.newContext({viewport:{width:1280,height:900}}),pg=await ctx.newPage(),errs=[];pg.on('pageerror',e=>errs.push(String(e).slice(0,100)));
 await pg.goto(base+'/marketing/index.html');await wait(300);S.ok('ورود نمایشی با برچسب «بدون احراز هویت واقعی»',(await txt(pg)).includes('احراز هویت واقعی وجود ندارد'));
 await pg.click('button:has-text("ورود نمایشی")');await wait(500);S.ok('بنر «حالت نمایشی» نمایش داده می‌شود',(await txt(pg)).includes('حالت نمایشی'));
 await pg.goto(base+'/marketing/index.html#/articles/new');await wait(400);await pg.fill('#f-title','نمایشی یک');await pg.click('#rte');await pg.keyboard.type('متن نمایشی');await pg.click('button:has-text("انتشار")');await wait(700);S.ok('نمایشی: ایجاد و انتشار',(await txt(pg)).includes('منتشرشده'));
 await pg.reload();await wait(600);S.ok('نمایشی: ماندگاری پس از رفرش (localStorage مرورگر)',(await pg.inputValue('#f-title'))==='نمایشی یک');
 S.ok('نمایشی: داده فقط در localStorage و به سایت عمومی وصل نیست',await pg.evaluate(()=>!!localStorage.getItem('tpcms:v1')));
 await pg.goto(base+'/marketing/index.html#/articles');await wait(500);S.ok('نمایشی: فهرست شامل مقالات نمونه اولیه (حذف نشده)',(await pg.locator('.mk-row').count())>=1&&(await txt(pg)).includes('مقاله'));
 S.ok('نمایشی: بدون خطای JS',!errs.length,errs.join(' | '));await ctx.close();return S}
