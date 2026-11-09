import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/auth/index.js'; // Added .jsx extension
import { Toaster } from 'react-hot-toast';

const cleanupServiceWorker = async () => {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) {
      return;
    }

    const legacy = registrations.filter(reg => [reg.active, reg.waiting, reg.installing].some(worker => {
      if (!worker) return false;
      const url = new URL(worker.scriptURL);
      return url.origin === window.location.origin && url.pathname === '/sw.js';
    }));
    await Promise.all(legacy.map(reg => reg.update()));
  }
};

cleanupServiceWorker().catch(() => {
  // Do not interrupt authentication or force a reload while users enter data.
  console.warn('The legacy offline worker could not be updated. Refresh after reconnecting.');
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
