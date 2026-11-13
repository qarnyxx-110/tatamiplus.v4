function storePageMarkup(total,pages,page){return pages>1?`<p class="mu sm" aria-live="polite">نمایش ${F((page-1)*STORE_PAGE_SIZE+1)} تا ${F(Math.min(page*STORE_PAGE_SIZE,total))} از ${F(total)} محصول</p>${tpPager(pages,page,'storePageGo')}`:''}
Object.assign(views,{
store:()=>{storeSync();const nq=nz(q);let l=P.filter(p=>p.st>0&&(!cat||p.c==cat)&&(!nq||nz(p.n+' '+p.c+' '+(p.ref?p.grp:p.ds)).includes(nq))&&(!FS.pmin||p.p>=FS.pmin)&&(!FS.pmax||p.p<=FS.pmax)&&(!FS.sz.length||p.sz.some(s=>FS.sz.includes(s)))&&(!FS.col.length||p.cl.some(c=>FS.col.includes(c)))&&(!FS.lv||p.lv==FS.lv||(p.lv=='همه سطوح'&&FS.lv!='همه سطوح'))&&(!FS.fv||fav.includes(p.id)));
l.sort({price_asc:(x,y)=>x.p-y.p,price_desc:(x,y)=>y.p-x.p,name:(x,y)=>x.n.localeCompare(y.n,'fa')}[sort]||((x,y)=>x.ci-y.ci||x.id-y.id));const pages=Math.max(1,Math.ceil(l.length/STORE_PAGE_SIZE));storePage=Math.min(pages,Math.max(1,storePage));const pageItems=l.slice((storePage-1)*STORE_PAGE_SIZE,storePage*STORE_PAGE_SIZE);storeWrite();const cn=cart.reduce((a,x)=>a+x.q,0),fc=fcount();
return`<div class="w"><header class="sh"><div><h1>فروشگاه</h1><h2 class="gold" style="font-size:var(--tp-font-size-xl)">هر چیزی که برای جودو نیاز دارید</h2><p class="mu" style="margin:0">از لباس و کمربند جودو تا تجهیزات تمرینی و لوازم موردنیاز جودوکار؛ همه در یکجا.</p></div><div class="sha"><span class="mu sm">${F(P.length)} محصول نمایشی</span><a class="ib" href="#/cart" aria-label="سبد خرید، ${F(cn)} آیتم">🛒 <b class="gold">${F(cn)}</b></a></div></header>
<div class="sbar"><label class="sr" for="fq">جستجوی محصول</label><input id="fq" type="search" placeholder="جستجوی محصول..." value="${esc(q)}" oninput="q=this.value;storePage=1;R('fq')"></div>
<nav class="cn" aria-label="دسته‌بندی محصولات">${['',...CATS].map(c=>chp(c||'همه',cat==c,`cat='${c}';storePage=1;R('x')`)).join('')}</nav>
<div class="sl">${fp()}<div><div class="tb"><b aria-live="polite">${F(l.length)} محصول</b><button class="btn s o fbtn" aria-expanded="${FS.open}" aria-controls="sf" onclick="sF('open',!FS.open)">فیلترها${fc?' ('+F(fc)+')':''}</button><label class="mu sm">مرتب‌سازی <select onchange="sort=this.value;storePage=1;R('x')"><option value="">پیش‌فرض</option><option value="price_asc" ${sort=='price_asc'?'selected':''}>ارزان‌ترین</option><option value="price_desc" ${sort=='price_desc'?'selected':''}>گران‌ترین</option><option value="name" ${sort=='name'?'selected':''}>نام محصول</option></select></label></div>${l.length?`<div class="pg">${pageItems.map(pc).join('')}</div>${storePageMarkup(l.length,pages,storePage)}`:emp('محصولی پیدا نشد','فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید.','پاک کردن فیلترها','javascript:clr()')}</div></div>
${REC.map(r=>`<section class="d-s" aria-label="${r[0]}"><h2>${r[0]}</h2><div class="pg">${r[1].map(n=>P.find(x=>x.n==n)).filter(Boolean).map(pc).join('')}</div></section>`).join('')}<p class="mu sm" style="margin-top:var(--tp-space-lg)">قیمت‌ها، موجودی و نظرات نمایشی‌اند و پیشنهادها فقط چیدمان نمونه هستند.</p></div>`},
product:i=>{if(isNaN(i)){const g=new URLSearchParams(location.hash.split('?')[1]||'').get('id');i=g==null||g.trim()==''?NaN:+g}const p=P[i];if(!p)return nfp('محصولی پیدا نشد','#/store','مشاهده فروشگاه');
if(PS.id!=i)PS={id:i,s:'',c:'',q:1,g:0,err:{}};PS.err=PS.err||{};const pe=PS.err||{},perr=(k,id)=>pe[k]?`<p class="tp-error-text" id="${id}-err">${pe[k]}</p>`:'';
const g=n=>ph(p.h,p.c,'r43'+(n==PS.g?' eager':''),(p.slot&&!n?p.slot:'products/product-'+pad(p.id+1)+(n?'-'+(n+1):'')+'.jpg'),`تصویر ${F(n+1)} محصول ${p.n}`);
const rel=P.filter(x=>x.ci==p.ci&&x.id!=p.id).slice(0,4);
return`<div class="w">${crumb([['خانه','#/'],['فروشگاه','#/store'],[p.n]])}<div class="pd"><div><div class="pm">${g(PS.g)}</div><div class="pt">${[0,1,2,3].map(n=>`<button class="ptb ${n==PS.g?'on':''}" aria-label="نمایش تصویر ${F(n+1)}" aria-pressed="${n==PS.g}" onclick="PS.g=${n};R('x')">${g(n).replace('r43','th')}</button>`).join('')}</div></div>
<div><a class="mu sm" href="#/store">${p.c}</a><h1>${p.n}</h1><p class="mu sm" style="margin:0">${rate(p)} · <span class="tag ${lvCls(p.lv)||'m'}">سطح ${p.lv}</span></p><h2 class="gold" style="margin:var(--tp-space-xs) 0">${T(p.p)}</h2>${p.ref?`<p class="mu sm">قیمت مرجع بازار (${p.pdate}) از ${p.src}؛ قیمت نهایی تاتامی پلاس نیست.</p>`:''}<p>${sk(p)}</p>
${p.sz.length?`<div class="fl">سایز<div class="chips" role="group" aria-label="سایز" id="pd-sz" tabindex="-1"${pe.s?' aria-invalid="true" aria-errormessage="pd-sz-err"':''}>${p.sz.map((s,k)=>chp(s,PS.s==s,`PS.s='${s}';PS.err.s='';R('x')`)).join('')}</div>${perr('s','pd-sz')}</div>`:''}
${p.cl.length?`<div class="fl">رنگ<div class="chips" role="group" aria-label="رنگ" id="pd-cl" tabindex="-1"${pe.c?' aria-invalid="true" aria-errormessage="pd-cl-err"':''}>${p.cl.map(c=>chp(c,PS.c==c,`PS.c='${c}';PS.err.c='';R('x')`)).join('')}</div>${perr('c','pd-cl')}</div>`:''}
<div class="fl">تعداد<div class="qt" role="group" aria-label="تعداد" id="pd-qt" tabindex="-1"${pe.q?' aria-invalid="true" aria-errormessage="pd-qt-err"':''}><button aria-label="کاهش تعداد" onclick="qP(-1)" ${PS.q<=1?'disabled':''}>−</button><output aria-live="polite">${F(PS.q)}</output><button aria-label="افزایش تعداد" onclick="qP(1)" ${PS.q>=p.st?'disabled':''}>+</button></div>${p.st&&p.st<5?`<span class="mu sm">حداکثر ${F(p.st)} عدد</span>`:''}${perr('q','pd-qt')}</div>
<p class="pa"><button id="pd-add" class="btn" ${p.st?'':'disabled'} onclick="addP()">${p.st?'افزودن به سبد':'ناموجود'}</button><button class="btn o" aria-pressed="${fav.includes(p.id)}" onclick="tf(${p.id})">${fav.includes(p.id)?'♥ در علاقه‌مندی‌ها':'♡ افزودن به علاقه‌مندی‌ها'}</button></p></div></div>
<section class="d-s"><h2>توضیحات محصول</h2><p class="mu">${p.ds}</p></section>
<section class="d-s"><h2>مشخصات</h2><table>${(p.ref?[['نوع',p.n],['دسته',p.c],['گروه',p.grp],['سایز',p.sz.length?p.sz.join('، '):'مطابق صفحه محصول'],['رنگ',p.cl.length?p.cl.join('، '):'مطابق صفحه محصول'],['سطح استفاده',p.lv],['منبع قیمت مرجع',p.src+' — '+p.pdate]]:[['نوع',p.n],['دسته',p.c],['جنس',CM[p.ci]],['سایز',p.sz.length?p.sz.join('، '):'بدون سایزبندی'],['رنگ',p.cl.join('، ')],['سطح استفاده',p.lv],['کاربرد',p.ap]]).map(r=>`<tr><th scope="row" class="mu">${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table><p class="mu sm">${p.ref?'مشخصات بر پایه نام محصول در کاتالوگ مرجع است؛ پیش از فروش با تأمین‌کننده تأیید شود.':'مشخصات نمایشی‌اند.'}</p></section>
${p.sz.some(s=>SZG[s])?`<section class="d-s"><h2>راهنمای سایز</h2><table><thead><tr><th>سایز</th><th>قد (سانتی‌متر)</th><th>وزن (کیلوگرم)</th></tr></thead><tbody>${p.sz.filter(s=>SZG[s]).map(s=>`<tr><td>${s}</td><td>${SZG[s][0]}</td><td>${SZG[s][1]}</td></tr>`).join('')}</tbody></table><p class="mu sm">جدول نمونه است.</p></section>`:''}
<section class="d-s"><h2>محصولات مرتبط</h2>${rel.length?`<div class="pg">${rel.map(pc).join('')}</div>`:emp('محصول مرتبطی نیست','محصولات دیگر را در فروشگاه ببینید.','مشاهده فروشگاه','#/store')}</section></div>`},
checkout:()=>checkoutView(),
cart:()=>{const ok=cart.filter(x=>P[x.id]),sub=ok.reduce((a,x)=>a+P[x.id].p*x.q,0);return`<div class="w"><h1>سبد خرید</h1>${ok.length?`<div class="cl2"><div>${cart.map((x,k)=>{const p=P[x.id];if(!p)return'';return`<div class="ci">${im.p(p,'th')}<div class="cb"><a href="#/product/${p.id}"><b>${p.n}</b></a><div class="mu sm">${[x.s&&'سایز '+esc(x.s),x.c&&'رنگ '+esc(x.c)].filter(Boolean).join(' · ')||'بدون گزینه'}</div><div class="mu sm">قیمت واحد: ${T(p.p)}</div>${p.ref?`<p class="mu sm tp-price-reference">قیمت مرجع بازار از ${esc(p.src||"منبع ثبت‌شده")}؛ قیمت نهایی فروش تاتامی پلاس نیست.</p>`:""}<div class="cr"><div class="qt" role="group" aria-label="تعداد ${p.n}"><button aria-label="کاهش تعداد" onclick="cq(${k},-1)" ${x.q<=1?'disabled':''}>−</button><output>${F(x.q)}</output><button aria-label="افزایش تعداد" onclick="cq(${k},1)" ${x.q>=p.st?'disabled':''}>+</button></div><b class="gold">${T(p.p*x.q)}</b><button class="chip" aria-label="حذف ${p.n} از سبد" onclick="rm(${k})">حذف</button></div></div></div>`}).join('')}</div><aside class="d-c" aria-label="خلاصه سفارش"><h3>خلاصه سفارش</h3><div class="rw2"><span class="mu">جمع اقلام</span><span>${T(sub)}</span></div><div class="rw2"><b>مبلغ کل</b><b class="gold">${T(sub)}</b></div><p class="tp-note">برای ورود به مرحله نشانی، ابتدا وارد حساب شوید. ثبت سفارش و پرداخت واقعی هنوز به بک‌اند متصل نشده‌اند.</p>${APP.fixed?'<p class="tp-note">ادامه فرایند خرید از این نسخه در دسترس نیست.</p>':'<a class="btn" style="width:100%" href="#/checkout" onclick="startCheckout();return false;">ادامه خرید</a>'}<p class="mu sm">مبالغ بر پایه داده‌های نمایشی Preview هستند و مبلغ نهایی فروش نیستند.</p></aside></div>`:emp('سبد خرید شما خالی است','محصولات موردنیاز خود را از فروشگاه انتخاب کنید.','مشاهده فروشگاه','#/store')}</div>`},
});

// فلوی خرید Preview: ورود لازم است؛ سفارش و پرداخت واقعی در بک‌اند تعریف نشده‌اند.
const checkoutSteps=n=>`<ol class="tp-steps" aria-label="مراحل خرید">
 <li class="${n>0?'done':'on'}"${n===0?' aria-current="step"':''}><span>۱</span>نشانی و گیرنده</li>
 <li class="${n===1?'on':''}"${n===1?' aria-current="step"':''}><span>۲</span>بازبینی سفارش</li>
 <li aria-disabled="true"><span>۳</span>پرداخت (غیرفعال)</li>
</ol>`;
const checkoutView=()=>{
 const items=cart.filter(x=>P[x.id]&&Number(x.q)>0);
 if(!items.length)return `<div class="w">${emp('سبد خرید شما خالی است','برای شروع خرید، ابتدا محصولی به سبد اضافه کنید.','مشاهده فروشگاه','#/store')}</div>`;
 if(!ME)return `<div class="w tp-checkout-auth"><section class="d-c">
  <h1>برای ادامه خرید وارد حساب شوید</h1>
  <p class="mu">سبد خرید شما حفظ می‌شود. انتخاب نشانی پس از ورود یا ثبت‌نام امکان‌پذیر است.</p>
  <div class="pa"><a class="btn" href="#/login?next=%23%2Fcheckout">ورود به حساب</a><a class="btn o" href="#/register?next=%23%2Fcheckout">ساخت حساب</a></div>
 </section></div>`;
 return CHECKOUT.step===1?checkoutReviewView(items):checkoutAddressView();
};
const checkoutAddressView=()=>`<div class="w tp-checkout">
 <h1>اطلاعات گیرنده و نشانی</h1>${checkoutSteps(0)}
 <p class="mu">برای ارسال سفارش، اطلاعات گیرنده و نشانی را وارد کنید.</p>
 <p class="tp-note">این پیش‌نمایش فرانت‌اند است: اطلاعات فرم فقط تا پایان همین نشست صفحه در حافظه می‌ماند و در سرور یا حافظه دائمی ذخیره نمی‌شود.</p>
 <section class="d-s" aria-label="حساب کاربری"><b>حساب فعال:</b> ${esc(ME.username)}</section>
 <form class="d-s" id="co-form" novalidate onsubmit="checkoutNext();return false" oninput="fClr(event)">
  <p class="tp-form-sum" role="alert" hidden></p>
  <div class="fl"><label for="co-name">نام و نام خانوادگی گیرنده *</label><input id="co-name" autocomplete="name" required maxlength="150" value="${esc(CHECKOUT.name)}" oninput="checkoutField('name',this.value)"></div>
  <div class="fl"><label for="co-phone">شماره موبایل گیرنده *</label><input id="co-phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="16" dir="ltr" placeholder="09123456789" value="${esc(CHECKOUT.phone)}" oninput="checkoutField('phone',this.value)"></div>
  <div class="fl"><label for="co-province">استان *</label><input id="co-province" autocomplete="address-level1" required maxlength="80" value="${esc(CHECKOUT.province)}" oninput="checkoutField('province',this.value)"></div>
  <div class="fl"><label for="co-city">شهر *</label><input id="co-city" autocomplete="address-level2" required maxlength="80" value="${esc(CHECKOUT.city)}" oninput="checkoutField('city',this.value)"></div>
  <div class="fl"><label for="co-postal">کد پستی ۱۰ رقمی *</label><input id="co-postal" inputmode="numeric" autocomplete="postal-code" required maxlength="10" dir="ltr" value="${esc(CHECKOUT.postal)}" aria-describedby="co-postal-h" oninput="checkoutField('postal',this.value)"><p class="tp-hint" id="co-postal-h">۱۰ رقم؛ ارقام فارسی و لاتین پذیرفته می‌شوند.</p></div>
  <div class="fl"><label for="co-address">نشانی کامل *</label><textarea id="co-address" autocomplete="street-address" required maxlength="1000" oninput="checkoutField('address',this.value)">${esc(CHECKOUT.address)}</textarea></div>
  <div class="fl"><label for="co-notes">توضیحات تکمیلی (اختیاری)</label><textarea id="co-notes" maxlength="500" oninput="checkoutField('notes',this.value)">${esc(CHECKOUT.notes)}</textarea></div>
  <div class="pa"><a class="btn o" href="#/cart">بازگشت به سبد</a><button class="btn" type="submit">ادامه به بازبینی سفارش</button></div>
 </form>
</div>`;
const checkoutReviewView=items=>{
 const subtotal=items.reduce((sum,item)=>sum+P[item.id].p*item.q,0);
 return `<div class="w tp-checkout">
  <h1>بازبینی سفارش</h1>${checkoutSteps(1)}
  <section class="d-s" aria-labelledby="co-address-title">
   <div class="sh"><h2 id="co-address-title">نشانی و گیرنده</h2><button class="btn s o" type="button" onclick="checkoutBack()">ویرایش نشانی</button></div>
   <p><b>${esc(CHECKOUT.name)}</b> · <span dir="ltr">${esc(CHECKOUT.phone)}</span></p>
   <p>${esc(CHECKOUT.province)}، ${esc(CHECKOUT.city)}</p>
   <p>${esc(CHECKOUT.address)}</p>
   <p>کد پستی: <b dir="ltr">${esc(CHECKOUT.postal)}</b></p>
   ${CHECKOUT.notes?`<p>توضیحات: ${esc(CHECKOUT.notes)}</p>`:''}
  </section>
  <section class="d-s" aria-labelledby="co-items-title">
   <h2 id="co-items-title">اقلام سبد خرید</h2>
   ${items.map(item=>{const p=P[item.id];return `<div class="rw2"><span>${esc(p.n)} × ${F(item.q)}${item.s?' · سایز '+esc(item.s):''}${item.c?' · رنگ '+esc(item.c):''}</span><b>${T(p.p*item.q)}</b></div>`}).join('')}
   <div class="rw2"><b>جمع نمایشی اقلام</b><b class="gold">${T(subtotal)}</b></div>
   <div class="rw2"><span>هزینه ارسال</span><span>پس از اتصال سرویس ارسال محاسبه می‌شود</span></div>
  </section>
  <section class="tp-checkout-blocked d-c" aria-labelledby="co-payment-title">
   <h2 id="co-payment-title">پرداخت</h2>
   <p class="mu">ثبت سفارش، محاسبه نهایی قیمت و هزینه ارسال و درگاه پرداخت هنوز به بک‌اند متصل نشده‌اند. در این مرحله هیچ سفارش یا تراکنشی ثبت نمی‌شود.</p>
   <button class="btn" type="button" disabled aria-describedby="co-payment-unavailable">ادامه به پرداخت فعلاً غیرفعال است</button>
   <p class="tp-hint" id="co-payment-unavailable">پس از ارائه API سفارش و اتصال درگاه واقعی، این مرحله فعال خواهد شد.</p>
  </section>
  <div class="pa"><button class="btn o" type="button" onclick="checkoutBack()">بازگشت و ویرایش نشانی</button><a class="btn o" href="#/cart">بازگشت به سبد خرید</a></div>
  <p class="mu sm">مبالغ Preview نمونه‌اند و قیمت نهایی یا مبلغ قابل پرداخت محسوب نمی‌شوند.</p>
 </div>`;
};

// فیلترهای فروشگاه در آدرس با همان نام‌های فرم Django: query, category, size, color, training_level, min_price, max_price, sort
// (صفحه‌بندی page را Django سمت سرور انجام می‌دهد؛ این نسخه همهٔ ۶۲ محصول نمایشی را یکجا نشان می‌دهد)
let SQS=null;
function storeSync(){const cur=location.hash.split('?')[1]||'';if(cur===SQS)return;const p=new URLSearchParams(cur),g=k=>(p.get(k)||'').trim();
 q=g('query').slice(0,100);cat=CATS.includes(g('category'))?g('category'):'';FS.sz=SZ_ALL.includes(g('size'))?[g('size')]:[];FS.col=ALLC.includes(g('color'))?[g('color')]:[];FS.lv=LVS.includes(g('training_level'))?g('training_level'):'';
 FS.pmin=num(g('min_price'))||0;FS.pmax=num(g('max_price'))||0;sort=['price_asc','price_desc','name'].includes(g('sort'))?g('sort'):'';storePage=Math.max(1,parseInt(g('page'),10)||1);SQS=cur}
function storeWrite(){setHashParams({query:q.trim(),category:cat,size:FS.sz[0]||'',color:FS.col[0]||'',training_level:FS.lv,min_price:FS.pmin||'',max_price:FS.pmax||'',sort,page:storePage>1?String(storePage):''});SQS=location.hash.split('?')[1]||''}
function storePageGo(n){storePage=Math.max(1,Math.floor(Number(n)||1));storeWrite();R('x')}
