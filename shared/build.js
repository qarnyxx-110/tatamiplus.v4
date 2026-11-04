// Build تکرارپذیر بدون وابستگی. استفاده:
//   node build.js                      → dist/{student,coach,club,marketing,preview}
//   OUT=.. node build.js               → خروجی‌ها کنار پوشه shared
// متغیرهای محیطی (همه اختیاری):
//   SITE_URL=https://دامنه-واقعی   برای canonical/og:url/og:image صفحه‌های پوششی (بدون آن این تگ‌ها ساخته نمی‌شوند)
//   TP_API_BASE=https://…/api/v1   برای اتصال فهرست‌های عمومی (وبلاگ/تاتامی‌پدیا) و پنل مارکتینگ به بک‌اند
//   ESBUILD=/path/esbuild          برای Minify کامل
const fs=require('fs'),path=require('path'),crypto=require('crypto'),J=p=>path.join(__dirname,p),R=p=>fs.readFileSync(J('src/'+p),'utf8');
let es=null;try{es=require(process.env.ESBUILD||'esbuild')}catch{}
const SITE=(process.env.SITE_URL||'').replace(/\/$/,''),API=(process.env.TP_API_BASE||'').replace(/\/$/,'');
const PUBLIC_JS=['lib/text','shared/core','shared/api','shared/components','ui/components-ui','shared/dashboard-kit','shared/content','shared/store','shared/videos','shared/state-guard','shared/views-core','shared/views-store','shared/views-tournaments','shared/views-videos','shared/views-academy','shared/views-new','shared/views-blog','shared/views-coaches','shared/views-tatamipedia','shared/views-sponsors','student/student','coach/coach','club/club','shared/router'].map(f=>`js/${f}.js`);
const MKT_JS=['lib/text','marketing/util','ui/components-ui','marketing/demo-store','marketing/api-client','marketing/editor','marketing/views','marketing/main'].map(f=>`js/${f}.js`);
const STORE=JSON.parse(R('data/store-products.json'));
const DATA={coaches:JSON.parse(R('data/coaches.json')),sponsors:JSON.parse(R('data/sponsors.json')),tpd:JSON.parse(R('data/tatamipedia.json'))};delete DATA.tpd._note;
const TOK=JSON.parse(R('design/tokens.json'));delete TOK._comment;
const tokensCss=()=>':root{'+Object.entries(TOK).flatMap(([g,o])=>Object.entries(o).map(([k,v])=>`--tp-${g}-${k}:${String(v).replace(/\{([a-z]+)\.([^}]+)\}/g,(m,a,c)=>`var(--tp-${a}-${c})`)}`)).join(';')+'}';
const APPS={
 preview:{fixed:false,deny:[]},
 student:{fixed:true,role:'student',home:'',deny:['role','my-profile','design-system'],name:'Tatami Plus Student',short:'Tatami Student',desc:'تاتامی پلاس برای هنرجویان جودو',start:'./',
  nav:[['','خانه'],['dashboard','داشبورد'],['store','فروشگاه'],['tournaments','تورنمنت‌ها'],['videos','ویدیوهای ضبط‌شده'],['ai','آنالیز هوش مصنوعی'],['academy','آکادمی اساتید'],['coaches','مربیان تاتامی'],['clubs','باشگاه‌ها'],['blog','بلاگ'],['tatamipedia','تاتامی‌پدیا'],['sponsors','حامیان تاتامی پلاس'],['search','جستجو']]},
 coach:{fixed:true,role:'coach',home:'dashboard',deny:['role','ai','clubs','club','design-system'],name:'Tatami Plus Coach',short:'Tatami Coach',desc:'تاتامی پلاس برای مربیان جودو',start:'./#/dashboard',
  nav:[['','خانه'],['dashboard','داشبورد مربی'],['my-profile','پروفایل من'],['tournaments','تورنمنت‌ها'],['videos','ویدیوهای ضبط‌شده'],['academy','آکادمی اساتید'],['coaches','مربیان تاتامی'],['blog','بلاگ'],['tatamipedia','تاتامی‌پدیا'],['store','فروشگاه'],['sponsors','حامیان تاتامی پلاس'],['search','جستجو']]},
 club:{fixed:true,role:'club',home:'dashboard',deny:['role','ai','my-profile','design-system'],name:'Tatami Plus Club',short:'Tatami Club',desc:'تاتامی پلاس برای باشگاه‌های جودو',start:'./#/dashboard',
  nav:[['','خانه'],['dashboard','داشبورد باشگاه'],['clubs','باشگاه‌ها'],['tournaments','تورنمنت‌ها'],['videos','ویدیوهای ضبط‌شده'],['academy','آکادمی اساتید'],['coaches','مربیان تاتامی'],['blog','بلاگ'],['tatamipedia','تاتامی‌پدیا'],['store','فروشگاه'],['sponsors','حامیان تاتامی پلاس'],['search','جستجو']]}
};
const walk=(d,b='')=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name),b+e.name+'/'):[b+e.name]):[];
const AVAIL=walk(J('public/assets/images')).filter(f=>/\.(jpe?g|png|webp|avif)$/i.test(f));
const FONTS=walk(J('public/fonts')).filter(f=>/\.woff2$/i.test(f)); // فونت محلی: فقط اگر فایل واقعاً وجود داشته باشد (مجوز OFL را رعایت کنید)
const min=(c,l)=>es?es.transformSync(c,{loader:l,minify:true,charset:'utf8',target:'es2019'}).code:(l==='css'?c.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').replace(/\s*([{};,>])\s*/g,'$1').replace(/;}/g,'}').trim():c);
const fontCss=()=>FONTS.length?`@font-face{font-family:Vazirmatn;src:url(fonts/${FONTS[0]}) format("woff2");font-weight:100 900;font-display:swap}`:'';
const baseCss=(extra='')=>min([fontCss(),tokensCss(),R('css/base.css'),R('css/components.css'),R('css/ui.css'),extra].join('\n'),'css');
const dropGoogle=h=>FONTS.length?h.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>/,'<link rel="preload" href="fonts/'+FONTS[0]+'" as="font" type="font/woff2" crossorigin>'):h;
function page(name,pwa){const a=APPS[name],cfg={...a};delete cfg.name;delete cfg.short;delete cfg.desc;delete cfg.start;
 let h=dropGoogle(R('index.html'));
 h=h.replace(/<a ([^>]*?)href="#\/([a-z-]*)[^"]*"([^>]*)>[^<]*<\/a>/g,(m,x,k)=>a.deny.includes(k)?'':m);
 const tags=pwa?`<meta name="theme-color" content="#0E0E0E"><meta name="description" content="${a.desc}"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icons/icon-192.png"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`:'';
 const files=(pwa||name!=='preview'?PUBLIC_JS:[...PUBLIC_JS.slice(0,-1),'js/shared/views-styleguide.js',PUBLIC_JS[PUBLIC_JS.length-1]]);
 const js=(pwa?'':'window.__ARTIFACT__=true;\n')+`const APP=${JSON.stringify(cfg)},IMG_AVAIL=${JSON.stringify(AVAIL)},TP_API_BASE=${JSON.stringify(API)},COACHES=${JSON.stringify(DATA.coaches)},STORE_CATALOG=${JSON.stringify(STORE)},SPONSORS=${JSON.stringify(DATA.sponsors)},TPD=${JSON.stringify(DATA.tpd)}${name==='preview'?',TP_TOKENS='+JSON.stringify(TOK):''};\n`+files.map(R).join('\n');
 return h.replace('<!--PWA-->',()=>tags).replace('/*CSS*/',()=>baseCss()).replace('/*JS*/',()=>min(js,'js'))}
