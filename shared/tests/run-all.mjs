// اجرای کامل: Build → سرورها → تست هر PWA → پنل مارکتینگ. خروجی: test-results/summary.md و results.json
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawn} from 'node:child_process';
import {pw,serve,build,wait} from './helpers.mjs';import {runPublic,runPwa,runClubs,runPreview} from './public.test.mjs';import {runMarketingApi,runMarketingDemo} from './marketing.test.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tp-test-')),MOCK=+process.env.MOCK_PORT||8601,A=path.join(tmp,'a'),B=path.join(tmp,'b'),API=path.join(tmp,'api'),PUB=path.join(tmp,'pub'),SITE=path.join(tmp,'site');
console.log('Build…');build(A);build(B,{TP_API_BASE:'/__build_b__'});build(API,{TP_API_BASE:'/api/v1'});build(PUB,{TP_API_BASE:`http://127.0.0.1:${MOCK}/api/v1`});build(SITE,{SITE_URL:'https://example.test'});
// نسخه B: شبیه‌سازی انتشار نسخه جدید (برای تست به‌روزرسانی Service Worker)
for(const app of['student','coach','club']){const f=path.join(B,app,'index.html');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('</body>','<!--UPDATE_MARKER--></body>'))}
const mock=spawn('node',['tools/mock-api-server.mjs','--port',String(MOCK),'--static',API],{stdio:'inherit'});await wait(800);
const browser=await pw.chromium.launch();const out=[];const apps=['student','coach','club'];let root=A;const ctl={use:()=>{root=B},reset:()=>{root=A}};
try{
 if(process.env.ONLY==='clubs'){
  for(const app of ['student','club']){
   const srv=await serve(()=>path.join(root,app));
   console.log('→ clubs integration:',app);
   out.push(await runClubs(app,srv.url,browser));
   await srv.close();
  }
 }else if(process.env.ONLY==='preview'){
  const srv=await serve(path.join(A,'preview'));
  console.log('→ Preview access/account/store regression tests');
  out.push(await runPreview(srv.url,browser));
  await srv.close();
 }else{
  for(const app of apps){const srv=await serve(()=>path.join(root,app));console.log('→',app);out.push(await runPublic(app,srv.url,browser));out.push(await runPwa(app,srv.url,browser,ctl));await srv.close()}
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
