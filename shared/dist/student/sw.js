const V='tatami-student-2208872161',CACHE_PREFIX='tatami-student',CORE_COUNT=13,SHELL=["./","index.html","offline.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","assets/neshan-config.js","assets/css/home-live-feeds.css","assets/js/home-live-feeds.js","assets/images/judo/uchi-mata.svg","assets/images/judo/seoi-nage.svg","assets/images/judo/osoto-gari.svg","coaches/","coaches/sara-ahmadi/","coaches/reza-kiani/","coaches/maryam-nouri/","coaches/amir-salehi/","coaches/negar-farhadi/","coaches/hossein-radmanesh/","tatamipedia/","tatamipedia/judo/","tatamipedia/kodokan/","tatamipedia/dojo/","tatamipedia/tatami/","tatamipedia/judogi/","tatamipedia/obi/","tatamipedia/rei/","tatamipedia/sensei/","tatamipedia/hajime/","tatamipedia/matte/","tatamipedia/sore-made/","tatamipedia/ippon/","tatamipedia/waza-ari/","tatamipedia/osaekomi/","tatamipedia/toketa/","tatamipedia/shido/","tatamipedia/nage-waza/","tatamipedia/katame-waza/","tatamipedia/ne-waza/","tatamipedia/uchi-mata/","tatamipedia/seoi-nage/","tatamipedia/o-soto-gari/","tatamipedia/kuzushi/","tatamipedia/tsukuri/","tatamipedia/kake/","tatamipedia/kumi-kata/","tatamipedia/seiryoku-zenyo/","tatamipedia/jita-kyoei/","tatamipedia/tori/","tatamipedia/uke/","tatamipedia/ukemi/","tatamipedia/randori/","tatamipedia/dan/","tatamipedia/kyu/","tatamipedia/kesa-gatame/","tatamipedia/okuri-eri-jime/","tatamipedia/hadaka-jime/","tatamipedia/juji-gatame/","tatamipedia/ude-garami/","tatamipedia/maitta/"];
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
