// ابزارهای متنی مشترک بین PWAها و پنل مارکتینگ (بدون وابستگی)
// nz: یکسان‌سازی برای جست‌وجو. «ی/ي/ى»، «ک/ك»، اعراب، کشیده، نیم‌فاصله، فاصله‌ها، ارقام فارسی/عربی، حروف لاتین (ماکرون و خط‌تیره) نادیده گرفته می‌شوند.
const nz=s=>String(s==null?'':s).normalize('NFKC').toLowerCase()
 .replace(/[\u064B-\u065F\u0670\u0640]/g,'')
 .replace(/[يىئ]/g,'ی').replace(/ك/g,'ک').replace(/[ةۀ]/g,'ه').replace(/[آأإٱ]/g,'ا').replace(/ؤ/g,'و')
 .replace(/[\u0660-\u0669]/g,d=>d.charCodeAt(0)-0x660).replace(/[\u06F0-\u06F9]/g,d=>d.charCodeAt(0)-0x6F0)
 .normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC')
 .replace(/[\u200c\u200d\u00a0\s\-'’.·_]/g,'');
// esc: فرار از HTML برای متن و مقدار attribute
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
// sanitizeHtml: لیست مجاز برای HTML غنی (محتوای مقاله). دفاع لایه دوم؛ بک‌اند هم باید پاک‌سازی کند.
const SAN_TAGS={H2:1,H3:1,H4:1,P:1,BR:1,UL:1,OL:1,LI:1,A:1,STRONG:1,B:1,EM:1,I:1,BLOCKQUOTE:1,IMG:1,HR:1};
function sanitizeHtml(html){const d=new DOMParser().parseFromString('<body>'+String(html==null?'':html)+'</body>','text/html').body;
 const okUrl=(u,img)=>{u=String(u||'').trim();return /^(https?:\/\/|\/|\.\/|#)/i.test(u)||(img&&/^data:image\/(png|jpe?g|webp);base64,/i.test(u))};
 (function walk(n){[...n.childNodes].forEach(c=>{
  if(c.nodeType===3)return;
  if(c.nodeType!==1){c.remove();return}
  if(!SAN_TAGS[c.tagName]){ if(/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|FORM|INPUT|BUTTON|SVG|MATH|TEXTAREA|SELECT)$/.test(c.tagName)){c.remove();return} walk(c);c.replaceWith(...c.childNodes);return}
  [...c.attributes].forEach(a=>{const k=a.name.toLowerCase();
   if(c.tagName==='A'&&k==='href'&&okUrl(a.value))return;
   if(c.tagName==='IMG'&&(k==='src'&&okUrl(a.value,1)||k==='alt'))return;
   c.removeAttribute(a.name)});
  if(c.tagName==='A'){if(!c.getAttribute('href'))c.removeAttribute('href');else if(/^https?:/i.test(c.getAttribute('href'))){c.setAttribute('rel','noopener noreferrer nofollow');c.setAttribute('target','_blank')}}
  if(c.tagName==='IMG'){if(!c.getAttribute('src')){c.remove();return}c.setAttribute('loading','lazy')}
  walk(c)})})(d);
 return d.innerHTML}
