// حساب کاربری (نسخه فرانت‌اند، بدون بک‌اند): ثبت‌نام، ورود، خروج.
// نام فیلدها هم‌نام قرارداد Django است تا اتصال بعدی ساده باشد: ثبت‌نام username, email, role, password1, password2 — ورود username, password.
// هشدار: داده‌ها فقط در localStorage همین مرورگر ذخیره می‌شوند. این احراز هویت واقعی نیست و جای اعتبارسنجی سمت سرور را نمی‌گیرد.
const AUTH_ROLES=APP.fixed?[APP.role]:['student','coach'];
let ME=null;
(function(){const u=L('tp:users',{}),m=L('tp:me',null),clean={};
 const ok=v=>v&&typeof v==='object'&&typeof v.username==='string'&&/^[\p{L}\p{N}@.+_-]{3,30}$/u.test(v.username)&&typeof v.email==='string'&&v.email.length<=120&&RN[v.role]&&typeof v.h==='string'&&typeof v.salt==='string';
 if(u&&typeof u==='object'&&!Array.isArray(u))for(const k of Object.keys(u).slice(0,50))if(ok(u[k])&&u[k].username.toLowerCase()===k)clean[k]={username:u[k].username,email:u[k].email,role:u[k].role,h:u[k].h,salt:u[k].salt,created:+u[k].created||0};
 S('tp:users',clean);ME=typeof m==='string'&&clean[m]?clean[m]:null;if(!ME)try{localStorage.removeItem('tp:me')}catch{}
 if(ME&&!APP.fixed){role=ME.role;S('role',role)}})();
const authUsers=()=>L('tp:users',{});
async function hashPw(p,salt){const s=salt+':'+p;if(window.crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return'w'+h}
const safeNext=n=>n&&/^#\/[a-z0-9-]*(?:\/[^?#]*)?(?:\?[^#]*)?$/i.test(n)&&!/^#\/(login|register|role)/.test(n)?n:'';
const authNext=()=>safeNext(hashParams().get('next')||'');

// ---- خطای فیلدها کنار همان فیلد (مشترک فرم‌ها) ----
function fErr(form,errs){form.querySelectorAll('[aria-invalid=true]').forEach(e=>{e.removeAttribute('aria-invalid');e.removeAttribute('aria-errormessage')});form.querySelectorAll('.tp-error-text[data-for]').forEach(e=>e.remove());
 let first=null;for(const[id,m]of Object.entries(errs)){const el=document.getElementById(id);if(!el)continue;el.setAttribute('aria-invalid','true');const p=document.createElement('p');p.className='tp-error-text';p.dataset.for=id;p.id=id+'-err';p.textContent=m;(el.closest('.tp-pw')||el.closest('[role=radiogroup]')||el).insertAdjacentElement('afterend',p);el.setAttribute('aria-errormessage',id+'-err');first=first||el}
 const sum=form.querySelector('.tp-form-sum');if(sum){const n=Object.keys(errs).length;sum.hidden=!n;sum.textContent=n?(n===1?'یک مورد نیاز به اصلاح دارد.':F(n)+' مورد نیاز به اصلاح دارد.'):''}
 if(first)first.focus();return!first}
function fClr(e){const t=e.target;if(t&&t.getAttribute&&t.getAttribute('aria-invalid')){t.removeAttribute('aria-invalid');const p=document.getElementById(t.id+'-err');if(p)p.remove()}}
function pwToggle(b){const i=b.parentNode.querySelector('input'),show=i.type==='password';i.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));b.textContent=show?'پنهان':'نمایش';i.focus()}
const pwField=(id,name,label,ac,hint)=>`<div class="tp-field"><label for="${id}">${label}</label><div class="tp-pw"><input id="${id}" name="${name}" type="password" autocomplete="${ac}" required dir="ltr"${hint?` aria-describedby="${id}-h"`:''}><button type="button" class="tp-pw-b" aria-pressed="false" aria-label="نمایش ${label}" onclick="pwToggle(this)">نمایش</button></div>${hint?`<p class="tp-hint" id="${id}-h">${hint}</p>`:''}</div>`;

