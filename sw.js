/* NEXA Fit · service worker
   - La app (index.html) se pide primero a la red: así cada alumno recibe las actualizaciones al momento,
     y si no hay conexión se abre la última versión guardada.
   - Imágenes e iconos: primero la copia guardada.
   - Librería de cuentas y tipografías: copia guardada y se refresca por detrás.
   - Los datos (Supabase) NUNCA pasan por aquí: siempre van directos a la red. */
const VER='nexa-fit-v1';
const LIB='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
const CDN=['cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VER).then(c=>c.addAll(SHELL).then(()=>c.add(new Request(LIB,{mode:'cors'})).catch(()=>{}))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin){
    if(r.mode==='navigate'||u.pathname.endsWith('/index.html')){
      e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(VER).then(x=>x.put('./index.html',c));return res})
        .catch(()=>caches.match('./index.html')));
      return;
    }
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{
      if(res.ok){const c=res.clone();caches.open(VER).then(x=>x.put(r,c))}return res;
    })));
    return;
  }
  if(CDN.includes(u.hostname)){
    e.respondWith(caches.open(VER).then(async c=>{
      const hit=await c.match(r,{ignoreVary:true});
      const net=fetch(r).then(res=>{if(res.ok||res.type==='opaque')c.put(r,res.clone());return res}).catch(()=>hit);
      return hit||net;
    }));
  }
  // cualquier otra petición (Supabase incluido) va directa a la red, sin caché
});
