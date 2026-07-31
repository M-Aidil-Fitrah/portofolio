"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { getApiQueryClient } from "@/lib/api/query-client";

export function ApiProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getApiQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
