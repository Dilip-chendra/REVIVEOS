import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { AuthErrorBoundary } from './components/AuthErrorBoundary'
import './index.css'
import App from './App.tsx'

// Listen for Vite dynamic import chunk failures after deployments and reload cleanly
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[ReviveOS] Stale chunk detected after deployment, reloading...', event);
  const reloadKey = 'revive_preload_retry';
  const lastReload = sessionStorage.getItem(reloadKey);
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
    sessionStorage.setItem(reloadKey, String(now));
    window.location.reload();
  }
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_aHVtYmxlLWtpdHRlbi04My5jbGVyay5hY2NvdW50cy5kZXYk";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthErrorBoundary>
      {PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
          <App />
        </ClerkProvider>
      ) : (
        <App />
      )}
    </AuthErrorBoundary>
  </StrictMode>,
)
