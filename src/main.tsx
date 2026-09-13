import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'

/**
 * iOS Safari withholds `:active` on a tap unless the document is listening for
 * touches. The listener does nothing; its existence is the whole point.
 */
document.addEventListener('touchstart', () => {}, { passive: true })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={400} skipDelayDuration={200}>
        <App />
      </TooltipProvider>
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
