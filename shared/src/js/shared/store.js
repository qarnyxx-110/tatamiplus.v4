const num=v=>+String(v).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^\d]/g,'')||0;
const CCOL=[['سفید','آبی','مشکی'],['سفید'],['مشکی','خاکستری'],['مشکی','قرمز'],['مشکی','آبی','خاکستری'],['مشکی','قرمز','آبی'],['مشکی','آبی'],['آبی','قرمز','مشکی']],BC=[['سفید'],['سبز'],['مشکی']],CM=['پنبه (نمونه)','پنبه ضخیم (نمونه)','لاستیک و پارچه (نمونه)','فلز و لاستیک (نمونه)','پارچه (نمونه)','فوم و پارچه (نمونه)','فوم و لاستیک (نمونه)','فوم فشرده (نمونه)'];
const LVS=['مبتدی','متوسط','پیشرفته','همه سطوح'],SZS=['XS','S','M','L','XL','XXL'],SZG={XS:['۱۴۰–۱۵۰','۳۵–۴۵'],S:['۱۵۰–۱۶۰','۴۵–۵۵'],M:['۱۶۰–۱۷۰','۵۵–۶۵'],L:['۱۷۰–۱۸۰','۶۵–۷۵'],XL:['۱۸۰–۱۹۰','۷۵–۹۰'],XXL:['۱۹۰–۲۰۰','۹۰–۱۱۰']};
P.forEach(p=>{if(p.ref){Object.assign(p,{rv:0,st:25,sold:0,d:p.id,ds:`${p.n}؛ ${p.grp}. قیمت نمایش‌داده‌شده قیمت مرجع بازار (${p.pdate}) از ${p.src} است و قیمت نهایی فروش تاتامی پلاس نیست.`});return}const i=p.id%3,lv=LVS[(p.ci+i)%4];Object.assign(p,{rv:12+(p.id*17)%180,st:p.id%9==4?0:p.id%7==2?3:25,sold:0,d:p.id,lv,sz:p.ci==0?SZS:p.ci==5&&i>0?['S','M','L']:[],cl:p.ci==1?BC[i]:CCOL[p.ci],ds:`${p.n} از دسته ${p.c} برای سطح ${lv}؛ توضیح نمایشی محصول در نمونه اولیه.`,ap:['کلاس تمرین','مسابقه','تمرین در خانه','باشگاه'][(p.ci+i)%4]})});
const ALLC=[...new Set(P.flatMap(p=>p.cl))],SZ_ALL=[...SZS,'2','3','4','5'].filter(s=>P.some(p=>p.sz.includes(s)));
const STORE_PAGE_SIZE=24;let storePage=1;const FS={pmin:0,pmax:0,sz:[],col:[],lv:'',fv:false,open:false};let PS={id:-1};
let CHECKOUT={step:0,name:'',phone:'',province:'',city:'',postal:'',address:'',notes:'',delivery:''};
function resetCheckout(){Object.assign(CHECKOUT,{step:0,name:'',phone:'',province:'',city:'',postal:'',address:'',notes:'',delivery:''})}
const tgl=(k,v)=>{FS[k]=FS[k].includes(v)?[]:[v];storePage=1;R('x')},sF=(k,v)=>{FS[k]=v;storePage=1;R('x')};
const clr=()=>{q='';cat='';storePage=1;Object.assign(FS,{pmin:0,pmax:0,sz:[],col:[],lv:'',fv:false});R('x')};
const cadd=(id,s,c,n)=>{const p=P[id];if(!p||!p.st){toast('این محصول ناموجود است','err');return false}const inCart=cart.filter(x=>x.id==id).reduce((a,x)=>a+x.q,0),room=Math.max(0,p.st-inCart);if(room<=0||n>room){toast(room?'تعداد درخواستی بیشتر از موجودی است':'به حداکثر موجودی این محصول رسیده‌اید','err');return false}const e=cart.find(x=>x.id==id&&x.s==s&&x.c==c);e?e.q+=n:cart.push({id,s,c,q:n});save();return true};
const toast=(t,k='')=>{const e=$('#ts');e.textContent=t;e.className='tp-toast on '+(k==='err'?'error':k);e.setAttribute('role',k==='err'?'alert':'status');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2200)};
function qadd(id){const p=P[id];if(!p||!p.st){toast('این محصول ناموجود است','err');return}if(p.sz.length||p.cl.length){location.hash='#/product/'+id;return}if(cadd(id,'','',1))toast('محصول به سبد خرید اضافه شد.')}
// مثل AddToCartForm: خطای «تنوع» (سایز/رنگ) و «تعداد» کنار همان فیلد؛ موفقیت ← سبد خرید
function addP(){const p=P[PS.id];if(!p||!p.st){toast('این محصول ناموجود است','err');return}const E={};if(p.sz.length&&!PS.s)E.s='این فیلد لازم است.';if(p.cl.length&&!PS.c)E.c='این فیلد لازم است.';
 const inCart=cart.filter(x=>x.id==PS.id&&x.s==PS.s&&x.c==PS.c).reduce((a,x)=>a+x.q,0);if(!E.s&&!E.c&&inCart+PS.q>p.st)E.q='تعداد درخواستی از موجودی فعلی بیشتر است.';
 PS.err=E;if(E.s||E.c||E.q){R(E.s?'pd-sz':E.c?'pd-cl':'pd-qt');return}if(cadd(PS.id,PS.s,PS.c,PS.q)){toast('محصول به سبد خرید اضافه شد.');location.hash='#/cart'}}
