import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { AuthErrorBoundary } from './components/AuthErrorBoundary'
import './index.css'
import App from './App.tsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_d2FybS1iYWJvb24tODU2MC5jbGVyay5hY2NvdW50cy5kZXYk";

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
