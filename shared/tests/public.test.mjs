// تست‌های سه PWA عمومی (هنرجو/مربی/باشگاه). هر PWA جداگانه گزارش می‌شود.
import {Suite,WIDTHS,OVERFLOW_JS,wait} from './helpers.mjs';
const is404=()=>/۴۰۴/.test(document.getElementById('app').innerText);
export async function runPublic(app,base,browser,opts={}){const S=new Suite('PWA '+app),denied={student:['#/role','#/my-profile','#/design-system','#/checkout'],coach:['#/role','#/ai','#/clubs','#/club/0','#/design-system','#/checkout'],club:['#/role','#/ai','#/my-profile','#/design-system','#/checkout']}[app];
 const ctx=await browser.newContext({viewport:{width:390,height:800},serviceWorkers:'block'});const pg=await ctx.newPage();pg.setDefaultTimeout(15000);pg.setDefaultNavigationTimeout(15000);const errs=[],backendFeedErrors=[],backendFeedResponses=[];
 pg.on('pageerror',e=>errs.push('PAGEERROR '+JSON.stringify({name:e.name,message:e.message,stack:e.stack||''}).slice(0,1600)));
 pg.on('console',m=>{
  if(m.type()!=='error')return;
  const message=m.text();
  if(message.includes('[Tatami home live feed]')&&message.includes('Django feed returned HTTP 404')&&/(?:coaches|products)/.test(message)){backendFeedErrors.push(message);return}
  if(!/fonts\.g|ERR_NAME_NOT_RESOLVED|ERR_INTERNET|Failed to load resource/.test(message))errs.push('CONSOLE '+JSON.stringify({text:message,location:m.location()}).slice(0,1600));
 });
 pg.on('response',response=>{
  if(response.status()>=400&&response.request().resourceType()==='fetch')backendFeedResponses.push({status:response.status(),url:response.url()});
 });
 const go=async h=>{await pg.evaluate(x=>{location.hash=x},h);await wait(60)},T=()=>pg.evaluate(()=>document.getElementById('app').innerText),cnt=sel=>pg.locator(sel).count(),nf=()=>pg.evaluate(is404);
 await pg.goto(base+'/index.html');await wait(300);
 // --- وضعیت داده‌های مسابقات با تاریخ سپری‌شده
 await go('#/tournaments');
 const tournamentNames=['جام بهاره تهران','لیگ باشگاه‌های اصفهان','مسابقات کشوری نوجوانان','جام دوستی شیراز'];
 const upcomingTournaments=await T();
 S.ok('مسابقات با تاریخ سپری‌شده به‌عنوان پیش‌رو نمایش داده نمی‌شوند',
  tournamentNames.every(name=>!upcomingTournaments.includes(name)));
 const reviewTab=pg.getByRole('tab',{name:'نیازمند بررسی'});
 const reviewTabCount=await reviewTab.count();
 if(reviewTabCount!==1){
  const debug=await pg.evaluate(()=>({hash:location.hash,title:document.title,text:(document.getElementById('app')?.innerText||'').slice(0,1600),tabs:[...document.querySelectorAll('#app [role="tab"]')].map(x=>({text:x.textContent.trim(),selected:x.getAttribute('aria-selected')}))}));
  throw new Error('Tournament review tab missing; debug='+JSON.stringify(debug)+'; pageErrors='+errs.join(' | '));
 }
 await reviewTab.click();await wait(60);
 const reviewTournaments=await T();
 S.ok('مسابقات دارای وضعیت نامطمئن در گروه نیازمند بررسی قابل مشاهده‌اند',
  tournamentNames.every(name=>reviewTournaments.includes(name)));
 await go('#/tournament/0');
 const tournamentDetail=await T();
 S.ok('جزئیات مسابقه وضعیت ثبت‌نام را به‌اشتباه باز/بسته/پایان‌یافته اعلام نمی‌کند',
  tournamentDetail.includes('نیازمند تأیید'));
 await go('#/');
 await pg.waitForFunction(()=>{
  const feeds=[...document.querySelectorAll('#app [data-tp-home-feed]')];
  return feeds.length===2&&feeds.every(feed=>
   feed.dataset.tpFeedStarted==='true'&&
   ['empty','error','ready','reference'].includes(feed.dataset.state)&&
   feed.getAttribute('aria-busy')==='false'
  );
 },null,{timeout:5000}).catch(()=>null);
 const homeFeedStates=await pg.locator('#app [data-tp-home-feed]').evaluateAll(feeds=>feeds.map(feed=>({
  layout:feed.dataset.layout,
  started:feed.dataset.tpFeedStarted==='true',
  state:feed.dataset.state||null,
  busy:feed.getAttribute('aria-busy'),
  cards:feed.querySelectorAll('.tp-coaches > li,.tp-product-card').length
 })));
 const expectedStoreUrl=new URL('/store/',base).toString();
 S.ok('Home: فید واقعی Django بدون پاسخ بک‌اند، فقط empty/error و بدون کارت ساختگی می‌ماند',
  homeFeedStates.length===2&&homeFeedStates.every(feed=>feed.started&&['empty','error'].includes(feed.state)&&feed.busy==='false'&&feed.cards===0),
  JSON.stringify(homeFeedStates));
 S.ok('Home: پاسخ 404 محیط استاتیک فقط مربوط به endpoint واقعی فروشگاه است',
  backendFeedResponses.length>=1&&backendFeedResponses.every(response=>response.status===404&&response.url===expectedStoreUrl),
  JSON.stringify(backendFeedResponses));
 S.ok('Home: خطای فید با پیام مشخص قابل تشخیص است',
  backendFeedErrors.some(message=>message.includes('products')&&message.includes('Django feed returned HTTP 404')),
  JSON.stringify({captured:backendFeedErrors,consoleErrorMessages:errs.filter(error=>error.includes('Tatami home live feed'))}));
 // --- مسیرهای معتبر/نامعتبر
 const valid=['#/','#/store','#/online-coach','#/store/','#/product/3','#/product?id=3','#/video/3','#/video?id=3','#/blog','#/blog/uchi-mata-basics','#/blog/2','#/tournaments','#/tournament/1','#/instructor/1','#/academy','#/profile','#/gems','#/cart','#/dashboard','#/videos','#/search','#/coaches','#/coaches/sara-ahmadi','#/sponsors','#/tatamipedia','#/tatamipedia/ippon','#/tatamipedia?q=ippon&cat=refereeing','#/blog?page=2','#/specialist-services','#/nutrition-coaches','#/sports-clinics','#/sports-psychologists'];
 const bad=[];for(const r of valid){await go(r);if(await nf())bad.push(r)}S.ok('مسیرهای معتبر 404 نمی‌دهند ('+valid.length+' مسیر)',!bad.length,bad.join(' '));
 const invalid=['#/gems/extra','#/courses/unknown','#/episode/unknown-lesson-1','#/store/x/y','#/product/abc','#/product/1/2','#/product/999','#/product','#/product/','#/video/','#/video/99','#/video?id=','#/tournament/abc','#/tournament/99','#/tournament/','#/instructor/99','#/instructor/','#/blog/not-a-real-slug','#/blog/a/b','#/coaches/nobody','#/coaches/','#/coaches/a/b','#/tatamipedia/nobody','#/tatamipedia/','#/tatamipedia/a/b','#/nonexistent','#/a/b/c/d/e','#/'+'x'.repeat(420),'#store','#/club/99'];
 const wrong=[];for(const r of invalid){await go(r);if(!await nf())wrong.push(r.slice(0,40))}S.ok('مسیرهای نامعتبر همه 404 دارند ('+invalid.length+' مسیر)',!wrong.length,wrong.join(' '));
 await go('#/zzz');S.ok('404: دکمه «بازگشت به صفحه اصلی»',await pg.evaluate(()=>!!document.querySelector('#app a[href="#/"]')&&/بازگشت به صفحه اصلی/.test(document.getElementById('app').innerText)));
 // --- نقش‌ها
 const dwrong=[];for(const r of denied){await go(r);if(!await nf())dwrong.push(r)}S.ok('مسیرهای ممنوع این نقش 404 می‌دهند',!dwrong.length,dwrong.join(' '));
 if(app!=='club'){
  await go('#/login');
  const toggle=pg.locator('#lg-f .tp-pw-b').first();
  const metrics=await toggle.evaluate(el=>{const wrap=el.parentElement.getBoundingClientRect(),btn=el.getBoundingClientRect(),input=el.parentElement.querySelector('input'),is=getComputedStyle(input),bs=getComputedStyle(el);return{rightInset:wrap.right-btn.right,paddingRight:parseFloat(is.paddingRight),buttonWidth:btn.width,border:bs.borderTopStyle,background:bs.backgroundColor,display:bs.display,opacity:bs.opacity}});
  S.ok('گذرواژه: دکمه نمایش همیشه دیده می‌شود و در سمت راست فیلد قرار دارد',await toggle.isVisible()&&metrics.rightInset<=4&&metrics.paddingRight>=metrics.buttonWidth&&metrics.border==='solid'&&metrics.background!=='rgba(0, 0, 0, 0)'&&metrics.display!=='none'&&metrics.opacity==='1',JSON.stringify(metrics));
  await go('#/');
 }
 const nav=await pg.evaluate(()=>[...document.querySelectorAll('#nv a')].map(a=>a.textContent.trim()));
 S.ok('منو: چهار بخش ادغام‌شده با نام‌های واحد',['باشگاه مجازی','مربیان','وبلاگ','حامیان تاتامی پلاس'].every(x=>nav.includes(x)),nav.join('|'));S.ok('منو: نام‌های فرعی به‌صورت لینک مستقل حذف شده‌اند',!['ویدیوهای ضبط‌شده','آکادمی اساتید','تاتامی‌پدیا','آنالیز هوش مصنوعی'].some(x=>nav.includes(x)),nav.join('|'));
 S.ok('منو: تاریخچه جم',nav.includes('جم'),nav.join('|'));
 S.ok('منو: مربی آنلاین برای هنرجو',app!=='student'||nav.includes('مربی آنلاین'),nav.join('|'));
 S.ok('منو: خدمات تخصصی در دسترس است',nav.includes('خدمات تخصصی'),nav.join('|'));
 await go('#/specialist-services');let serviceText=await T();
 S.ok('خدمات تخصصی: سه دسته معرفی شده‌اند',['مربیان تغذیه','کلینیک‌های ورزشی','روان‌شناسی ورزشی'].every(x=>serviceText.includes(x)));
 await go('#/nutrition-coaches');S.ok('مربیان تغذیه: بدون پروفایل یا فرم ساختگی',(await T()).includes('هنوز از سامانه مدیریت Django'));
 await go('#/sports-clinics');S.ok('کلینیک‌های ورزشی: بدون داده ساختگی',(await T()).includes('هنوز از سامانه مدیریت Django'));
 await go('#/sports-psychologists');S.ok('روان‌شناسی ورزشی: بدون داده ساختگی',(await T()).includes('هنوز از سامانه مدیریت Django'));
 await go('#/');
 await go('#/courses');let hub=await T();S.ok('باشگاه مجازی: تب دوره‌ها و ویدیوهای ضبط‌شده در یک صفحه',hub.includes('باشگاه مجازی')&&await pg.locator('.tp-section-tabs a[href="#/courses"]').count()===1&&await pg.locator('.tp-section-tabs a[href="#/videos"]').count()===1);
 await go('#/videos');hub=await T();S.ok('باشگاه مجازی: مسیر قدیمی ویدیوها به همان بخش یکپارچه می‌رسد',hub.includes('باشگاه مجازی')&&await pg.locator('.tp-section-tabs a[aria-current="page"]').getAttribute('href')==='#/videos');
 await go('#/blog');hub=await T();S.ok('وبلاگ: تب مقاله و دانشنامه در یک بخش',hub.includes('وبلاگ')&&await pg.locator('.tp-section-tabs a[href="#/tatamipedia"]').count()===1);
 await go('#/tatamipedia');hub=await T();S.ok('تاتامی‌پدیا: مسیر قدیمی به تب همان بخش وبلاگ می‌رسد',hub.includes('وبلاگ')&&await pg.locator('.tp-section-tabs a[aria-current="page"]').getAttribute('href')==='#/tatamipedia');
 await go('#/academy');hub=await T();S.ok('آکادمی اساتید: مسیر قدیمی به فهرست واحد مربیان می‌رسد',hub.includes('مربیان')&&await pg.locator('#kfq').count()===1);
 await go('#/online-coach');const oc=await T();
 S.ok('مربی آنلاین: صفحه مشترک و تب آنالیز برای نقش‌های مجاز',oc.includes('مربی آنلاین')&&oc.includes('روشن کردن دوربین')&&await pg.locator('#tp-oc-video').count()===1&&await pg.locator('.tp-section-tabs a[href="#/online-coach"]').count()===1&&(app==='coach'||app==='club'?await pg.locator('.tp-section-tabs a[href="#/ai"]').count()===0:await pg.locator('.tp-section-tabs a[href="#/ai"]').count()===1));
 S.ok('مربی آنلاین: شمارش واقعی جعل نمی‌شود',await pg.locator('#tp-oc-count').innerText()==='—'&&oc.includes('ربات هنوز متصل نشده است')&&await pg.locator('#tp-oc-count-start').isDisabled());
 S.ok('مربی آنلاین: فعلاً فقط پیش‌نمایش محلی و بدون ورودی فایل',oc.includes('تصویر به سرور ارسال نمی‌شود')&&await pg.locator('#tp-oc-video').count()===1&&await pg.locator('#tp-oc input[type=file]').count()===0);
 const ocWidths=[];for(const width of [320,360,390]){await pg.setViewportSize({width,height:800});await go('#/online-coach');ocWidths.push(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1));}
 S.ok('مربی آنلاین: بدون اسکرول افقی در موبایل ۳۲۰/۳۶۰/۳۹۰',ocWidths.every(Boolean),ocWidths.join(','));
 await pg.setViewportSize({width:390,height:800});await go('#/');
  const homeOnlineCoachLinks=await pg.locator('#app a[href="#/online-coach"]').count();
  S.ok('صفحه اصلی هنرجو: دکمه و کارت مربی آنلاین در دسترس‌اند',app==='student'?homeOnlineCoachLinks>=2:homeOnlineCoachLinks===0,String(homeOnlineCoachLinks));
 if(app!=='coach'){
  await go('#/clubs');const clubList=await T();
  S.ok('باشگاه‌ها: صفحه جستجو و فهرست',clubList.includes('جستجوی باشگاه‌ها')&&clubList.includes('فهرست باشگاه‌ها'));
  const clubControlCounts=await Promise.all(['tp-club-city','tp-club-gender','tp-club-radius'].map(id=>pg.locator('#'+id).count()));S.ok('باشگاه‌ها: کنترل‌های شهر، جنسیت و شعاع',clubControlCounts.every(n=>n===1),clubControlCounts.join(','));
  S.ok('باشگاه‌ها: نزدیک من و تب نقشه',clubList.includes('نزدیک من')&&clubList.includes('نقشه'));
  S.ok('باشگاه‌ها: برچسب و داده نمونه',await pg.locator('#tp-club-cards[data-source="sample"] [data-club-id]').count()===6&&clubList.includes('داده‌های نمونه'));
  S.ok('باشگاه‌ها: فیلترهای وابسته به API بدون داده واقعی غیرفعال‌اند',await pg.locator('#tp-club-gender').isDisabled()&&await pg.locator('#tp-club-radius').isDisabled()&&await pg.locator('#tp-club-near-status').count()===1);
  S.ok('باشگاه‌ها: مختصات ساختگی/فاصله ساختگی در کارت‌ها نمایش داده نمی‌شود',clubList.includes('مختصات جغرافیایی در دادهٔ نمونه ثبت نشده است')&&!((await pg.locator('#tp-club-cards').innerText()).includes('کیلومتر')));
  
  const clubApiRows=[
   {id:'club-north-women',name:'باشگاه شمال بانوان',city:'تهران',coach_name:'سارا احمدی',description:'تمرین بانوان در شمال تهران',status:'registration_open',gender:'women',student_count:20,schedule:'شنبه و دوشنبه',latitude:35.7201,longitude:51.4001},
   {id:'club-north-men',name:'باشگاه شمال آقایان',city:'تهران',coach_name:'رضا کیانی',description:'تمرین آقایان',status:'active',gender:'men',student_count:15,latitude:35.7202,longitude:51.4001},
   {id:'club-south-women',name:'باشگاه جنوب بانوان',city:'شیراز',coach_name:'مربی نمونه',description:'تمرین شیراز',status:'active',gender:'women',latitude:29.6000,longitude:52.5000},
   {id:'club-north-far',name:'باشگاه شمال دور',city:'تهران',coach_name:'مربی نمونه',description:'بیرون از شعاع پنج کیلومتر',status:'active',gender:'women',latitude:35.8000,longitude:51.4000},
   {id:'club-north-no-coord',name:'باشگاه شمال بدون مختصات',city:'تهران',coach_name:'مربی نمونه',description:'مختصات هنوز ثبت نشده',status:'pending',gender:'women',student_count:8}
  ];
  let clubApiStatus=200,clubApiRequestUrl='';
  await pg.route('**/__tp_test_api/clubs*',async route=>{
   clubApiRequestUrl=route.request().url();
   if(clubApiStatus!==200){await route.fulfill({status:clubApiStatus,contentType:'text/plain',body:'temporarily unavailable'});return}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[...clubApiRows,clubApiRows[0],{name:'رکورد بدون شناسه',city:'تهران'}]})});
  });
  await pg.evaluate(()=>{window.TP_CLUBS_JSON_URL='/__tp_test_api/clubs';window.TP_NESHAN_WEB_KEY=''});
  const filteredHash='#/clubs?query='+encodeURIComponent('باشگاه شمال')+'&city='+encodeURIComponent('تهران')+'&gender=women&radius_km=5&lat=35.72&lng=51.4';
  await go(filteredHash);
  await pg.waitForFunction(()=>document.querySelector('#tp-club-cards')?.dataset.source==='api');
  const radiusIds=await pg.locator('#tp-club-cards [data-club-id]').evaluateAll(es=>es.map(e=>e.dataset.clubId));
  const requestParams=new URL(clubApiRequestUrl).searchParams;
  S.ok('باشگاه‌ها: دریافت API حتی بدون Web Key نشان',radiusIds.length===1&&radiusIds[0]==='club-north-women');
  S.ok('باشگاه‌ها: اعمال جستجو/شهر/جنسیت/شعاع روی همان مجموعه داده',requestParams.get('query')==='باشگاه شمال'&&requestParams.get('city')==='تهران'&&requestParams.get('gender')==='women'&&requestParams.get('radius_km')==='5'&&requestParams.get('lat')==='35.72'&&requestParams.get('lng')==='51.4');
  S.ok('باشگاه‌ها: رکوردهای نامعتبر و شناسه تکراری نادیده گرفته می‌شوند',(await pg.locator('#tp-club-notes').innerText()).includes('رکورد به‌دلیل شناسه/نام نامعتبر یا تکراری بودن شناسه نمایش داده نشد'));
  S.ok('باشگاه‌ها: نبود Web Key دریافت و فهرست API را متوقف نمی‌کند',(await pg.locator('#tp-club-map-status').innerText()).includes('فهرست باشگاه‌ها دریافت شد'));
  
  await pg.evaluate(()=>{
   window.TP_NESHAN_WEB_KEY='test-web-key';
   window.L={
    Map:class{constructor(id,options){this.id=id;this.options=options;this._markers=[];window.__tpFakeClubMap=this}remove(){this._removed=true}panTo(point){this._lastPan=point}setView(point,zoom){this._view={point,zoom}}fitBounds(bounds){this._bounds=bounds}invalidateSize(){}},
    marker(point){return{point,addTo(map){this.map=map;map._markers.push(this);return this},bindPopup(html){this.popup=html;return this},openPopup(){return this}}},
    featureGroup(markers){return{getBounds(){return{pad(){return{}}}}}}
   };
  });
  await go('#/clubs?query='+encodeURIComponent('باشگاه شمال')+'&city='+encodeURIComponent('تهران')+'&gender=women');
  await pg.waitForFunction(()=>window.__tpFakeClubMap&&window.__tpFakeClubMap._markers.length===2);
  const apiCards=await pg.locator('#tp-club-cards[data-source="api"] [data-club-id]').evaluateAll(es=>es.map(e=>e.dataset.clubId));
  const mapData=await pg.evaluate(()=>({ids:window.__tpFakeClubMap._markers.map(m=>m.point),status:document.getElementById('tp-club-map-status').innerText}));
  S.ok('باشگاه‌ها: کارت‌ها از پاسخ واقعی API جایگزین داده نمونه می‌شوند',apiCards.length===3&&apiCards.includes('club-north-women')&&apiCards.includes('club-north-far')&&apiCards.includes('club-north-no-coord')&&!apiCards.includes('0'));
  S.ok('باشگاه‌ها: فقط رکوردهای دارای مختصات معتبر نشانک می‌گیرند',mapData.ids.length===2&&mapData.status.includes('نشانک روی نقشه نمایش داده شد'));
  await pg.locator('#tp-club-cards [data-club-id="club-north-women"]').hover();
  S.ok('باشگاه‌ها: تعامل کارت و نشانک نقشه همگام است',await pg.evaluate(()=>Array.isArray(window.__tpFakeClubMap._lastPan)&&window.__tpFakeClubMap._lastPan[0]===35.7201));
  S.ok('باشگاه‌ها: گزینه‌های شهر از داده API به فیلتر افزوده می‌شوند',await pg.locator('#tp-club-city option').evaluateAll(es=>es.some(e=>e.value==='شیراز')));
  
  clubApiStatus=503;
  await go('#/clubs?query='+encodeURIComponent('باشگاه شمال'));
  await pg.waitForFunction(()=>document.querySelector('#tp-club-cards')?.dataset.source==='error');
  S.ok('باشگاه‌ها: خطای API به داده نمونه یا کارت‌های قدیمی سقوط نمی‌کند',await pg.locator('#tp-club-cards [data-club-id]').count()===0&&(await pg.locator('#tp-club-list-status').innerText()).includes('HTTP 503'));
  
  await go('#/club/0');const clubDetail=await T();
  S.ok('باشگاه‌ها: جزئیات نمونه بدون آدرس یا مختصات جعلی',clubDetail.includes('نشانی دقیق')&&clubDetail.includes('در دادهٔ نمونه ثبت نشده است.'));
 }

 S.ok('جم: نشان موجودی در هدر',await pg.locator('#hgem[href="#/gems"]').count()===1);
 S.ok('منو: «باشگاه‌ها» فقط برای هنرجو/باشگاه',(app==='coach')?!nav.includes('باشگاه‌ها'):nav.includes('باشگاه‌ها'));
 const foot=await pg.evaluate(()=>[...document.querySelectorAll('footer a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href')})));S.ok('فوتر: بخش‌های ادغام‌شده فقط یک‌بار و با نام یکسان آمده‌اند',foot.some(a=>a.text==='باشگاه مجازی'&&a.href==='#/courses')&&foot.some(a=>a.text==='مربیان'&&a.href==='#/coaches')&&foot.some(a=>a.text==='وبلاگ'&&a.href==='#/blog')&&foot.some(a=>a.text==='مربی آنلاین'&&a.href==='#/online-coach')&&!['ویدیوهای ضبط‌شده','آکادمی اساتید','تاتامی‌پدیا','آنالیز هوش مصنوعی'].some(x=>foot.some(a=>a.text===x)),JSON.stringify(foot));
 await go('#/gems');const gems=await T();S.ok('جم: صفحه تاریخچه و وضعیت عدم اتصال',gems.includes('تاریخچه تراکنش‌ها')&&gems.includes('موجودی واقعی هنوز به این نسخه متصل نشده است'));S.ok('جم: عدم نمایش تراکنش ساختگی',gems.includes('تراکنشی برای نمایش وجود ندارد'));
 await go('#/my-profile');S.ok('«پروفایل من» فقط در PWA مربی',(app==='coach')?!await nf():await nf());
 if(app==='coach'){
  const loggedOutProfile=await T();
  S.ok('پروفایل مربی بدون ورود، اطلاعات مربی نمونه دیگری را نمایش نمی‌دهد',loggedOutProfile.includes('ورود به حساب مربی لازم است')&&!loggedOutProfile.includes('سارا احمدی'));
  await pg.evaluate(()=>{
   ME={username:'coach-test-۱۴',role:'coach'};
   localStorage.setItem('tp:coachapps',JSON.stringify({'coach-test-۱۴':{
    coaching_level:'مربی آزمایشی درجه ۲',specializations:'ناژه‌وازه آزمایشی',years_experience:7,
    club_name:'باشگاه آزمایشی',certificate_details:'مدرک آزمایشی',certificate_document:{name:'coach-test.pdf',size:1024},
    status:'pending_review',submitted_at:Date.now()
   }}));
   R();
  });
  const ownProfile=await T();
  const ownFields=await pg.evaluate(()=>({
   username:document.querySelector('#mp-u')?.value||'',
   level:document.querySelector('#mp-l')?.value||'',
   specialties:document.querySelector('#mp-s')?.value||'',
   club:document.querySelector('#mp-c')?.value||'',
   certificate:document.querySelector('#mp-doc')?.value||''
  }));
  S.ok('پروفایل مربی فقط اطلاعات درخواست متعلق به همان حساب را نشان می‌دهد',
   ownFields.username==='coach-test-۱۴'&&ownFields.level==='مربی آزمایشی درجه ۲'&&ownFields.specialties==='ناژه‌وازه آزمایشی'&&ownFields.club==='باشگاه آزمایشی'&&ownFields.certificate==='coach-test.pdf'&&!ownProfile.includes('سارا احمدی'),JSON.stringify(ownFields));
  await pg.evaluate(()=>{ME=null;localStorage.removeItem('tp:coachapps');R()});
 }
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
 const initialStoreAudit=await pg.evaluate(()=>{
  const cards=[...document.querySelectorAll('#app .sl .pg article.pcd')];
  const ids=cards.map(card=>Number((card.querySelector('a[href^="#/product/"]')?.getAttribute('href')||'').split('/').pop()));
  const garments=P.filter(product=>product.c==='لباس جودو');
  return{
   garmentCount:garments.length,
   garmentsHaveSizes:garments.every(product=>Array.isArray(product.sz)&&product.sz.length>0),
   firstPageCategories:ids.map(id=>P[id]?.c),
   cardsHideVariants:cards.every(card=>!card.querySelector('.pc-variants,[data-product-size],[data-product-color]')),
   cardsHaveDetailCta:cards.length>0&&cards.every(card=>[...card.querySelectorAll('a.btn')].some(link=>/مشاهده (?:و انتخاب محصول|اطلاعات مرجع)/.test(link.textContent)&&link.getAttribute('href')?.startsWith('#/product/'))),
   cardsHaveNoDirectAdd:cards.every(card=>![...card.querySelectorAll('button')].some(button=>/افزودن به سبد|افزودن به خرید/.test(button.textContent)))
  };
 });
 S.ok('فروشگاه: همه ۱۳ پوشاک جودو گزینه سایز دارند',initialStoreAudit.garmentCount===13&&initialStoreAudit.garmentsHaveSizes,JSON.stringify(initialStoreAudit));
 S.ok('فروشگاه: ترتیب پیش‌فرض با لباس جودو و سپس کمربند جودو آغاز می‌شود',
  initialStoreAudit.firstPageCategories.slice(0,13).every(category=>category==='لباس جودو')&&
  initialStoreAudit.firstPageCategories.slice(13,23).every(category=>category==='کمربند جودو'),
  initialStoreAudit.firstPageCategories.join(' | '));
 S.ok('فروشگاه: کارت‌ها فقط CTA صفحه جزئیات دارند و سایز/رنگ یا افزودن مستقیم ندارند',
  initialStoreAudit.cardsHideVariants&&initialStoreAudit.cardsHaveDetailCta&&initialStoreAudit.cardsHaveNoDirectAdd,
  JSON.stringify(initialStoreAudit));
 const estimatedSizeProduct=await pg.evaluate(()=>P.find(product=>product.szEstimated)?.id??-1);
 if(estimatedSizeProduct>=0){
  await go('#/product/'+estimatedSizeProduct);
  S.ok('جزئیات محصول: سایز تخمینی فقط اطلاع‌رسانی است و به‌عنوان تنوع خرید ارائه نمی‌شود',
   (await T()).includes('تخمینی است')&&await cnt('#pd-sz .chip')===0&&await pg.locator('#pd-add').isDisabled());
  await go('#/store');
 }else S.ok('کاتالوگ: نشانگر سایز تخمینی در محصولات تکمیل‌شده وجود دارد',false);


 S.ok('فروشگاه: برچسب «قیمت مرجع بازار» روی کارت‌های کاتالوگ',(await T()).includes('قیمت مرجع بازار'));
 const referenceStockAudit=await pg.evaluate(()=>({allReferenceRowsHaveNoStock:P.filter(product=>product.ref).every(product=>product.st===0),visibleReferenceCard:[...document.querySelectorAll('#app .sl .pg .pcd')].some(card=>{const href=card.querySelector('a[href^="#/product/"]')?.getAttribute('href')||'';const id=Number(href.split('/').pop());return !!P[id]?.ref&&card.textContent.includes('موجودی تأیید نشده')})}));
 S.ok('فروشگاه: کالای مرجع موجودی ساختگی ندارد و کارت آن موجودی تأییدنشده نشان می‌دهد',referenceStockAudit.allReferenceRowsHaveNoStock&&referenceStockAudit.visibleReferenceCard,JSON.stringify(referenceStockAudit));
 const demoProductName=await pg.evaluate(()=>P.find(product=>product.demo&&product.st>0)?.n||'');
 if(demoProductName){
  await pg.fill('#fq',demoProductName);await wait(140);
  S.ok('فروشگاه: جستجوی محصول نمونه، برچسب اطلاعات نمونه را نمایش می‌دهد',(await T()).includes('اطلاعات نمونه'));
  await pg.fill('#fq','');await wait(100);
 }else S.ok('فروشگاه: محصول نمونه برای کنترل برچسب وجود دارد',false);
 // تصاویر lazy کارت‌ها را eager کن و تا پایان درخواست‌ها صبر کن؛ سپس شکست واقعی را بررسی کن.
 const productCardImages=pg.locator('#app .sl .pg article.pcd img');
 await productCardImages.evaluateAll(images=>images.forEach(img=>{img.loading='eager'}));
 await pg.waitForFunction(()=>{const images=[...document.querySelectorAll('#app .sl .pg article.pcd img')];return images.length>0&&images.every(img=>img.complete)},null,{timeout:15000});
 S.ok('فروشگاه: تصاویر همه کارت‌های بارگذاری‌شده شکسته نیستند',await productCardImages.evaluateAll(images=>images.every(img=>img.naturalWidth>0)));
 // Checkout نمایشی فقط در Preview؛ PWAهای نقش‌محور نباید CTA یا مسیر فعال داشته باشند.
 const checkoutTestProduct=await pg.evaluate(()=>P.findIndex(p=>p.demo&&p.st>0));
 if(checkoutTestProduct>=0){
  await go('#/product/'+checkoutTestProduct);
  if(await pg.locator('#pd-sz .chip').count())await pg.locator('#pd-sz .chip').first().click();
  if(await pg.locator('#pd-cl .chip').count())await pg.locator('#pd-cl .chip').first().click();
  await pg.locator('#app .pa button.btn').first().click();
  await pg.waitForFunction(()=>location.hash.split('?')[0]==='#/cart',null,{timeout:5000});
  S.ok('PWA نقش‌محور: دکمه ادامه خرید به Checkout نمایشی نمایش داده نمی‌شود',await cnt('#app a[href="#/checkout"]')===0);
  await pg.evaluate(()=>{cart=[];S('cart',cart)});
  await go('#/store');
 }else S.ok('PWA نقش‌محور: محصول آزمایشی بدون تنوع برای تست سبد پیدا شد',false);
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
 S.ok('جزئیات محصول: موجودی نمونه به‌صورت شفاف برچسب خورده است',t.includes('موجودی تأیید نشده'));
 const referenceProductId=await pg.evaluate(()=>P.find(p=>p.ref&&!p.sz.length&&!p.cl.length)?.id??-1);
 if(referenceProductId>=0){
  await go('#/product/'+referenceProductId);
  S.ok('جزئیات مرجع: دکمه خرید غیرفعال است',await pg.locator('#pd-add').isDisabled()&&(await pg.locator('#pd-add').innerText()).includes('خرید غیرفعال'));
  const beforeReferenceAdd=await pg.evaluate(()=>cart.length);
  await pg.evaluate(()=>addP());
  S.ok('جزئیات مرجع: فراخوانی مستقیم addP هم سبد را تغییر نمی‌دهد',await pg.evaluate(n=>cart.length===n,beforeReferenceAdd));
  await go('#/cart');
  S.ok('سبد: کالای مرجع بازار وارد سبد خرید نمی‌شود',(await T()).includes('سبد خرید شما خالی است'));
 }else S.ok('کاتالوگ مرجع بدون تنوع برای کنترل خرید غیرفعال موجود است',false);
 await pg.evaluate(()=>localStorage.clear());

 // --- کاتالوگ دوره‌های نمایشی Preview
 await go('#/courses');S.ok('دوره‌ها: فهرست سه دوره نمونه',await cnt('#app .tp-course-card')===3);
 await go('#/courses/judo-foundations');t=await T();S.ok('دوره‌ها: جزئیات، مربی و قسمت‌ها',t.includes('آشنایی با فنون پایه جودو')&&t.includes('فهرست قسمت‌ها')&&t.includes('ثبت‌نام و خرید در این نسخه انجام نمی‌شود.'));
 S.ok('دوره‌ها: ثبت‌نام واقعی غیرفعال است',await pg.locator('#app button[disabled]').count()===1);
 await go('#/episode/judo-foundations-lesson-1');t=await T();S.ok('قسمت دوره: معرفی نمونه بدون ویدئوی ساختگی',t.includes('پخش ویدئو در پیش‌نمایش فعال نیست')&&await cnt('#app video')===0);
 await go('#/episode/not-a-course-lesson-1');S.ok('قسمت نامعتبر به صفحه ۴۰۴ می‌رود',await nf());

 // --- جستجوی سراسری: هر دو زیرمجموعه محتوای ادغام‌شده
 await go('#/search?q='+encodeURIComponent('فنون پایه'));
 const courseSearchGroup=pg.locator('#app .d-s[aria-label="باشگاه مجازی"]');
 S.ok('جستجوی سراسری: دوره‌ها در گروه باشگاه مجازی جستجو می‌شوند',
   await courseSearchGroup.locator('a[href="#/courses/judo-foundations"]').count()===1,
   await T());

 await go('#/search?q='+encodeURIComponent('ا'));
 const blogSearchGroup=pg.locator('#app .d-s[aria-label="وبلاگ"]');
 const blogShowAll=blogSearchGroup.locator('button[data-search-expand="blog"]');
 S.ok('جستجوی وبلاگ: نتیجه‌های اولیه محدود و کنترل نمایش همه حاضر است',
   await blogSearchGroup.locator('a.rec').count()===5&&await blogShowAll.count()===1);
 await blogShowAll.click();await wait(80);
 let blogSearchLinks=await blogSearchGroup.locator('a.rec').evaluateAll(items=>items.map(item=>item.getAttribute('href')||''));
 S.ok('جستجوی وبلاگ: نمایش همه، هم مقاله‌ها و هم تاتامی‌پدیا را نگه می‌دارد',
   blogSearchLinks.length>5&&blogSearchLinks.some(href=>href.startsWith('#/blog/'))&&blogSearchLinks.some(href=>href.startsWith('#/tatamipedia/')),
   'نتایج نمایش‌داده‌شده: '+blogSearchLinks.length);
 await blogShowAll.click();await wait(80);
 S.ok('جستجوی وبلاگ: امکان جمع‌کردن دوباره نتایج',
   await blogSearchGroup.locator('a.rec').count()===5&&await blogSearchGroup.locator('button[data-search-expand="blog"]').getAttribute('aria-expanded')==='false');

 const clubSearchGroup=pg.locator('#app .d-s[aria-label="باشگاه مجازی"]');
 const clubShowAll=clubSearchGroup.locator('button[data-search-expand="virtual-club"]');
 S.ok('جستجوی باشگاه مجازی: دوره و ویدیو هر دو در گروه نتایج قابل گسترش‌اند',
   await clubSearchGroup.locator('a[href^="#/courses/"]').count()>0&&await clubShowAll.count()===1);
 await clubShowAll.click();await wait(80);
 const clubSearchLinks=await clubSearchGroup.locator('a.rec').evaluateAll(items=>items.map(item=>item.getAttribute('href')||''));
 S.ok('جستجوی همه باشگاه مجازی: لینک دوره‌ها و ویدیوها حفظ می‌شود',
   clubSearchLinks.length>5&&clubSearchLinks.some(href=>href.startsWith('#/courses/'))&&clubSearchLinks.some(href=>href.startsWith('#/video/')),
   'نتایج نمایش‌داده‌شده: '+clubSearchLinks.length);

 // --- وبلاگ
 await go('#/blog');S.ok('بلاگ: صفحه اول ۶ مقاله + صفحه‌بندی',await cnt('#app article')===6&&await cnt('.tp-pager')===1);
 await pg.locator('.tp-pager button[aria-label="صفحه ۲"]').click();await wait(100);S.ok('بلاگ: صفحه ۲ دو مقاله دارد و در آدرس است',await cnt('#app article')===2&&(await pg.evaluate(()=>location.hash)).includes('page=2'));
 await go('#/blog?q='+encodeURIComponent('اوچی ماتا'));S.ok('بلاگ: جست‌وجوی بدون نیم‌فاصله/فاصله',await cnt('#app article')>=1);
 await go('#/blog/uchi-mata-basics');S.ok('بلاگ: صفحه مقاله با slug خوانا',(await T()).includes('اوچی‌ماتا')&&(await pg.title()).includes('اوچی‌ماتا'));
 // --- حامیان
 await go('#/sponsors');S.ok('حامیان: شش جایگاه نمونه با توضیح شفاف',await cnt('#app .tp-sponsors li')===6&&(await T()).includes('موارد زیر جایگاه‌های نمونه هستند'));
 // --- امنیت: داده localStorage و آدرس
 const [safeCartId,referenceCartId]=await pg.evaluate(()=>[P.findIndex(product=>!product.ref&&product.st>0),P.findIndex(product=>product.ref)]);
 await pg.evaluate(({safeId,referenceId})=>{localStorage.setItem('cart',JSON.stringify([{id:safeId,s:'<img src=x onerror=window.__ls=1>',c:'<b>x</b>',q:99999},{id:referenceId,s:'',c:'',q:2},{id:9999,s:'',c:'',q:1},{id:'x'},null]));localStorage.setItem('prog',JSON.stringify({3:500,abc:5,'-1':3}));localStorage.setItem('fav',JSON.stringify([1,1,'a',9999]));localStorage.setItem('saved','"nope"');localStorage.setItem('lastWatched','"<script>"');localStorage.setItem('role','"<img src=x>"')}, {safeId:safeCartId,referenceId:referenceCartId});
 await pg.goto('about:blank');await pg.goto(base+'/index.html#/cart');await wait(400);
 S.ok('امنیت: HTML تزریق‌شده از localStorage اجرا نمی‌شود',!await pg.evaluate(()=>!!window.__ls));
 S.ok('امنیت: داده نامعتبر سبد پاک‌سازی/محدود شد',await pg.evaluate((safeId)=>{const c=JSON.parse(localStorage.getItem('cart'));return c.length===1&&c[0].id===safeId&&c[0].q<=50&&!/[<>]/.test(JSON.stringify(c))},safeCartId));
 S.ok('امنیت: پیشرفت ویدیو در بازه ۰..۱۰۰ و کلیدهای نامعتبر حذف',await pg.evaluate(()=>{const p=JSON.parse(localStorage.getItem('prog'));return Object.keys(p).join()==='3'&&p[3]===100}));
 S.ok('امنیت: علاقه‌مندی/ذخیره‌ها اعتبارسنجی شد',await pg.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('fav')))==='[1]'&&localStorage.getItem('saved')==='[]'));
 await go('#/dashboard');S.ok('امنیت: بدون خطای JS با داده خراب',!errs.length,errs.join(' | '));
 await pg.evaluate(()=>localStorage.clear());
 await ctx.close();
 // --- واکنش‌گرایی، ID تکراری، خطاهای JS در همه عرض‌ها
 const routes=['#/','#/login','#/register','#/coaches','#/coaches/sara-ahmadi','#/sponsors','#/tatamipedia','#/tatamipedia/uchi-mata','#/blog','#/blog/uchi-mata-basics','#/store','#/product/2','#/cart','#/tournaments','#/tournament/1','#/videos','#/video/3','#/academy','#/instructor/0','#/dashboard','#/profile','#/ai','#/clubs','#/club/0','#/gems','#/search','#/my-profile','#/nope'];
 const over=[],dup=new Set();for(const w of WIDTHS){const c2=await browser.newContext({viewport:{width:w,height:800},serviceWorkers:'block'});const p2=await c2.newPage();p2.on('pageerror',e=>errs.push('PAGEERROR@'+w+' '+String(e).slice(0,80)));await p2.goto(base+'/index.html');
  for(const r of routes){await p2.evaluate(x=>{location.hash=x},r);await wait(50);const o=await p2.evaluate(OVERFLOW_JS);if(o.o)over.push(`${w}${r}`);o.dup.forEach(d=>dup.add(r+':'+d))}await c2.close()}
 S.ok(`واکنش‌گرایی: بدون اسکرول افقی (${WIDTHS.join('/')} × ${routes.length} مسیر)`,!over.length,over.slice(0,5).join(' '));S.ok('بدون شناسه تکراری',!dup.size,[...dup].join(' '));S.ok('بدون خطای JavaScript',!errs.length,errs.slice(0,3).join(' | '));
 // --- اهداف لمسی ≥۴۴px (کنترل‌های تعاملی؛ لینک درون‌متنی مستثناست)
 const c3=await browser.newContext({viewport:{width:360,height:800},serviceWorkers:'block'});const p3=await c3.newPage();await p3.goto(base+'/index.html');const small=[];
 for(const r of routes){await p3.evaluate(x=>{location.hash=x},r);await wait(80);const n=await p3.evaluate(()=>[...document.querySelectorAll('#app button:not([disabled]),#app a.btn,#app .chip,#app select,#app input:not([type=checkbox]):not([type=file]),#nv a,header a.ib,.tp-pager button')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&(b.height<43.5||b.width<43.5)&&getComputedStyle(e).visibility!=='hidden'}).map(e=>(e.tagName+'.'+e.className+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)).slice(0,50)));if(n.length)small.push(r+' '+n.slice(0,3).join(','))}
 S.ok('اهداف لمسی ≥۴۴×۴۴ در کنترل‌های مهم (۳۶۰px)',!small.length,small.join(' ; '));await c3.close();
 return S}
