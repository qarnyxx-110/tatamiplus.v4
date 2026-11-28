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
  event.respondWith(fetch(request).then(async response=>{
   const url=new URL(request.url),root=new URL('./',self.registration.scope).pathname;
   if(response.ok&&(url.pathname===root||url.pathname===root+'index.html')){
    try{const cache=await caches.open(V);await cache.put('index.html',response.clone())}catch{}
   }
   return response;
  }).catch(()=>caches.match(request).then(cached=>cached||caches.match('index.html').then(page=>page||caches.match('offline.html')))));
  return;
 }
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(async response=>{
  if(response.ok&&(new URL(request.url).origin===location.origin||/fonts\.(googleapis|gstatic)\.com/.test(request.url))){
   try{const cache=await caches.open(V);await cache.put(request,response.clone())}catch{}
  }
  return response;
 }).catch(()=>cached)));
});
