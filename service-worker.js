
"use strict";

const CACHE_NAME = "filhos-da-alem-v1";
const FICHEIROS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./imea-logo.png"
];

self.addEventListener("install", evento => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FICHEIROS))
  );

  self.skipWaiting();
});

self.addEventListener("activate", evento => {
  evento.waitUntil(
    caches.keys().then(chaves =>
      Promise.all(
        chaves
          .filter(chave => chave !== CACHE_NAME)
          .map(chave => caches.delete(chave))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", evento => {
  if (evento.request.method !== "GET") return;

  const url = new URL(evento.request.url);

  if (url.origin !== self.location.origin) return;

  evento.respondWith(
    caches.match(evento.request).then(cached => {
      if (cached) return cached;

      return fetch(evento.request).then(resposta => {
        if (resposta && resposta.ok) {
          const copia = resposta.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(evento.request, copia);
          });
        }

        return resposta;
      });
    })
  );
});
