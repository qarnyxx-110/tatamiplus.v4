// پورتفوی مربی (#/instructor/<id>): عکس، نام، کمربند و دان، ستاره، تعداد شاگرد، رتبه‌ها،
// کارنامه (کمربند، پیشرفت، رکورد روزانه، نمره آزمون‌ها)، امتیازها و مستر کلاس‌ها.
// داده از COACHES[i].portfolio (data/coaches.json) می‌آید؛ نمونه است و باید با داده بک‌اند جایگزین شود.
const pfGo=id=>{const e=document.getElementById(id);if(e)e.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'})};
const pfBelt=(b,dan,label,cls='')=>`<span class="tp-belt ${cls}"><span class="tp-belt-bar tp-belt-${b}" aria-hidden="true">${b==='black'&&dan?'<span class="tp-belt-tip"></span>':''}</span>${label}</span>`;
const pfStars=(r,n)=>`<span class="pf-stars" role="img" aria-label="امتیاز ${F(r)} از ۵ بر پایه ${F(n)} نظر"><span class="pf-stars-bg" aria-hidden="true">★★★★★<span class="pf-stars-fg" style="width:${(r/5*100).toFixed(1)}%">★★★★★</span></span><b aria-hidden="true">${F(r)}</b><span class="mu sm" aria-hidden="true">(${F(n)} نظر)</span></span>`;
const pfGrade=s=>s>=90?['عالی','ok']:s>=80?['خیلی خوب','g']:['خوب','m'];
const pfMc={open:['ثبت‌نام باز','ok'],full:['ظرفیت تکمیل','lo'],done:['برگزارشده','m']};
const pfSec=(id,t,sub,body)=>`<section class="d-s pf-sec" id="${id}" aria-labelledby="${id}-t"><h2 id="${id}-t">${t}</h2>${sub?`<p class="mu pf-sub">${sub}</p>`:''}${body}</section>`;

function pfDaily(d){
 const days=d.length,on=d.filter(x=>x>0),mins=on.reduce((a,b)=>a+b,0);let best=0,cur=0;for(const x of d){cur=x>0?cur+1:0;best=Math.max(best,cur)}
 const lv=x=>x===0?0:x<=45?1:x<=75?2:x<=90?3:4,labels=['بدون تمرین','تا ۴۵ دقیقه','تا ۷۵ دقیقه','تا ۹۰ دقیقه','بیش از ۹۰ دقیقه'],hrs=Math.round(mins/60);
 const sum=`${F(on.length)} روز تمرین در ${F(days/7)} هفته اخیر، مجموع ${F(hrs)} ساعت، بیشترین پیوستگی ${F(best)} روز`;
 return`<div class="pf-heat-wrap"><div class="pf-heat" role="img" aria-label="${sum}">${d.map((x,k)=>`<i class="l${lv(x)}" title="${F(days-k)} روز پیش: ${x?F(x)+' دقیقه':'بدون تمرین'}"></i>`).join('')}</div>
 <div class="pf-heat-ax mu sm" aria-hidden="true"><span>${F(days/7)} هفته پیش</span><span>امروز</span></div>
 <div class="pf-legend mu sm" aria-hidden="true"><span>کمتر</span>${[0,1,2,3,4].map(k=>`<i class="l${k}" title="${labels[k]}"></i>`).join('')}<span>بیشتر</span></div></div>
 <dl class="pf-mini"><div><dt>روزهای تمرین</dt><dd>${F(on.length)}</dd></div><div><dt>مجموع ساعت</dt><dd>${F(hrs)}</dd></div><div><dt>بیشترین پیوستگی</dt><dd>${F(best)} روز</dd></div><div><dt>میانگین هر جلسه</dt><dd>${F(Math.round(mins/Math.max(1,on.length)))} دقیقه</dd></div></dl>`}

function instructorView(i){
 const x=I[i],co=x&&COACHES[x.id];if(!x||!co)return nfp('مربی‌ای پیدا نشد','#/academy','مشاهده آکادمی');
 const pf=co.portfolio||{},c=CB[x.club],vs=V.filter(v=>v.i==x.id),ar=BL.filter(b=>b.a==x.id),dan=pf.dan||0,beltLabel=dan?`کمربند مشکی · دان ${F(dan)}`:'کمربند مشکی';
 const pts=pf.points||{},ptTotal=(pts.ranking||0)+(pts.teaching||0)+(pts.feedback||0),ranks=pf.ranks||[],mcs=pf.masterclasses||[],exams=pf.exams||[],hist=pf.beltHistory||[],nd=pf.nextDan;
 PT={t:x.n+' — پورتفوی مربی',d:`پورتفوی ${x.n}: ${beltLabel}، ${F(x.st)} شاگرد، رتبه‌ها و مستر کلاس‌ها.`};
 const kpi=(v,l)=>`<div class="pf-kpi"><b>${v}</b><span>${l}</span></div>`;
 const nav=[['pf-card','کارنامه'],['pf-ranks','رتبه‌ها'],['pf-points','امتیازها'],['pf-mc','مستر کلاس‌ها']];

 const hero=`<header class="pf-hero">
  <div class="pf-id">${ph(x.h,'عکس مربی','pf-av eager',co.photo,'عکس '+x.n)}<div class="pf-who"><p class="pf-kick">${esc(co.level||'مربی')} · ${esc(x.s)}</p><h1>${x.n}</h1>
   <div class="pf-tags">${pfBelt('black',dan,beltLabel,'pf-belt-lg')}${pf.rating?pfStars(pf.rating,pf.reviews||0):''}</div>
   <p class="mu pf-club">باشگاه: ${allowed('club')?`<a href="#/club/${c.id}">${c.n}</a>`:`<b>${c.n}</b>`}</p></div></div>
  <div class="pf-kpis">${kpi(F(x.st),'شاگرد')}${kpi(F(x.exp)+' سال','سابقه مربیگری')}${kpi(F(ptTotal),'امتیاز کل')}${kpi(F(ranks.length),'رتبه کسب‌شده')}</div>
  <div class="pf-cta"><button type="button" class="btn" onclick="pfGo('pf-mc')">مشاهده مستر کلاس‌ها</button>${co.slug&&allowed('coaches')?`<a class="btn o" href="#/coaches/${encodeURIComponent(co.slug)}">پروفایل عمومی مربی</a>`:''}</div>
 </header>`;

 const belt=`<article class="d-c pf-c"><h3>کمربند</h3>${hist.length?`<ol class="pf-tl">${hist.map((h,k)=>`<li class="${k===hist.length-1?'on':''}"${k===hist.length-1?' aria-current="step"':''}>${pfBelt(h.belt,h.dan,esc(h.label))}<span class="mu sm">${F(h.year)}</span></li>`).join('')}</ol>`:'<p class="mu">سابقه‌ای ثبت نشده.</p>'}</article>`;
 const prog=`<article class="d-c pf-c"><h3>پیشرفت</h3>${nd?`<p class="pf-goal">مسیر رسیدن به <b>دان ${F(nd.dan)}</b></p><div class="pf-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${nd.progress}" aria-label="پیشرفت تا دان ${F(nd.dan)}"><i style="width:${nd.progress}%"></i></div><p class="pf-pct"><b>${F(nd.progress)}٪</b> <span class="mu sm">تکمیل شده</span></p><ul class="pf-req">${nd.requirements.map(r=>`<li class="${r.done?'done':''}"><span class="pf-req-i" aria-hidden="true">${r.done?'✓':''}</span>${esc(r.t)}<span class="tp-sr-only">${r.done?' (انجام شده)':' (باقی‌مانده)'}</span></li>`).join('')}</ul>`:'<p class="mu">اطلاعاتی ثبت نشده.</p>'}</article>`;
 const daily=`<article class="d-c pf-c pf-wide"><h3>رکورد روزانه</h3>${pf.daily?pfDaily(pf.daily):'<p class="mu">رکوردی ثبت نشده.</p>'}</article>`;
 const ex=`<article class="d-c pf-c pf-wide"><h3>نمره آزمون‌ها</h3>${exams.length?`<ul class="pf-exams">${exams.map(e=>{const g=pfGrade(e.score);return`<li><div class="pf-row"><span>${esc(e.title)}</span><span class="mu sm">${F(e.date)}</span></div><div class="pf-ex-b"><div class="pf-bar" aria-hidden="true"><i style="width:${e.score}%"></i></div><b>${F(e.score)}<span class="mu sm"> از ۱۰۰</span></b><span class="tag ${g[1]}">${g[0]}</span></div></li>`}).join('')}</ul>`:'<p class="mu">آزمونی ثبت نشده.</p>'}</article>`;

 const rk=ranks.length?`<ul class="pf-ranks">${ranks.map(r=>`<li class="d-c"><span class="pf-medal m${r.place}" aria-hidden="true">${F(r.place)}</span><div><b>${esc(r.title)}</b><div>${esc(r.event)}</div><div class="mu sm">${F(r.year)} · سطح ${esc(r.level)}</div></div></li>`).join('')}</ul>`:tpState('empty','هنوز رتبه‌ای ثبت نشده','رتبه‌های مسابقات پس از ثبت در اینجا نمایش داده می‌شوند.');
 const pt=`<div class="d-c pf-pts"><div class="pf-pts-t"><span class="mu">امتیاز کل</span><b>${F(ptTotal)}</b></div><ul>${[['امتیاز رنکینگ مسابقات',pts.ranking],['امتیاز آموزشی و دوره‌ها',pts.teaching],['رضایت شاگردان',pts.feedback]].map(p=>`<li><div class="pf-row"><span>${p[0]}</span><b>${F(p[1]||0)}</b></div><div class="pf-bar" aria-hidden="true"><i style="width:${ptTotal?Math.round((p[1]||0)/ptTotal*100):0}%"></i></div></li>`).join('')}</ul></div>`;
 const mc=mcs.length?`<div class="pf-mcs">${mcs.map(m=>{const s=pfMc[m.status]||pfMc.done,left=Math.max(0,m.seats-m.taken);return`<article class="d-c pf-mcard"><div class="pf-row"><span class="tag ${s[1]}">${s[0]}</span><span class="mu sm">${esc(m.level)}</span></div><h3>${esc(m.title)}</h3><dl class="pf-mc-d"><div><dt>تاریخ</dt><dd>${esc(m.date)}</dd></div><div><dt>مدت</dt><dd>${F(m.hours)} ساعت</dd></div><div><dt>ظرفیت</dt><dd>${m.status==='open'?F(left)+' جای خالی از '+F(m.seats):F(m.seats)+' نفر'}</dd></div></dl>${m.status!=='done'?'<p class="pf-mc-soon mu sm">ثبت‌نام آنلاین به‌زودی فعال می‌شود.</p>':''}</article>`}).join('')}</div>`:tpState('empty','مستر کلاسی ثبت نشده','دوره‌های جدید پس از اعلام در اینجا نمایش داده می‌شوند.');

 return`<div class="w pf">${crumb([['خانه','#/'],['آکادمی اساتید','#/academy'],[x.n]])}${hero}
 <nav class="pf-nav" aria-label="بخش‌های پورتفو">${nav.map(n=>`<button type="button" class="chip" onclick="pfGo('${n[0]}')">${n[1]}</button>`).join('')}</nav>
 <p class="pf-demo mu sm">اطلاعات این پورتفو نمونه و نمایشی است و پس از اتصال بک‌اند با داده واقعی جایگزین می‌شود.</p>
 ${pfSec('pf-card','کارنامه','کمربند، پیشرفت، رکورد تمرین روزانه و نمره آزمون‌ها',`<div class="pf-grid">${belt}${prog}${daily}${ex}</div>`)}
 ${pfSec('pf-ranks','رتبه‌های کسب‌شده','',rk)}
 ${pfSec('pf-points','امتیازها','',pt)}
 ${pfSec('pf-mc','مستر کلاس‌ها','دوره‌های حضوری فشرده با ظرفیت محدود',mc)}
 ${vs.length?pfSec('pf-vid','دوره‌های ویدیویی','',`<div class="grid">${vs.map(vc).join('')}</div>`):''}
 ${ar.length?pfSec('pf-art','مقاله‌ها','',ar.map(b=>`<a class="rec" href="${bLink(b)}"><b>${b.t}</b><span>${b.d}</span></a>`).join('')):''}
 </div>`}
