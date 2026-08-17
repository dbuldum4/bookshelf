// Bump CACHE_NAME whenever this file changes so browsers install a new worker.
const CACHE_NAME = 'bookshelf-shell-v2'
const MATCH = { ignoreSearch: true }
const SHELL = [
  './',
  './index.html',
  './favicon.svg',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
]

const resolvePath = (path) => new URL(path, self.location).pathname
const htmlPaths = new Set(['./', './index.html'].map(resolvePath))
const immutablePaths = new Set(
  [
    './favicon.svg',
    './icon-192.png',
    './icon-512.png',
    './icon-maskable-512.png',
    './apple-touch-icon.png',
  ].map(resolvePath),
)

const isSameOriginGet = (request, url) =>
  request.method === 'GET' &&
  (url.protocol === 'http:' || url.protocol === 'https:') &&
  url.origin === self.location.origin

const isHtmlNavigation = (request, url) =>
  request.mode === 'navigate' || htmlPaths.has(url.pathname)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
        ),
      self.clients.claim(),
    ]),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (!isSameOriginGet(request, url)) return

  if (isHtmlNavigation(request, url) || !immutablePaths.has(url.pathname)) {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(cacheFirst(request))
})

async function putInCache(cache, request, response) {
  try {
    await cache.put(request, response)
  } catch {
    // redirected, quota, or partial responses cannot be stored
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request, MATCH)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) await putInCache(cache, request, response.clone())
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) {
      await putInCache(cache, request, response.clone())
      return response
    }
    const cached = await cache.match(request, MATCH)
    return cached || response
  } catch (error) {
    const cached = await cache.match(request, MATCH)
    if (cached) return cached
    throw error
  }
}
