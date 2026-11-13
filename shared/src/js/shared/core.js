const $=s=>document.querySelector(s),F=n=>Number(n).toLocaleString('fa-IR'),T=n=>F(n)+' تومان';
const L=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},S=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
let role=L('role',null),cart=L('cart',[]),fav=L('fav',[]),saved=L('saved',[]),prog=L('prog',{});
const allowed=k=>!APP.deny.includes(k);
let PT=null;
const NAV=APP.nav||[['','خانه'],['store','فروشگاه'],['online-coach','مربی آنلاین'],['courses','دوره‌ها'],['tournaments','تورنمنت‌ها'],['videos','ویدیوهای ضبط‌شده'],['ai','آنالیز هوش مصنوعی'],['academy','آکادمی اساتید'],['coaches','مربیان تاتامی'],['clubs','باشگاه‌ها'],['blog','بلاگ'],['tatamipedia','تاتامی‌پدیا'],['sponsors','حامیان تاتامی پلاس'],['gems','جم'],['search','جستجو']];
const CATS=['لباس جودو','کمربند جودو','تجهیزات تمرینی','قدرت و آمادگی جسمانی','لوازم شخصی','محافظ‌ها و ایمنی','تجهیزات تمرین در خانه','تجهیزات باشگاهی'];
const PN=[['کیمونو مسابقه‌ای','کیمونو تمرینی سبک','کیمونو کودکان'],['کمربند سفید','کمربند سبز','کمربند مشکی'],['کیسه بوکس ضربه','لاستیک تمرین اوچی‌کومی','بازوبند پرتاب'],['کش مقاومتی','کتل‌بل ۱۶ کیلویی','طناب کنفی'],['کیف ورزشی','دمپایی تاتامی','حوله ورزشی'],['محافظ دهان','مچ‌بند حمایتی','زانوبند'],['تشک تاشو خانگی','مانکن پرتاب','قفسه کمربند'],['تشک تاتامی رقابتی','ساعت مسابقه','تخته امتیاز']];
// محصولات: کاتالوگ کارفرما (STORE_CATALOG ← data/store-products.json) + نمونه‌های آزمایشی فقط برای دسته‌ای که کاتالوگ ندارد (جلوگیری از تکرار)
const P=[];STORE_CATALOG.forEach(x=>{const ci=CATS.indexOf(x.category);P.push({id:P.length,sku:x.sku,n:x.name,c:x.category,ci,p:x.price,r:0,h:(ci*45+P.length*7)%360,ref:1,grp:x.group,src:x.source==='torob'?'ترب':'دیجی‌کالا',pdate:x.priceDate,slot:x.slot,lv:x.level,sz:x.sizes.slice(),szEstimated:x.sizeEstimated===true,cl:x.colors.slice()})});
const CATALOG_CATS=new Set(STORE_CATALOG.map(x=>x.category));
CATS.forEach((c,ci)=>{if(CATALOG_CATS.has(c))return;PN[ci].forEach((n,i)=>P.push({id:P.length,n,c,ci,p:(ci*37+i*23+180)*1000,r:(4+((ci+i)%10)/10).toFixed(1),h:(ci*45+i*30)%360,demo:1}))});
const V=[['اوچی‌ماتا: ورود و کنترل',0,1],['سئوی‌ناگه گام‌به‌گام',0,0],['اوسوتو‌گاری در مسابقه',0,2],['کنترل در خاک',1,1],['اوسایکومی‌وازه',1,0],['تمرین اوچی‌کومی',2,0],['رندوری هدفمند',2,1],['برنامه هفته مسابقه',3,2],['وزن‌کشی و تغذیه',3,1],['قدرت مخصوص جودو',4,2],['تحرک‌پذیری مفاصل',4,0],['ترکیب‌های پیشرفته',0,2]].map((v,i)=>({id:i,t:v[0],c:['تکنیک‌ها','خاک','تمرین','آمادگی مسابقه','بدنسازی'][v[1]],l:['مبتدی','متوسط','پیشرفته'][v[2]],d:12+i*4,i:i%6,v:1200+i*870,h:200+i*17}));
// منبع واحد مربیان: data/coaches.json (COACHES). I = نمای آکادمی روی همان داده، بدون تکرار اطلاعات
const I=COACHES.map((c,i)=>({id:i,n:c.firstName+' '+c.lastName,s:c.academySpecialty,k:c.coursesLabel,h:c.hue,slug:c.slug}));
const TN=[['جام بهاره تهران','آینده','۱۴۰۵/۰۷/۲۵'],['لیگ باشگاه‌های اصفهان','آینده','۱۴۰۵/۰۸/۱۲'],['مسابقات کشوری نوجوانان','جاری','۱۴۰۵/۰۷/۰۸'],['جام دوستی شیراز','جاری','۱۴۰۵/۰۷/۰۹'],['قهرمانی مشهد','پایان‌یافته','۱۴۰۵/۰۵/۲۰'],['جام رمضان تبریز','پایان‌یافته','۱۴۰۵/۰۳/۱۱']].map((x,i)=>({id:i,n:x[0],s:x[1],d:x[2],p:60+i*22,h:i*60}));
const IMG_BASE='assets/images/',IMG_DATA={};/* IMG_DATA['judo/uchi-mata.jpg']='data:image/jpeg;base64,...' overrides file paths */
const pad=n=>String(n).padStart(2,'0');
const ph=(h,t,cls='',slot,alt)=>{const src=slot?(IMG_DATA[slot]||(IMG_AVAIL.includes(slot)?IMG_BASE+slot:'')):'';return`<figure class="ph ${cls}" style="--h:${h}" data-slot="${slot||''}">${src?`<img src="${src}" alt="${alt||t}" loading="${cls.includes('eager')?'eager':'lazy'}" decoding="async" onload="this.parentNode.classList.add('ok')" onerror="this.remove()">`:''}<svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true"><circle cx="14" cy="8" r="4"/><circle cx="27" cy="10" r="4"/><path d="M8 34l3-18 8 3 3 15zM22 30l4-15 8 4-3 14z"/></svg><figcaption>${t||'تصویر نمونه'}</figcaption></figure>`};
const im={p:(p,c='')=>ph(p.h,p.c,c,p.slot||`products/product-${pad(p.id+1)}.jpg`,`تصویر محصول ${p.n} از دسته ${p.c}`),v:(v,c='')=>ph(v.h,v.d+' دقیقه',c,`videos/video-${pad(v.id+1)}.jpg`,`تصویر شاخص ویدیوی ${v.t} با تدریس ${I[v.i].n}`),t:(t,c='')=>ph(t.h,t.s,c,`tournaments/tournament-${pad(t.id+1)}.jpg`,`تصویر مسابقات ${t.n}، وضعیت ${t.s}`),i:(x,c='')=>ph(x.h,'پرتره نمونه',c,`instructors/instructor-${pad(x.id+1)}.jpg`,`پرتره مربی ${x.n}، متخصص ${x.s}`)};
let ME=null;// حساب واردشده (در auth.js مقدار می‌گیرد)؛ سبد مهمان در cart و سبد هر حساب در cart:<username>
const cartKey=()=>ME?'cart:'+ME.username.toLowerCase():'cart';
const save=()=>{S(cartKey(),cart);S('fav',fav);S('saved',saved);S('prog',prog);$('#cc').textContent=cart.length?F(cart.reduce((a,x)=>a+x.q,0)):''};
// رنگ کمربندهای جودو: سطح‌ها و کمربندها با همان رنگ رتبه نمایش داده می‌شوند (همیشه همراه نام، نه فقط رنگ)
const BELTS=[['white','سفید'],['yellow','زرد'],['orange','نارنجی'],['green','سبز'],['blue','آبی'],['brown','قهوه‌ای'],['black','مشکی']];
const lvCls=l=>({'مبتدی':'lv1','متوسط':'lv2','پیشرفته':'lv3'})[l]||'';
const beltKey=n=>(BELTS.find(b=>b[1]===n)||[])[0]||'';
const beltChip=(n,dan)=>`<span class="tp-belt"><span class="tp-belt-bar tp-belt-${beltKey(n)||'white'}" aria-hidden="true">${dan?'<span class="tp-belt-tip"></span>':''}</span>کمربند ${n}</span>`;
const beltPath=cur=>{const ci=BELTS.findIndex(b=>b[1]===cur);return`<ol class="tp-beltpath" aria-label="مسیر کمربند">${BELTS.map((b,i)=>`<li class="${i<ci?'done':i===ci?'on':''}"${i===ci?' aria-current="step"':''}><span class="tp-belt-bar tp-belt-${b[0]}" aria-hidden="true"></span><span class="tp-bp-l">${b[1]}</span><span class="tp-sr-only">${i<ci?' (گذرانده)':i===ci?' (کمربند فعلی)':' (بعدی)'}</span></li>`).join('')}</ol>`};
const vc=v=>`<a class="card" href="#/video/${v.id}">${im.v(v)}<div class="b"><b>${v.t}</b><div class="mu" style="font-size:var(--tp-font-size-caption)">${I[v.i].n} · ${F(v.v)} بازدید</div><div><span class="tag">${v.c}</span> <span class="tag ${lvCls(v.l)}">${v.l}</span></div>${prog[v.id]?`<div class="bar" style="margin-top:var(--tp-space-xs)"><i style="width:${prog[v.id]}%"></i></div>`:''}<button class="chip ${saved.includes(v.id)?'on':''}" onclick="event.preventDefault();tv(${v.id})">${saved.includes(v.id)?'ذخیره‌شده':'ذخیره'}</button></div></a>`;
const tc=t=>`<a class="card" href="#/tournament/${t.id}">${im.t(t)}<div class="b"><b>${t.n}</b><div class="mu">${t.d} · ${F(t.p)} شرکت‌کننده</div><span class="tag">${t.s}</span></div></a>`;
const ic=x=>`<a class="card" href="#/instructor/${x.id}">${im.i(x,'r45')}<div class="b"><b>${x.n}</b><div class="mu">${x.s}</div><div class="gold">${x.k}</div><div class="mu sm">${F(x.exp)} سال سابقه · ${F(x.st)} هنرجو</div><span class="btn s o">مشاهده پروفایل</span></div></a>`;
function tv(i){saved=saved.includes(i)?saved.filter(x=>x!=i):[...saved,i];save();R()}
const RN={student:'هنرجو',coach:'مربی',club:'باشگاه'};
let q='',cat='',sort='',vcat='',vlev='',tab='آینده';
const views={};