function qP(d){PS.q=Math.max(1,Math.min(P[PS.id].st,PS.q+d));if(PS.err)PS.err.q='';R('x')}
function cq(k,d){const x=cart[k],n=x.q+d;if(n<1){toast('تعداد باید دست‌کم یک باشد.','err');return}if(n>P[x.id].st){toast('تعداد درخواستی از موجودی فعلی بیشتر است.','err');return}x.q=n;save();R('x');toast('تعداد محصول به‌روزرسانی شد.')}
function rm(k){cart.splice(k,1);save();R('x');toast('محصول از سبد خرید حذف شد.')}
function tf(i){fav=fav.includes(i)?fav.filter(x=>x!=i):[...fav,i];save();R('x')}
const rate=p=>p.rv?`<span class="mu sm">★ ${F(p.r)} (${F(p.rv)} نظر)</span>`:'',sk=p=>p.st==0?tg('ناموجود','m'):p.st<5?tg('تنها '+F(p.st)+' عدد','g lo'):tg('موجود','ok');
const fvb=(p,c='')=>`<button class="fv ${fav.includes(p.id)?'on':''} ${c}" aria-pressed="${fav.includes(p.id)}" aria-label="${fav.includes(p.id)?'حذف از':'افزودن به'} علاقه‌مندی‌ها: ${p.n}" onclick="tf(${p.id})">${fav.includes(p.id)?'♥':'♡'}</button>`;
const pc=p=>`<article class="card pcd"><a href="#/product/${p.id}" aria-label="مشاهده ${p.n}">${im.p(p)}</a><div class="b"><a href="#/product/${p.id}"><b>${p.n}</b></a><div class="mu sm">${p.c}</div>${rate(p)}<div class="gold">${T(p.p)}</div>${p.ref?'<div class="mu sm">قیمت مرجع بازار</div>':p.demo?`<div>${tg('نمونه آزمایشی','m')}</div>`:''}${sk(p)}<div class="pa"><button class="btn s" ${p.st?'':'disabled'} onclick="qadd(${p.id})">${p.st?'افزودن به سبد':'ناموجود'}</button><a class="btn s o" href="#/product/${p.id}">مشاهده محصول</a>${fvb(p)}</div></div></article>`;
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
