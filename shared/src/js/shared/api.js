// لایه داده عمومی: پیش‌فرض داده محلی (نمایشی). اگر TP_API_BASE هنگام Build تنظیم شود، فهرست‌های عمومی از API خوانده می‌شوند.
// قرارداد: docs/API_CONTRACT.md. بک‌اند در این پروژه پیاده‌سازی نشده است؛ نبود/خطای API به داده محلی برمی‌گردد.
const TP_API=(typeof TP_API_BASE!=='undefined'&&TP_API_BASE)?String(TP_API_BASE).replace(/\/$/,''):'';
async function apiGet(path){if(!TP_API)return null;try{const c=new AbortController(),t=setTimeout(()=>c.abort(),6000);const r=await fetch(TP_API+path,{signal:c.signal,headers:{Accept:'application/json'},credentials:'omit'});clearTimeout(t);return r.ok?await r.json():null}catch{return null}}
const safeUrl=u=>{u=String(u||'').trim();return /^(https?:\/\/|\/)/i.test(u)&&!/^\/\//.test(u)?u:''};
const faDate=s=>{try{return new Date(s).toLocaleDateString('fa-IR')}catch{return''}};
// ---- بلاگ
const blogItem=a=>({id:a.id,slug:String(a.slug||a.id),t:String(a.title||''),c:String(a.category&&a.category.name||a.category||''),au:String(a.author_name||a.author||''),d:a.published_at?faDate(a.published_at):'',h:(+a.id*37)%360,x:String(a.excerpt||''),html:String(a.body_html||''),img:safeUrl(a.cover_image_url||a.cover_image),tags:Array.isArray(a.tags)?a.tags.map(t=>String(t&&t.name||t)).slice(0,10):[],api:true});
// بارگذاری با TTL ۶۰ ثانیه: ورود دوباره به بلاگ محتوای تازه را می‌گیرد (بدون نمایش حالت «در حال دریافت» در بازخوانی)
let blogState='idle',blogErr=false,blogAt=0;
async function loadBlog(){if(!TP_API||blogState==='loading'||blogState==='refreshing'||(blogState==='done'&&Date.now()-blogAt<60000))return;const first=blogState==='idle';blogState=first?'loading':'refreshing';const r=await apiGet('/public/articles?page_size=100');
 if(r&&Array.isArray(r.results)){BL.splice(0,BL.length,...r.results.map(blogItem));blogErr=false}else if(first)blogErr=true;
 blogState='done';blogAt=Date.now();if(/^#\/blog/.test(location.hash))R('x')}
