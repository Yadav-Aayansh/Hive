import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouteErrorPage, RouteNotFoundPage } from '@/components/route-error'
import { RoutePending } from '@/components/route-progress'
import { toast } from '@/components/ui/toast'
import { attachNotifier, attachRedirector, queryClient } from '@/lib/queryClient'
import { routeTree } from './routeTree.gen'
import './index.css'

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 10_000,
  defaultPendingComponent: RoutePending,
  defaultPendingMs: 150,
  defaultPendingMinMs: 300,
  defaultErrorComponent: RouteErrorPage,
  defaultNotFoundComponent: RouteNotFoundPage,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

attachRedirector((target) => {
  void router.navigate({ to: target, replace: true })
})

attachNotifier((message) => {
  toast.add({ title: message, type: 'error' })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
