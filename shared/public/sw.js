const V='tatami-v2',CACHE_PREFIX='tatami-cache-prefix',CORE_COUNT=6,SHELL=['./','index.html','offline.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',event=>{
 self.skipWaiting().catch(error=>console.error('[Tatami SW] skipWaiting failed',error));
 event.waitUntil((async()=>{
  const cache=await caches.open(V);
  await cache.addAll(SHELL.slice(0,CORE_COUNT));
  const routes=SHELL.slice(CORE_COUNT);
  const results=await Promise.allSettled(routes.map(url=>cache.add(url)));
  results.forEach((result,index)=>{if(result.status==='rejected')console.warn('[Tatami SW] optional route was not precached:',routes[index],result.reason)});
 })().catch(error=>{console.error('[Tatami SW] install failed',error);throw error}));
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING'){
  self.skipWaiting().catch(error=>console.error('[Tatami SW] requested activation failed',error));
  event.ports[0]?.postMessage({type:'SKIP_WAITING_ACK'});
 }
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX+'-')&&name!==V).map(name=>caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   const cache=await caches.open(V);
   try{
    const response=await fetch(request);
    const pathname=new URL(request.url).pathname;
    const root=new URL('./',self.registration.scope).pathname;
    if(response.ok&&(pathname===root||pathname===root+'index.html')){
     try{await cache.put('index.html',response.clone())}catch{}
    }
    return response;
   }catch(error){
    const fallback=await cache.match(request)||await cache.match('index.html')||await cache.match('offline.html');
    if(fallback)return fallback;
    throw error;
   }
  })());
  return;
 }
 event.respondWith((async()=>{
  const cache=await caches.open(V);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response.ok&&(new URL(request.url).origin===location.origin||/fonts\.(googleapis|gstatic)\.com/.test(request.url))){
   try{await cache.put(request,response.clone())}catch{}
  }
  return response;
 })());
});
