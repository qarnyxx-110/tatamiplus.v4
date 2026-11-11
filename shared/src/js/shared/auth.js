// حساب کاربری و درخواست مربیگری، هم‌راستا با قرارداد بک‌اند Django (FRONTEND_BACKEND_HANDOFF_FA.md):
//  ثبت‌نام  POST /accounts/register/  → username, email, role(student|coach), password1, password2 ؛ ?role= فقط نقش اولیه را انتخاب می‌کند؛ پس از موفقیت ← /account/
//  ورود     POST /accounts/login/     → username, password ؛ next ؛ پس از موفقیت ← next یا /account/
//  مربیگری  POST /coaches/apply/      → coaching_level, specializations, years_experience, club_name, certificate_details, certificate_document (PDF/JPG/JPEG/PNG ≤ ۱۰MB)
//  وضعیت    GET  /coaches/application/ → pending_review | approved | rejected
//  سبد: مهمان در نشست؛ پس از ورود با سبد حساب ادغام می‌شود.  باشگاه: فقط نمایشی (حساب باشگاه ساخته نمی‌شود).
// هشدار: تا اتصال بک‌اند، همه‌چیز فقط در localStorage همین مرورگر است؛ احراز هویت واقعی نیست.
const AUTH_ROLES=['student','coach'];                       // نقش‌های پذیرفته‌شده بک‌اند
const APP_ROLE=APP.fixed?APP.role:null;                     // اپ ثابت: فقط همان نقش
const CLUB_DEMO=APP_ROLE==='club';                          // اپ باشگاه: حساب ساخته نمی‌شود
const UNAME_RE=/^[\p{L}\p{N}@.+_-]{1,150}$/u;
const userKey=u=>String(u).toLowerCase();
const validUser=v=>v&&typeof v==='object'&&typeof v.username==='string'&&UNAME_RE.test(v.username)&&typeof v.email==='string'&&v.email.length<=254&&AUTH_ROLES.includes(v.role)&&typeof v.h==='string'&&typeof v.salt==='string';
// پاک‌سازی سبد ذخیره‌شده (همان قواعد state-guard)
const cleanCart=a=>Array.isArray(a)?a.slice(0,50).map(x=>{if(!x||typeof x!=='object'||!Number.isInteger(x.id)||!P[x.id]||!P[x.id].st)return null;const p=P[x.id];
 return{id:x.id,s:p.sz.length?(p.sz.includes(x.s)?x.s:p.sz[0]):'',c:p.cl.length?(p.cl.includes(x.c)?x.c:p.cl[0]):'',q:Math.max(1,Math.min(p.st,Number.isInteger(x.q)?x.q:1))}}).filter(Boolean):[];
const setCart=a=>{cart.splice(0,cart.length,...a);save()};
(function(){const u=L('tp:users',{}),m=L('tp:me',null),clean={};
 if(u&&typeof u==='object'&&!Array.isArray(u))for(const k of Object.keys(u).slice(0,50))if(validUser(u[k])&&userKey(u[k].username)===k)clean[k]={username:u[k].username,email:u[k].email,role:u[k].role,h:u[k].h,salt:u[k].salt,created:+u[k].created||0};
 S('tp:users',clean);ME=typeof m==='string'&&clean[m]?clean[m]:null;if(!ME)try{localStorage.removeItem('tp:me')}catch{}
 if(ME){cart.splice(0,cart.length,...cleanCart(L(cartKey(),[])));if(!APP.fixed){role=ME.role;S('role',role)}}})();
