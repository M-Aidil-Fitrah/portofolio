import { QueryClient } from "@tanstack/react-query";

let browserClient: QueryClient | undefined;

export function createApiQueryClient() {
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

export function getBrowserApiQueryClient() {
  if (!browserClient) browserClient = createApiQueryClient();
  return browserClient;
}
