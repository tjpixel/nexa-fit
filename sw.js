/* NEXA Fit · service worker
   - La app (index.html) se pide primero a la red para recibir actualizaciones al momento.
     Si la red no responde en 3,5 s (cobertura mala en el gimnasio) se abre la copia guardada.
   - Librería, tipografías, imágenes e iconos: primero la copia guardada (están versionados).
   - Los datos (Supabase) NUNCA pasan por aquí: siempre van directos a la red. */
const VER='nexa-fit-v5';
const SHELL=['./','./index.html','./manifest.webmanifest','./vendor/supabase-2.117.2.js',
  './fonts/syne.woff2','./fonts/dm-sans.woff2','./fonts/dm-mono-300.woff2','./fonts/dm-mono-400.woff2','./fonts/dm-mono-500.woff2',
  './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./icons/favicon.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VER).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
function networkFirst(req){
  return new Promise(resolve=>{
    let done=false;
    const fallback=()=>caches.match('./index.html').then(hit=>{if(!done&&hit){done=true;resolve(hit)}});
    const timer=setTimeout(fallback,3500);
    fetch(req).then(res=>{
      clearTimeout(timer);
      if(res.ok){const c=res.clone();caches.open(VER).then(x=>x.put('./index.html',c))}
      if(!done){done=true;resolve(res)}
    }).catch(()=>{clearTimeout(timer);caches.match('./index.html').then(hit=>{if(!done){done=true;resolve(hit||Response.error())}})});
  });
}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==location.origin)return;            // Supabase y cualquier otro dominio: directo a la red, sin caché
  if(r.mode==='navigate'||u.pathname.endsWith('/index.html')){e.respondWith(networkFirst(r));return}
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{
    if(res.ok){const c=res.clone();caches.open(VER).then(x=>x.put(r,c))}return res;
  })));
});