const authUsers=()=>L('tp:users',{});
async function hashPw(p,salt){const s=salt+':'+p;if(window.crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return'w'+h}
const safeNext=n=>n&&/^#\/[a-z0-9-]*(?:\/[^?#]*)?(?:\?[^#]*)?$/i.test(n)&&!/^#\/(login|register|role)/.test(n)?n:'';
const authNext=()=>safeNext(hashParams().get('next')||'');
const nextQ=()=>{const n=authNext();return n?'next='+encodeURIComponent(n):''};
// ورود موفق: سبد مهمان با سبد حساب ادغام می‌شود (مثل بک‌اند)
function signIn(u){resetCheckout();const guest=cart.map(x=>({...x}));ME=u;S('tp:me',userKey(u.username));if(!APP.fixed){role=u.role;S('role',u.role)}
 const mine=cleanCart(L(cartKey(),[]));let merged=0;for(const g of guest){const p=P[g.id];const e=mine.find(x=>x.id===g.id&&x.s===g.s&&x.c===g.c);if(e)e.q=Math.min(p.st,e.q+g.q);else mine.push({...g});merged++}
 setCart(mine.slice(0,50));S('cart',[]);return merged}
function doLogout(){resetCheckout();ME=null;try{localStorage.removeItem('tp:me')}catch{}setCart(cleanCart(L('cart',[])));toast('از حساب خود خارج شدید');location.hash='#/'}

// ---- خطای فیلدها کنار همان فیلد (مشترک فرم‌ها) ----
function fErr(form,errs){form.querySelectorAll('[aria-invalid=true]').forEach(e=>{e.removeAttribute('aria-invalid');e.removeAttribute('aria-errormessage')});form.querySelectorAll('.tp-error-text[data-for]').forEach(e=>e.remove());
 let first=null;for(const[id,m]of Object.entries(errs)){const el=document.getElementById(id);if(!el)continue;el.setAttribute('aria-invalid','true');const p=document.createElement('p');p.className='tp-error-text';p.dataset.for=id;p.id=id+'-err';p.textContent=m;(el.closest('.tp-pw')||el.closest('[role=radiogroup]')||el.closest('.tp-file')||el).insertAdjacentElement('afterend',p);el.setAttribute('aria-errormessage',id+'-err');first=first||el}
 const sum=form.querySelector('.tp-form-sum');if(sum){const n=Object.keys(errs).length;sum.hidden=!n;sum.textContent=n?(n===1?'یک مورد نیاز به اصلاح دارد.':F(n)+' مورد نیاز به اصلاح دارد.'):''}
 if(first)first.focus();return!first}
function fClr(e){const t=e.target;if(t&&t.getAttribute&&t.getAttribute('aria-invalid')){t.removeAttribute('aria-invalid');const p=document.getElementById(t.id+'-err');if(p)p.remove();const f=t.form,sum=f&&f.querySelector('.tp-form-sum');if(sum){const n=f.querySelectorAll('[aria-invalid=true]').length;sum.hidden=!n;sum.textContent=n?(n===1?'یک مورد نیاز به اصلاح دارد.':F(n)+' مورد نیاز به اصلاح دارد.'):''}}}
function pwToggle(b){const i=b.parentNode.querySelector('input'),show=i.type==='password';i.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));b.textContent=show?'پنهان':'نمایش';i.focus()}
const hint=(id,t)=>t?`<p class="tp-hint" id="${id}-h">${t}</p>`:'';
const field=(id,name,label,attrs,help)=>`<div class="tp-field"><label for="${id}">${label}</label><input id="${id}" name="${name}" ${attrs}${help?` aria-describedby="${id}-h"`:''}>${hint(id,help)}</div>`;
const pwField=(id,name,label,ac,help)=>`<div class="tp-field"><label for="${id}">${label}</label><div class="tp-pw"><input id="${id}" name="${name}" type="password" autocomplete="${ac}" required dir="ltr"${help?` aria-describedby="${id}-h"`:''}><button type="button" class="tp-pw-b" aria-pressed="false" aria-label="نمایش ${label}" onclick="pwToggle(this)">نمایش</button></div>${hint(id,help)}</div>`;

// ---- ثبت‌نام (اعتبارسنجی مشابه اعتبارسنج‌های پیش‌فرض Django) ----
const COMMON_PW=['12345678','123456789','1234567890','password','password1','password123','qwertyui','qwerty123','qwertyuiop','11111111','00000000','iloveyou','admin123','abcd1234','1q2w3e4r','sunshine','football','baseball','princess','trustno1','welcome1','superman','zaq12wsx','letmein1'];// زیرمجموعه‌ای از فهرست ۲۰هزارتایی CommonPasswordValidator؛ بک‌اند فهرست کامل را بررسی می‌کند
const qRatio=(a,b)=>{const c={};for(const ch of b)c[ch]=(c[ch]||0)+1;let m=0;for(const ch of a)if(c[ch]>0){c[ch]--;m++}return a.length+b.length?2*m/(a.length+b.length):0};
function pwValidate(p,u,em){const out=[],lp=p.toLowerCase();
 for(const[val,name]of[[u,'نام کاربری'],[em,'آدرس ایمیل']]){if(!val)continue;const parts=[val,...String(val).split(/\W+/)].filter(Boolean);if(parts.some(x=>qRatio(lp,x.toLowerCase())>=0.7)){out.push(`این رمز عبور بسیار شبیه ${name} می‌باشد.`);break}}
 if(p.length<8)out.push('این رمز عبور خیلی کوتاه است. رمز عبور می‌بایست حداقل از ۸ حرف تشکیل شده باشد.');
 if(COMMON_PW.includes(lp.trim()))out.push('این رمز عبور بسیار رایج است.');
 if(/^\d+$/.test(p))out.push('رمز شما کلا عدد است');return out}
