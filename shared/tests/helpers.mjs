// ابزارهای مشترک تست‌ها: سرور استاتیک (شبیه هاست واقعی: ریدایرکت اسلش پایانی)، راه‌انداز Playwright، گزارش‌دهی
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
export const pw=(()=>{try{return require('playwright')}catch{return require(process.env.PLAYWRIGHT_PATH||'/home/claude/.npm-global/lib/node_modules/playwright')}})();
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
export function serve(rootRef,port=0){const root=typeof rootRef==='function'?rootRef:()=>rootRef;
 const s=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');let f=path.join(root(),decodeURIComponent(u.pathname));if(!f.startsWith(root())){r.writeHead(403);return r.end()}
  if(fs.existsSync(f)&&fs.statSync(f).isDirectory()){if(!u.pathname.endsWith('/')){r.writeHead(301,{Location:u.pathname+'/'+u.search});return r.end()}f=path.join(f,'index.html')}
  if(!fs.existsSync(f)){r.writeHead(404);return r.end('not found')}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});r.end(fs.readFileSync(f))});
 return new Promise(ok=>s.listen(port,'127.0.0.1',()=>ok({url:'http://127.0.0.1:'+s.address().port,close:()=>new Promise(c=>s.close(c))})))}
export function build(out,env={}){const r=spawnSync('node',['build.js'],{cwd:process.cwd(),env:{...process.env,OUT:out,...env},encoding:'utf8'});if(r.status!==0)throw new Error('build failed: '+r.stderr);return r.stdout}
export class Suite{constructor(name){this.name=name;this.results=[]}
 ok(name,cond,detail=''){this.results.push({name,pass:!!cond,detail:cond?'':String(detail)});if(!cond)console.log('  ✗',this.name,'|',name,detail?'→ '+detail:'')}
 get failed(){return this.results.filter(r=>!r.pass)}
 summary(){return `${this.name}: ${this.results.length-this.failed.length}/${this.results.length} passed`+(this.failed.length?` — FAILED: ${this.failed.map(f=>f.name).join('; ')}`:'')}}
export const WIDTHS=[320,360,390,430,1280,1440,1920];
export const OVERFLOW_JS=()=>{const W=innerWidth,de=document.documentElement;const o=de.scrollWidth>W+1||document.body.scrollWidth>W+1;const bad=[];if(o){for(const e of document.querySelectorAll('body *')){const r=e.getBoundingClientRect();if(r.width>0&&(r.right>W+1||r.left<-1)){let p=e.parentElement,sc=false;while(p&&p!==document.body){const v=getComputedStyle(p).overflowX;if(v=='auto'||v=='scroll'||v=='hidden'){sc=true;break}p=p.parentElement}if(!sc){bad.push(e.tagName+'.'+e.className);if(bad.length>2)break}}}}
const ids={};document.querySelectorAll('[id]').forEach(e=>ids[e.id]=(ids[e.id]||0)+1);return{o,bad,dup:Object.keys(ids).filter(k=>ids[k]>1)}};
export const wait=ms=>new Promise(r=>setTimeout(r,ms));
