const V='tatami-v2',CACHE_PREFIX='tatami-cache-prefix',CORE_COUNT=7,SHELL=['./','index.html','offline.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',event=>{
 // Keep the new worker waiting while any page is still using the previous version.
 event.waitUntil((async()=>{
  const cache=await caches.open(V),core=SHELL.slice(0,CORE_COUNT),routes=SHELL.slice(CORE_COUNT);
  await cache.addAll(core);
  const results=await Promise.allSettled(routes.map(url=>cache.add(url)));
  results.forEach((result,index)=>{if(result.status==='rejected')console.warn('[Tatami SW] optional route was not precached:',routes[index],result.reason)});
 })().catch(error=>{console.error('[Tatami SW] install failed',error);throw error}));
});
self.addEventListener('activate',event=>{
 // Cache Storage is shared by all role PWAs on the same origin. Retire only this role's old versions.
 event.waitUntil(caches.keys().then(names=>Promise.all(
  names.filter(name=>name.startsWith(CACHE_PREFIX+'-')&&name!==V).map(name=>caches.delete(name))
 )));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   const cache=await caches.open(V);
   const cached=await cache.match(request);
   if(cached)return cached;
   try{return await fetch(request)}
   catch(error){
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
  try{
   const response=await fetch(request);
   if(response.ok&&(new URL(request.url).origin===location.origin||/fonts\.(googleapis|gstatic)\.com/.test(request.url))){
    try{await cache.put(request,response.clone())}catch{}
   }
   return response;
  }catch(error){
   const fallback=await cache.match(request);
   if(fallback)return fallback;
   throw error;
  }
 })());
});
