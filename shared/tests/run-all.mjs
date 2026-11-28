// اجرای کامل: Build → سرورها → تست هر PWA → پنل مارکتینگ. خروجی: test-results/summary.md و results.json
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawn,spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {pw,serve,build,wait} from './helpers.mjs';import {runPublic,runPwa,runClubs,runPreview} from './public.test.mjs';import {runMarketingApi,runMarketingDemo} from './marketing.test.mjs';
import {runCheckout} from './checkout-flow.test.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tp-test-')),MOCK=+process.env.MOCK_PORT||8601,A=path.join(tmp,'a'),B=path.join(tmp,'b'),API=path.join(tmp,'api'),PUB=path.join(tmp,'pub'),SITE=path.join(tmp,'site');
console.log('Build…');build(A);build(B,{TP_API_BASE:'/__build_b__'});build(API,{TP_API_BASE:'/api/v1'});build(PUB,{TP_API_BASE:`http://127.0.0.1:${MOCK}/api/v1`});build(SITE,{SITE_URL:'https://example.test'});
function verifyInlineBundle(app){
 const html=fs.readFileSync(path.join(A,app,'index.html'),'utf8');
 const tags=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
 let checked=0;
 for(const [i,m] of tags.entries()){
  if(/\bsrc\s*=/.test(m[1]))continue;
  if(!m[2].trim())continue;
  try{new vm.Script(m[2],{filename:app+'/index.html#inline-script-'+(i+1)});checked++}
  catch(error){throw new Error('Generated '+app+' inline bundle has invalid JavaScript in script '+(i+1)+': '+error.stack)}
 }
 if(!checked)throw new Error('No inline application bundle found for '+app);
 console.log('PASS generated inline bundle syntax:',app,checked,'script(s)');
}
for(const app of ['student','coach','club','preview'])verifyInlineBundle(app);

