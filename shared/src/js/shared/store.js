const num=v=>+String(v).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^\d]/g,'')||0;
const CCOL=[['سفید','آبی','مشکی'],['سفید'],['مشکی','خاکستری'],['مشکی','قرمز'],['مشکی','آبی','خاکستری'],['مشکی','قرمز','آبی'],['مشکی','آبی'],['آبی','قرمز','مشکی']],BC=[['سفید'],['سبز'],['مشکی']],CM=['پنبه (نمونه)','پنبه ضخیم (نمونه)','لاستیک و پارچه (نمونه)','فلز و لاستیک (نمونه)','پارچه (نمونه)','فوم و پارچه (نمونه)','فوم و لاستیک (نمونه)','فوم فشرده (نمونه)'];
const LVS=['مبتدی','متوسط','پیشرفته','همه سطوح'],SZS=['XS','S','M','L','XL','XXL'],SZG={XS:['۱۴۰–۱۵۰','۳۵–۴۵'],S:['۱۵۰–۱۶۰','۴۵–۵۵'],M:['۱۶۰–۱۷۰','۵۵–۶۵'],L:['۱۷۰–۱۸۰','۶۵–۷۵'],XL:['۱۸۰–۱۹۰','۷۵–۹۰'],XXL:['۱۹۰–۲۰۰','۹۰–۱۱۰']};
P.forEach(p=>{if(p.ref){Object.assign(p,{rv:0,st:25,sold:0,d:p.id,ds:`${p.n}؛ ${p.grp}. قیمت نمایش‌داده‌شده قیمت مرجع بازار (${p.pdate}) از ${p.src} است و قیمت نهایی فروش تاتامی پلاس نیست.`});return}const i=p.id%3,lv=LVS[(p.ci+i)%4];Object.assign(p,{rv:12+(p.id*17)%180,st:p.id%9==4?0:p.id%7==2?3:25,sold:0,d:p.id,lv,sz:p.ci==0?SZS:p.ci==5&&i>0?['S','M','L']:[],cl:p.ci==1?BC[i]:CCOL[p.ci],ds:`${p.n} از دسته ${p.c} برای سطح ${lv}؛ توضیح نمایشی محصول در نمونه اولیه.`,ap:['کلاس تمرین','مسابقه','تمرین در خانه','باشگاه'][(p.ci+i)%4]})});
const ALLC=[...new Set(P.flatMap(p=>p.cl))],SZ_ALL=[...SZS,'2','3','4','5'].filter(s=>P.some(p=>p.sz.includes(s)));
const STORE_PAGE_SIZE=24;let storePage=1;const FS={pmin:0,pmax:0,sz:[],col:[],lv:'',fv:false,open:false};let PS={id:-1};
let CHECKOUT={step:0,name:'',phone:'',province:'',city:'',postal:'',address:'',delivery:'standard',notes:''};
function resetCheckout(){Object.assign(CHECKOUT,{step:0,name:'',phone:'',province:'',city:'',postal:'',address:'',delivery:'standard',notes:''})}
const tgl=(k,v)=>{FS[k]=FS[k].includes(v)?[]:[v];storePage=1;R('x')},sF=(k,v)=>{FS[k]=v;storePage=1;R('x')};
const clr=()=>{q='';cat='';storePage=1;Object.assign(FS,{pmin:0,pmax:0,sz:[],col:[],lv:'',fv:false});R('x')};
const cadd=(id,s,c,n)=>{const p=P[id];if(!p||!p.st){toast('این محصول ناموجود است','err');return false}const inCart=cart.filter(x=>x.id==id).reduce((a,x)=>a+x.q,0),room=Math.max(0,p.st-inCart);if(room<=0||n>room){toast(room?'تعداد درخواستی بیشتر از موجودی است':'به حداکثر موجودی این محصول رسیده‌اید','err');return false}const e=cart.find(x=>x.id==id&&x.s==s&&x.c==c);e?e.q+=n:cart.push({id,s,c,q:n});save();return true};
const toast=(t,k='')=>{const e=$('#ts');e.textContent=t;e.className='tp-toast on '+(k==='err'?'error':k);e.setAttribute('role',k==='err'?'alert':'status');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2200)};
// تعامل افزودن به سبد فقط در صفحه جزئیات محصول Preview اجرا می‌شود.
let productAddBusy=false;
const cartCountText=count=>count?F(count):'';
function writeCartCount(count){
 const node=$('#cc');
 if(node)node.textContent=cartCountText(count);
}
function animateCartCount(from,to){
 const node=$('#cc');
 if(!node)return Promise.resolve();
 const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduced||typeof window.requestAnimationFrame!=='function'||document.visibilityState==='hidden'){
  node.textContent=cartCountText(to);
  return Promise.resolve();
 }
 const duration=250;
 return new Promise(resolve=>{
  let startTime=null;
  const frame=now=>{
   if(startTime===null)startTime=now;
   const progress=Math.min(1,(now-startTime)/duration);
   const eased=1-Math.pow(1-progress,3);
   const value=Math.round(from+(to-from)*eased);
   node.textContent=cartCountText(value);
   if(progress<1){
    window.requestAnimationFrame(frame);
    return;
   }
   node.textContent=cartCountText(to);
   node.classList.remove('tp-cart-count-pop');
   void node.offsetWidth;
   node.classList.add('tp-cart-count-pop');
   node.addEventListener('animationend',()=>node.classList.remove('tp-cart-count-pop'),{once:true});
   resolve();
  };
  window.requestAnimationFrame(frame);
 });
}
function receiveCart(target){
 const icon=target&&target.matches('.tp-ico')?target:target&&target.querySelector('.tp-ico');
 if(!icon)return;
 icon.classList.remove('tp-cart-icon-receive');
 void icon.getBoundingClientRect();
 icon.classList.add('tp-cart-icon-receive');
 icon.addEventListener('animationend',()=>icon.classList.remove('tp-cart-icon-receive'),{once:true});
}
function flyProductToCart(previousCount,nextCount){
 const source=$('#app .pd .pm .ph'),target=$('#hcart .tp-ico')||$('#hcart');
 const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!source||!target||reduced||typeof window.requestAnimationFrame!=='function')return Promise.resolve(false);
 const from=source.getBoundingClientRect(),to=target.getBoundingClientRect();
 if(from.width<2||from.height<2||to.width<2||to.height<2)return Promise.resolve(false);
 const ghost=source.cloneNode(true);
 ghost.className='ph tp-cart-fly';
 ghost.removeAttribute('id');
 ghost.removeAttribute('data-slot');
 ghost.setAttribute('aria-hidden','true');
 ghost.setAttribute('tabindex','-1');
 ghost.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
 ghost.querySelectorAll('figcaption').forEach(node=>node.remove());
 ghost.querySelectorAll('img').forEach(img=>{
  img.removeAttribute('onload');
  img.removeAttribute('onerror');
  img.loading='eager';
  img.draggable=false;
 });
 Object.assign(ghost.style,{
  position:'fixed',left:from.left+'px',top:from.top+'px',
  width:from.width+'px',height:from.height+'px',boxSizing:'border-box',
  margin:'0',padding:'0',zIndex:'10000',pointerEvents:'none',
  transformOrigin:'center center',willChange:'transform,opacity',
  borderRadius:getComputedStyle(source).borderRadius
 });
 document.body.appendChild(ghost);
 source.classList.add('tp-product-flight-source');
 // save() شمارنده واقعی را به‌روز کرده؛ تا رسیدن تصویر، مقدار قبلی را فقط در UI نگه می‌داریم.
 writeCartCount(previousCount);
 const startX=from.left+from.width/2,startY=from.top+from.height/2;
 const duration=1040,pageHash=location.hash;
 const easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 const cubic=(a,b,c,d,t)=>{
  const u=1-t;
  return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d;
 };
 return new Promise(resolve=>{
  let finished=false,frameId=0;
  const finish=arrived=>{
   if(finished)return;
   finished=true;
   if(frameId)window.cancelAnimationFrame(frameId);
   ghost.remove();
   source.classList.remove('tp-product-flight-source');
   if(!arrived){
    writeCartCount(nextCount);
    resolve(false);
    return;
   }
   receiveCart(target);
   animateCartCount(previousCount,nextCount).then(()=>resolve(true),()=>resolve(true));
  };
  const tick=now=>{
   try{
    if(!ghost.isConnected||!source.isConnected||location.hash!==pageHash||document.visibilityState==='hidden'){
     finish(false);
     return;
    }
    const currentTarget=target.getBoundingClientRect();
    if(currentTarget.width<2||currentTarget.height<2){finish(false);return}
    const endX=currentTarget.left+currentTarget.width/2;
    const endY=currentTarget.top+currentTarget.height/2;
    const dx=endX-startX,dy=endY-startY;
    const arc=Math.min(104,Math.max(30,Math.abs(dx)*.055+Math.abs(dy)*.035));
    const p1x=startX+dx*.24,p1y=startY+dy*.2-arc;
    const p2x=startX+dx*.77,p2y=startY+dy*.78-arc*.22;
    const progress=Math.min(1,Math.max(0,(now-startTime)/duration));
    const pathProgress=easeInOut(progress);
    const x=cubic(startX,p1x,p2x,endX,pathProgress);
    const y=cubic(startY,p1y,p2y,endY,pathProgress);
    const shrinkProgress=.46*progress+.54*pathProgress;
    const scale=1-.78*shrinkProgress;
    const rotation=Math.sin(progress*Math.PI)*2.2;
    const fadeProgress=Math.max(0,(progress-.84)/.16);
    const opacity=1-Math.pow(fadeProgress,1.15);
    ghost.style.transform=`translate3d(${x-startX}px,${y-startY}px,0) scale(${scale}) rotate(${rotation}deg)`;
    ghost.style.opacity=String(opacity);
    if(progress<1)frameId=window.requestAnimationFrame(tick);
    else finish(true);
   }catch(error){finish(false)}
  };
  let startTime=null;
  frameId=window.requestAnimationFrame(now=>{
   startTime=now;
   tick(now);
  });
 });
}
// مثل AddToCartForm: اعتبارسنجی سایز/رنگ و تعداد قبل از افزودن حفظ می‌شود.
function addP(){
 if(productAddBusy)return;
 const p=P[PS.id];if(!p||!p.st){toast('این محصول ناموجود است','err');return}
 const E={};if(p.sz.length&&!PS.s)E.s='این فیلد لازم است.';if(p.cl.length&&!PS.c)E.c='این فیلد لازم است.';
 const inCart=cart.filter(x=>x.id==PS.id&&x.s==PS.s&&x.c==PS.c).reduce((a,x)=>a+x.q,0);if(!E.s&&!E.c&&inCart+PS.q>p.st)E.q='تعداد درخواستی از موجودی فعلی بیشتر است.';
 PS.err=E;if(E.s||E.c||E.q){R(E.s?'pd-sz':E.c?'pd-cl':'pd-qt');return}
 const previousCartCount=cart.reduce((total,item)=>total+item.q,0);
 if(!cadd(PS.id,PS.s,PS.c,PS.q))return;
 // برنامه‌های نقش‌محور همان رفتار قبلی را حفظ می‌کنند؛ انیمیشن و ماندن در صفحه مخصوص Preview است.
 if(APP.fixed){toast('محصول به سبد خرید اضافه شد.');location.hash='#/cart';return}
 const nextCartCount=cart.reduce((total,item)=>total+item.q,0);
 productAddBusy=true;
 const button=$('#pd-add');if(button){button.disabled=true;button.setAttribute('aria-busy','true')}
 flyProductToCart(previousCartCount,nextCartCount).then(()=>{
  productAddBusy=false;
  if(button&&button.isConnected){button.disabled=false;button.removeAttribute('aria-busy')}
  toast('محصول با موفقیت به سبد خرید اضافه شد.');
 },()=>{
  productAddBusy=false;
  if(button&&button.isConnected){button.disabled=false;button.removeAttribute('aria-busy')}
  writeCartCount(nextCartCount);
  toast('محصول با موفقیت به سبد خرید اضافه شد.');
 });
}
function qP(d){PS.q=Math.max(1,Math.min(P[PS.id].st,PS.q+d));if(PS.err)PS.err.q='';R('x')}
function cq(k,d){const x=cart[k],n=x.q+d;if(n<1){toast('تعداد باید دست‌کم یک باشد.','err');return}if(n>P[x.id].st){toast('تعداد درخواستی از موجودی فعلی بیشتر است.','err');return}x.q=n;save();R('x');toast('تعداد محصول به‌روزرسانی شد.')}
function rm(k){cart.splice(k,1);save();R('x');toast('محصول از سبد خرید حذف شد.')}
function tf(i){fav=fav.includes(i)?fav.filter(x=>x!=i):[...fav,i];save();R('x')}
const rate=p=>p.rv?`<span class="mu sm">★ ${F(p.r)} (${F(p.rv)} نظر)</span>`:'',sk=p=>p.st==0?tg('ناموجود','m'):p.st<5?tg('تنها '+F(p.st)+' عدد','g lo'):tg('موجود','ok');
const fvb=(p,c='')=>`<button class="fv ${fav.includes(p.id)?'on':''} ${c}" aria-pressed="${fav.includes(p.id)}" aria-label="${fav.includes(p.id)?'حذف از':'افزودن به'} علاقه‌مندی‌ها: ${p.n}" onclick="tf(${p.id})">${fav.includes(p.id)?'♥':'♡'}</button>`;
const pc=p=>`<article class="card pcd"><a href="#/product/${p.id}" aria-label="مشاهده ${p.n}">${im.p(p)}</a><div class="b"><a href="#/product/${p.id}"><b>${p.n}</b></a><div class="mu sm">${p.c}</div>${rate(p)}<div class="gold">${T(p.p)}</div>${p.ref?'<div class="mu sm">قیمت مرجع بازار</div>':p.demo?`<div>${tg('نمونه آزمایشی','m')}</div>`:''}${sk(p)}<div class="pa"><a class="btn s" href="#/product/${p.id}" aria-label="مشاهده و انتخاب ${p.n}">مشاهده و انتخاب محصول</a>${fvb(p)}</div></div></article>`;
const chp=(t,on,fn,x='')=>`<button class="chip ${on?'on':''}" aria-pressed="${!!on}" ${x} onclick="${fn}">${t}</button>`;
const fcount=()=>(cat?1:0)+(FS.pmin||FS.pmax?1:0)+FS.sz.length+FS.col.length+(FS.lv?1:0)+(FS.fv?1:0);
const fp=()=>`<aside class="sf ${FS.open?'open':''}" id="sf" aria-label="فیلترها"><div class="sfh"><b>فیلترها</b><button class="chip" onclick="clr()">پاک کردن فیلترها</button></div><label class="fl">دسته‌بندی<select onchange="cat=this.value;storePage=1;R('x')"><option value="">همه</option>${CATS.map(c=>`<option ${cat==c?'selected':''}>${c}</option>`).join('')}</select></label><div class="fl">محدوده قیمت (تومان)<div class="fr"><input id="pmin" inputmode="numeric" aria-label="حداقل قیمت" placeholder="حداقل" value="${FS.pmin||''}" oninput="FS.pmin=num(this.value);storePage=1;R('pmin')"><input id="pmax" inputmode="numeric" aria-label="حداکثر قیمت" placeholder="حداکثر" value="${FS.pmax||''}" oninput="FS.pmax=num(this.value);storePage=1;R('pmax')"></div></div><div class="fl">سایز<div class="chips">${SZ_ALL.map(s=>chp(s,FS.sz.includes(s),`tgl('sz','${s}')`)).join('')}</div></div><div class="fl">رنگ<div class="chips">${ALLC.map(s=>chp(s,FS.col.includes(s),`tgl('col','${s}')`)).join('')}</div></div><div class="fl">سطح<div class="chips">${LVS.map(s=>chp(s,FS.lv==s,`sF('lv',FS.lv=='${s}'?'':'${s}')`)).join('')}</div></div><div class="fl">${chp('فقط علاقه‌مندی‌ها',FS.fv,'sF(\'fv\',!FS.fv)')}</div><div class="sfa"><button class="btn" onclick="sF('open',false)">اعمال فیلترها</button><button class="btn o" onclick="clr()">پاک کردن</button></div></aside>`;
const REC=[['تازه جودو را شروع کرده‌ام',['لباس رزمی جودو سامکو مدل Olympic','کمربند احسان رزم ضخیم — سفید','محافظ لثه ونوم VG203','ساک ورزشی مدل SH-0013']],['برای تمرین حرفه‌ای آماده‌ام',['کش تمرین جودو سامکو (اوچی‌کمی)','آدمک کشتی','کش پاورباند Pro کد Blk-22mm','نردبان چابکی ۵ متری']],['برای مسابقه آماده می‌شوم',['لباس جودو سامکو مدل Approved (سایز S تا XXL)','لباس جودو قهرمانی ایران رزم کد ۴۰۰۰ آبی','کرنومتر فلوت F5853','سوت داوری FOX 40']]];
function startCheckout(){if(!cart.length){toast('سبد خرید شما خالی است','err');location.hash='#/store';return}resetCheckout();location.hash='#/checkout'}
function checkoutField(k,v){CHECKOUT[k]=v}
function checkoutNext(){
 if(!cart.length){toast('سبد خرید شما خالی است','err');location.hash='#/cart';return}
 if(!ME){location.hash='#/login?next=%23%2Fcheckout';return}
 const keys=['name','phone','province','city','postal','address'];for(const k of keys){const e=document.getElementById('co-'+k);if(e)CHECKOUT[k]=e.value.trim()}
 const n=document.getElementById('co-notes');if(n)CHECKOUT.notes=n.value.trim();const d=document.getElementById('co-delivery');if(d)CHECKOUT.delivery=d.value;
 let ph=nz(CHECKOUT.phone);if(ph.startsWith('0098'))ph='0'+ph.slice(4);else if(ph.startsWith('98'))ph='0'+ph.slice(2);const pc=nz(CHECKOUT.postal),E={};
 if(!CHECKOUT.name)E['co-name']='نام و نام خانوادگی گیرنده را وارد کنید.';else if(CHECKOUT.name.length<3)E['co-name']='نام گیرنده باید حداقل ۳ حرف باشد.';
 if(!CHECKOUT.phone)E['co-phone']='شماره موبایل را وارد کنید.';else if(!/^09\d{9}$/.test(ph))E['co-phone']='شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود؛ مثل ۰۹۱۲۳۴۵۶۷۸۹.';
 if(!CHECKOUT.province)E['co-province']='استان را وارد کنید.';
 if(!CHECKOUT.city)E['co-city']='شهر را وارد کنید.';
 if(!CHECKOUT.postal)E['co-postal']='کد پستی را وارد کنید.';else if(!/^\d{10}$/.test(pc))E['co-postal']='کد پستی باید ۱۰ رقم باشد (بدون خط تیره).';
 if(!CHECKOUT.address)E['co-address']='نشانی کامل را وارد کنید.';else if(CHECKOUT.address.length<10)E['co-address']='نشانی را کامل‌تر بنویسید: خیابان، کوچه، پلاک و واحد.';
 const f=document.getElementById('co-form');if(f&&!fErr(f,E))return;
 CHECKOUT.phone=ph;CHECKOUT.postal=pc;CHECKOUT.step=1;R('x');scrollTo(0,0)
}
function checkoutBack(){CHECKOUT.step=0;R('x')}
