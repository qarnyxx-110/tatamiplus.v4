Object.assign(views,{
'':()=>`<section class="hero"><div class="w"><h1>نسل جدید تجربه جودو</h1><h2 class="gold" style="font-size:var(--tp-font-size-2xl)">جودو را یاد بگیر، هوشمندانه تمرین کن، حرفه‌ای‌تر پیشرفت کن.</h2><p class="mu">دوره‌های آموزشی، رقابت‌ها، تجهیزات جودو و خدمات تخصصی؛ همه در یک پلتفرم.</p><a class="btn" href="#/courses">مشاهده دوره‌ها</a> <a class="btn o" href="#/dashboard">مشاهده امکانات</a></div></section>${homeIntro()}
<section class="tp-techniques" aria-labelledby="tp-techniques-title">
  <div class="tp-techniques-head">
    <div class="tp-techniques-heading-copy">
      <span class="tp-techniques-eyebrow">JUDO FUNDAMENTALS · مبانی جودو</span>
      <h2 id="tp-techniques-title">سه فن شناخته‌شده جودو</h2>
      <p>با ساختار و نکته کلیدی هر فن آشنا شوید؛ تصویرها نمودارهای آموزشی اختصاصی‌اند و حرکت را به‌صورت شماتیک نشان می‌دهند.</p>
    </div>
    <span class="tp-techniques-count"><b>۳</b><span>فن آموزشی</span></span>
  </div>
  <div class="tp-technique-grid">
    <article class="tp-technique-card">
      <div class="tp-technique-visual">
        <img src="assets/images/judo/uchi-mata.svg" alt="نمودار آموزشی فن اوچی‌ماتا؛ جودوکار سفید با پای داخلی، حریف آبی را از تعادل خارج می‌کند" width="640" height="360" fetchpriority="high" decoding="async">
        <span class="tp-technique-visual-label">نمای شماتیک حرکت</span>
      </div>
      <div class="tp-technique-copy">
        <div class="tp-technique-title-row"><span class="tp-technique-number">۰۱</span><div><h3>اوچی‌ماتا</h3><span class="tp-technique-latin">UCHI MATA</span></div></div>
        <p class="tp-technique-description">پرتاب با درو کردن بخش داخلی ران حریف؛ اجرای درست به برهم‌زدن تعادل، ورود نزدیک و چرخش هماهنگ لگن و پا وابسته است.</p>
        <div class="tp-technique-tip"><b>نکته فنی</b><span>ابتدا تعادل حریف را به جلو و گوشه هدایت کنید؛ سپس پای دروگر را از داخل وارد کنید.</span></div>
      </div>
    </article>
    <article class="tp-technique-card">
      <div class="tp-technique-visual">
        <img src="assets/images/judo/seoi-nage.svg" alt="نمودار آموزشی فن سئوی‌ناگه؛ جودوکار سفید پس از چرخش و خم‌کردن زانوها، حریف آبی را روی شانه هدایت می‌کند" width="640" height="360" loading="lazy" decoding="async">
        <span class="tp-technique-visual-label">نمای شماتیک حرکت</span>
      </div>
      <div class="tp-technique-copy">
        <div class="tp-technique-title-row"><span class="tp-technique-number">۰۲</span><div><h3>سئوی‌ناگه</h3><span class="tp-technique-latin">SEOI NAGE</span></div></div>
        <p class="tp-technique-description">پرتاب از روی شانه؛ با چرخش پشت به حریف، خم‌کردن زانوها و حفظ کنترل آستین و بالاتنه، حریف روی شانه و پشت قرار می‌گیرد.</p>
        <div class="tp-technique-tip"><b>نکته فنی</b><span>ورود باید نزدیک و متعادل باشد؛ بارگیری حریف با پاها انجام می‌شود، نه با خم‌کردن تنهاِ کمر.</span></div>
      </div>
    </article>
    <article class="tp-technique-card">
      <div class="tp-technique-visual">
        <img src="assets/images/judo/osoto-gari.svg" alt="نمودار آموزشی فن اوسوتو‌گاری؛ جودوکار سفید با پای بیرونی، پای تکیه‌گاه حریف آبی را درو می‌کند" width="640" height="360" loading="lazy" decoding="async">
        <span class="tp-technique-visual-label">نمای شماتیک حرکت</span>
      </div>
      <div class="tp-technique-copy">
        <div class="tp-technique-title-row"><span class="tp-technique-number">۰۳</span><div><h3>اوسوتو‌گاری</h3><span class="tp-technique-latin">OSOTO GARI</span></div></div>
        <p class="tp-technique-description">دروگر بزرگ بیرونی؛ با هدایت حریف به عقب و خارج‌کردن تعادل، پای بیرونی از پشت پای تکیه‌گاه او درو می‌شود.</p>
        <div class="tp-technique-tip"><b>نکته فنی</b><span>تماس بالاتنه و جهت هدایت حریف را حفظ کنید؛ حرکت پا و دست‌ها باید هماهنگ باشد.</span></div>
      </div>
    </article>
  </div>
  <p class="tp-techniques-note">این نمودارها برای معرفی مفاهیم پایه‌اند؛ اجرای فنون را با رعایت ایمنی و زیر نظر مربی واجد صلاحیت تمرین کنید.</p>
</section>
<div class="w"><h2>امکانات پلتفرم</h2><div class="grid">${[['فروشگاه','#/store','تجهیزات جودو'],['خدمات تخصصی','#/specialist-services','مربیان تغذیه، کلینیک‌های ورزشی و روان‌شناسی ورزشی'],['تورنمنت‌ها','#/tournaments','برنامه و نتایج'],['آنالیز هوش مصنوعی','#/ai','نسخه نمایشی تحلیل حرکت'],['آکادمی اساتید','#/academy','مربیان و دوره‌ها'],['باشگاه‌ها','#/clubs','باشگاه‌های جودو'],['بلاگ','#/blog','مقاله‌های آموزشی']].filter(f=>allowed(f[1].slice(2))).map(f=>`<a class="card b" href="${f[1]}"><b class="gold">${f[0]}</b><div class="mu">${f[2]}</div></a>`).join('')}</div></div>`+homeMore(),
dashboard:()=>{const r=RN[role]?role:'student';return`<div class="d-l"><aside class="d-sb"><a class="d-lg" href="#/">تاتامی پلاس</a><nav class="d-n" aria-label="بخش‌های داشبورد ${RN[r]}">${SB[r].map((x,i)=>`<button type="button" data-t="${x[0]}" aria-current="${i==0}" onclick="go('${x[0]}')">${x[1]}</button>`).join('')}</nav></aside><div class="d-m"><header class="d-h"><div><h1>${HD[r][0]}</h1><p class="mu" style="margin:var(--tp-space-2xs) 0 0">${HD[r][1]}</p></div><div class="d-acc"><span class="d-av" aria-hidden="true">${RN[r][0]}</span><div><b>حساب ${RN[r]}</b><div class="mu sm">اطلاعات حساب کاربری</div></div></div></header><p class="tp-note" role="note">داشبوردها هنوز در بک‌اند پیاده نشده‌اند؛ اعداد، کلاس‌ها و فهرست‌های این صفحه نمونه‌اند و پس از اتصال بک‌اند واقعی می‌شوند.</p>${BODY[r]()}</div></div>`},
search:()=>searchView(),
});
// جستجوی سراسری: فروشگاه، مربیان، مقاله‌ها و باشگاه‌ها (فقط بخش‌های مجاز همین اپ)
let SQ='';
function searchSet(v){setHashParams({q:v});R('sq')}
function searchAll(k){if(k==='store')location.hash='#/store?query='+encodeURIComponent(SQ)}
function searchView(){const raw=(hashParams().get('q')||'').slice(0,80),n=nz(raw);SQ=raw;PT={t:'جستجو',d:'جستجو در فروشگاه، مربیان، مقاله‌ها و باشگاه‌ها'};
 const has=t=>nz(t).includes(n),eq=encodeURIComponent(raw),G=[];
 if(n){
  if(allowed('store'))G.push(['محصولات',P.filter(p=>has(p.n+' '+p.c)).map(p=>[`#/product/${p.id}`,p.n,p.c]),`<button type="button" class="btn o s" onclick="searchAll('store')">همه در فروشگاه</button>`]);
  if(allowed('coaches'))G.push(['مربیان',COACHES.filter(c=>has([c.firstName,c.lastName,c.level,c.academySpecialty,...(c.specialties||[])].join(' '))).map(c=>[`#/coaches/${encodeURIComponent(c.slug)}`,c.firstName+' '+c.lastName,(c.specialties||[]).join('، ')]),`<a class="btn o s" href="#/coaches?q=${eq}">همه در مربیان</a>`]);
  if(allowed('blog'))G.push(['مقاله‌ها',BL.filter(b=>has([b.t,b.x,b.c].join(' '))).map(b=>[bLink(b),b.t,b.c||'']),`<a class="btn o s" href="#/blog?q=${eq}">همه در بلاگ</a>`]);
  if(allowed('clubs'))G.push(['باشگاه‌ها',CB.map((c,i)=>[`#/club/${i}`,c[0],c[1],c[4]]).filter(c=>has(c.join(' '))).map(c=>c.slice(0,3)),'']);
 }
 const hit=G.filter(g=>g[1].length),total=hit.reduce((a,g)=>a+g[1].length,0);
 const sug=['اوچی‌ماتا','کیمونو','کمربند','ایپون','سارا احمدی','تهران'].map(t=>`<button type="button" class="chip" onclick="searchSet('${t}')">${t}</button>`).join('');
 const row=r=>`<a class="rec" href="${r[0]}"><b>${esc(r[1])}</b>${r[2]?`<span>${esc(r[2])}</span>`:''}</a>`;
 return`<div class="w"><h1>جستجو</h1><p class="mu">در فروشگاه، مربیان، مقاله‌ها${allowed('clubs')?' و باشگاه‌ها':''}.</p>
 <div class="sbar" role="search"><label class="sr" for="sq">جستجو در کل سایت</label><input id="sq" type="search" placeholder="نام فن، محصول، مربی یا مقاله..." value="${esc(raw)}" oninput="searchSet(this.value)" autocomplete="off"></div>
 ${!n?`<p class="mu sm">پیشنهاد جستجو:</p><div class="chips">${sug}</div>`:`<p><b aria-live="polite">${total?F(total)+' نتیجه برای «'+esc(raw)+'»':'نتیجه‌ای برای «'+esc(raw)+'» پیدا نشد'}</b></p>`}
 ${n&&!total?`<div class="tp-state"><b>نتیجه‌ای پیدا نشد</b><p>املای کلمه را بررسی کنید یا عبارت کوتاه‌تری بنویسید. نام فن‌ها را می‌توانید فارسی، ژاپنی یا لاتین جستجو کنید.</p><div class="chips" style="justify-content:center">${sug}</div></div>`:''}
 ${hit.map(g=>`<section class="d-s" aria-label="${g[0]}"><h2>${g[0]} <span class="mu sm">(${F(g[1].length)})</span></h2>${g[1].slice(0,5).map(row).join('')}${g[1].length>5&&g[2]?`<div class="tp-cluster" style="margin-top:var(--tp-space-sm)">${g[2]}</div>`:''}</section>`).join('')}</div>`}
