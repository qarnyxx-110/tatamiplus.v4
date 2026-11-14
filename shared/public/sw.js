const V='tatami-v2',SHELL=['./','index.html','offline.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
const CACHE_PREFIX=V.slice(0,V.lastIndexOf('-')+1);
async function cacheResponse(request,response){
 try{
  const cache=await caches.open(V);
  await cache.put(request,response);
  console.info('[Tatami SW] cache:put',V,request instanceof Request?request.url:request);
  const names=await caches.keys();
  const hasNewerVersion=names.some(name=>name.startsWith(CACHE_PREFIX)&&name!==V);
  console.info('[Tatami SW] cache:versions',JSON.stringify(names),'newer',hasNewerVersion,'installing',!!self.registration.installing,'waiting',!!self.registration.waiting);
  if(hasNewerVersion&&!self.registration.installing&&!self.registration.waiting){await caches.delete(V);console.info('[Tatami SW] cache:old-version-removed',V)}
 }catch{}
}
self.addEventListener('install',e=>{e.waitUntil((async()=>{
 const c=await caches.open(V),core=SHELL.slice(0,7),routes=SHELL.slice(7);
 await c.addAll(core);
 const results=await Promise.allSettled(routes.map(url=>c.add(url)));
 results.forEach((result,index)=>{if(result.status==='rejected')console.warn('[Tatami SW] optional route was not precached:',routes[index],result.reason)});
})().catch(async error=>{try{await caches.delete(V)}catch{}console.error('[Tatami SW] install failed',error);throw error}))});
self.addEventListener('message',e=>{console.info('[Tatami SW] message:received',V,e.data);if(e.data==='TP_SKIP_WAITING')self.skipWaiting().then(()=>console.info('[Tatami SW] message:skip-waiting-resolved',V)).catch(error=>console.error('[Tatami SW] message:skip-waiting-rejected',V,String(error)))});
self.addEventListener('activate',e=>{console.info('[Tatami SW] activate:start',V);e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()).then(()=>console.info('[Tatami SW] activate:done',V)))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
if(r.mode==='navigate'){e.respondWith(fetch(r).then(async x=>{const u=new URL(r.url),root=new URL('./',self.registration.scope).pathname;if(x.ok&&(u.pathname===root||u.pathname===root+'index.html'))await cacheResponse('index.html',x.clone());return x}).catch(()=>caches.match(r).then(cached=>cached||caches.match('index.html').then(x=>x||caches.match('offline.html')))));return}
e.respondWith(caches.match(r).then(c=>c||fetch(r).then(async x=>{if(x.ok&&(new URL(r.url).origin===location.origin||/fonts\.(googleapis|gstatic)\.com/.test(r.url)))await cacheResponse(r,x.clone());return x}).catch(()=>c)))});
