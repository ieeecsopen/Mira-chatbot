import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { MetricsProvider } from './contexts/MetricsContext'
import { registerSW } from 'virtual:pwa-register'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Clerk Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

// Register Service Worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    toast.info('New version available!', {
      description: 'Click to update the app.',
      action: {
        label: 'Update',
        onClick: () => updateSW(true),
      },
      duration: Infinity,
    })
  },
  onOfflineReady() {
    toast.success('App ready for offline use! 📴', {
      description: 'You can now use MIRA without internet connection.',
      duration: 3000,
    })
  },
  onRegisteredSW(swUrl, registration) {
    console.log('✅ Service Worker registered:', swUrl)
    // Check for updates periodically (every 1 hour)
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
  onRegisterError(error) {
    console.error('❌ Service Worker registration failed:', error)
  },
})

// Listen for online/offline events
window.addEventListener('online', () => {
  toast.success('Back online! 🌐', {
    description: 'Syncing queued messages...',
    duration: 2000,
  })
})

window.addEventListener('offline', () => {
  toast.warning('You are offline 📴', {
    description: 'Messages will be queued and sent when back online.',
    duration: 3000,
  })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <MetricsProvider>
              <App />
              <Toaster
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: '#161b22',
                    border: '1px solid #30363d',
                    color: '#c9d1d9',
                  },
                  className: 'sonner-toast',
                }}
                theme="dark"
                richColors
                closeButton
              />
            </MetricsProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </BrowserRouter>
  </StrictMode>,
)