export async function runPwa(app,base,browser,altRoot){
 const S=new Suite('PWA-فنی '+app);
 const ctx=await browser.newContext({viewport:{width:390,height:800},serviceWorkers:'allow'});
 const pg=await ctx.newPage();pg.setDefaultTimeout(15000);pg.setDefaultNavigationTimeout(15000);
 const swConsoleErrors=[],staticResourceErrors=[];
 pg.on('console',message=>{
  if(message.type()!=='error')return;
  const source=message.location()?.url||'';
  if(source.endsWith('/sw.js')||message.text().includes('[Tatami SW]'))swConsoleErrors.push({text:message.text(),source});
 });
 pg.on('response',response=>{
  const resourceType=response.request().resourceType();
  const sameOrigin=new URL(response.url()).origin===new URL(base).origin;
  if(sameOrigin&&response.status()>=400&&['stylesheet','script','image','font'].includes(resourceType)){
   staticResourceErrors.push({status:response.status(),url:response.url(),resourceType});
  }
 });
 await pg.goto(base+'/index.html');
 await wait(250);
 S.ok('CSS، JS و تصاویر هم‌مبدأ PWA با پاسخ موفق بارگذاری می‌شوند',staticResourceErrors.length===0,JSON.stringify(staticResourceErrors));
 const neshanConfig=await pg.evaluate(async()=>{const r=await fetch('assets/neshan-config.js');return{status:r.status,text:await r.text()}});
 S.ok('تنظیمات نشان در خروجی PWA قابل دریافت است',neshanConfig.status===200&&neshanConfig.text.includes('TP_NESHAN_WEB_KEY')&&neshanConfig.text.includes('TP_CLUBS_JSON_URL'),String(neshanConfig.status));
 const man=await pg.evaluate(()=>fetch('manifest.webmanifest').then(r=>r.json()));
 S.ok('Manifest: fa/rtl/standalone/id/start_url/scope',man.lang==='fa'&&man.dir==='rtl'&&man.display==='standalone'&&man.scope==='./'&&man.id==='./'&&man.name.startsWith('Tatami Plus'),JSON.stringify([man.lang,man.dir,man.display,man.start_url]));
 S.ok('Manifest: آیکون ۱۹۲/۵۱۲/maskable',['192x192','512x512'].every(s=>man.icons.some(i=>i.sizes===s))&&man.icons.some(i=>i.purpose==='maskable'));
 let ok=true;
 for(const i of man.icons)if(await pg.evaluate(u=>fetch(u).then(r=>r.status),i.src)!==200)ok=false;
 S.ok('آیکون‌ها 200',ok);
 S.ok('offline.html موجود',await pg.evaluate(()=>fetch('offline.html').then(r=>r.status))===200);
 const pwaCoreAssets=[
  'assets/css/home-live-feeds.css',
  'assets/js/home-live-feeds.js',
  'assets/images/judo/uchi-mata.svg',
  'assets/images/judo/seoi-nage.svg',
  'assets/images/judo/osoto-gari.svg'
 ];
 const precache=await pg.evaluate(async({requiredAssets,app})=>{
  const source=await fetch('sw.js').then(r=>r.text());
  const match=source.match(/SHELL=(\[[^;]+\]);/);
  if(!match)return{ok:false,missing:['Unable to parse generated precache list'],unlisted:requiredAssets,notCore:requiredAssets,cachePrefix:null};
  const paths=JSON.parse(match[1]),missing=[],unlisted=requiredAssets.filter(path=>!paths.includes(path));
  const coreMatch=source.match(/CORE_COUNT=(\d+)/),coreCount=coreMatch?Number(coreMatch[1]):0;
  const notCore=requiredAssets.filter(path=>!paths.slice(0,coreCount).includes(path));
  const prefixMatch=source.match(/CACHE_PREFIX='([^']+)'/);
  for(const path of paths){try{const response=await fetch(path);if(!response.ok)missing.push(path+' → HTTP '+response.status)}catch(error){missing.push(path+' → '+String(error))}}
  const cachePrefix=prefixMatch?.[1]||null;
  return{ok:missing.length===0&&unlisted.length===0&&notCore.length===0&&cachePrefix==='tatami-'+app,missing,unlisted,notCore,cachePrefix};
 },{requiredAssets:pwaCoreAssets,app});
 S.ok('منابع اصلی رابط در Build و فهرست هستهٔ Cache موجودند',precache.ok,JSON.stringify(precache));
 S.ok('پیشوند Cache از نقش همین PWA جدا شده است',precache.cachePrefix==='tatami-'+app,String(precache.cachePrefix));
 const registrations=await pg.evaluate(async()=>Promise.all((await navigator.serviceWorker.getRegistrations()).map(async registration=>({scope:registration.scope,active:registration.active?.state||null,installing:registration.installing?.state||null,waiting:registration.waiting?.state||null}))));
 S.ok('Service Worker registration exists',registrations.length>0,JSON.stringify(registrations));
 const swReady=await pg.evaluate(()=>Promise.race([navigator.serviceWorker.ready.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),10000))]));
 S.ok('Service Worker registration becomes ready within 10 seconds',swReady,swReady?'ready':'timed out');
 S.ok('Service Worker console has no registration/install error',!swConsoleErrors.length,JSON.stringify(swConsoleErrors));
 await wait(900);
 await pg.reload();
 await wait(500);
 const keys=await pg.evaluate(()=>caches.keys());
 S.ok('Service Worker فعال و Cache نسخه‌دار ساخته شد',keys.length===1&&new RegExp('^tatami-'+app+'-[0-9a-f]{10}$').test(keys[0]),keys.join());
 const configCached=await pg.evaluate(async()=>{
  const names=await caches.keys();
  if(!names.length)return false;
  const cache=await caches.open(names[0]);
  const url=new URL('assets/neshan-config.js',location.href).toString();
  return!!(await cache.match(url));
 });
 S.ok('فایل تنظیمات نشان در Cache اولیه PWA ذخیره شده است',configCached);
 const otherRole=app==='student'?'coach':'student';
 const crossRoleCacheProbe=await pg.evaluate(async(role)=>{
  const cacheName='tatami-'+role+'-isolation-probe';
  const url=new URL('assets/__tatami-cache-isolation-probe__.txt',location.href).toString();
  const otherCache=await caches.open(cacheName);
  await otherCache.put(url,new Response('other-role-cache-entry',{headers:{'Content-Type':'text/plain'}}));
  try{
   const response=await fetch(url);
   return{status:response.status,body:await response.text()};
  }finally{await caches.delete(cacheName)}
 },otherRole);
 S.ok('درخواست PWA فقط Cache همان نسخه/نقش را می‌خواند',
  crossRoleCacheProbe.status===404&&!crossRoleCacheProbe.body.includes('other-role-cache-entry'),
  JSON.stringify(crossRoleCacheProbe));
 const manifestIconsCached=await pg.evaluate(async()=>{
  const manifest=await fetch('manifest.webmanifest').then(response=>response.json());
  const names=await caches.keys();
  if(!names.length)return{ok:false,missing:manifest.icons.map(icon=>icon.src)};
  const cache=await caches.open(names[0]),missing=[];
  for(const icon of manifest.icons)if(!await cache.match(new URL(icon.src,location.href).toString()))missing.push(icon.src);
  return{ok:missing.length===0,missing};
 });
 S.ok('همهٔ آیکون‌های Manifest از جمله maskable در Cache اولیه‌اند',manifestIconsCached.ok,JSON.stringify(manifestIconsCached));
 const coreAssetsCached=await pg.evaluate(async(paths)=>{
  const name=(await caches.keys()).find(key=>key.startsWith('tatami-'));
  if(!name)return{ok:false,missing:paths};
  const cache=await caches.open(name),missing=[];
  for(const path of paths)if(!await cache.match(new URL(path,location.href).toString()))missing.push(path);
  return{ok:missing.length===0,missing};
 },pwaCoreAssets);
 S.ok('CSS، JavaScript و SVGهای اصلی در Cache نسخه‌دار ذخیره شده‌اند',coreAssetsCached.ok,coreAssetsCached.missing.join(' | '));
 const cdp=await ctx.newCDPSession(pg);
 try{
  const r=await cdp.send('Page.getInstallabilityErrors');
  S.ok('Chromium: بدون خطای نصب‌پذیری (localhost)',!r.installabilityErrors.length,JSON.stringify(r.installabilityErrors));
 }catch(e){S.ok('Chromium installability',false,e.message)}
 await ctx.setOffline(true);
 try{
  await pg.reload({timeout:8000});
  await wait(400);
  S.ok('آفلاین: رفرش برنامه',await pg.evaluate(()=>document.getElementById('app').innerHTML.length)>500);
  await pg.evaluate(()=>{location.hash='#/tatamipedia/ippon'});
  await wait(100);
  S.ok('آفلاین: تاتامی‌پدیا',(await pg.evaluate(()=>document.getElementById('app').innerText)).includes('ایپون'));
  const offlineConfig=await pg.evaluate(async()=>{
   try{const r=await fetch('assets/neshan-config.js');return{status:r.status,text:await r.text()}}
   catch{return{status:0,text:''}}
  });
  S.ok('تنظیمات نشان در حالت آفلاین هم در دسترس است',offlineConfig.status===200&&offlineConfig.text.includes('TP_NESHAN_WEB_KEY'),String(offlineConfig.status));
  const offlineCoreAssets=await pg.evaluate(async(paths)=>{
   const results=[];
   for(const path of paths){try{const response=await fetch(path,{cache:'no-store'});results.push({path,status:response.status})}catch(error){results.push({path,status:0,error:String(error)})}}
   return results;
  },pwaCoreAssets);
  S.ok('منابع اصلی رابط در حالت آفلاین قابل دریافت‌اند',offlineCoreAssets.every(result=>result.status===200),JSON.stringify(offlineCoreAssets));
 }catch(e){S.ok('آفلاین: رفرش',false,e.message.slice(0,80))}
 try{
  await pg.goto(base+'/coaches/sara-ahmadi/',{timeout:8000});
  await wait(700);
  S.ok('آفلاین: ورود مستقیم /coaches/<slug>/',(await pg.evaluate(()=>document.getElementById('app')&&document.getElementById('app').innerText)||'').includes('سارا احمدی'));
 }catch(e){S.ok('آفلاین: ورود مستقیم /coaches/<slug>/',false,e.message.slice(0,80))}
 await ctx.setOffline(false);
 if(altRoot){
  const before=keys.find(name=>name.startsWith('tatami-'+app+'-'));
  const otherRoles=['student','coach','club'].filter(role=>role!==app);
  const sentinels=[...otherRoles.map(role=>'tatami-'+role+'-preserve-sentinel'),'tatami-unrelated-preserve-sentinel'];
  await pg.evaluate(names=>Promise.all(names.map(name=>caches.open(name))),sentinels);

  // A second tab remains controlled by the old worker while the replacement installs.
  const peer=await ctx.newPage();
  await peer.goto(base+'/index.html');
  await peer.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:8000});

  altRoot.use();
  const updateRequested=await pg.evaluate(async()=>{
   const registration=await navigator.serviceWorker.getRegistration();
   if(!registration)return false;
   await registration.update();
   return true;
  });
  if(updateRequested){
   await pg.waitForFunction(async()=>{
    const registration=await navigator.serviceWorker.getRegistration();
    return registration?.waiting?.state==='installed';
   },null,{timeout:15000}).catch(()=>null);
  }
  const staged=await pg.evaluate(async()=>{
   const registration=await navigator.serviceWorker.getRegistration();
   return{
    active:registration?.active?.state||null,
    waiting:registration?.waiting?.state||null,
    controller:navigator.serviceWorker.controller?.state||null,
    activeControlsPage:!!(registration?.active&&navigator.serviceWorker.controller===registration.active),
    caches:await caches.keys()
   };
  });
  const stagedCache=staged.caches.find(name=>name.startsWith('tatami-'+app+'-')&&name!==before);
  S.ok('به‌روزرسانی: نسخه جدید تا پایان کار تب‌های قدیمی در انتظار می‌ماند',
   updateRequested&&!!before&&staged.active==='activated'&&staged.waiting==='installed'&&staged.controller==='activated'&&staged.activeControlsPage&&staged.caches.includes(before)&&!!stagedCache,
   JSON.stringify(staged));

  await pg.close();
  await wait(350);
  const peerState=await peer.evaluate(async()=>{
   const registration=await navigator.serviceWorker.getRegistration();
   return{
    active:registration?.active?.state||null,
    waiting:registration?.waiting?.state||null,
    controlledByActive:!!(registration?.active&&navigator.serviceWorker.controller===registration.active),
    caches:await caches.keys()
   };
  });
  S.ok('به‌روزرسانی: بازماندن حتی یک تب، نسخه قبلی و Cache آن را حفظ می‌کند',
   peerState.active==='activated'&&peerState.waiting==='installed'&&peerState.controlledByActive&&peerState.caches.includes(before),
   JSON.stringify(peerState));

  // Once every old client is closed, the browser may activate the waiting worker.
  await peer.close();
  await wait(1800);
  pg=await ctx.newPage();
  await pg.goto(base+'/index.html');
  await pg.waitForFunction(async()=>{
   const registration=await navigator.serviceWorker.getRegistration();
   return registration?.active?.state==='activated'&&!registration.waiting&&!registration.installing&&!!navigator.serviceWorker.controller;
  },null,{timeout:15000}).catch(()=>null);

  let after=[];
  for(let i=0;i<30;i++){
   await wait(300);
   after=await pg.evaluate(()=>caches.keys());
   const own=after.filter(name=>name.startsWith('tatami-'+app+'-'));
   if(own.length===1&&own[0]!==before)break;
  }
  const latest=await pg.evaluate(async()=>{
   const registration=await navigator.serviceWorker.getRegistration();
   return{
    active:registration?.active?.state||null,
    waiting:registration?.waiting?.state||null,
    installing:registration?.installing?.state||null,
    controlled:!!navigator.serviceWorker.controller,
    caches:await caches.keys(),
    updateMarker:document.documentElement.outerHTML.includes('UPDATE_MARKER')
   };
  });
  const ownCaches=latest.caches.filter(name=>name.startsWith('tatami-'+app+'-'));
  S.ok('به‌روزرسانی: Worker جدید پس از بسته‌شدن همه تب‌های قدیمی فعال می‌شود',
   latest.active==='activated'&&!latest.waiting&&!latest.installing&&latest.controlled,
   JSON.stringify(latest));
  S.ok('به‌روزرسانی: فقط Cache نسخه قدیمی همین نقش پاک می‌شود',
   ownCaches.length===1&&ownCaches[0]!==before&&sentinels.every(name=>latest.caches.includes(name)),
   JSON.stringify({before,ownCaches,sentinels,remaining:latest.caches}));
  S.ok('به‌روزرسانی: نسخه تازه در بارگذاری بعدی نمایش داده می‌شود',latest.updateMarker);
  await pg.evaluate(names=>Promise.all(names.map(name=>caches.delete(name))),sentinels);
  altRoot.reset();
 }
 const get=async p=>{const r=await pg.request.get(base+p,{maxRedirects:0});return{s:r.status(),t:await r.text()}};
 let r=await get('/coaches/');
 S.ok('/coaches/ ← صفحه پوششی به فهرست مربیان',r.s===200&&r.t.includes('#/coaches'));
 r=await get('/coaches');
 S.ok('/coaches (بدون اسلش) ← ریدایرکت ۳۰۱ به /coaches/',r.s===301);
 r=await get('/tatamipedia/ippon/');
 S.ok('صفحه پوششی اصطلاح: عنوان/توضیح و Redirect',r.s===200&&r.t.includes('ایپون')&&r.t.includes('og:title')&&r.t.includes('#/tatamipedia/ippon'));
 S.ok('صفحه پوششی بدون SITE_URL: canonical/og:url/og:image ساخته نمی‌شود (دامنه جعل نمی‌شود)',!r.t.includes('canonical')&&!r.t.includes('og:url')&&!r.t.includes('og:image'));
 await ctx.close();
 return S;
}


