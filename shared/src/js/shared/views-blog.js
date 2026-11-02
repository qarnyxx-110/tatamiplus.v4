// بلاگ عمومی: آدرس خوانا با slug (#/blog/<slug>)؛ شناسه عددی داده نمونه برای سازگاری با لینک‌های قبلی پذیرفته می‌شود.
const bcats=()=>[...new Set(BL.map(b=>b.c).filter(Boolean))],BPAGE=6;
const bImg=(b,cls)=>b.img?`<figure class="ph ${cls} ok" style="--h:${b.h}"><img src="${esc(b.img)}" alt="${esc(b.t)}" loading="${cls.includes('eager')?'eager':'lazy'}" decoding="async" onerror="this.remove()"></figure>`:ph(b.h,'تصویر نمونه',cls,'blog/blog-'+pad((typeof b.id==='number'?b.id:0)+1)+'.jpg','تصویر مقاله '+b.t);
const bLink=b=>'#/blog/'+encodeURIComponent(b.slug);
const bcard=b=>`<article class="card"><a href="${bLink(b)}" aria-label="${esc(b.t)}">${bImg(b,'r169')}</a><div class="b">${b.c?tg(esc(b.c)):''}<a href="${bLink(b)}"><h3 style="font-size:var(--tp-font-size-lg);margin:var(--tp-space-xs) 0">${esc(b.t)}</h3></a><p class="mu sm">${esc(b.x)}</p><div class="mu sm">${esc(b.au)} · ${esc(b.d)}</div></div></article>`;
function blogSet(o){const p=hashParams(),cur={q:p.get('q')||'',cat:p.get('cat')||'',page:p.get('page')||''};setHashParams({...cur,...o});R(o.q!==undefined?'bq':'x')}
function blogPage(n){blogSet({page:n>1?String(n):''})}
function blogList(){loadBlog();const hp=hashParams(),cats=bcats();const q=hp.get('q')||'',cat=cats.includes(hp.get('cat'))?hp.get('cat'):'',n=nz(q);
 const l=BL.filter(b=>(!cat||b.c==cat)&&(!n||nz(b.t+' '+b.x+' '+b.au+' '+b.c).includes(n))),pages=Math.max(1,Math.ceil(l.length/BPAGE)),pg=Math.min(pages,Math.max(1,parseInt(hp.get('page'))||1));
 PT={t:'بلاگ',d:'مقاله‌های آموزشی جودو برای هنرجو، مربی و باشگاه.'};
 return`<div class="w"><h1>بلاگ</h1><p class="mu">مقاله‌های آموزشی جودو برای هنرجو، مربی و باشگاه.</p>${TP_API&&blogErr?'<div class="warn">دریافت مقالات از سرور ممکن نشد؛ نمونه‌های محلی نمایش داده می‌شوند.</div>':''}
<div class="sbar"><label class="sr" for="bq">جستجوی مقاله</label><input id="bq" type="search" placeholder="جستجوی مقاله..." value="${esc(q)}" oninput="blogSet({q:this.value,page:''})"></div>
<nav class="cn" aria-label="دسته‌بندی مقالات">${['',...cats].map(c=>chp(esc(c)||'همه',cat==c,`blogSet({cat:'${esc(c).replace(/'/g,'')}',page:''})`)).join('')}</nav>
<p><b aria-live="polite">${F(l.length)} مقاله</b></p>${TP_API&&blogState==='loading'?tpState('loading','در حال دریافت مقالات','لطفاً صبر کنید.'):l.length?`<div class="pg">${l.slice((pg-1)*BPAGE,pg*BPAGE).map(bcard).join('')}</div>${pages>1?tpPager(pages,pg,'blogPage'):''}`:tpState('empty','مقاله‌ای پیدا نشد','عبارت جستجو یا دسته را تغییر دهید.','پاک کردن فیلترها',"javascript:blogSet({q:'',cat:'',page:''})")}</div>`}
function blogDetail(raw){loadBlog();let s=raw;try{s=decodeURIComponent(raw)}catch{}
 const b=BL.find(x=>x.slug===s)||(/^\d+$/.test(s)?BL.find(x=>String(x.id)===s&&!x.api):null);
 if(!b){if(TP_API&&blogState==='loading')return`<div class="w">${tpState('loading','در حال دریافت مقاله','لطفاً صبر کنید.')}</div>`;return nfp('مقاله‌ای پیدا نشد','#/blog','مشاهده بلاگ')}
 PT={t:b.t,d:b.x};const rel=BL.filter(x=>x.c==b.c&&x!==b).slice(0,3);
 const body=b.html?sanitizeHtml(b.html):(b.b||[]).map(p=>`<p>${esc(p)}</p>`).join('');
 return`<div class="w">${crumb([['خانه','#/'],['بلاگ','#/blog'],[esc(b.t)]])}<h1>${esc(b.t)}</h1><p class="mu sm">${b.c?tg(esc(b.c)):''} ${esc(b.au)} · ${esc(b.d)}</p>${bImg(b,'r169 eager')}<article class="tp-article">${body}</article>${b.tags&&b.tags.length?`<p class="tp-cluster">${b.tags.map(t=>tg(esc(t),'m')).join('')}</p>`:''}${rel.length?`<section class="d-s"><h2>مقاله‌های مرتبط</h2><div class="pg">${rel.map(bcard).join('')}</div></section>`:''}</div>`}
Object.assign(views,{blog:(n,raw)=>raw===undefined?blogList():blogDetail(raw)});
