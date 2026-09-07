// 住宅ローン返済シミュレーション — オフライン用のキャッシュ
// 方針：本体（index.html）は「まずネットワーク、だめならキャッシュ」。
//       オンラインなら常に最新版が手に入り、オフラインなら直前の版で起動できる。
//       外部ドメインへは一切アクセスしない。
const CACHE = 'loan-sim-2026-09-07b';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).catch(function(){}));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; })
                            .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  const url = new URL(e.request.url);
  // 自分のドメイン以外へは何もしない（そもそも外部参照は無い）
  if(url.origin !== self.location.origin) return;
  if(e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request).then(function(res){
      const copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(e.request, copy); }).catch(function(){});
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(hit){
        return hit || caches.match('./index.html');
      });
    })
  );
});
