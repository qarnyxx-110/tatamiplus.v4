const V='tatami-v2',SHELL=['./','index.html','offline.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{
 const c=await caches.open(V),core=SHELL.slice(0,7),routes=SHELL.slice(7);
 await c.addAll(core);
 const results=await Promise.allSettled(routes.map(url=>c.add(url)));
 results.forEach((result,index)=>{if(result.status==='rejected')console.warn('[Tatami SW] optional route was not precached:',routes[index],result.reason)});
 await self.skipWaiting();
})().catch(error=>{console.error('[Tatami SW] install failed',error);throw error}))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{const u=new URL(r.url),root=new URL('./',self.registration.scope).pathname;if(x.ok&&(u.pathname===root||u.pathname===root+'index.html')){const c=x.clone();caches.open(V).then(h=>h.put('index.html',c))}return x}).catch(()=>caches.match(r).then(cached=>cached||caches.match('index.html').then(x=>x||caches.match('offline.html')))));return}
e.respondWith(caches.match(r).then(c=>c||fetch(r).then(x=>{if(x.ok&&(new URL(r.url).origin===location.origin||/fonts\.(googleapis|gstatic)\.com/.test(r.url))){const y=x.clone();caches.open(V).then(h=>h.put(r,y))}return x}).catch(()=>c)))});
