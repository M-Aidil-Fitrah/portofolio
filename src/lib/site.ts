import { requireEnv } from "./env";

// Dievaluasi saat modul dimuat: kalau kosong, build harus gagal.
export const SITE_URL = requireEnv(
  "NEXT_PUBLIC_SITE_URL",
  process.env.NEXT_PUBLIC_SITE_URL,
);
export const SOCIAL = {
  linkedin: "https://linkedin.com/in/muhammadaidilfitrahh",
  github: "https://github.com/M-Aidil-Fitrah",
  email: "muhammadfitrah46@gmail.com",
};
