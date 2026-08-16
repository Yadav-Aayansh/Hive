import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isApiError } from "./errors";

export type RedirectTarget = "/login" | "/onboarding";

type Redirector = (target: RedirectTarget) => void;
type Notifier = (message: string) => void;

const AUTH_PATHS = new Set(["/auth/login", "/auth/signup", "/users/me"]);

let redirector: Redirector | null = null;
let notifier: Notifier | null = null;

export function attachRedirector(fn: Redirector): void {
  redirector = fn;
}

export function attachNotifier(fn: Notifier): void {
  notifier = fn;
}

function handleError(error: unknown): void {
  if (!isApiError(error)) return;

  switch (error.code) {
    case "UNAUTHENTICATED": {
      if (AUTH_PATHS.has(error.path)) return;
      queryClient.clear();
      redirector?.("/login");
      return;
    }
    case "ONBOARDING_REQUIRED": {
      redirector?.("/onboarding");
      return;
    }
    case "SERVICE_UNAVAILABLE": {
      notifier?.(error.message);
      return;
    }
    default:
      return;
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
