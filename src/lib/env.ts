// Env per-environment tanpa nilai cadangan: lebih baik build gagal.
export function requireEnv(key: string, value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `${key} is not set. Isi di .env.local (lihat .env.example) untuk lokal, ` +
        `atau di environment variable platform untuk staging/production.`,
    );
  }
  return trimmed.replace(/\/+$/, "");
}

// API_URL dipakai server component, NEXT_PUBLIC_API_URL dipakai browser.
export function apiUrl() {
  if (typeof window === "undefined") {
    const serverUrl = process.env.API_URL?.trim();
    if (serverUrl) return serverUrl.replace(/\/+$/, "");
    return requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL);
  }
  return requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL);
}