export async function runClubs(app,base,browser){
 const S=new Suite('Club list/map '+app);
 const ctx=await browser.newContext({viewport:{width:390,height:850},serviceWorkers:'block'});
 const pg=await ctx.newPage();pg.setDefaultTimeout(15000);pg.setDefaultNavigationTimeout(15000);
 const errors=[];
 pg.on('pageerror',e=>errors.push(String(e)));
 await pg.goto(base+'/index.html');
 await wait(250);
 const go=async hash=>{await pg.evaluate(h=>{location.hash=h},hash);await wait(100)};
 const txt=()=>pg.locator('#app').innerText();
 await go('#/clubs');
 const sample=await pg.locator('#tp-club-cards[data-source="sample"] [data-club-id]').count();
 S.ok('داده نمونه: شش کارت با برچسب نمونه',sample===6&&(await txt()).includes('داده‌های نمونه'));
 S.ok('داده نمونه: فیلتر جنسیت و شعاع بدون API غیرفعال‌اند',await pg.locator('#tp-club-gender').isDisabled()&&await pg.locator('#tp-club-radius').isDisabled());
 S.ok('داده نمونه: مختصات و فاصله ساختگی نمایش داده نمی‌شود',!(await pg.locator('#tp-club-cards').innerText()).includes('کیلومتر')&&(await txt()).includes('مختصات جغرافیایی در دادهٔ نمونه ثبت نشده است'));
 const rows=[
  {id:'club-north-women',name:'باشگاه شمال بانوان',city:'تهران',coach_name:'سارا احمدی',description:'تمرین بانوان در شمال تهران',status:'registration_open',gender:'women',student_count:20,schedule:'شنبه و دوشنبه',latitude:35.7201,longitude:51.4001},
  {id:'club-north-men',name:'باشگاه شمال آقایان',city:'تهران',coach_name:'رضا کیانی',description:'تمرین آقایان',status:'active',gender:'men',student_count:15,latitude:35.7202,longitude:51.4001},
  {id:'club-south-women',name:'باشگاه جنوب بانوان',city:'شیراز',coach_name:'مربی نمونه',description:'تمرین شیراز',status:'active',gender:'women',latitude:29.6000,longitude:52.5000},
  {id:'club-north-far',name:'باشگاه شمال دور',city:'تهران',coach_name:'مربی نمونه',description:'بیرون از شعاع پنج کیلومتر',status:'active',gender:'women',latitude:35.8000,longitude:51.4000},
  {id:'club-north-no-coord',name:'باشگاه شمال بدون مختصات',city:'تهران',coach_name:'مربی نمونه',description:'مختصات هنوز ثبت نشده',status:'pending',gender:'women',student_count:8}
 ];
 let status=200,requestUrl='';
 await pg.route('**/__tp_test_api/clubs*',async route=>{
  requestUrl=route.request().url();
  if(status!==200){await route.fulfill({status,contentType:'text/plain',body:'temporarily unavailable'});return}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[...rows,rows[0],{name:'رکورد بدون شناسه',city:'تهران'}]})});
 });
 await pg.evaluate(()=>{window.TP_CLUBS_JSON_URL='/__tp_test_api/clubs';window.TP_NESHAN_WEB_KEY=''});
 const filtered='#/clubs?query='+encodeURIComponent('باشگاه شمال')+'&city='+encodeURIComponent('تهران')+'&gender=women&radius_km=5&lat=35.72&lng=51.4';
 await go(filtered);
 await pg.waitForFunction(()=>document.querySelector('#tp-club-cards')?.dataset.source==='api');
 const selected=await pg.locator('#tp-club-cards [data-club-id]').evaluateAll(es=>es.map(e=>e.dataset.clubId));
 const params=new URL(requestUrl).searchParams;
 S.ok('API بدون Web Key: فهرست همچنان بارگذاری می‌شود',selected.length===1&&selected[0]==='club-north-women'&&(await pg.locator('#tp-club-map-status').innerText()).includes('فهرست باشگاه‌ها دریافت شد'));
 S.ok('فیلتر ترکیبی: جستجو، شهر، جنسیت و شعاع',params.get('query')==='باشگاه شمال'&&params.get('city')==='تهران'&&params.get('gender')==='women'&&params.get('radius_km')==='5'&&params.get('lat')==='35.72'&&params.get('lng')==='51.4');
 S.ok('اعتبارسنجی: شناسه تکراری و رکورد ناقص حذف می‌شوند',(await pg.locator('#tp-club-notes').innerText()).includes('شناسه/نام نامعتبر یا تکراری بودن شناسه'));
 await pg.evaluate(()=>{
  window.TP_NESHAN_WEB_KEY='test-web-key';
  window.L={
   Map:class{constructor(id,options){this.id=id;this.options=options;this._markers=[];window.__tpFakeClubMap=this}remove(){this._removed=true}panTo(point){this._lastPan=point}setView(point,zoom){this._view={point,zoom}}fitBounds(bounds){this._bounds=bounds}invalidateSize(){}},
   marker(point){return{point,addTo(map){this.map=map;map._markers.push(this);return this},bindPopup(html){this.popup=html;return this},openPopup(){return this}}},
   featureGroup(markers){return{getBounds(){return{pad(){return{}}}}}}
  };
 });
 await go('#/clubs?query='+encodeURIComponent('باشگاه شمال')+'&city='+encodeURIComponent('تهران')+'&gender=women');
 await pg.waitForFunction(()=>window.__tpFakeClubMap&&window.__tpFakeClubMap._markers.length===2);
 const cards=await pg.locator('#tp-club-cards[data-source="api"] [data-club-id]').evaluateAll(es=>es.map(e=>e.dataset.clubId));
 const markers=await pg.evaluate(()=>({points:window.__tpFakeClubMap._markers.map(m=>m.point),status:document.getElementById('tp-club-map-status').innerText}));
 S.ok('همگامی فهرست و نقشه: کارت‌ها از پاسخ API',cards.length===3&&cards.includes('club-north-women')&&cards.includes('club-north-far')&&cards.includes('club-north-no-coord')&&!cards.includes('0'));
 S.ok('مختصات: فقط دو رکورد معتبر نشانک می‌گیرند',markers.points.length===2&&markers.status.includes('نشانک روی نقشه نمایش داده شد'));
 await pg.locator('#tp-club-cards [data-club-id="club-north-women"]').hover();
 S.ok('تعامل: انتخاب کارت، نقشه را به مختصات همان باشگاه می‌برد',await pg.evaluate(()=>Array.isArray(window.__tpFakeClubMap._lastPan)&&window.__tpFakeClubMap._lastPan[0]===35.7201));
 S.ok('شهرها: شهرهای API به انتخاب‌گر افزوده می‌شوند',await pg.locator('#tp-club-city option').evaluateAll(es=>es.some(e=>e.value==='شیراز')));
 status=503;
 await go('#/clubs?query='+encodeURIComponent('باشگاه شمال'));
 await pg.waitForFunction(()=>document.querySelector('#tp-club-cards')?.dataset.source==='error');
 S.ok('خطای API: بدون برگشت پنهانی به داده نمونه',await pg.locator('#tp-club-cards [data-club-id]').count()===0&&(await pg.locator('#tp-club-list-status').innerText()).includes('HTTP 503'));
 await go('#/club/0');
 const detail=await txt();
 S.ok('جزئیات نمونه: بدون نشانی یا مختصات جعلی',detail.includes('نشانی دقیق')&&detail.includes('در دادهٔ نمونه ثبت نشده است.'));
 await go('#/clubs');
 for(const width of [320,360,390]){
  await pg.setViewportSize({width,height:850});
  await wait(80);
  const overflow=await pg.evaluate(()=>({yes:document.documentElement.scrollWidth>document.documentElement.clientWidth,viewport:document.documentElement.clientWidth,document:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,id:e.id,cls:String(e.className||'').slice(0,90),left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right),width:Math.round(e.getBoundingClientRect().width),scroll:e.scrollWidth,client:e.clientWidth})).filter(x=>x.width>0&&(x.right>document.documentElement.clientWidth+1||x.left< -1||x.scroll>x.client+2)).slice(0,12)}));
  S.ok('واکنش‌گرایی صفحه باشگاه‌ها در '+width+'px',!overflow.yes,JSON.stringify(overflow));
 }
 S.ok('بدون خطای JavaScript در صفحه باشگاه‌ها',errors.length===0,errors.join(' | '));
 await ctx.close();
 return S;
}

