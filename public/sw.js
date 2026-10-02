// public/sw.js
// Service worker: permite abrir y recargar la app web sin internet.
//
// - Al instalarse guarda la página y TODOS los archivos del build (lista en
//   /precache-manifest.json, generada por scripts/generate-precache.mjs), incluidas
//   las pantallas que se cargan bajo demanda.
// - Solo atiende peticiones GET al mismo dominio. Firestore, Auth y Storage van a
//   otros dominios y no pasan por aquí: sus datos sin conexión los maneja Firestore.
//
// __BUILD_ID__ se reemplaza en cada build para que el navegador detecte la versión nueva.

const BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = `m3-app-${BUILD_ID}`;
const APP_SHELL = '/';

const precache = async () => {
  const cache = await caches.open(CACHE_NAME);
  let files = [APP_SHELL];
  try {
    const response = await fetch('/precache-manifest.json', { cache: 'no-store' });
    if (response.ok) files = [...new Set([...files, ...(await response.json())])];
  } catch (_e) {
    // Sin manifiesto: los archivos se guardan conforme se van usando
  }
  // Un archivo que falle no debe impedir que se guarde el resto
  await Promise.all(files.map((file) => cache.add(file).catch(() => {})));
};

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const saveToCache = async (request, response) => {
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
};

// Página: primero la red (para recibir versiones nuevas); sin red, la copia guardada
const handleNavigation = async (request) => {
  try {
    const response = await fetch(request);
    // La app es de una sola página: cualquier ruta devuelve el mismo index.html
    if (response.ok) await saveToCache(APP_SHELL, response.clone());
    return response;
  } catch (_e) {
    const cached = (await caches.match(request)) || (await caches.match(APP_SHELL));
    return cached || Response.error();
  }
};

// Archivos del build (nombre con hash, nunca cambian): primero la copia guardada
const handleStaticAsset = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  return saveToCache(request, await fetch(request));
};

// Resto (iconos, manifest): la red si hay, y si no la copia guardada
const handleOther = async (request) => {
  try {
    return await saveToCache(request, await fetch(request));
  } catch (_e) {
    return (await caches.match(request)) || Response.error();
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js' || url.pathname === '/precache-manifest.json') return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
  } else if (url.pathname.startsWith('/_expo/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleOther(request));
  }
});