async function doRegister(f){const v=k=>(f.elements[k]&&f.elements[k].value||'').trim(),E={},u=v('username'),em=v('email'),p1=f.elements.password1.value,p2=f.elements.password2.value,users=authUsers();
 const r=APP_ROLE||(f.querySelector('input[name=role]:checked')||{}).value;
// پیام‌ها عیناً ترجمهٔ فارسی خود Django 5.2 هستند؛ مثل UserCreationForm خطاهای اعتبارسنج گذرواژه زیر «تکرار گذرواژه» می‌نشینند
 if(!u)E['rg-u']='این فیلد لازم است.';else if(!UNAME_RE.test(u))E['rg-u']='یک نام کاربری معتبر وارد کنید. این مقدار میتواند فقط شامل حروف، اعداد، و علامات @/./+/-/_ باشد.';else if(users[userKey(u)])E['rg-u']='کاربری با آن نام کاربری وجود دارد.';
 if(em&&(em.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)))E['rg-e']='یک ایمیل آدرس معتبر وارد کنید.';
 if(!AUTH_ROLES.includes(r))E['rg-r0']='این فیلد لازم است.';
 if(!p1)E['rg-p1']='این فیلد لازم است.';
 if(!p2)E['rg-p2']='این فیلد لازم است.';else if(p1&&p1!==p2)E['rg-p2']='دو فیلد گذرواژه با هم مطابقت ندارند.';else if(p1){const pv=pwValidate(p1,u,em);if(pv.length)E['rg-p2']=pv.join(' ')}
 if(!fErr(f,E))return;const b=f.querySelector('[type=submit]');b.classList.add('is-loading');b.disabled=true;
 const salt=Math.random().toString(36).slice(2,12),h=await hashPw(p1,salt),all=authUsers();if(all[userKey(u)]){b.classList.remove('is-loading');b.disabled=false;fErr(f,{'rg-u':'کاربری با آن نام کاربری وجود دارد.'});return}
 all[userKey(u)]={username:u,email:em,role:r,h,salt,created:Date.now()};S('tp:users',all);const m=signIn(all[userKey(u)]);
 toast(m?'حساب شما ساخته شد و سبد خرید مهمان به حسابتان منتقل شد':'حساب شما ساخته شد و وارد شدید');location.hash=authNext()||'#/profile'}

// ---- ورود (فقط با نام کاربری، مثل AuthenticationForm) ----
async function doLogin(f){const id=f.elements.username.value.trim(),p=f.elements.password.value,E={};if(!id)E['lg-u']='این فیلد لازم است.';if(!p)E['lg-p']='این فیلد لازم است.';if(!fErr(f,E))return;
 const b=f.querySelector('[type=submit]');b.classList.add('is-loading');b.disabled=true;const c=authUsers()[userKey(id)],x=c&&c.username===id?c:null,good=x&&await hashPw(p,x.salt)===x.h;b.classList.remove('is-loading');b.disabled=false;
 if(!good){fErr(f,{'lg-p':'لطفا نام کاربری و گذرواژه‌ای قابل قبول وارد کنید. توجه داشته باشید که ممکن است هر دو به کوچکی و بزرگی حروف حساس باشند.'});f.elements.password.value='';return}
 if(APP_ROLE&&x.role!==APP_ROLE){fErr(f,{'lg-u':`این حساب «${RN[x.role]}» است و در اپ ${RN[APP_ROLE]} قابل استفاده نیست.`});return}
 const m=signIn(x);toast(m?'خوش آمدید؛ سبد خرید مهمان با سبد حساب شما ادغام شد':'خوش آمدید، '+x.username);location.hash=authNext()||'#/profile'}

