import { requireEnv } from "./env";

// Dievaluasi saat modul dimuat: kalau kosong, build harus gagal.
export const SITE_URL = requireEnv(
  "NEXT_PUBLIC_SITE_URL",
  process.env.NEXT_PUBLIC_SITE_URL,
);
export const SOCIAL = {
  linkedin: "https://linkedin.com/in/muhammadaidilfitrahh",
  // TODO: replace dummy GitHub URL with the real profile.
  github: "https://github.com/username",
  email: "muhammadfitrah46@gmail.com",
};
