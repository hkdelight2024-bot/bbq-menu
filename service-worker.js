
/* HK Delight: low-data offline cache, revision 5.
   Promotion images: cache first (download once per unique filename).
   HTML/JS/JSON: network first, cached offline fallback.
   Videos: normal browser streaming; no whole-video Cache API storage.
*/
var CORE_CACHE='hk-delight-core-v5';
var MEDIA_CACHE='hk-delight-promo-media-v1';
var CORE_FILES=[
 './bbq.html','./lunchbox.html','./promo.html','./shared.css','./shared.js',
 './display-config.json','./site-version.json','./menu-data.json','./promo-list.js',
 './images/bbq-strip.png','./images/lunch-strip.png','./images/curry.jpg'
];

function cacheKey(request){
 var u=new URL(request.url);
 u.search='';
 return u.href;
}
function isPromoImage(url){
 return /\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(url.pathname)
  && url.pathname.indexOf('/images/')!==-1;
}
function isVideo(url){
 return /\.(mp4|webm)$/i.test(url.pathname);
}

self.addEventListener('install',function(event){
 event.waitUntil(caches.open(CORE_CACHE).then(function(cache){
  return Promise.all(CORE_FILES.map(function(file){
   return fetch(file,{cache:'no-store'}).then(function(r){
    if(r.ok)return cache.put(file,r.clone());
   }).catch(function(){});
  }));
 }).then(function(){return self.skipWaiting();}));
});

self.addEventListener('activate',function(event){
 event.waitUntil(caches.keys().then(function(keys){
  return Promise.all(keys.filter(function(k){
   return k!==CORE_CACHE&&k!==MEDIA_CACHE&&k.indexOf('hk-delight-')===0;
  }).map(function(k){return caches.delete(k);}));
 }).then(function(){return self.clients.claim();}));
});

function cacheFirstImage(request){
 var key=cacheKey(request);
 return caches.open(MEDIA_CACHE).then(function(cache){
  return cache.match(key).then(function(hit){
   if(hit)return hit;
   return fetch(request,{cache:'default'}).then(function(response){
    if(response.ok&&response.type!=='opaque'){
     return cache.put(key,response.clone()).then(function(){
      return response;
     }).catch(function(){return response;});
    }
    return response;
   });
  });
 });
}

function networkFirst(request){
 var key=cacheKey(request);
 return fetch(request,{cache:'no-store'}).then(function(response){
  if(response.ok){
   var copy=response.clone();
   caches.open(CORE_CACHE).then(function(cache){
    return cache.put(key,copy);
   }).catch(function(){});
  }
  return response;
 }).catch(function(){
  return caches.match(key).then(function(hit){
   if(hit)return hit;
   if(request.mode==='navigate'){
    return new Response(
     '<!doctype html><html><body style="background:#000"></body></html>',
     {headers:{'Content-Type':'text/html'}}
    );
   }
   return new Response('',{status:503,statusText:'Offline'});
  });
 });
}

self.addEventListener('fetch',function(event){
 var request=event.request;
 if(request.method!=='GET')return;
 var url=new URL(request.url);
 if(url.origin!==self.location.origin)return;

 /* Never intercept partial video requests. */
 if(isVideo(url)||request.headers.has('range'))return;

 if(isPromoImage(url)){
  event.respondWith(cacheFirstImage(request));
  return;
 }
 event.respondWith(networkFirst(request));
});
