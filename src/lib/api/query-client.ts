import { QueryClient } from "@tanstack/react-query";

let browserClient: QueryClient | undefined;

function createApiQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30_000,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * The browser keeps one client; the server builds a fresh one per render.
 * A module-level cache survives between requests on the server, so one
 * visitor's data would be rendered into another's HTML — and the client,
 * starting empty, would disagree with it and fail hydration.
 */
export function getApiQueryClient() {
  if (typeof window === "undefined") return createApiQueryClient();
  if (!browserClient) browserClient = createApiQueryClient();
  return browserClient;
}