// ---- درخواست مربیگری ----
const APP_ST={pending_review:['در انتظار بررسی','g','تیم تاتامی پلاس درخواست شما را بررسی می‌کند. نتیجه در همین صفحه نمایش داده می‌شود.'],approved:['تأییدشده','ok','درخواست شما تأیید شد. پروفایل عمومی پس از انتشار توسط تیم نمایش داده می‌شود.'],rejected:['ردشده','danger','درخواست شما تأیید نشد.']};
const DOC_EXT=['pdf','jpg','jpeg','png'],DOC_MAX=10*1024*1024;
const myApp=()=>{if(!ME)return null;const a=L('tp:coachapps',{}),x=a&&a[userKey(ME.username)];return x&&APP_ST[x.status]&&typeof x.coaching_level==='string'?x:null};
const appDate=t=>{try{return new Date(t).toLocaleDateString('fa-IR-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit'})}catch{return''}};
function fileInfo(inp){const f=inp.files&&inp.files[0],o=document.getElementById(inp.id+'-n');if(o)o.textContent=f?`${f.name} · ${F(Math.max(1,Math.round(f.size/1024)))} کیلوبایت`:'فایلی انتخاب نشده است.'}
function doApply(f){if(!ME||ME.role!=='coach'){location.hash='#/profile';return}if(myApp()){location.hash='#/coach-application';return}
 const v=k=>(f.elements[k]&&f.elements[k].value||'').trim(),E={},yrs=nz(v('years_experience')),doc=f.elements.certificate_document.files[0];
 if(!v('coaching_level'))E['ca-level']='این فیلد لازم است.';else if(v('coaching_level').length>100)E['ca-level']=`طول این مقدار باید حداکثر ۱۰۰ کاراکتر باشد (طولش ${F(v('coaching_level').length)} است).`;
 if(!v('specializations'))E['ca-spec']='این فیلد لازم است.';
 if(!yrs)E['ca-years']='این فیلد لازم است.';else if(!/^\d+$/.test(yrs))E['ca-years']='به طور کامل یک عدد وارد کنید.';else if(+yrs>32767)E['ca-years']='مطمئن شوید این مقدار کوچکتر و یا مساوی 32767 است.';
 if(v('club_name').length>150)E['ca-club']=`طول این مقدار باید حداکثر ۱۵۰ کاراکتر باشد (طولش ${F(v('club_name').length)} است).`;
 if(!v('certificate_details'))E['ca-cert']='این فیلد لازم است.';
 if(!doc)E['ca-doc']='این فیلد لازم است.';else if(!doc.size)E['ca-doc']='پروندهٔ ارسال‌شده خالیست.';else if(!DOC_EXT.includes((doc.name.split('.').pop()||'').toLowerCase()))E['ca-doc']='فقط فایل PDF یا تصویر JPG و PNG مجاز است.';else if(doc.size>DOC_MAX)E['ca-doc']='حجم فایل مدرک نباید بیشتر از ۱۰ مگابایت باشد.';
 if(!fErr(f,E))return;
 const all=L('tp:coachapps',{}),o=all&&typeof all==='object'&&!Array.isArray(all)?all:{};
 o[userKey(ME.username)]={coaching_level:v('coaching_level'),specializations:v('specializations'),years_experience:+yrs,club_name:v('club_name'),certificate_details:v('certificate_details'),certificate_document:{name:doc.name.slice(0,120),size:doc.size},status:'pending_review',submitted_at:Date.now()};
 S('tp:coachapps',o);toast('درخواست مربیگری ثبت شد');location.hash='#/coach-application'}

// ---- نماها ----
const goTo=h=>{setTimeout(()=>{location.hash=h});return''};// مثل redirect سمت سرور
const authShell=(t,sub,body,alt)=>`<div class="w tp-auth"><div class="tp-auth-card"><h1>${t}</h1><p class="mu">${sub}</p>${body}</div>${alt?`<p class="tp-auth-alt">${alt}</p>`:''}<p class="mu sm tp-auth-note">نسخه نمایشی: حساب فقط در همین مرورگر ذخیره می‌شود و به سرور ارسال نمی‌شود. از گذرواژهٔ واقعی خود استفاده نکنید.</p></div>`;
const clubDemo=()=>`<div class="w">${tpState('empty','حساب باشگاه فعلاً ساخته نمی‌شود','در نسخهٔ اولیه، بخش باشگاه فقط نمایشی است. هنرجویان و مربیان می‌توانند حساب بسازند.','بازگشت به داشبورد','#/dashboard')}</div>`;
const coachSteps=a=>{const s=[['ساخت حساب مربی',1],['ثبت درخواست مربیگری',a?1:0],['بررسی تیم',a&&a.status!=='pending_review'?1:0],['انتشار پروفایل',0]],cur=s.findIndex(x=>!x[1]);
 return`<ol class="tp-steps" aria-label="مراحل مربی شدن">${s.map((x,i)=>`<li class="${x[1]?'done':i===cur?'on':''}"${i===cur?' aria-current="step"':''}><span>${x[1]?'✓':F(i+1)}</span>${x[0]}</li>`).join('')}</ol>`};
