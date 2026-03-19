const CACHE_NAME = 'medicare-plus-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/assets/logo.png'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle API requests differently (network first)
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return response;
        })
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // For other requests - cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // If both cache and network fail, show offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  }
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data.json();
  
    const options = {
      body: data.body,
      icon: '/assets/logo.png',
      badge: '/assets/logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url
    },
    actions: [
      {
        action: 'open',
        title: 'Open'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url)
    );
  }
});

// Sync functions
async function syncMessages() {
  try {
    const db = await openDB();
    const offlineMessages = await getOfflineMessages(db);
    
    for (const message of offlineMessages) {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });
      await deleteOfflineMessage(db, message.id);
    }
  } catch (error) {
    console.error('Sync messages failed:', error);
  }
}

async function syncAppointments() {
  try {
    const db = await openDB();
    const offlineAppointments = await getOfflineAppointments(db);
    
    for (const appointment of offlineAppointments) {
      await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointment)
      });
      await deleteOfflineAppointment(db, appointment.id);
    }
  } catch (error) {
    console.error('Sync appointments failed:', error);
  }
}

// IndexedDB helper functions
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MediCarePlusOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      db.createObjectStore('messages', { keyPath: 'id' });
      db.createObjectStore('appointments', { keyPath: 'id' });
    };
  });
}

async function getOfflineMessages(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function deleteOfflineMessage(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getOfflineAppointments(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['appointments'], 'readonly');
    const store = transaction.objectStore('appointments');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function deleteOfflineAppointment(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['appointments'], 'readwrite');
    const store = transaction.objectStore('appointments');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