function marketing(){const js=`const TP_CMS=${JSON.stringify({apiBase:API,mode:API?'api':'demo'})},BL_SEED=${JSON.stringify(R('data/blog-seed.json')?JSON.parse(R('data/blog-seed.json')):[])},TPD_SEED=${JSON.stringify(DATA.tpd)},TP_DEMO_AUTHOR='تیم مارکتینگ';\n`+MKT_JS.map(R).join('\n');
 return dropGoogle(R('marketing.html')).replace('/*CSS*/',()=>baseCss(R('css/marketing.css'))).replace('/*JS*/',()=>min(js,'js'))}
const OUT=process.env.OUT?path.resolve(process.env.OUT):J('dist');
const keep=s=>!/[\\/]assets[\\/]/.test(s)||fs.statSync(s).isDirectory()||/\.(jpe?g|png|webp|avif)$/i.test(s);
const prune=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true}))if(e.isDirectory()){prune(path.join(d,e.name));if(!fs.readdirSync(path.join(d,e.name)).length)fs.rmdirSync(path.join(d,e.name))}};
const meta=(title,desc,url,img)=>`<title>${title} | تاتامی پلاس</title><meta name="description" content="${desc}"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:type" content="website">${SITE&&url?`<link rel="canonical" href="${SITE}/${url}"><meta property="og:url" content="${SITE}/${url}">`:''}${SITE&&img?`<meta property="og:image" content="${SITE}/${img}">`:''}`;
// صفحه پوششی استاتیک: آدرس خوانا + متادیتا اختصاصی؛ سپس به مسیر هش‌محور برنامه هدایت می‌شود
function stub(o,rel,hash,title,desc,img){const d=path.join(o,rel);fs.mkdirSync(d,{recursive:true});const up='../'.repeat(rel.split('/').filter(Boolean).length);
 fs.writeFileSync(path.join(d,'index.html'),`<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${meta(title,desc,rel+'/',img)}<meta http-equiv="refresh" content="0;url=${up}#/${hash}"></head><body><script>location.replace('${up}#/${hash}')</script><p><a href="${up}#/${hash}">${title}</a></p></body></html>`)}
