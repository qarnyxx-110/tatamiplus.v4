// سرور آزمایشی برای تست فرانت‌اند — بک‌اند محصول نیست!
// قرارداد docs/API_CONTRACT.md را در حافظه شبیه‌سازی می‌کند تا کلاینت پنل مارکتینگ و اتصال عمومی بلاگ/تاتامی‌پدیا قابل‌تست باشد.
// اجرا: node tools/mock-api-server.mjs --port 8600 --static dist
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d};
const PORT=+arg('port',8600),STATIC=path.resolve(arg('static','dist'));
const USERS={marketing:{password:'marketing123',display_name:'مسئول مارکتینگ',permissions:['articles.manage','articles.delete','glossary.manage','glossary.delete','media.upload']},editor:{password:'editor123',display_name:'ویراستار (بدون حذف)',permissions:['articles.manage','glossary.manage','media.upload']},student:{password:'student123',display_name:'هنرجو',permissions:[]}};
const sessions=new Map(),media=new Map();let db=null;
const seed=()=>{const s=JSON.parse(fs.readFileSync(path.resolve(arg('seed','src/data/blog-seed.json')),'utf8')),t=JSON.parse(fs.readFileSync(path.resolve(arg('tpd','src/data/tatamipedia.json')),'utf8'));
 db={nid:{a:100,t:100,tc:100},articles:s.map((a,i)=>({...a,id:i+1})),acats:[...new Set(s.map(a=>a.category))].map((n,i)=>({id:i+1,name:n,slug:n})),
 tcats:t.categories.map((c,i)=>({id:i+1,slug:c.slug,name:c.name,name_ja:c.nameJa,romaji:c.romaji,order:c.order})),
 terms:t.terms.map((x,i)=>({id:i+1,slug:x.slug,name_fa:x.nameFa,name_ja:x.nameJa,romaji:x.romaji,meaning:x.meaning,description:x.description,usage:x.usage||'',safety:x.safety||'',categories:x.categories,related:x.related,featured:!!x.featured,status:'published',image_url:''}))}};
