"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { getBrowserApiQueryClient } from "@/lib/api/query-client";

export function ApiProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getBrowserApiQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
