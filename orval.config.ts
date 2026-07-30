import { defineConfig } from "orval";

const input = {
  target: "./backend/api/openapi.yaml",
};

export default defineConfig({
  portfolioApi: {
    input,
    output: {
      clean: true,
      client: "react-query",
      httpClient: "fetch",
      mode: "tags-split",
      target: "./src/lib/api/generated/endpoints",
      schemas: "./src/lib/api/generated/models",
      baseUrl: "",
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: "./src/lib/api/fetcher.ts",
          name: "apiFetch",
        },
      },
    },
  },
  portfolioSchemas: {
    input,
    output: {
      clean: false,
      client: "zod",
      mode: "single",
      target: "./src/lib/api/generated/schemas.ts",
      override: {
        zod: {
          version: 4,
          strict: {
            body: true,
            response: true,
          },
        },
      },
    },
  },
});
