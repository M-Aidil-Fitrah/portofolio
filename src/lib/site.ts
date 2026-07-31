import { requireEnv } from "./env";

// Sengaja dievaluasi saat modul dimuat: sitemap, canonical URL, dan OG image
// menunjuk domain ini, jadi kalau kosong lebih baik build gagal daripada terbit
// dengan domain yang salah.
export const SITE_URL = requireEnv(
  "NEXT_PUBLIC_SITE_URL",
  process.env.NEXT_PUBLIC_SITE_URL,
);
export const SITE_NAME = "Muhammad Aidil Fitrah";
export const SITE_AUTHOR = "Muhammad Aidil Fitrah";
export const SOCIAL = {
  linkedin: "https://linkedin.com/in/muhammadaidilfitrahh",
  // TODO: replace dummy GitHub URL with the real profile.
  github: "https://github.com/username",
  email: "muhammadfitrah46@gmail.com",
};