Object.assign(views,{
 login:()=>{PT={t:'ورود',d:'ورود به حساب تاتامی پلاس'};if(CLUB_DEMO)return clubDemo();if(ME)return`<div class="w">${emp('شما وارد شده‌اید','با حساب «'+esc(ME.username)+'» وارد شده‌اید.','رفتن به حساب کاربری','#/profile')}</div>`;const nq=nextQ();
  return authShell('ورود به حساب','نام کاربری و گذرواژهٔ خود را وارد کنید.',`<form id="lg-f" novalidate onsubmit="doLogin(this);return false" oninput="fClr(event)"><p class="tp-form-sum" role="alert" hidden></p>
  ${field('lg-u','username','نام کاربری','autocomplete="username" autocapitalize="none" spellcheck="false" dir="ltr" maxlength="150" required')}
  ${pwField('lg-p','password','گذرواژه','current-password')}
  <button class="btn tp-auth-btn" type="submit">ورود</button></form>`,`حساب ندارید؟ <a href="#/register${nq?'?'+nq:''}">ثبت‌نام کنید</a>`)},
 register:()=>{PT={t:'ثبت‌نام',d:'ساخت حساب تاتامی پلاس'};if(CLUB_DEMO)return clubDemo();if(ME)return goTo('#/profile');// register: کاربر واردشده ← /account/
  const pre=AUTH_ROLES.includes(hashParams().get('role'))?hashParams().get('role'):'student',nq=nextQ();
  const roles=APP_ROLE?`<p class="mu sm">نقش کاربری: <b>${RN[APP_ROLE]}</b></p>`:`<fieldset class="tp-field tp-roles"><legend>نقش کاربری</legend><div role="radiogroup" class="tp-cluster">${AUTH_ROLES.map((r,i)=>`<label class="chip tp-radio"><input type="radio" name="role" id="rg-r${i}" value="${r}"${r===pre?' checked':''}> ${RN[r]}</label>`).join('')}</div><p class="tp-hint">پروفایل مربی پس از بررسی درخواست مربیگری و انتشار توسط تیم نمایش داده می‌شود.</p></fieldset>`;
  return authShell('ساخت حساب کاربری',APP_ROLE==='coach'?'پس از ساخت حساب، درخواست مربیگری خود را ثبت کنید.':'چند ثانیه بیشتر طول نمی‌کشد.',`<form id="rg-f" novalidate onsubmit="doRegister(this);return false" oninput="fClr(event)"><p class="tp-form-sum" role="alert" hidden></p>
  ${field('rg-u','username','نام کاربری','autocomplete="username" autocapitalize="none" spellcheck="false" dir="ltr" maxlength="150" required','این نام برای ورود به حساب کاربری استفاده می‌شود؛ حروف، اعداد و @ . + - _')}
  ${field('rg-e','email','رایانامه <span class="mu sm">(اختیاری)</span>','type="email" autocomplete="email" autocapitalize="none" spellcheck="false" dir="ltr"')}
  ${roles}
  ${pwField('rg-p1','password1','گذرواژه','new-password','گذرواژه باید دست‌کم ۸ نویسه داشته باشد و به اطلاعات شخصی شما شبیه نباشد.')}
  ${pwField('rg-p2','password2','تکرار گذرواژه','new-password','برای تأیید، گذرواژه را دوباره وارد کنید.')}
  <button class="btn tp-auth-btn" type="submit">ثبت‌نام</button></form>`,`قبلاً ثبت‌نام کرده‌اید؟ <a href="#/login${nq?'?'+nq:''}">وارد شوید</a>`)},
 'coach-apply':()=>{PT={t:'درخواست مربیگری',d:'ثبت درخواست همکاری مربیان تاتامی پلاس'};
  if(!ME)return goTo('#/login?next=%23%2Fcoach-apply');// @login_required
  if(ME.role!=='coach')return`<div class="w">${tpState('error','این صفحه فقط برای حساب مربی است','حساب شما «'+RN[ME.role]+'» است. برای درخواست مربیگری، حساب مربی بسازید.','بازگشت به حساب کاربری','#/profile')}</div>`;
  if(myApp())return goTo('#/coach-application');
  return`<div class="w tp-auth tp-apply"><div class="tp-auth-card"><p class="pf-kick">حساب مربی</p><h1>درخواست همکاری</h1>${coachSteps(null)}<p class="mu">درخواست شما توسط تیم تاتامی پلاس بررسی می‌شود. ثبت درخواست، پروفایل عمومی را به‌طور خودکار منتشر نمی‌کند. هر مربی فقط یک درخواست ثبت می‌کند.</p>
  <form id="ca-f" novalidate onsubmit="doApply(this);return false" oninput="fClr(event)"><p class="tp-form-sum" role="alert" hidden></p>
  ${field('ca-level','coaching_level','سطح مربیگری','list="ca-levels" maxlength="100" required','مثلاً مربی درجهٔ ۳ فدراسیون')}<datalist id="ca-levels"><option value="مربی درجهٔ ۳"><option value="مربی درجهٔ ۲"><option value="مربی درجهٔ ۱"><option value="مربی ملی"><option value="مربی بین‌المللی"></datalist>
  <div class="tp-field"><label for="ca-spec">تخصص‌ها</label><textarea id="ca-spec" name="specializations" rows="3" required aria-describedby="ca-spec-h"></textarea>${hint('ca-spec','مثلاً ناژه‌وازه، کاتامه‌وازه، آمادگی مسابقه')}</div>
  ${field('ca-years','years_experience','سابقهٔ مربیگری، به سال','inputmode="numeric" dir="ltr" maxlength="2" required')}
  ${field('ca-club','club_name','نام باشگاه <span class="mu sm">(اختیاری)</span>','maxlength="150" autocomplete="organization"')}
  <div class="tp-field"><label for="ca-cert">توضیحات مدارک</label><textarea id="ca-cert" name="certificate_details" rows="3" required aria-describedby="ca-cert-h"></textarea>${hint('ca-cert','نام مدرک، مرجع صادرکننده و سال دریافت')}</div>
  <div class="tp-field"><label for="ca-doc">فایل مدرک</label><div class="tp-file"><input id="ca-doc" name="certificate_document" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required aria-describedby="ca-doc-h ca-doc-n" onchange="fileInfo(this)"><label for="ca-doc" class="btn o s">انتخاب فایل</label><span id="ca-doc-n" class="mu sm">فایلی انتخاب نشده است.</span></div>${hint('ca-doc','PDF، JPG یا PNG؛ حداکثر ۱۰ مگابایت. این فایل خصوصی است و فقط تیم بررسی آن را می‌بیند.')}</div>
  <button class="btn tp-auth-btn" type="submit">ثبت درخواست</button></form></div><p class="mu sm tp-auth-note">نسخه نمایشی: فایل مدرک بارگذاری نمی‌شود و فقط نام آن در همین مرورگر ثبت می‌شود.</p></div>`},
 'coach-application':()=>{PT={t:'وضعیت درخواست مربیگری',d:'وضعیت درخواست مربیگری'};if(!ME)return goTo('#/login?next=%23%2Fcoach-application');// @login_required
  const a=myApp();if(!a)return`<div class="w">${emp('درخواستی ثبت نشده است',ME.role==='coach'?'هنوز درخواست مربیگری ثبت نکرده‌اید.':'این بخش برای حساب‌های مربی است.',ME.role==='coach'?'ثبت درخواست مربیگری':'بازگشت به حساب کاربری',ME.role==='coach'?'#/coach-apply':'#/profile')}</div>`;
  const st=APP_ST[a.status];return`<div class="w tp-auth tp-apply"><div class="tp-auth-card"><p class="mu sm">درخواست مربیگری</p><h1>${st[0]}</h1>${coachSteps(a)}<p class="tp-note"><span class="tag ${st[1]}">${st[0]}</span> ${a.status==='rejected'&&a.rejection_reason?esc(a.rejection_reason):st[2]}</p>
  <dl class="tp-dl"><div><dt>تاریخ ثبت</dt><dd>${appDate(a.submitted_at)}</dd></div><div><dt>سطح مربیگری</dt><dd>${esc(a.coaching_level)}</dd></div><div><dt>تخصص‌ها</dt><dd>${esc(a.specializations)}</dd></div><div><dt>سابقه</dt><dd>${F(a.years_experience)} سال</dd></div>${a.club_name?`<div><dt>باشگاه</dt><dd>${esc(a.club_name)}</dd></div>`:''}<div><dt>فایل مدرک</dt><dd dir="ltr">${esc(a.certificate_document&&a.certificate_document.name)}</dd></div></dl>
  <div class="pa"><a class="btn o" href="#/profile">بازگشت به حساب کاربری</a></div></div></div>`}
});