export async function runPreview(base,browser){
 const S=new Suite('Preview: access, account CTA, and 24-product pagination');
 const ctx=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
 const pg=await ctx.newPage();pg.setDefaultTimeout(15000);pg.setDefaultNavigationTimeout(15000);const errors=[];
 pg.on('pageerror',e=>errors.push(String(e).slice(0,140)));
 await pg.addInitScript(()=>localStorage.setItem('role',JSON.stringify('student')));
 await pg.goto(base+'/index.html');await wait(350);
 const freshCtx=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
 const fresh=await freshCtx.newPage();await fresh.goto(base+'/index.html');await wait(250);
 S.ok('بازدیدکننده بدون نقش در صفحه اصلی می‌ماند',await fresh.evaluate(()=>!location.hash||location.hash==='#/'));
 S.ok('بازدیدکننده بدون نقش محتوای خانه را می‌بیند',/نسل جدید تجربه جودو/.test(await fresh.locator('#app').innerText()));
  S.ok('صفحه اصلی عمومی: لینک مربی آنلاین در دسترس است',await fresh.locator('#app a[href="#/online-coach"]').count()>=2);
 await freshCtx.close();
 const go=async h=>{await pg.evaluate(x=>{location.hash=x},h);await wait(100)};
 const T=()=>pg.locator('#app').innerText();
 const cards=()=>pg.locator('#app .sl .pg article.pcd').count();
 await go('#/');
 S.ok('صفحه اصلی در بازدید اول پیام «آماده شروع هستید؟» را دارد',(await T()).includes('آماده شروع هستید؟'));
 S.ok('CTA خانه به ثبت‌نام هدایت می‌کند',await pg.locator('#app .cta a[href="#/register"]').count()===1);
  S.ok('صفحه اصلی Preview: دکمه و کارت مربی آنلاین در دسترس‌اند',await pg.locator('#app a[href="#/online-coach"]').count()>=2);
  S.ok('منوی اصلی Preview: مربی آنلاین مسیر مستقل دارد',await pg.locator('#nv a[href="#/online-coach"]').count()===1);
  S.ok('فوتر Preview: مربی آنلاین به مسیر مستقل می‌رود',await pg.locator('footer a[href="#/online-coach"]').count()===1);
  S.ok('دکمه مربی آنلاین در ابتدای صفحه اصلی قابل مشاهده است',await pg.locator('#app a[href="#/online-coach"]').first().isVisible());
  await go('#/online-coach');
  S.ok('صفحه مربی آنلاین در Preview باز می‌شود',(await T()).includes('روشن کردن دوربین')&&await pg.locator('#tp-oc-video').count()===1);
  await go('#/');
 S.ok('لینک سیستم طراحی از فوتر حذف شده است',await pg.locator('footer a[href="#/design-system"]').count()===0);
 S.ok('لینک انتخاب نوع حساب از فوتر حذف شده است',await pg.locator('footer a[href="#/role"]').count()===0);
 await go('#/design-system');
 S.ok('مسیر مستقیم سیستم طراحی به ۴۰۴ می‌رسد',/۴۰۴/.test(await T()));
 S.ok('کد صفحه سیستم طراحی در خروجی عمومی Preview بارگذاری نشده است',
   !await pg.evaluate(()=>[...document.scripts].map(s=>s.textContent).join('\n').includes('راهنمای زنده توکن‌ها')));
 await go('#/role');
 S.ok('مسیر مستقیم انتخاب نوع حساب به ۴۰۴ می‌رسد',/۴۰۴/.test(await T()));
 S.ok('کد صفحه انتخاب نوع حساب از خروجی Preview حذف شده است',
   !await pg.evaluate(()=>[...document.scripts].map(s=>s.textContent).join('\n').includes('نوع حساب خود را انتخاب کنید')));
 await go('#/dashboard');
 S.ok('لینک تغییر نوع حساب از داشبورد حذف شده است',await pg.locator('#app a[href="#/role"]').count()===0);
 await go('#/');
 await go('#/my-profile');
 S.ok('بخش پروفایل مربی به مسیر حذف‌شده لینک نمی‌دهد',
   await pg.locator('#app a[href="#/role"]').count()===0&&await pg.locator('#app a[href="#/profile"]').count()===1);
 await go('#/');
 await go('#/store');
 S.ok('صفحه اول فروشگاه دقیقاً ۲۴ محصول دارد',await cards()===24,String(await cards()));
 S.ok('صفحه‌بندی سه‌صفحه‌ای برای ۶۲ محصول ساخته شده است',
   await pg.locator('#app .tp-pager button[aria-label^="صفحه "]').count()===5);
 await pg.locator('#app .tp-pager button[aria-label="صفحه ۲"]').click();await wait(140);
 S.ok('صفحه دوم ۲۴ محصول دارد',await cards()===24,String(await cards()));
 S.ok('شماره صفحه در URL ثبت می‌شود',(await pg.evaluate(()=>location.hash)).includes('page=2'));
 await pg.locator('#app .tp-pager button[aria-label="صفحه ۳"]').click();await wait(140);
 S.ok('صفحه سوم ۱۴ محصول دارد',await cards()===14,String(await cards()));
 S.ok('صفحه سوم در URL قابل اشتراک است',(await pg.evaluate(()=>location.hash)).includes('page=3'));
 await pg.locator('.tb select').selectOption('price_asc');await wait(140);
 S.ok('مرتب‌سازی در URL حفظ می‌شود',(await pg.evaluate(()=>location.hash)).includes('sort=price_asc'));
 await pg.locator('.cn .chip',{hasText:'کمربند جودو'}).first().click();await wait(140);
 S.ok('تغییر فیلتر صفحه را به ۱ برمی‌گرداند و فیلتر حفظ می‌شود',
   await cards()===10&&(await pg.evaluate(()=>location.hash)).includes('category=')&&!(await pg.evaluate(()=>location.hash)).includes('page=2'));
 await go('#/register?role=club');
 S.ok('ثبت‌نام: سه نوع حساب در رابط نمایش داده می‌شوند',await pg.locator('#rg-f .tp-role-card').count()===3);
 S.ok('ثبت‌نام: حساب باشگاه فقط پیش‌نمایش است و دکمه ساخت حساب را غیرفعال می‌کند',await pg.locator('#rg-f').getAttribute('data-role-preview')==='club'&&await pg.locator('#rg-f button[type=submit]').isDisabled()&&(await T()).includes('در حال حاضر ساخت حساب باشگاه از این فرم امکان‌پذیر نیست'));
 await pg.locator('#rg-f input[name=role][value=student]').check();
 S.ok('ثبت‌نام: انتخاب هنرجو حالت فعال را برمی‌گرداند',await pg.locator('#rg-f button[type=submit]').isEnabled()&&await pg.locator('#rg-f').getAttribute('data-role-preview')==='');
 await pg.setViewportSize({width:390,height:850});await go('#/register');
 S.ok('ثبت‌نام موبایل: مرحله اول فرم نمایش داده می‌شود',await pg.locator('#rg-f').getAttribute('data-mobile-steps')==='true'&&await pg.locator('#rg-f [data-auth-step="2"]').isHidden());
 await pg.locator('#rg-u').fill('mobile-preview-user');
 const beforeStep=await pg.evaluate(()=>({username:document.querySelector('#rg-u')?.value,formUsername:document.querySelector('#rg-f')?.elements.username?.value,mobile:document.querySelector('#rg-f')?.dataset.mobileSteps,step:document.querySelector('#rg-f')?.dataset.step}));
 await pg.locator('#rg-f [data-auth-next]').click();
 const afterStep=await pg.evaluate(()=>({username:document.querySelector('#rg-u')?.value,mobile:document.querySelector('#rg-f')?.dataset.mobileSteps,step:document.querySelector('#rg-f')?.dataset.step,errors:[...document.querySelectorAll('#rg-f [aria-invalid=true]')].map(x=>x.id)}));
 S.ok('ثبت‌نام موبایل: پس از ادامه، مرحله گذرواژه نمایش داده می‌شود',afterStep.step==='2'&&await pg.locator('#rg-f [data-auth-step="2"]').isVisible(),JSON.stringify({beforeStep,afterStep}));
 if(afterStep.step==='2')await pg.locator('#rg-f [data-auth-back]').click();
 await pg.setViewportSize({width:1280,height:900});await go('#/register');
 S.ok('ثبت‌نام دسکتاپ: هر دو بخش فرم هم‌زمان در دسترس‌اند',await pg.locator('#rg-f [data-auth-step="1"]').isVisible()&&await pg.locator('#rg-f [data-auth-step="2"]').isVisible());
 const username='previewqa'+Date.now().toString(36);
 await pg.fill('#rg-u',username);await pg.fill('#rg-p1','TatamiPlus!Preview2026');await pg.fill('#rg-p2','TatamiPlus!Preview2026');
 await pg.locator('#rg-f button[type="submit"]').click();
 await pg.waitForFunction(()=>location.hash==='#/profile',{timeout:6000});await go('#/');
 S.ok('پس از ثبت‌نام پیام پایانی دیگر نمایش داده نمی‌شود',!(await T()).includes('آماده شروع هستید؟'));
 await pg.evaluate(()=>doLogout());await wait(120);await go('#/');
 S.ok('پس از خروج هم پیام ثبت‌نام‌شده دوباره ظاهر نمی‌شود',!(await T()).includes('آماده شروع هستید؟'));
 await pg.reload();await wait(300);
 S.ok('مخفی‌ماندن پیام پس از بارگذاری مجدد پایدار است',!(await T()).includes('آماده شروع هستید؟'));
 
 const previewMobileRoutes=['#/','#/login','#/register','#/coaches','#/coaches/sara-ahmadi','#/sponsors','#/tatamipedia','#/tatamipedia/ippon','#/blog','#/blog/uchi-mata-basics','#/store','#/product/0','#/cart','#/tournaments','#/tournament/1','#/videos','#/video/3','#/academy','#/instructor/0','#/dashboard','#/profile','#/ai','#/clubs','#/club/0','#/gems','#/search','#/courses','#/courses/judo-foundations','#/episode/judo-foundations-lesson-1'];
 const mobileOverflow=[];
 for(const width of [320,360,390]){
  await pg.setViewportSize({width,height:850});
  for(const route of previewMobileRoutes){
   await pg.evaluate(hash=>{location.hash=hash},route);
   await wait(35);
   const state=await pg.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,viewport:document.documentElement.clientWidth,document:document.documentElement.scrollWidth}));
   if(state.overflow)mobileOverflow.push(width+route+' ('+state.viewport+'/'+state.document+')');
  }
 }
 S.ok('واکنش‌گرایی Preview در ۲۹ مسیر و سه عرض موبایل',mobileOverflow.length===0,mobileOverflow.slice(0,8).join(' | '));
S.ok('بدون خطای JavaScript در سناریوی Preview',errors.length===0,errors.join(' | '));
 await ctx.close();return S;
}
