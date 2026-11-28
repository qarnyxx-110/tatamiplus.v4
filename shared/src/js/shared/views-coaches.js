// فهرست عمومی مربیان از snapshot صفحهٔ رسمی در زمان build تأمین می‌شود.
let kfq='',ksp='',klv='';
const DIRECTORY=Array.isArray(COACH_DIRECTORY)&&COACH_DIRECTORY.length?COACH_DIRECTORY:COACHES;
const cName=c=>c.displayName||[c.firstName,c.lastName].filter(Boolean).join(' '),
 cClub=c=>c.clubName||CB[c.clubId]?.n||'نامشخص',
 cSpecs=c=>(c.specialties||[]).filter(s=>s&&s!=='نامشخص'),
 cLevel=c=>c.level||c.belt||'سطح ثبت نشده',
 cBio=c=>c.bio&&c.bio!=='نامشخص'?c.bio:'اطلاعات تکمیلی این مربی در منبع عمومی ثبت نشده است.',
 SPECS=[...new Set(DIRECTORY.flatMap(c=>cSpecs(c)))],
 LEVELS=[...new Set(DIRECTORY.map(c=>cLevel(c)).filter(x=>x&&x!=='سطح ثبت نشده'))];
const cPhoto=(c,cls)=>ph(c.hue||202,'تصویر مربی',cls,c.photo||'', 'عکس پروفایل '+esc(cName(c)));
const ccoach=c=>`<article class="card"><a href="#/coaches/${encodeURIComponent(c.slug)}" aria-label="پروفایل ${esc(cName(c))}">${cPhoto(c,'r45')}</a><div class="b"><a href="#/coaches/${encodeURIComponent(c.slug)}"><h3 style="font-size:var(--tp-font-size-lg)">${esc(cName(c))}</h3></a><div>${tg(esc(cLevel(c)),'g')}</div><div class="tp-cluster">${cSpecs(c).map(s=>tg(esc(s))).join('')}</div><p class="mu sm tp-clamp">${esc(cBio(c))}</p><a class="btn s" href="#/coaches/${encodeURIComponent(c.slug)}">مشاهده پروفایل</a></div></article>`;
const kSync=()=>setHashParams({q:kfq,sp:ksp,lv:klv});
const clrK=()=>{kfq='';ksp='';klv='';kSync();R('x')};
function coachesList(){try{const hp=hashParams();kfq=hp.get('q')||'';ksp=SPECS.includes(hp.get('sp'))?hp.get('sp'):'';klv=LEVELS.includes(hp.get('lv'))?hp.get('lv'):'';const n=nz(kfq),l=DIRECTORY.filter(c=>(!ksp||cSpecs(c).includes(ksp))&&(!klv||cLevel(c)===klv)&&(!n||nz(cName(c)+' '+c.searchText+' '+cSpecs(c).join(' ')+' '+cClub(c)).includes(n))),fc=(ksp?1:0)+(klv?1:0)+(kfq?1:0);
PT={t:'مربیان',d:'فهرست مربیان جودو تاتامی پلاس بر اساس اطلاعات عمومی منتشرشده.'};
const grp=(lab,items,cur,v)=>`<div class="tp-field"><span class="tp-label" id="g-${v}">${lab}</span><div class="chips" role="group" aria-labelledby="g-${v}" style="margin:0">${[['','همه'],...items.map(x=>[x,x])].map(([k,t])=>chp(esc(t),cur==k,`${v}='${k}';kSync();R('x')`)).join('')}</div></div>`;
return`<div class="w"><h1>مربیان</h1><p class="mu">مربیان جودو را پیدا کنید و پروفایل عمومی‌شان را ببینید.</p>
<div class="sbar"><label class="tp-sr-only" for="kfq">جستجوی مربی بر اساس نام یا تخصص</label><input id="kfq" type="search" placeholder="جستجوی نام یا تخصص..." value="${esc(kfq)}" oninput="kfq=this.value;kSync();R('kfq')"></div>
${grp('تخصص',SPECS,ksp,'ksp')}${LEVELS.length>1?grp('سطح مربیگری',LEVELS,klv,'klv'):''}
<div class="tp-cluster" style="margin:var(--tp-space-sm) 0"><b aria-live="polite">${F(l.length)} مربی</b>${fc?`<button type="button" class="chip" onclick="clrK()">پاک کردن فیلترها</button>`:''}</div>
${l.length?`<div class="pg">${l.map(ccoach).join('')}</div>`:tpState('empty','مربی‌ای پیدا نشد','عبارت جستجو یا فیلترها را تغییر دهید.','پاک کردن فیلترها','javascript:clrK()')}</div>`}catch(e){return`<div class="w">${tpState('error','بارگذاری فهرست مربیان ممکن نشد','دوباره تلاش کنید.','تلاش دوباره','javascript:R()')}</div>`}}
const secC=(t,b)=>`<section class="d-s" aria-label="${esc(t)}"><h2>${esc(t)}</h2>${b}</section>`;
function coachDetail(slug){const c=DIRECTORY.find(x=>String(x.slug)===String(slug));if(!c)return nfp('مربی‌ای پیدا نشد','#/coaches','مشاهده مربیان تاتامی');
const name=cName(c),specs=cSpecs(c),isPublic=!!c.displayName,level=cLevel(c),club=cClub(c),bio=cBio(c);
PT={t:name+' — مربی جودو',d:`پروفایل عمومی ${name}؛ ${level}، تخصص: ${specs.join('، ')||'ثبت نشده'}.`};
const rel=DIRECTORY.filter(x=>x!==c&&x.displayName&&x.specialties?.some(s=>specs.includes(s))).slice(0,3);
return`<div class="w">${crumb([['خانه','#/'],['مربیان','#/coaches'],[esc(name)]])}<div class="tp-profile"><div>${cPhoto(c,'r45 eager')}</div><div>${tg(isPublic?'اطلاعات عمومی':'پروفایل','m')}<h1>${esc(name)}</h1><div class="tp-cluster">${tg(esc(level),'g')}${c.belt?tg(esc(c.belt)):''}${specs.map(s=>tg(esc(s))).join('')}</div><h2 style="font-size:var(--tp-font-size-xl);margin-top:var(--tp-space-md)">معرفی حرفه‌ای</h2><p class="mu">${esc(bio)}</p><div class="tp-cluster"><a class="btn" href="#/coaches">بازگشت به فهرست مربیان</a><button type="button" class="btn o" onclick="shareCoach('${encodeURIComponent(c.slug)}')">اشتراک‌گذاری</button></div></div></div>
${secC('تخصص‌ها و سبک‌های آموزشی',specs.length?`<div class="tp-cluster">${specs.map(s=>tg(esc(s))).join('')}</div>`:'<p class="mu">تخصصی در اطلاعات عمومی ثبت نشده است.</p>')}
${secC('سطح مربیگری',`<p>${esc(level)}${c.belt?` · ${esc(c.belt)}`:''}</p>`)}
${secC('سوابق ورزشی و مربیگری',`<p>${c.experienceYears?`${F(c.experienceYears)} سال سابقه مربیگری`:'سابقه در منبع عمومی ثبت نشده است.'}</p>`)}
${secC('باشگاه مرتبط',`<p>${esc(club)}</p>`)}
${rel.length?secC('مربیان مشابه',`<div class="pg">${rel.map(ccoach).join('')}</div>`):''}</div>`}
function shareCoach(slug){const c=DIRECTORY.find(x=>String(x.slug)===String(slug));if(!c)return;const u=/^https?:$/.test(location.protocol)?new URL('coaches/'+encodeURIComponent(slug)+'/',location.href.replace(/[#?].*$/,'').replace(/[^/]*$/,'')).href:location.href;try{if(navigator.share){navigator.share({title:cName(c),url:u}).catch(()=>{});return}navigator.clipboard.writeText(u).then(()=>toast('پیوند پروفایل کپی شد'),()=>toast('کپی پیوند ممکن نشد','error'))}catch{toast('اشتراک‌گذاری در این مرورگر در دسترس نیست','error')}}
const myProfile=()=>{
 if(!ME||ME.role!=='coach')return`<div class="w">${tpState('empty','ورود به حساب مربی لازم است','برای مشاهده اطلاعات مربوط به حساب خود، ابتدا وارد حساب کاربری شوید.','بازگشت به حساب کاربری','#/profile')}</div>`;
 const a=myApp();PT={t:'پروفایل من',d:'اطلاعات درخواست مربیگری ثبت‌شده برای حساب شما.'};
 if(!a)return`<div class="w">${crumb([['خانه','#/'],['داشبورد','#/dashboard'],['پروفایل من']])}<h1>پروفایل من</h1><div class="warn">اطلاعات این صفحه فقط پس از ثبت درخواست مربیگری و در همین مرورگر نمایش داده می‌شود؛ هنوز پروفایل عمومی متصل به حساب شما از سرور دریافت نمی‌شود.</div>${tpState('empty','اطلاعات پروفایل ثبت نشده است','برای ثبت اطلاعات خود، ابتدا درخواست مربیگری را تکمیل کنید.','ثبت درخواست مربیگری','#/coach-apply')}</div>`;
 const status=APP_ST[a.status]||APP_ST.pending_review;
 const certificate=a.certificate_document&&typeof a.certificate_document.name==='string'?a.certificate_document.name:'ثبت نشده';
 const years=Number.isFinite(Number(a.years_experience))?F(Math.max(0,Number(a.years_experience))):'—';
 return`<div class="w">${crumb([['خانه','#/'],['داشبورد','#/dashboard'],['پروفایل من']])}<h1>پروفایل من</h1><div class="warn">این اطلاعات از درخواست مربیگری ثبت‌شده با همین حساب در حافظه همین مرورگر خوانده شده‌اند؛ تأیید یا انتشار پروفایل عمومی از سمت سرور انجام نشده است.</div><div class="tp-profile"><div><span class="tag ${status[1]}">${esc(status[0])}</span><p class="mu sm">وضعیت درخواست مربیگری</p><a class="btn o s" href="#/coach-application">مشاهده جزئیات درخواست</a></div><div><div class="tp-field"><label for="mp-u">نام کاربری حساب</label><input id="mp-u" value="${esc(ME.username)}" readonly></div><div class="tp-field"><label for="mp-l">سطح مربیگری ثبت‌شده</label><input id="mp-l" value="${esc(a.coaching_level)}" readonly></div><div class="tp-field"><label for="mp-s">تخصص‌ها</label><textarea id="mp-s" rows="2" readonly>${esc(a.specializations||'')}</textarea></div><div class="tp-field"><label for="mp-y">سابقه مربیگری</label><input id="mp-y" value="${years} سال" readonly></div>${a.club_name?`<div class="tp-field"><label for="mp-c">باشگاه</label><input id="mp-c" value="${esc(a.club_name)}" readonly></div>`:''}<div class="tp-field"><label for="mp-b">توضیحات مدارک</label><textarea id="mp-b" rows="3" readonly>${esc(a.certificate_details||'')}</textarea></div><div class="tp-field"><label for="mp-doc">فایل مدرک انتخاب‌شده</label><input id="mp-doc" value="${esc(certificate)}" readonly></div><div class="tp-cluster"><a class="btn" href="#/coach-application">پیگیری درخواست مربیگری</a><a class="btn o" href="#/coaches">مشاهده فهرست مربیان</a></div></div></div></div>`;
};
Object.assign(views,{academy:()=>coachesList(),coaches:(n,raw)=>raw===undefined?coachesList():coachDetail(raw),'my-profile':myProfile});