// صفحهٔ حساب (/account/): نقش کاربر واردشده، یا پیوند ثبت‌نام هنرجو و مربی (باشگاه نمایشی)
{const pv=views.profile;views.profile=(...a)=>`<div class="w tp-acct-w">${ME?acctIn():acctOut()}</div>`+pv(...a)}
function acctIn(){const ap=ME.role==='coach'?myApp():null;
 return`<div class="d-c tp-acct"><span class="d-av" aria-hidden="true">${esc(ME.username.slice(0,1).toUpperCase())}</span><div><b>خوش آمدید، ${esc(ME.username)}</b><div class="mu sm">نوع حساب: ${RN[ME.role]}${ME.email?` · <span dir="ltr">${esc(ME.email)}</span>`:''}</div></div><button type="button" class="btn o s" onclick="doLogout()">خروج از حساب</button></div>
 ${ME.role==='coach'?`<div class="d-c tp-coach-next">${coachSteps(ap)}${ap?`<p>وضعیت درخواست مربیگری: <span class="tag ${APP_ST[ap.status][1]}">${APP_ST[ap.status][0]}</span></p><a class="btn o" href="#/coach-application">مشاهدهٔ وضعیت درخواست</a>`:`<p>برای نمایش در فهرست مربیان، درخواست مربیگری و مدرک خود را ثبت کنید.</p><a class="btn" href="#/coach-apply">ثبت درخواست مربیگری</a>`}</div>`:''}`}
