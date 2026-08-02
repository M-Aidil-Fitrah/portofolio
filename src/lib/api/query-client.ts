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

/** One client in the browser, a fresh one per server render. */
export function getApiQueryClient() {
  if (typeof window === "undefined") return createApiQueryClient();
  if (!browserClient) browserClient = createApiQueryClient();
  return browserClient;
}
