// 住宅ローン返済シミュレーション — オフライン用のキャッシュ
// 方針：本体は「まずネットワーク、だめならキャッシュ」。オンラインなら常に最新、オフラインなら直前の版。
//       新しい版は install しても待機したままにし、利用者が「いま更新する」を押したときだけ切り替える。
//       外部ドメインへは一切アクセスしない。
const CACHE = 'loan-sim-v7';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './version.json', './icon-180.png', './icon-512.png'];

self.addEventListener('install', function(e){
  // skipWaiting はしない（手動更新のため待機する）
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).catch(function(){}));
});

self.addEventListener('message', function(e){
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
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
  if(url.origin !== self.location.origin) return;   // 外部へは関与しない
  if(e.request.method !== 'GET') return;
  // バージョン確認は必ず最新を取りに行く
  if(url.pathname.endsWith('/version.json')){
    e.respondWith(fetch(e.request).catch(function(){ return caches.match(e.request); }));
    return;
  }
  e.respondWith(
    fetch(e.request).then(function(res){
      const copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(e.request, copy); }).catch(function(){});
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(hit){ return hit || caches.match('./index.html'); });
    })
  );
});