const strip=s=>String(s).replace(/"/g,'&quot;').replace(/</g,'&lt;');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,10);
for(const n of ['student','coach','club']){const a=APPS[n],o=path.join(OUT,n);fs.rmSync(o,{recursive:true,force:true});fs.mkdirSync(o,{recursive:true});fs.cpSync(J('public'),o,{recursive:true,filter:keep});if(fs.existsSync(o+'/assets'))prune(o+'/assets');fs.cpSync(J('icons/'+n),o+'/icons',{recursive:true});
 const html=page(n,true);fs.writeFileSync(o+'/index.html',html);
 stub(o,'coaches','coaches','مربیان تاتامی','فهرست مربیان جودو تاتامی پلاس.');
 for(const c of DATA.coaches){const nm=c.firstName+' '+c.lastName;stub(o,'coaches/'+c.slug,'coaches/'+c.slug,strip(nm+' — مربی جودو'),strip(`پروفایل نمونه ${nm}؛ ${c.level}، تخصص: ${c.specialties.join('، ')}.`),AVAIL.includes('coaches/'+c.slug+'.jpg')?'assets/images/coaches/'+c.slug+'.jpg':'')}
 stub(o,'tatamipedia','tatamipedia','تاتامی‌پدیا | دانشنامه جودو','مرجع فارسی اصطلاحات و مفاهیم جودو.');
 for(const t of DATA.tpd.terms.filter(t=>t.status!=='draft'))stub(o,'tatamipedia/'+t.slug,'tatamipedia/'+t.slug,strip(t.nameFa+' — تاتامی‌پدیا'),strip(t.meaning+'. '+t.description.slice(0,110)),AVAIL.includes('tatamipedia/'+t.slug+'.jpg')?'assets/images/tatamipedia/'+t.slug+'.jpg':'');
 fs.writeFileSync(o+'/manifest.webmanifest',JSON.stringify({id:'./',name:a.name,short_name:a.short,description:a.desc,lang:'fa',dir:'rtl',start_url:a.start,scope:'./',display:'standalone',orientation:'portrait',background_color:'#0E0E0E',theme_color:'#0E0E0E',icons:[{src:'icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},null,1));
 // نسخه Cache از محتوای Build ساخته می‌شود: هر تغییر در سورس ← نام Cache جدید ← به‌روزرسانی خودکار
 const ver=sha(html+JSON.stringify(AVAIL)+FONTS.join()),shell=['./','index.html','offline.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png',...FONTS.map(f=>'fonts/'+f)];
 fs.writeFileSync(o+'/sw.js',fs.readFileSync(o+'/sw.js','utf8').replace("'tatami-v2'",`'tatami-${n}-${ver}'`).replace("SHELL=['./','index.html','offline.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png']",'SHELL='+JSON.stringify(shell)));
 console.log(n,fs.statSync(o+'/index.html').size,'bytes · cache',ver)}
{const o=path.join(OUT,'marketing');fs.rmSync(o,{recursive:true,force:true});fs.mkdirSync(o,{recursive:true});fs.writeFileSync(o+'/index.html',marketing());console.log('marketing',fs.statSync(o+'/index.html').size,'bytes · mode',API?'api':'demo')}
const previewOut=path.join(OUT,'preview');fs.mkdirSync(previewOut,{recursive:true});fs.cpSync(J('public/assets'),path.join(previewOut,'assets'),{recursive:true,force:true});fs.writeFileSync(path.join(previewOut,'index.html'),page('preview',false));fs.writeFileSync(J('build-artifact.html'),page('preview',false));
console.log('minified:',!!es,'· image slots with files:',AVAIL.length,'· local fonts:',FONTS.length,'· SITE_URL:',SITE||'(unset)','· TP_API_BASE:',API||'(unset)');