seed();
const live=a=>a.status==='published'||(a.status==='scheduled'&&a.publish_at&&new Date(a.publish_at)<=new Date());
const cors={'Access-Control-Allow-Origin':'*'};
const send=(res,code,obj,h={})=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8',...h});res.end(obj==null?'':JSON.stringify(obj))};
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split('; ').filter(Boolean).map(c=>c.split('=')));
const clean=h=>String(h||'').replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi,'').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/javascript:/gi,'');
const SLUG=/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u,SLUG_L=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const page=(l,u)=>{const ps=Math.min(500,+u.searchParams.get('page_size')||10),pg=Math.max(1,+u.searchParams.get('page')||1);return{count:l.length,results:l.slice((pg-1)*ps,pg*ps)}};
const pubArticle=a=>({id:a.id,slug:a.slug,title:a.title,excerpt:a.excerpt,body_html:clean(a.body_html),cover_image_url:a.cover_image_url||'',author_name:a.author_name,category:{name:a.category,slug:a.category},tags:(a.tags||[]).map(name=>({name})),published_at:a.published_at||a.publish_at});
const body=req=>new Promise(r=>{const c=[];req.on('data',d=>c.push(d));req.on('end',()=>r(Buffer.concat(c)))});
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://x'),p=u.pathname,ck=cookies(req);
 if(p==='/__reset'){seed();sessions.clear();return send(res,200,{ok:true})}
 if(p.startsWith('/media/')){const m=media.get(p.slice(7));if(!m)return send(res,404,{detail:'not found'});res.writeHead(200,{'Content-Type':m.type});return res.end(m.buf)}
 if(!p.startsWith('/api/v1/')){let f=path.join(STATIC,decodeURIComponent(p));if(!f.startsWith(STATIC)){res.writeHead(403);return res.end()}
  if(fs.existsSync(f)&&fs.statSync(f).isDirectory()){if(!p.endsWith('/')){res.writeHead(301,{Location:p+'/'+u.search});return res.end()}f=path.join(f,'index.html')}
  if(!fs.existsSync(f)){res.writeHead(404);return res.end('not found')}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});return res.end(fs.readFileSync(f))}
 const api=p.slice(8),m=req.method,seg=api.split('/').filter(Boolean);
 if(m==='OPTIONS'){res.writeHead(204,{...cors,'Access-Control-Allow-Methods':'GET,OPTIONS'});return res.end()}
 // ---- عمومی (بدون احراز هویت)
 if(m==='GET'&&seg[0]==='public'){const h=cors;
  if(seg[1]==='articles'&&!seg[2]){const q=(u.searchParams.get('q')||'').toLowerCase(),l=db.articles.filter(live).filter(a=>!q||(a.title+a.excerpt).toLowerCase().includes(q)).sort((a,b)=>String(b.published_at||b.publish_at).localeCompare(String(a.published_at||a.publish_at)));const r=page(l,u);return send(res,200,{count:r.count,results:r.results.map(pubArticle)},h)}
  if(seg[1]==='articles'){const a=db.articles.filter(live).find(x=>x.slug===decodeURIComponent(seg[2]));return a?send(res,200,pubArticle(a),h):send(res,404,{detail:'یافت نشد'},h)}
  if(seg[1]==='glossary'&&seg[2]==='categories')return send(res,200,{results:db.tcats},h);
  if(seg[1]==='glossary'&&seg[2]==='terms'){const l=db.terms.filter(t=>t.status==='published'),r=page(l,u);return send(res,200,{count:r.count,results:r.results},h)}
  return send(res,404,{detail:'نیست'},h)}
 // ---- احراز هویت (نشست + CSRF)
 const sess=sessions.get(ck.sid),user=sess&&USERS[sess.u];
 if(seg[0]==='auth'){
  if(seg[1]==='login'&&m==='POST'){const d=JSON.parse((await body(req)).toString()||'{}'),us=USERS[d.username];if(!us||us.password!==d.password)return send(res,401,{detail:'نام کاربری یا رمز عبور درست نیست.'});const sid=crypto.randomBytes(16).toString('hex'),csrf=crypto.randomBytes(12).toString('hex');sessions.set(sid,{u:d.username,csrf});
   return send(res,200,{user:{username:d.username,display_name:us.display_name,permissions:us.permissions}},{'Set-Cookie':[`sid=${sid}; HttpOnly; Path=/; SameSite=Lax`,`csrftoken=${csrf}; Path=/; SameSite=Lax`]})}
  if(seg[1]==='me'&&m==='GET')return user?send(res,200,{user:{username:sess.u,display_name:user.display_name,permissions:user.permissions}}):send(res,401,{detail:'ورود لازم است.'});
  if(seg[1]==='logout'&&m==='POST'){sessions.delete(ck.sid);return send(res,204,null,{'Set-Cookie':'sid=; Max-Age=0; Path=/'})}}
 // ---- CMS: ورود + CSRF + مجوز (در بک‌اند واقعی هم باید دقیقاً همین‌طور باشد)
 if(seg[0]!=='cms')return send(res,404,{detail:'نیست'});
 if(!user)return send(res,401,{detail:'ورود لازم است.'});
 if(m!=='GET'&&req.headers['x-csrftoken']!==sess.csrf)return send(res,403,{detail:'CSRF نامعتبر است.'});
 const perm=p=>user.permissions.includes(p),deny=()=>send(res,403,{detail:'مجوز این عملیات را ندارید.'});
 const art=seg[1]==='articles',gl=seg[1]==='glossary',id=+seg[art?2:3];
 if(art||seg[1]==='article-categories'||seg[1]==='media'){if(!perm(seg[1]==='media'?'media.upload':'articles.manage'))return deny()}
 if(gl&&!perm('glossary.manage'))return deny();
 if(seg[1]==='media'&&m==='POST'){const raw=await body(req),ct=req.headers['content-type']||'',bd=ct.split('boundary=')[1];if(!bd)return send(res,400,{errors:{file:'درخواست نامعتبر است.'}});
  const s=raw.toString('latin1'),i=s.indexOf('\r\n\r\n'),head=s.slice(0,i),end=s.lastIndexOf('\r\n--'+bd),buf=raw.subarray(i+4,end),type=(head.match(/Content-Type: ([^\r\n]+)/i)||[])[1];
  const mg=buf.subarray(0,4),ok=(type==='image/png'&&mg[0]===0x89&&mg[1]===0x50)||(type==='image/jpeg'&&mg[0]===0xff&&mg[1]===0xd8)||(type==='image/webp'&&buf.subarray(8,12).toString()==='WEBP');
  if(!ok)return send(res,400,{errors:{file:'فقط تصویر JPEG، PNG یا WebP معتبر مجاز است.'}});if(buf.length>2*1024*1024)return send(res,413,{errors:{file:'حجم تصویر باید حداکثر ۲ مگابایت باشد.'}});
  const mid=crypto.randomBytes(6).toString('hex');media.set(mid,{type,buf:Buffer.from(buf)});return send(res,201,{id:mid,url:'/media/'+mid})}
 if(seg[1]==='article-categories')return send(res,200,{results:db.acats});
 if(art){
  if(m==='GET'&&!seg[2]){const q=(u.searchParams.get('q')||'').toLowerCase(),st=u.searchParams.get('status'),ct=u.searchParams.get('category');let l=db.articles.map(a=>live(a)&&a.status==='scheduled'?{...a,status:'published'}:a).filter(a=>(!st||a.status===st)&&(!ct||a.category===ct)&&(!q||(a.title+a.excerpt+a.category).toLowerCase().includes(q)));l.sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));return send(res,200,page(l,u))}
  if(m==='GET'){const a=db.articles.find(x=>x.id===id);return a?send(res,200,a):send(res,404,{detail:'مقاله پیدا نشد.'})}
  if(m==='DELETE'){if(!perm('articles.delete'))return deny();db.articles=db.articles.filter(a=>a.id!==id);return send(res,204,null)}
  if(seg[3]==='publish'||seg[3]==='unpublish'){const a=db.articles.find(x=>x.id===id);if(!a)return send(res,404,{detail:'مقاله پیدا نشد.'});const d=JSON.parse((await body(req)).toString()||'{}');
   if(seg[3]==='unpublish'){a.status='draft';a.publish_at=null;return send(res,200,a)}
   const t=d.publish_at?new Date(d.publish_at):null;if(t&&isNaN(t))return send(res,400,{errors:{publish_at:'زمان نامعتبر است.'}});if(t&&t>new Date()){a.status='scheduled';a.publish_at=t.toISOString()}else{a.status='published';a.publish_at=null;a.published_at=a.published_at||new Date().toISOString()}return send(res,200,a)}
  if(m==='POST'||m==='PUT'){const d=JSON.parse((await body(req)).toString()||'{}'),errors={};if(!String(d.title||'').trim())errors.title='عنوان الزامی است.';if(!SLUG.test(d.slug||''))errors.slug='نشانی کوتاه نامعتبر است.';else if(db.articles.some(a=>a.slug===d.slug&&a.id!==id))errors.slug='این نشانی کوتاه قبلاً استفاده شده است.';
   if(Object.keys(errors).length)return send(res,400,{errors});const now=new Date().toISOString();
   const f={title:d.title,slug:d.slug,excerpt:d.excerpt||'',body_html:clean(d.body_html),author_name:d.author_name||'',category:d.category||'',tags:(d.tags||[]).slice(0,10),cover_image_url:d.cover_image_url||'',seo_title:d.seo_title||'',seo_description:d.seo_description||'',updated_at:now};
   if(f.category&&!db.acats.some(c=>c.name===f.category))db.acats.push({id:db.acats.length+1,name:f.category,slug:f.category});
   if(m==='PUT'){const a=db.articles.find(x=>x.id===id);if(!a)return send(res,404,{detail:'مقاله پیدا نشد.'});Object.assign(a,f);return send(res,200,a)}
   const a={id:db.nid.a++,...f,status:'draft',published_at:null,publish_at:null};db.articles.push(a);return send(res,201,a)}}
 if(gl&&seg[2]==='categories'){if(m==='GET')return send(res,200,{results:db.tcats});
  if(m==='DELETE'){if(!perm('glossary.delete'))return deny();const c=db.tcats.find(x=>x.id===+seg[3]);if(c&&db.terms.some(t=>t.categories.includes(c.slug)))return send(res,400,{errors:{_:'این دسته هنوز اصطلاح دارد.'}});db.tcats=db.tcats.filter(x=>x.id!==+seg[3]);return send(res,204,null)}
  const d=JSON.parse((await body(req)).toString()||'{}');if(!d.name||!SLUG_L.test(d.slug||''))return send(res,400,{errors:{slug:'نشانی کوتاه نامعتبر است.'}});if(db.tcats.some(c=>c.slug===d.slug&&c.id!==+seg[3]))return send(res,400,{errors:{slug:'این نشانی کوتاه قبلاً استفاده شده است.'}});
  if(m==='PUT'){const c=db.tcats.find(x=>x.id===+seg[3]);Object.assign(c,{slug:d.slug,name:d.name,name_ja:d.name_ja||'',romaji:d.romaji||'',order:+d.order||0});return send(res,200,c)}
  const c={id:db.nid.tc++,slug:d.slug,name:d.name,name_ja:d.name_ja||'',romaji:d.romaji||'',order:+d.order||0};db.tcats.push(c);return send(res,201,c)}
 if(gl&&seg[2]==='terms'){const tid=+seg[3];
  if(m==='GET'&&!seg[3]){const q=(u.searchParams.get('q')||'').toLowerCase(),st=u.searchParams.get('status'),ct=u.searchParams.get('category');return send(res,200,page(db.terms.filter(t=>(!st||t.status===st)&&(!ct||t.categories.includes(ct))&&(!q||[t.name_fa,t.name_ja,t.romaji,t.meaning].join(' ').toLowerCase().includes(q))),u))}
  if(m==='GET'){const t=db.terms.find(x=>x.id===tid);return t?send(res,200,t):send(res,404,{detail:'اصطلاح پیدا نشد.'})}
  if(m==='DELETE'){if(!perm('glossary.delete'))return deny();db.terms=db.terms.filter(t=>t.id!==tid);return send(res,204,null)}
  const d=JSON.parse((await body(req)).toString()||'{}'),errors={};for(const k of['name_fa','romaji','meaning'])if(!String(d[k]||'').trim())errors[k]='این فیلد الزامی است.';if(!SLUG_L.test(d.slug||''))errors.slug='نشانی کوتاه نامعتبر است.';else if(db.terms.some(t=>t.slug===d.slug&&t.id!==tid))errors.slug='این نشانی کوتاه قبلاً استفاده شده است.';
  if(d.status==='published'&&!(d.categories||[]).length)errors.categories='برای انتشار حداقل یک دسته‌بندی لازم است.';if(Object.keys(errors).length)return send(res,400,{errors});
  const f={slug:d.slug,name_fa:d.name_fa,name_ja:d.name_ja||'',romaji:d.romaji,meaning:d.meaning,description:d.description||'',usage:d.usage||'',safety:d.safety||'',categories:d.categories||[],related:d.related||[],featured:!!d.featured,status:d.status==='published'?'published':'draft',image_url:d.image_url||''};
  if(m==='PUT'){const t=db.terms.find(x=>x.id===tid);if(!t)return send(res,404,{detail:'اصطلاح پیدا نشد.'});Object.assign(t,f);return send(res,200,t)}const t={id:db.nid.t++,...f};db.terms.push(t);return send(res,201,t)}
 return send(res,404,{detail:'نیست'})}catch(e){send(res,500,{detail:'خطای سرور آزمایشی: '+e.message})}}).listen(PORT,'127.0.0.1',()=>console.log('mock api on',PORT));
