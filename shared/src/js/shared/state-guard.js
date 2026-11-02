// اعتبارسنجی داده‌های localStorage: همه مقدارها غیرقابل‌اعتماد فرض می‌شوند و فقط شکل و محدوده معتبر پذیرفته می‌شود.
(function(){const isInt=v=>Number.isInteger(v)&&v>=0;
 role=RN[role]?role:null;
 const sc=Array.isArray(cart)?cart.slice(0,50).map(x=>{if(!x||typeof x!=='object'||!isInt(x.id)||!P[x.id]||!P[x.id].st)return null;const p=P[x.id];
  const s=p.sz.length?(p.sz.includes(x.s)?x.s:p.sz[0]):'',c=p.cl.length?(p.cl.includes(x.c)?x.c:p.cl[0]):'',q=Math.max(1,Math.min(p.st,Number.isInteger(x.q)?x.q:1));return {id:x.id,s,c,q}}).filter(Boolean):[];
 cart=sc;
 fav=Array.isArray(fav)?[...new Set(fav.filter(i=>isInt(i)&&P[i]))]:[];
 saved=Array.isArray(saved)?[...new Set(saved.filter(i=>isInt(i)&&V[i]))]:[];
 const pg={};if(prog&&typeof prog==='object'&&!Array.isArray(prog))for(const k of Object.keys(prog)){const i=+k;if(/^\d+$/.test(k)&&V[i]&&Number.isFinite(prog[k]))pg[i]=Math.max(0,Math.min(100,Math.round(prog[k])))}
 prog=pg;
 if(typeof lw!=='undefined'&&!(isInt(lw)&&V[lw]))lw=null;
 S('cart',cart);S('fav',fav);S('saved',saved);S('prog',prog);if(role)S('role',role)})();
