const num=v=>+String(v).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^\d]/g,'')||0;
const CCOL=[['سفید','آبی','مشکی'],['سفید'],['مشکی','خاکستری'],['مشکی','قرمز'],['مشکی','آبی','خاکستری'],['مشکی','قرمز','آبی'],['مشکی','آبی'],['آبی','قرمز','مشکی']],BC=[['سفید'],['سبز'],['مشکی']],CM=['پنبه (نمونه)','پنبه ضخیم (نمونه)','لاستیک و پارچه (نمونه)','فلز و لاستیک (نمونه)','پارچه (نمونه)','فوم و پارچه (نمونه)','فوم و لاستیک (نمونه)','فوم فشرده (نمونه)'];
const LVS=['مبتدی','متوسط','پیشرفته','همه سطوح'],SZS=['XS','S','M','L','XL','XXL'],SZG={XS:['۱۴۰–۱۵۰','۳۵–۴۵'],S:['۱۵۰–۱۶۰','۴۵–۵۵'],M:['۱۶۰–۱۷۰','۵۵–۶۵'],L:['۱۷۰–۱۸۰','۶۵–۷۵'],XL:['۱۸۰–۱۹۰','۷۵–۹۰'],XXL:['۱۹۰–۲۰۰','۹۰–۱۱۰']};
P.forEach(p=>{if(p.ref){Object.assign(p,{rv:0,st:25,sold:0,d:p.id,ds:`${p.n}؛ ${p.grp}. قیمت نمایش‌داده‌شده قیمت مرجع بازار (${p.pdate}) از ${p.src} است و قیمت نهایی فروش تاتامی پلاس نیست.`});return}const i=p.id%3,lv=LVS[(p.ci+i)%4];Object.assign(p,{rv:12+(p.id*17)%180,st:p.id%9==4?0:p.id%7==2?3:25,sold:0,d:p.id,lv,sz:p.ci==0?SZS:p.ci==5&&i>0?['S','M','L']:[],cl:p.ci==1?BC[i]:CCOL[p.ci],ds:`${p.n} از دسته ${p.c} برای سطح ${lv}؛ توضیح نمایشی محصول در نمونه اولیه.`,ap:['کلاس تمرین','مسابقه','تمرین در خانه','باشگاه'][(p.ci+i)%4]})});
const ALLC=[...new Set(P.flatMap(p=>p.cl))],SZ_ALL=[...SZS,'2','3','4','5'].filter(s=>P.some(p=>p.sz.includes(s)));
const FS={pmin:0,pmax:0,sz:[],col:[],lv:'',fv:false,open:false};let PS={id:-1};
let CHECKOUT={step:0,name:'',phone:'',province:'',city:'',postal:'',address:'',delivery:'standard',notes:''};
const tgl=(k,v)=>{const a=FS[k];FS[k]=a.includes(v)?a.filter(x=>x!=v):[...a,v];R('x')},sF=(k,v)=>{FS[k]=v;R('x')};
const clr=()=>{q='';cat='';Object.assign(FS,{pmin:0,pmax:0,sz:[],col:[],lv:'',fv:false});R('x')};
const cadd=(id,s,c,n)=>{const p=P[id];if(!p||!p.st){toast('این محصول ناموجود است','err');return false}const inCart=cart.filter(x=>x.id==id).reduce((a,x)=>a+x.q,0),room=Math.max(0,p.st-inCart);if(room<=0||n>room){toast(room?'تعداد درخواستی بیشتر از موجودی است':'به حداکثر موجودی این محصول رسیده‌اید','err');return false}const e=cart.find(x=>x.id==id&&x.s==s&&x.c==c);e?e.q+=n:cart.push({id,s,c,q:n});save();return true};
const toast=(t,k='')=>{const e=$('#ts');e.textContent=t;e.className='tp-toast on '+k;clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2200)};
function qadd(id){const p=P[id];if(!p||!p.st){toast('این محصول ناموجود است','err');return}if(p.sz.length||p.cl.length){location.hash='#/product/'+id;return}if(cadd(id,'','',1))toast('به سبد خرید اضافه شد')}
function addP(){const p=P[PS.id];if(!p||!p.st){toast('این محصول ناموجود است','err');return}if(p.sz.length&&!PS.s){toast('لطفاً سایز را انتخاب کنید','err');return}if(p.cl.length&&!PS.c){toast('لطفاً رنگ را انتخاب کنید','err');return}if(cadd(PS.id,PS.s,PS.c,PS.q)){toast('به سبد خرید اضافه شد');location.hash='#/cart'}}
function qP(d){PS.q=Math.max(1,Math.min(P[PS.id].st,PS.q+d));R('x')}
function cq(k,d){const x=cart[k];x.q=Math.max(1,Math.min(P[x.id].st,x.q+d));save();R('x')}
function rm(k){cart.splice(k,1);save();R('x')}
function tf(i){fav=fav.includes(i)?fav.filter(x=>x!=i):[...fav,i];save();R('x')}
const rate=p=>p.rv?`<span class="mu sm">★ ${F(p.r)} (${F(p.rv)} نظر)</span>`:'',sk=p=>p.st==0?tg('ناموجود','m'):p.st<5?tg('تنها '+F(p.st)+' عدد','g'):tg('موجود');
const fvb=(p,c='')=>`<button class="fv ${fav.includes(p.id)?'on':''} ${c}" aria-pressed="${fav.includes(p.id)}" aria-label="${fav.includes(p.id)?'حذف از':'افزودن به'} علاقه‌مندی‌ها: ${p.n}" onclick="tf(${p.id})">${fav.includes(p.id)?'♥':'♡'}</button>`;
const pc=p=>`<article class="card pcd"><a href="#/product/${p.id}" aria-label="مشاهده ${p.n}">${im.p(p)}</a><div class="b"><a href="#/product/${p.id}"><b>${p.n}</b></a><div class="mu sm">${p.c}</div>${rate(p)}<div class="gold">${T(p.p)}</div>${p.ref?'<div class="mu sm">قیمت مرجع بازار</div>':p.demo?`<div>${tg('نمونه آزمایشی','m')}</div>`:''}${sk(p)}<div class="pa"><button class="btn s" ${p.st?'':'disabled'} onclick="qadd(${p.id})">${p.st?'افزودن به سبد':'ناموجود'}</button><a class="btn s o" href="#/product/${p.id}">مشاهده محصول</a>${fvb(p)}</div></div></article>`;
const chp=(t,on,fn,x='')=>`<button class="chip ${on?'on':''}" aria-pressed="${!!on}" ${x} onclick="${fn}">${t}</button>`;
const fcount=()=>(cat?1:0)+(FS.pmin||FS.pmax?1:0)+FS.sz.length+FS.col.length+(FS.lv?1:0)+(FS.fv?1:0);
const fp=()=>`<aside class="sf ${FS.open?'open':''}" id="sf" aria-label="فیلترها"><div class="sfh"><b>فیلترها</b><button class="chip" onclick="clr()">پاک کردن فیلترها</button></div><label class="fl">دسته‌بندی<select onchange="cat=this.value;R('x')"><option value="">همه</option>${CATS.map(c=>`<option ${cat==c?'selected':''}>${c}</option>`).join('')}</select></label><div class="fl">محدوده قیمت (تومان)<div class="fr"><input id="pmin" inputmode="numeric" aria-label="حداقل قیمت" placeholder="حداقل" value="${FS.pmin||''}" oninput="FS.pmin=num(this.value);R('pmin')"><input id="pmax" inputmode="numeric" aria-label="حداکثر قیمت" placeholder="حداکثر" value="${FS.pmax||''}" oninput="FS.pmax=num(this.value);R('pmax')"></div></div><div class="fl">سایز<div class="chips">${SZ_ALL.map(s=>chp(s,FS.sz.includes(s),`tgl('sz','${s}')`)).join('')}</div></div><div class="fl">رنگ<div class="chips">${ALLC.map(s=>chp(s,FS.col.includes(s),`tgl('col','${s}')`)).join('')}</div></div><div class="fl">سطح<div class="chips">${LVS.map(s=>chp(s,FS.lv==s,`sF('lv',FS.lv=='${s}'?'':'${s}')`)).join('')}</div></div><div class="fl">${chp('فقط علاقه‌مندی‌ها',FS.fv,'sF(\'fv\',!FS.fv)')}</div><div class="sfa"><button class="btn" onclick="sF('open',false)">اعمال فیلترها</button><button class="btn o" onclick="clr()">پاک کردن</button></div></aside>`;
const REC=[['تازه جودو را شروع کرده‌ام',['لباس رزمی جودو سامکو مدل Olympic','کمربند احسان رزم ضخیم — سفید','محافظ لثه ونوم VG203','ساک ورزشی مدل SH-0013']],['برای تمرین حرفه‌ای آماده‌ام',['کش تمرین جودو سامکو (اوچی‌کمی)','آدمک کشتی','کش پاورباند Pro کد Blk-22mm','نردبان چابکی ۵ متری']],['برای مسابقه آماده می‌شوم',['لباس جودو سامکو مدل Approved (سایز S تا XXL)','لباس جودو قهرمانی ایران رزم کد ۴۰۰۰ آبی','کرنومتر فلوت F5853','سوت داوری FOX 40']]];
function startCheckout(){if(!cart.length){toast('سبد خرید شما خالی است','err');location.hash='#/store';return}CHECKOUT.step=0;location.hash='#/checkout'}
function checkoutField(k,v){CHECKOUT[k]=v}
function checkoutNext(){
 if(!cart.length){toast('سبد خرید شما خالی است','err');location.hash='#/cart';return}
 const keys=['name','phone','province','city','postal','address'];for(const k of keys){const e=document.getElementById('co-'+k);if(e)CHECKOUT[k]=e.value.trim()}
 const n=document.getElementById('co-notes');if(n)CHECKOUT.notes=n.value.trim();const d=document.getElementById('co-delivery');if(d)CHECKOUT.delivery=d.value;
 if(!CHECKOUT.name||!CHECKOUT.phone||!CHECKOUT.province||!CHECKOUT.city||!CHECKOUT.postal||!CHECKOUT.address){toast('لطفاً همه فیلدهای ضروری را تکمیل کنید','err');return}
 const phone=CHECKOUT.phone.replace(/[^0-9۰-۹]/g,'');if(!/^(09[0-9۰-۹]{9}|۰۹[۰-۹]{9})$/.test(phone)){toast('شماره موبایل را به‌صورت ۱۱ رقمی وارد کنید','err');return}
 if(!/^[0-9۰-۹]{10}$/.test(CHECKOUT.postal.replace(/\s/g,''))){toast('کد پستی باید ۱۰ رقم باشد','err');return}
 CHECKOUT.step=1;R('x')
}
function checkoutBack(){CHECKOUT.step=0;R('x')}
function checkoutDemoConfirm(){if(!cart.length){location.hash='#/cart';return}CHECKOUT.step=2;R('x')}
function checkoutRestart(){CHECKOUT.step=0;location.hash='#/cart'}
