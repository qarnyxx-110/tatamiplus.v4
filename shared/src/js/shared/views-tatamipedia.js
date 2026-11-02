// تاتامی‌پدیا | دانشنامه جودو (عمومی). داده: data/tatamipedia.json (TPD). مدیریت اصطلاحات فقط در پنل مارکتینگ است.
const tpdCat=s=>TPD.categories.find(c=>c.slug===s),tpdTerm=s=>TPD.terms.find(t=>t.slug===s&&t.status!=='draft');
const tpdLink=t=>'#/tatamipedia/'+encodeURIComponent(t.slug);
const tpdCard=t=>`<a class="card b" href="${tpdLink(t)}"><b>${esc(t.nameFa)}</b><div class="tp-ja" lang="ja">${esc(t.nameJa)}</div><div class="mu sm tp-ltr">${esc(t.romaji)}</div><p class="mu sm tp-clamp">${esc(t.meaning)}</p><div class="tp-cluster">${t.categories.slice(0,2).map(c=>tg(esc((tpdCat(c)||{}).name||c),'m')).join('')}</div></a>`;
const tpdParams=()=>{const hp=hashParams(),cat=TPD.categories.some(c=>c.slug===hp.get('cat'))?hp.get('cat'):'';return{q:hp.get('q')||'',cat}};
function tpdSet(o){setHashParams({...tpdParams(),...o});R(o.q!==undefined?'tq':'x')}
function tpdList(){loadTpd();const{q,cat}=tpdParams(),n=nz(q),all=TPD.terms.filter(t=>t.status!=='draft');
 const l=all.filter(t=>(!cat||t.categories.includes(cat))&&(!n||nz([t.nameFa,t.nameJa,t.romaji,t.meaning,t.description].join(' ')).includes(n))).sort((a,b)=>a.romaji.localeCompare(b.romaji));
 const cats=TPD.categories.slice().sort((a,b)=>a.order-b.order),feat=all.filter(t=>t.featured).slice(0,6);
 PT={t:'تاتامی‌پدیا | دانشنامه جودو',d:'مرجع فارسی اصطلاحات و مفاهیم جودو: نام فارسی، ژاپنی و آوانویسی لاتین.'};
 return`<div class="w"><h1>تاتامی‌پدیا | دانشنامه جودو</h1><p class="mu" style="max-width:46rem">مرجعی فارسی و قابل‌جست‌وجو برای اصطلاحات و مفاهیم جودو، با نام فارسی، نوشتار ژاپنی و آوانویسی لاتین. محتوا برای بازبینی تخصصی آماده است و نهایی نیست.</p>
<div class="sbar"><label class="sr" for="tq">جستجوی اصطلاح</label><input id="tq" type="search" placeholder="جستجوی نام فارسی، ژاپنی یا لاتین..." value="${esc(q)}" oninput="tpdSet({q:this.value})"></div>
<nav class="cn" aria-label="دسته‌بندی اصطلاحات">${chp('همه',!cat,"tpdSet({cat:''})")}${cats.map(c=>chp(esc(c.name),cat==c.slug,`tpdSet({cat:'${c.slug}'})`)).join('')}</nav>
${!q&&!cat&&feat.length?`<section class="d-s" aria-label="اصطلاحات پرکاربرد"><h2>اصطلاحات پرکاربرد</h2><div class="pg">${feat.map(tpdCard).join('')}</div></section>`:''}
<section class="d-s" aria-label="فهرست اصطلاحات"><div class="tp-cluster"><h2 style="margin:0">فهرست اصطلاحات</h2><b aria-live="polite">${F(l.length)} اصطلاح</b>${q||cat?`<button type="button" class="chip" onclick="tpdSet({q:'',cat:''})">پاک کردن فیلترها</button>`:''}</div>
${TP_API&&tpdState==='loading'?tpState('loading','در حال دریافت اصطلاحات','لطفاً صبر کنید.'):l.length?`<div class="pg" style="margin-top:var(--tp-space-sm)">${l.map(tpdCard).join('')}</div>`:tpState('empty','اصطلاحی پیدا نشد','عبارت جستجو یا دسته‌بندی را تغییر دهید.','پاک کردن فیلترها',"javascript:tpdSet({q:'',cat:''})")}</section></div>`}
function tpdDetail(raw){loadTpd();let s=raw;try{s=decodeURIComponent(raw)}catch{}const t=tpdTerm(s);
 if(!t){if(TP_API&&tpdState==='loading')return`<div class="w">${tpState('loading','در حال دریافت اصطلاح','لطفاً صبر کنید.')}</div>`;return nfp('اصطلاحی پیدا نشد','#/tatamipedia','مشاهده تاتامی‌پدیا')}
 PT={t:t.nameFa+' — تاتامی‌پدیا',d:t.meaning+'. '+t.description.slice(0,120)};const rel=(t.related||[]).map(tpdTerm).filter(Boolean);
 return`<div class="w">${crumb([['خانه','#/'],['تاتامی‌پدیا','#/tatamipedia'],[esc(t.nameFa)]])}<div class="tp-term"><div><h1>${esc(t.nameFa)}</h1><div class="tp-ja tp-ja-lg" lang="ja">${esc(t.nameJa)}</div><div class="mu tp-ltr">${esc(t.romaji)}</div><div class="tp-cluster" style="margin-top:var(--tp-space-sm)">${t.categories.map(c=>`<a class="chip" href="#/tatamipedia?cat=${encodeURIComponent(c)}">${esc((tpdCat(c)||{}).name||c)}</a>`).join('')}</div></div>${t.image?`<figure class="ph r43 ok"><img src="${esc(t.image)}" alt="${esc(t.nameFa)}" loading="lazy" onerror="this.remove()"></figure>`:''}</div>
<section class="d-s"><h2>معنی</h2><p>${esc(t.meaning)}</p></section><section class="d-s"><h2>توضیح</h2><p class="mu">${esc(t.description)}</p></section>
${t.usage?`<section class="d-s"><h2>کاربرد</h2><p class="mu">${esc(t.usage)}</p></section>`:''}${t.safety?`<section class="d-s"><h2>نکته ایمنی</h2><div class="warn">${esc(t.safety)}</div></section>`:''}
${rel.length?`<section class="d-s"><h2>اصطلاحات مرتبط</h2><div class="tp-cluster">${rel.map(r=>`<a class="chip" href="${tpdLink(r)}">${esc(r.nameFa)}</a>`).join('')}</div></section>`:''}
<p class="mu sm">محتوا برای بازبینی تخصصی (مربی/داور) آماده است و تعریف نهایی فدراسیون محسوب نمی‌شود.</p><p class="tp-cluster"><a class="btn" href="#/tatamipedia">بازگشت به تاتامی‌پدیا</a><button type="button" class="btn o" onclick="shareTerm('${esc(t.slug)}')">اشتراک‌گذاری</button></p></div>`}
function shareTerm(slug){const u=location.href;try{if(navigator.share){navigator.share({title:slug,url:u}).catch(()=>{});return}navigator.clipboard.writeText(u).then(()=>toast('پیوند کپی شد'),()=>toast('کپی پیوند ممکن نشد','error'))}catch{toast('اشتراک‌گذاری در این مرورگر در دسترس نیست','error')}}
Object.assign(views,{tatamipedia:(n,raw)=>raw===undefined?tpdList():tpdDetail(raw)});
