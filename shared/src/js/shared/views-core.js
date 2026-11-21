Object.assign(views,{
'':()=>`<section class="hero"><div class="w"><h1>نسل جدید تجربه جودو</h1><h2 class="gold" style="font-size:var(--tp-font-size-2xl)">جودو را یاد بگیر، هوشمندانه تمرین کن، حرفه‌ای‌تر پیشرفت کن.</h2><p class="mu">آموزش تخصصی، پخش زنده، تجهیزات جودو و تحلیل هوشمند حرکت؛ همه در یک پلتفرم.</p><a class="btn" href="#/courses">ورود به باشگاه مجازی</a> <a class="btn o" href="#/dashboard">مشاهده امکانات</a> ${(!APP.fixed||APP.role==='student')?'<a class="btn o" href="#/online-coach">مربی آنلاین</a>':''}</div></section>${homeIntro()}
<section class="cine" id="cine"><div class="stk">${[['اوچی‌ماتا','UCHI MATA','پرتاب با ران داخلی؛ تعادل و چرخش لگن.',150,'uchi-mata','اجرای فن اوچی‌ماتا در جودو: جودوکا با گی سفید، ران داخلی و گرفتن یقه و آستین حریف را بلند می‌کند'],['سئوی‌ناگه','SEOI NAGE','پرتاب از روی شانه؛ ورود عمیق و کنترل آستین.',200,'seoi-nage','اجرای فن سئوی‌ناگه در جودو: جودوکا با ورود عمیق و کنترل آستین، حریف را از روی شانه پرتاب می‌کند'],['اوسوتو‌گاری','OSOTO GARI','دروگر بیرونی؛ انتقال وزن و ضربه پا.',30,'osoto-gari','اجرای فن اوسوتو‌گاری در جودو: جودوکا با ضربه پای بیرونی و انتقال وزن حریف را به عقب می‌اندازد']].map(s=>`<div class="sc"><div><h2>${s[0]} — ${s[1]}</h2><p class="mu">${s[2]}</p></div>${ph(s[3],s[1],'r169'+(s[4]=='uchi-mata'?' eager':''),'judo/'+s[4]+'.jpg',s[5])}</div>`).join('')}</div></section>
<div class="w"><h2>امکانات پلتفرم</h2><div class="grid">${[['فروشگاه','#/store','تجهیزات جودو'],...((!APP.fixed||APP.role==='student')?[['مربی آنلاین','#/online-coach','تمرین آنلاین و ابزارهای تحلیل حرکت']]:[]),['باشگاه مجازی','#/courses','دوره‌های آموزشی و ویدیوهای ضبط‌شده'],['تورنمنت‌ها','#/tournaments','برنامه و نتایج مسابقات'],['مربیان','#/coaches','فهرست مربیان و پروفایل‌های آموزشی'],['باشگاه‌ها','#/clubs','باشگاه‌های جودو'],['وبلاگ','#/blog','مقاله‌ها و دانشنامه جودو']].filter(f=>allowed(f[1].slice(2))).map(f=>`<a class="card b" href="${f[1]}"><b class="gold">${f[0]}</b><div class="mu">${f[2]}</div></a>`).join('')}</div></div>`+homeMore(),
dashboard:()=>{const r=RN[role]?role:'student';return`<div class="d-l"><aside class="d-sb"><a class="d-lg" href="#/">تاتامی پلاس</a><nav class="d-n" aria-label="بخش‌های داشبورد ${RN[r]}">${SB[r].map((x,i)=>`<button type="button" data-t="${x[0]}" aria-current="${i==0}" onclick="go('${x[0]}')">${x[1]}</button>`).join('')}</nav></aside><div class="d-m"><header class="d-h"><div><h1>${HD[r][0]}</h1><p class="mu" style="margin:var(--tp-space-2xs) 0 0">${HD[r][1]}</p></div><div class="d-acc"><span class="d-av" aria-hidden="true">${RN[r][0]}</span><div><b>حساب ${RN[r]}</b><div class="mu sm">اطلاعات حساب کاربری</div></div></div></header><p class="tp-note" role="note">داشبوردها هنوز در بک‌اند پیاده نشده‌اند؛ اعداد، کلاس‌ها و فهرست‌های این صفحه نمونه‌اند و پس از اتصال بک‌اند واقعی می‌شوند.</p>${BODY[r]()}</div></div>`},
search:()=>searchView(),
});
// جستجوی سراسری: فروشگاه، مربیان، مقاله‌ها، تاتامی‌پدیا، ویدیوها و باشگاه‌ها (فقط بخش‌های مجاز همین اپ)
let SQ='',searchExpanded='';
function searchSet(v){searchExpanded='';setHashParams({q:v});R('sq')}
function searchAll(k){
 if(k==='store'){location.hash='#/store?query='+encodeURIComponent(SQ);return}
 if(k==='blog'||k==='virtual-club'){searchExpanded=searchExpanded===k?'':k;R()}
}
function searchExpandButton(key,total){
 return `<button type="button" class="btn o s" data-search-expand="${key}" aria-expanded="${searchExpanded===key}" onclick="searchAll('${key}')">${searchExpanded===key?'نمایش پنج نتیجه نخست':'نمایش همه '+F(total)+' نتیجه'}</button>`;
}
function searchView(){const raw=(hashParams().get('q')||'').slice(0,80),n=nz(raw);SQ=raw;PT={t:'جستجو',d:'جستجو در فروشگاه، مربیان، وبلاگ، باشگاه مجازی و باشگاه‌ها'};
 const has=t=>nz(t).includes(n),eq=encodeURIComponent(raw),G=[],liveSearchTargets=[];
 const isLiveDjangoPreview=['tatamiplus.ir','www.tatamiplus.ir'].includes(location.hostname.toLowerCase())&&(location.pathname==='/preview/'||location.pathname==='/preview');
 if(n){
  if(allowed('store')){
   if(isLiveDjangoPreview)liveSearchTargets.push([`#/store?query=${eq}`,'جست‌وجو در فروشگاه واقعی','فقط محصولات فعال، قیمت فروش و موجودی ثبت‌شده در Django']);
   else G.push(['محصولات',P.filter(p=>has(p.n+' '+p.c)).map(p=>[`#/product/${p.id}`,p.n,p.c]),`<button type="button" class="btn o s" onclick="searchAll('store')">همه در فروشگاه</button>`]);
  }
  if(allowed('coaches')){
   if(isLiveDjangoPreview)liveSearchTargets.push(['#/coaches','فهرست مربیان تأییدشده','فقط پروفایل‌های عمومی و منتشرشده در Django؛ داده نمونه محلی نمایش داده نمی‌شود']);
   else G.push(['مربیان',COACHES.filter(c=>has([c.firstName,c.lastName,c.level,c.academySpecialty,...(c.specialties||[])].join(' '))).map(c=>[`#/coaches/${encodeURIComponent(c.slug)}`,c.firstName+' '+c.lastName,(c.specialties||[]).join('، ')]),`<a class="btn o s" href="#/coaches?q=${eq}">همه در مربیان</a>`]);
  }
  if(allowed('blog')){
   const articleHits=isLiveDjangoPreview?[]:BL.filter(b=>has([b.t,b.x,b.c].join(' '))).map(b=>[bLink(b),b.t,b.c||'مقاله']);
   const blogHits=[
    ...articleHits,
    ...TPD.terms.filter(t=>t.status!=='draft'&&has([t.nameFa,t.nameJa,t.romaji,t.meaning].join(' '))).map(t=>[`#/tatamipedia/${encodeURIComponent(t.slug)}`,t.nameFa,isLiveDjangoPreview?'دانشنامه محلی · تاتامی‌پدیا':[t.romaji,t.meaning].filter(Boolean).join(' · ')])
   ];
   G.push(['وبلاگ',blogHits,searchExpandButton('blog',blogHits.length),'blog']);
   if(isLiveDjangoPreview)liveSearchTargets.push(['#/blog','مطالب منتشرشدهٔ وبلاگ','جست‌وجوی سمت سرور وبلاگ هنوز قرارداد ندارد؛ این پیوند فهرست واقعی Django را باز می‌کند']);
  }
  if(allowed('videos')){
   const courses=typeof TP_DEMO_COURSES!=='undefined'&&Array.isArray(TP_DEMO_COURSES)?TP_DEMO_COURSES:[];
   const courseHits=courses.filter(c=>has([c.title,c.level,c.description,...(c.lessons||[]).flatMap(x=>[x.title,x.summary])].join(' '))).map(c=>[`#/courses/${encodeURIComponent(c.slug)}`,c.title,c.level+' · دوره نمونه']);
   const videoHits=V.filter(v=>has(v.t+' '+v.c)).map(v=>[`#/video/${v.id}`,v.t,'ویدیوی نمونه · '+v.c+' · '+v.l]);
   const clubHits=[...courseHits,...videoHits];
   G.push(['باشگاه مجازی',clubHits,searchExpandButton('virtual-club',clubHits.length),'virtual-club']);
  }
  if(allowed('clubs')){
   const clubHits=CB.filter(c=>has([c.n,c.city,c.s,c.ds].join(' '))).map(c=>[`#/club/${c.id}`,c.n,(isLiveDjangoPreview?'داده نمونه · ':'')+c.city]);
   G.push(['باشگاه‌ها',clubHits,'']);
  }
 }
 const hit=G.filter(g=>g[1].length),total=hit.reduce((a,g)=>a+g[1].length,0);
 const suggestions=isLiveDjangoPreview?['اوچی‌ماتا','کیمونو','کمربند','ایپون','تهران']:['اوچی‌ماتا','کیمونو','کمربند','ایپون','سارا احمدی','تهران'];
 const sug=suggestions.map(t=>`<button type="button" class="chip" onclick="searchSet('${t}')">${t}</button>`).join('');
 const row=r=>`<a class="rec" href="${r[0]}"><b>${esc(r[1])}</b>${r[2]?`<span>${esc(r[2])}</span>`:''}</a>`;
 const resultLabel=total?F(total)+' نتیجه برای «'+esc(raw)+'»':liveSearchTargets.length?'در داده‌های محلی نتیجه‌ای پیدا نشد؛ بخش‌های متصل به سامانه را بررسی کنید.':'نتیجه‌ای برای «'+esc(raw)+'» پیدا نشد';
 return`<div class="w"><h1>جستجو</h1><p class="mu">در فروشگاه، مربیان، وبلاگ، باشگاه مجازی${allowed('clubs')?' و باشگاه‌ها':''}.</p>${['tatamiplus.ir','www.tatamiplus.ir'].includes(location.hostname.toLowerCase())&&(location.pathname==='/preview/'||location.pathname==='/preview')?'<p class="mu sm">مقاله‌های منتشرشدهٔ وبلاگ مستقیماً از Django دریافت می‌شوند؛ این جستجو فقط دانشنامهٔ محلی را بررسی می‌کند.</p>':''}
 <div class="sbar" role="search"><label class="sr" for="sq">جستجو در کل سایت</label><input id="sq" type="search" placeholder="نام فن، محصول، مربی یا مقاله..." value="${esc(raw)}" oninput="searchSet(this.value)" autocomplete="off"></div>
 ${!n?`<p class="mu sm">پیشنهاد جستجو:</p><div class="chips">${sug}</div>`:`<p><b aria-live="polite">${resultLabel}</b></p>`}
 ${n&&!total&&!liveSearchTargets.length?`<div class="tp-state"><b>نتیجه‌ای پیدا نشد</b><p>املای کلمه را بررسی کنید یا عبارت کوتاه‌تری بنویسید. نام فن‌ها را می‌توانید فارسی، ژاپنی یا لاتین جستجو کنید.</p><div class="chips" style="justify-content:center">${sug}</div></div>`:''}
 ${hit.map(g=>`<section class="d-s" aria-label="${g[0]}"><h2>${g[0]} <span class="mu sm">(${F(g[1].length)})</span></h2>${g[1].slice(0,g[3]&&searchExpanded===g[3]?g[1].length:5).map(row).join('')}${g[1].length>5&&g[2]?`<div class="tp-cluster" style="margin-top:var(--tp-space-sm)">${g[2]}</div>`:''}</section>`).join('')}
 ${liveSearchTargets.length?`<section class="d-s" aria-label="دسترسی به داده‌های واقعی"><h2>بخش‌های متصل به سامانه</h2>${liveSearchTargets.map(row).join('')}</section>`:''}</div>`}
