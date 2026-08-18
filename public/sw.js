// Bump CACHE_NAME whenever this file changes so browsers install a new worker.
const CACHE_NAME = 'bookshelf-shell-v3'
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
const hashedAssetsPrefix = resolvePath('./assets/')
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

// Vite hashed build outputs are content-addressed and safe to reuse across visits.
const isHashedAsset = (url) => url.pathname.startsWith(hashedAssetsPrefix)

const isImmutable = (url) => isHashedAsset(url) || immutablePaths.has(url.pathname)

const isHtmlResponse = (response) => {
  const type = response.headers.get('content-type') || ''
  return type.includes('text/html')
}

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
  // Cross-origin (including Open Library) is never intercepted.
  if (!isSameOriginGet(request, url)) return

  if (isHtmlNavigation(request, url) || !isImmutable(url)) {
    event.respondWith(networkFirst(request, url))
    return
  }

  event.respondWith(cacheFirst(request))
})

function putInCache(cache, request, response) {
  // Do not await: large hashed assets should stream to the page immediately.
  void (async () => {
    try {
      await cache.put(request, response)
    } catch {
      // redirected, quota, or partial responses cannot be stored
    }
  })()
}

function referencedPathsFromHtml(html) {
  const paths = new Set()
  const pattern = /(?:src|href)=["']([^"']+)["']/gi
  let match
  while ((match = pattern.exec(html))) {
    try {
      const url = new URL(match[1], self.location)
      if (url.origin === self.location.origin) paths.add(url.pathname)
    } catch {
      // ignore malformed URLs in markup
    }
  }
  return paths
}

function pruneHashedAssetsNotIn(response) {
  // Drop previous Vite hashes so they cannot accumulate in the current cache.
  void (async () => {
    try {
      const html = await response.text()
      const referenced = referencedPathsFromHtml(html)
      const cache = await caches.open(CACHE_NAME)
      const keys = await cache.keys()
      await Promise.all(
        keys.map((request) => {
          const url = new URL(request.url)
          if (!isHashedAsset(url) || referenced.has(url.pathname)) return undefined
          return cache.delete(request)
        }),
      )
    } catch {
      // ignore prune failures
    }
  })()
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request, MATCH)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) putInCache(cache, request, response.clone())
  return response
}

async function networkFirst(request, url) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) {
      putInCache(cache, request, response.clone())
      if (isHtmlNavigation(request, url) || isHtmlResponse(response)) {
        pruneHashedAssetsNotIn(response.clone())
      }
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