// ---- ثبت‌نام ----
const COMMON_PW=['12345678','123456789','1234567890','password','password1','qwertyui','qwerty123','11111111','00000000','iloveyou','admin123','abcd1234'];
async function doRegister(f){const v=k=>(f.elements[k]&&f.elements[k].value||'').trim(),E={},u=v('username'),em=v('email'),p1=f.elements.password1.value,p2=f.elements.password2.value,r=AUTH_ROLES.length>1?(f.querySelector('input[name=role]:checked')||{}).value:AUTH_ROLES[0],users=authUsers();
 if(!u)E['rg-u']='نام کاربری را وارد کنید.';else if(u.length<3||u.length>30)E['rg-u']='نام کاربری باید بین ۳ تا ۳۰ نویسه باشد.';else if(!/^[\p{L}\p{N}@.+_-]+$/u.test(u))E['rg-u']='نام کاربری فقط می‌تواند شامل حرف، عدد و نویسه‌های @ . + - _ باشد (بدون فاصله).';else if(users[u.toLowerCase()])E['rg-u']='این نام کاربری قبلاً ثبت شده است؛ نام دیگری انتخاب کنید یا وارد شوید.';
 if(!em)E['rg-e']='نشانی ایمیل را وارد کنید.';else if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)||em.length>120)E['rg-e']='نشانی ایمیل معتبر نیست؛ مثل name@example.com.';else if(Object.values(users).some(x=>x.email.toLowerCase()===em.toLowerCase()))E['rg-e']='با این ایمیل قبلاً حساب ساخته شده است.';
 if(!r||!AUTH_ROLES.includes(r))E['rg-r0']='نوع حساب را انتخاب کنید.';
 if(!p1)E['rg-p1']='رمز عبور را وارد کنید.';else if(p1.length<8)E['rg-p1']='رمز عبور باید حداقل ۸ نویسه باشد.';else if(/^\d+$/.test(nz(p1)))E['rg-p1']='رمز عبور نمی‌تواند فقط عدد باشد.';else if(COMMON_PW.includes(p1.toLowerCase()))E['rg-p1']='این رمز عبور خیلی رایج است؛ رمز دیگری انتخاب کنید.';else if(u&&u.length>=3&&p1.toLowerCase().includes(u.toLowerCase()))E['rg-p1']='رمز عبور نباید شامل نام کاربری باشد.';
 if(!E['rg-p1']&&p1!==p2)E['rg-p2']=p2?'تکرار رمز عبور با رمز عبور یکسان نیست.':'رمز عبور را دوباره وارد کنید.';
 if(!fErr(f,E))return;const b=f.querySelector('[type=submit]');b.classList.add('is-loading');b.disabled=true;
 const salt=Math.random().toString(36).slice(2,12),h=await hashPw(p1,salt),all=authUsers();if(all[u.toLowerCase()]){b.classList.remove('is-loading');b.disabled=false;fErr(f,{'rg-u':'این نام کاربری قبلاً ثبت شده است.'});return}
 all[u.toLowerCase()]={username:u,email:em,role:r,h,salt,created:Date.now()};S('tp:users',all);ME=all[u.toLowerCase()];S('tp:me',u.toLowerCase());if(!APP.fixed){role=r;S('role',r)}
 toast('حساب شما ساخته شد و وارد شدید');location.hash=authNext()||'#/profile'}

// ---- ورود ----
async function doLogin(f){const id=f.elements.username.value.trim(),p=f.elements.password.value,E={};if(!id)E['lg-u']='نام کاربری یا ایمیل را وارد کنید.';if(!p)E['lg-p']='رمز عبور را وارد کنید.';if(!fErr(f,E))return;
 const b=f.querySelector('[type=submit]');b.classList.add('is-loading');b.disabled=true;const users=authUsers(),x=users[id.toLowerCase()]||Object.values(users).find(u=>u.email.toLowerCase()===id.toLowerCase());
 const good=x&&await hashPw(p,x.salt)===x.h;b.classList.remove('is-loading');b.disabled=false;
 if(!good){fErr(f,{'lg-p':'نام کاربری یا رمز عبور درست نیست. دوباره تلاش کنید یا حساب جدید بسازید.'});f.elements.password.value='';return}
 if(APP.fixed&&x.role!==APP.role){fErr(f,{'lg-u':`این حساب «${RN[x.role]}» است و در اپ ${RN[APP.role]} قابل استفاده نیست.`});return}
 ME=x;S('tp:me',x.username.toLowerCase());if(!APP.fixed){role=x.role;S('role',x.role)}toast('خوش آمدید، '+x.username);location.hash=authNext()||'#/profile'}
function doLogout(){ME=null;try{localStorage.removeItem('tp:me')}catch{}toast('از حساب خود خارج شدید');location.hash='#/'}