function acctOut(){const rows=[['student','هنرجو','مربیان را ببینید و سبد خریدتان را در حساب خود نگه دارید.'],['coach','مربی','حساب بسازید و درخواست مربیگری خود را برای بررسی ثبت کنید.'],['club','باشگاه','این گزینه فقط نمایشی است و در نسخهٔ اولیه حساب باشگاه ساخته نمی‌شود.']].filter(r=>!APP_ROLE||r[0]===APP_ROLE);
 return`<div class="d-c tp-acct-out"><h2>حساب کاربری</h2><p class="mu">برای ادامه، حساب بسازید یا وارد حساب خود شوید.</p><ul class="tp-roles-l">${rows.map((r,i)=>`<li><span class="tp-role-n" aria-hidden="true">${F(String(i+1).padStart(2,'0'))}</span><div><b>${r[1]}</b><div class="mu sm">${r[2]}</div></div>${r[0]==='club'?'<span class="tag m">نمایشی</span>':`<a class="btn s" href="#/register?role=${r[0]}">ثبت‌نام ${r[1]}</a>`}</li>`).join('')}</ul>${CLUB_DEMO?'':'<p class="tp-auth-alt">قبلاً ثبت‌نام کرده‌اید؟ <a href="#/login?next=%23%2Fprofile">وارد شوید</a></p>'}</div>`}

// هدر و کشو: وضعیت حساب
const ICO_USER='<svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
function authUI(){const a=$('#hbu');if(a){a.href=ME?'#/profile':CLUB_DEMO?'#/profile':'#/login';a.innerHTML=ICO_USER+`<span class="hb-t">${ME?esc(ME.username):CLUB_DEMO?'حساب کاربری':'ورود / ثبت‌نام'}</span>`;a.setAttribute('aria-label',ME?'حساب کاربری: '+ME.username:CLUB_DEMO?'حساب کاربری':'ورود یا ثبت‌نام')}
 const f=$('#mndf');if(f)f.innerHTML=ME?`<a class="btn o" href="#/profile">${ICO_USER}<span>${esc(ME.username)}</span></a><button type="button" class="btn o" onclick="doLogout()">خروج از حساب</button>`:CLUB_DEMO?`<a class="btn o" href="#/profile">حساب کاربری</a>`:`<a class="btn" href="#/login">ورود</a><a class="btn o" href="#/register">ثبت‌نام</a>`}
