const $=s=>document.querySelector(s),F=n=>Number(n).toLocaleString('fa-IR');
const toast=(t,k='')=>{const e=$('#ts');e.textContent=t;e.className='tp-toast on '+k;clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),3000)};
// slug: حروف فارسی/لاتین/ارقام و خط‌تیره؛ نیم‌فاصله و فاصله ← خط‌تیره
const slugify=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\s_]+/g,'-').replace(/[^\p{L}\p{N}-]+/gu,'').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80);
const SLUG_RE=/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
const faDT=s=>{try{return s?new Date(s).toLocaleString('fa-IR',{dateStyle:'medium',timeStyle:'short'}):''}catch{return''}};
const cookie=n=>(document.cookie.split('; ').find(x=>x.startsWith(n+'='))||'').split('=')[1]||'';
const MEDIA_TYPES=['image/jpeg','image/png','image/webp'],MEDIA_MAX=2*1024*1024;
const mediaCheck=f=>!f?'فایلی انتخاب نشده است.':!MEDIA_TYPES.includes(f.type)?'فقط تصویر JPEG، PNG یا WebP مجاز است.':f.size>MEDIA_MAX?'حجم تصویر باید حداکثر ۲ مگابایت باشد.':'';
const ST={draft:['پیش‌نویس','m'],published:['منتشرشده',''],scheduled:['زمان‌بندی‌شده','g']};
const stTag=s=>`<span class="tag ${(ST[s]||['','m'])[1]}">${esc((ST[s]||[s])[0])}</span>`;
