import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';

const retireLegacyWorker = async () => {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const legacy = registrations.filter(registration => [registration.active, registration.waiting, registration.installing].some(worker => {
    if (!worker) return false;
    const url = new URL(worker.scriptURL);
    return url.origin === location.origin && url.pathname === '/sw.js';
  }));
  await Promise.all(legacy.map(registration => registration.update()));
};
retireLegacyWorker().catch(() => console.warn('Legacy worker update failed; refresh after reconnecting.'));
const root = createRoot(document.getElementById('root'));
Promise.all([import('./App.jsx'), import('./context/AuthContext.jsx')]).then(modules => {
  const [{ default: App }, { AuthProvider }] = modules;
  root.render(<React.StrictMode><BrowserRouter><AuthProvider><App /><Toaster position="top-right" /></AuthProvider></BrowserRouter></React.StrictMode>);
}).catch(() => {
  root.render(<main className="p-6" role="alert"><h1 className="text-xl font-bold">Hospital portal could not start</h1>
    <p>Check your connection or contact hospital administration. Deployment configuration or application files may be unavailable.</p>
    <button className="mt-3 underline" onClick={() => location.reload()}>Retry startup</button></main>);
});
