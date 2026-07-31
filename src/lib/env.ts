// Env yang beda per environment tidak boleh punya nilai cadangan. Nilai cadangan
// bikin build tetap "berhasil" sambil menunjuk host yang salah — sitemap, canonical
// URL, dan OG image jadi menunjuk domain yang keliru tanpa satu pun error muncul.
// Karena NEXT_PUBLIC_* di-inline saat build, kalau kosong lebih baik build-nya gagal.
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

// API_URL dipakai server component (bisa menunjuk host internal), NEXT_PUBLIC_API_URL
// dipakai browser. Di server API_URL menang; di browser hanya NEXT_PUBLIC_* yang ada.
export function apiUrl() {
  if (typeof window === "undefined") {
    const serverUrl = process.env.API_URL?.trim();
    if (serverUrl) return serverUrl.replace(/\/+$/, "");
    return requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL);
  }
  return requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL);
}