// نسخه B: شبیه‌سازی انتشار نسخه جدید. هم سند و هم نسخه Cache در Service Worker تغییر می‌کند.
for(const app of['student','coach','club']){
 const htmlFile=path.join(B,app,'index.html');
 fs.writeFileSync(htmlFile,fs.readFileSync(htmlFile,'utf8').replace('</body>','<!--UPDATE_MARKER--></body>'));
 const swFile=path.join(B,app,'sw.js');
 const swSource=fs.readFileSync(swFile,'utf8');
 const version=swSource.match(/const V='([^']+)'/);
 if(!version)throw new Error('Unable to find generated Service Worker cache version for '+app);
 fs.writeFileSync(swFile,swSource.replace(version[0],`const V='${version[1]}-update'`));
}
const mock=spawn('node',['tools/mock-api-server.mjs','--port',String(MOCK),'--static',API],{stdio:'inherit'});await wait(800);
const browser=await pw.chromium.launch();const out=[];const apps=['student','coach','club'];let root=A;const ctl={use:()=>{root=B},reset:()=>{root=A}};
async function verifyGeneratedServiceWorkerPolicy(app){
 const source=fs.readFileSync(path.join(A,app,'sw.js'),'utf8');
 const version=source.match(/const V='([^']+)'/)?.[1];
 const prefix=source.match(/CACHE_PREFIX='([^']+)'/)?.[1];
 if(!version||prefix!=='tatami-'+app)throw new Error('Generated '+app+' Service Worker has an invalid role cache namespace');
 if(/\\bskipWaiting\\s*\\(/.test(source)||/\\bclients\\.claim\\s*\\(/.test(source)){
  throw new Error('Generated '+app+' Service Worker contains a forced activation or client-claim call');
 }
 const otherRole=apps.find(role=>role!==app);
 const cacheNames=[`tatami-${app}-old`,version,`tatami-${otherRole}-preserve`,'tatami-unrelated-preserve'];
 const deleted=[];
 const listeners={};
 const sandbox={
  self:{addEventListener:(name,handler)=>{listeners[name]=handler}},
  caches:{
   keys:async()=>cacheNames.slice(),
   delete:async name=>{deleted.push(name);return true}
  },
  Promise,
  URL,
  console
 };
 vm.runInNewContext(source,sandbox,{filename:app+'/sw.js'});
 if(typeof listeners.activate!=='function')throw new Error('Generated '+app+' Service Worker has no activate handler');
 let activationWork;
 listeners.activate({waitUntil(promise){activationWork=promise}});
 if(!activationWork)throw new Error('Generated '+app+' Service Worker does not wait for cache cleanup');
 await activationWork;
 const expected=[`tatami-${app}-old`];
 if(JSON.stringify(deleted)!==JSON.stringify(expected)){
  throw new Error('Generated '+app+' Service Worker cleanup crossed role boundaries: '+JSON.stringify({deleted,expected}));
 }
 console.log('PASS Service Worker deferred-update policy and role Cache cleanup:',app);
}
try{
 for(const app of apps){
  const sw=path.join(A,app,'sw.js');
  const syntax=spawnSync(process.execPath,['--check',sw],{encoding:'utf8'});
  if(syntax.status!==0)throw new Error('Generated Service Worker syntax failed for '+app+': '+(syntax.stderr||syntax.stdout));
  console.log('PASS generated Service Worker syntax:',app);
  await verifyGeneratedServiceWorkerPolicy(app);
 }
 if(process.env.ONLY==='marketing'){
  const pubSrv=await serve(path.join(PUB,'student'));
  console.log('→ marketing (API)');
  out.push(await runMarketingApi(`http://127.0.0.1:${MOCK}`,pubSrv.url,browser));
  await pubSrv.close();
  const demoSrv=await serve(A);
  console.log('→ marketing (Demo)');
  out.push(await runMarketingDemo(demoSrv.url,browser));
  await demoSrv.close();
 }else if(process.env.ONLY==='clubs'){
  for(const app of ['student','club']){
   const srv=await serve(()=>path.join(root,app));
   console.log('→ clubs integration:',app);
   out.push(await runClubs(app,srv.url,browser));
   await srv.close();
  }
 }else if(['student','coach','club'].includes(process.env.ONLY)){
  const app=process.env.ONLY;
  const srv=await serve(()=>path.join(root,app));
  console.log('→',app,'browser regression');
  out.push(await runPublic(app,srv.url,browser));
  console.log('→',app,'PWA technical regression');
  out.push(await runPwa(app,srv.url,browser,ctl));
  await srv.close();
 }else if(process.env.ONLY==='section-smoke'){
  // Focused section-consolidation smoke run. Run the public browser suites for
  // all three roles without the separate PWA update-lifecycle harness.
  for(const app of apps){
   const srv=await serve(path.join(A,app));
   console.log('→',app,'section-consolidation browser regression');
   out.push(await runPublic(app,srv.url,browser));
   await srv.close();
  }
  const previewSrv=await serve(path.join(A,'preview'));
  console.log('→ Preview access/account/store regression tests');
  out.push(await runPreview(previewSrv.url,browser));
  out.push(await runCheckout(previewSrv.url,browser));
  await previewSrv.close();
 }else if(process.env.ONLY==='preview'){
  const srv=await serve(path.join(A,'preview'));
  console.log('→ Preview access/account/store regression tests');
  out.push(await runPreview(srv.url,browser));
  out.push(await runCheckout(srv.url,browser));
  await srv.close();
 }else{
  for(const app of apps){const srv=await serve(()=>path.join(root,app));console.log('→',app);out.push(await runPublic(app,srv.url,browser));out.push(await runPwa(app,srv.url,browser,ctl));await srv.close()}
  // فلوی خرید Preview: سبد، ورود، نشانی، بازبینی و جلوگیری از سفارش/پرداخت ساختگی
  const checkoutSrv=await serve(path.join(A,'preview'));
  console.log('→ Preview checkout flow');out.push(await runCheckout(checkoutSrv.url,browser));await checkoutSrv.close();
  // متادیتای اشتراک‌گذاری با SITE_URL (دامنه آزمایشی فقط در Build موقت تست)
  const {Suite}=await import('./helpers.mjs');const S=new Suite('صفحه‌های پوششی با SITE_URL');const srv=await serve(path.join(SITE,'student'));const ctx=await browser.newContext(),pg=await ctx.newPage();
  const t=await(await pg.request.get(srv.url+'/coaches/sara-ahmadi/')).text();S.ok('canonical و og:url از SITE_URL ساخته می‌شود',t.includes('<link rel="canonical" href="https://example.test/coaches/sara-ahmadi/">')&&t.includes('og:url'));S.ok('og:image فقط وقتی فایل تصویر وجود دارد (اینجا ندارد ← ساخته نمی‌شود)',!t.includes('og:image'));out.push(S);await srv.close();await ctx.close();
  const mkSrv=await serve(path.join(tmp,'a','student'));await mkSrv.close();
  if(process.env.ONLY!=='public'){console.log('→ marketing (api)');const pubSrv=await serve(path.join(PUB,'student'));out.push(await runMarketingApi(`http://127.0.0.1:${MOCK}`,pubSrv.url,browser));await pubSrv.close();
   console.log('→ marketing (demo)');const dsrv=await serve(A);out.push(await runMarketingDemo(dsrv.url,browser));await dsrv.close();}
 }
}finally{await browser.close();mock.kill()}
const lines=out.map(s=>`- **${s.name}** — ${s.results.length-s.failed.length}/${s.results.length} موفق${s.failed.length?'، ناموفق: '+s.failed.map(f=>f.name+(f.detail?` (${f.detail.slice(0,80)})`:'')).join('؛ '):''}`);
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/results.json',JSON.stringify(out.map(s=>({suite:s.name,results:s.results})),null,1));fs.writeFileSync('test-results/summary.md','# نتیجه آخرین اجرای تست‌ها\n\n'+lines.join('\n')+'\n');
console.log('\n'+out.map(s=>s.summary()).join('\n'));process.exit(out.some(s=>s.failed.length)?1:0);