// ---- نماها ----
const authShell=(t,sub,body,alt)=>`<div class="w tp-auth"><div class="tp-auth-card"><h1>${t}</h1><p class="mu">${sub}</p>${body}</div><p class="tp-auth-alt">${alt}</p><p class="mu sm tp-auth-note">نسخه نمایشی: حساب فقط در همین مرورگر ذخیره می‌شود و به سرور ارسال نمی‌شود. از رمز عبور واقعی خود استفاده نکنید.</p></div>`;
const nextQ=()=>{const n=authNext();return n?'?next='+encodeURIComponent(n):''};
Object.assign(views,{
 login:()=>{PT={t:'ورود',d:'ورود به حساب تاتامی پلاس'};if(ME)return`<div class="w">${emp('شما وارد شده‌اید','با حساب «'+esc(ME.username)+'» وارد شده‌اید.','رفتن به پروفایل','#/profile')}</div>`;
  return authShell('ورود به حساب','برای ادامه، نام کاربری و رمز عبور خود را وارد کنید.',`<form id="lg-f" novalidate onsubmit="doLogin(this);return false" oninput="fClr(event)"><p class="tp-form-sum" role="alert" hidden></p>
  <div class="tp-field"><label for="lg-u">نام کاربری یا ایمیل</label><input id="lg-u" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" dir="ltr" required></div>
  ${pwField('lg-p','password','رمز عبور','current-password')}
  <button class="btn tp-auth-btn" type="submit">ورود</button></form>`,`حساب ندارید؟ <a href="#/register${nextQ()}">ثبت‌نام کنید</a>`)},
 register:()=>{PT={t:'ثبت‌نام',d:'ساخت حساب تاتامی پلاس'};if(ME)return`<div class="w">${emp('شما وارد شده‌اید','برای ساخت حساب دیگر، ابتدا از حساب فعلی خارج شوید.','رفتن به پروفایل','#/profile')}</div>`;
  const roles=AUTH_ROLES.length>1?`<fieldset class="tp-field tp-roles"><legend>نوع حساب</legend><div role="radiogroup" class="tp-cluster">${AUTH_ROLES.map((r,i)=>`<label class="chip tp-radio"><input type="radio" name="role" id="rg-r${i}" value="${r}"${i===0?' checked':''}> ${RN[r]}</label>`).join('')}</div></fieldset>`:`<p class="mu sm">نوع حساب: <b>${RN[AUTH_ROLES[0]]}</b></p>`;
  return authShell('ساخت حساب','چند ثانیه بیشتر طول نمی‌کشد.',`<form id="rg-f" novalidate onsubmit="doRegister(this);return false" oninput="fClr(event)"><p class="tp-form-sum" role="alert" hidden></p>
  <div class="tp-field"><label for="rg-u">نام کاربری</label><input id="rg-u" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" dir="ltr" maxlength="30" required aria-describedby="rg-u-h"><p class="tp-hint" id="rg-u-h">۳ تا ۳۰ نویسه؛ حرف، عدد و @ . + - _</p></div>
  <div class="tp-field"><label for="rg-e">ایمیل</label><input id="rg-e" name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" dir="ltr" required></div>
  ${roles}
  ${pwField('rg-p1','password1','رمز عبور','new-password','حداقل ۸ نویسه؛ فقط عدد نباشد.')}
  ${pwField('rg-p2','password2','تکرار رمز عبور','new-password')}
  <button class="btn tp-auth-btn" type="submit">ساخت حساب</button></form>`,`حساب دارید؟ <a href="#/login${nextQ()}">وارد شوید</a>`)}
});
// کارت حساب بالای صفحه پروفایل
{const pv=views.profile;views.profile=(...a)=>`<div class="w tp-acct-w">${ME?`<div class="d-c tp-acct"><span class="d-av" aria-hidden="true">${esc(ME.username.slice(0,1).toUpperCase())}</span><div><b>${esc(ME.username)}</b><div class="mu sm" dir="ltr">${esc(ME.email)}</div><div class="mu sm">حساب ${RN[ME.role]}</div></div><button type="button" class="btn o s" onclick="doLogout()">خروج از حساب</button></div>${ordersBox()}`:`<div class="d-c tp-acct"><div><b>وارد حساب نشده‌اید</b><div class="mu sm">برای ذخیره سفارش‌ها و پیشرفت خود وارد شوید یا حساب بسازید.</div></div><div class="tp-cluster"><a class="btn s" href="#/login?next=%23%2Fprofile">ورود</a><a class="btn o s" href="#/register?next=%23%2Fprofile">ثبت‌نام</a></div></div>`}</div>`+pv(...a)}
const ordersBox=()=>{const o=myOrders();return o.length?`<div class="d-c" style="margin-top:var(--tp-space-sm)"><h2 style="font-size:var(--tp-font-size-lg)">سفارش‌های آزمایشی من</h2>${o.slice(0,5).map(x=>`<div class="rw2"><span>${esc(x.code)} · ${F(x.n)} قلم</span><b>${T(x.total)}</b></div>`).join('')}</div>`:''};
const myOrders=()=>{const a=L('tp:orders',[]);return Array.isArray(a)?a.filter(x=>x&&typeof x.code==='string'&&ME&&x.user===ME.username.toLowerCase()&&Number.isFinite(x.total)&&Number.isFinite(x.n)).reverse():[]};

// هدر و کشو: وضعیت حساب
const ICO_USER='<svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
function authUI(){const a=$('#hbu');if(a){a.href=ME?'#/profile':'#/login';a.innerHTML=ICO_USER+`<span class="hb-t">${ME?esc(ME.username):'ورود / ثبت‌نام'}</span>`;a.setAttribute('aria-label',ME?'حساب کاربری: '+ME.username:'ورود یا ثبت‌نام')}
 const f=$('#mndf');if(f)f.innerHTML=ME?`<a class="btn o" href="#/profile">${ICO_USER}<span>${esc(ME.username)}</span></a><button type="button" class="btn o" onclick="doLogout()">خروج از حساب</button>`:`<a class="btn" href="#/login">ورود</a><a class="btn o" href="#/register">ثبت‌نام</a>`}
