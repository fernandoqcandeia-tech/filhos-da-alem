
"use strict";

const CACHE_NAME = "filhos-da-alem-v2";

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
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FICHEIROS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", evento => {
  evento.waitUntil(
    caches.keys()
      .then(chaves =>
        Promise.all(
          chaves
            .filter(chave => chave.startsWith("filhos-da-alem-") && chave !== CACHE_NAME)
            .map(chave => caches.delete(chave))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", evento => {
  if (evento.request.method !== "GET") return;

  const url = new URL(evento.request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("/imea-logo.png")) {
    evento.respondWith(
      fetch(evento.request, { cache: "no-store" })
        .then(resposta => {
          if (!resposta.ok) throw new Error("Não foi possível carregar o logótipo.");
          return resposta;
        })
        .catch(() => caches.match("./imea-logo.png"))
    );
    return;
  }

  evento.respondWith(
    caches.match(evento.request).then(cached => {
      if (cached) return cached;

      return fetch(evento.request).then(resposta => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(evento.request, copia));
        }
        return resposta;
      });
    })
  );
});

