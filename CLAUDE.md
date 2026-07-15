# CLAUDE.md

## Project

Portofolio pribadi **Muhammad Aidil Fitrah** — mahasiswa Informatika Universitas Syiah Kuala. Dark editorial, one-page landing + halaman detail project (`/projects/[slug]`), bilingual EN/ID, animasi GSAP maksimal + Lenis smooth scroll + hero 3D (React Three Fiber). Live URL: TODO.

## Commands

```
pnpm dev      # dev server
pnpm build    # production build
pnpm lint     # eslint
```

`pnpm lint && pnpm build` harus lulus tanpa error sebelum sebuah task dianggap selesai.

## Stack

- Next.js 16 (App Router), React 19, TypeScript strict, pnpm.
- Tailwind CSS v4 — config via `@theme` di `src/app/globals.css`. **Tidak ada** `tailwind.config.*`.
- GSAP 3.13+ dengan `@gsap/react`, `ScrollTrigger`, `SplitText` (Club plugins gratis sejak GSAP 3.13).
- Lenis (smooth scroll, terhubung ke GSAP ticker + ScrollTrigger).
- React Three Fiber v9 + drei v10 (kompatibel React 19 — jangan pakai v8).
- Belum ada dependency animasi/3D yang terinstal di awal — ditambahkan bertahap sesuai fase pengerjaan (lihat plan).

## Arsitektur (target)

```
src/
├── app/                     # server: layout, page, route metadata (sitemap, robots, OG)
│   └── projects/[slug]/     # halaman detail project (SSG)
├── components/
│   ├── providers/           # LocaleProvider, SmoothScrollProvider
│   ├── layout/              # Header, Footer, Preloader, CustomCursor, TransitionLink
│   ├── sections/             # Hero, About, Works, Skills, Awards, Contact (landing)
│   ├── project/              # CaseStudy, ProjectPager
│   ├── three/                # HeroScene, ParticleField (lazy-loaded, hero only)
│   └── ui/                   # AnimatedText, MagneticButton, Marquee, Counter, LangToggle, SectionHeading
└── lib/
    ├── gsap.ts                # satu-satunya tempat registerPlugin; import gsap HANYA dari sini
    ├── animation.ts           # konstanta EASE / DUR / STAGGER + helper fonts.ready
    ├── projects.ts             # data project bilingual (sumber untuk landing, detail page, sitemap, OG)
    └── i18n/                   # types.ts, en.ts (source of truth), id.ts
```

## Konvensi

- Server component secara default. `"use client"` hanya untuk komponen yang butuh animasi/interaksi. Setiap section tetap harus SSR konten English penuh (penting untuk SEO — konten tidak boleh bergantung pada JS untuk muncul).
- GSAP hanya diimport dari `@/lib/gsap`. Semua animasi dijalankan dalam `useGSAP` dengan `scope` yang jelas. Gunakan konstanta motion dari `@/lib/animation` — jangan menulis easing/duration/stagger inline.
- Setiap animasi scroll/pin **wajib** punya branch `gsap.matchMedia()` untuk `prefers-reduced-motion` dan untuk breakpoint mobile bila animasinya desktop-only (mis. horizontal scroll). Hidden state di-set oleh GSAP (`gsap.set`), bukan oleh CSS default — supaya konten tidak pernah invisible jika JS gagal load.
- Semua string yang tampil ke user lewat `useLocale().t`, bukan hardcoded. Menambah copy baru = update `en.ts` **dan** `id.ts` (paritas key di-enforce lewat `type Dictionary = typeof en`).
- Design token hanya dari `@theme` di `globals.css` (ink `#0A0A0A`, surface `#111111`, foreground `#E8E6E1`, muted `#7A7A72`, hairline `#232320`, accent volt `#D9FF3D`). Radius selalu 0. Tidak ada gradien background, tidak ada icon library (SVG inline saja), tidak ada emoji di UI.

## Content

Menambah/mengubah project ada di `src/lib/projects.ts` — ini single source of truth untuk card landing, halaman detail, sitemap, dan OG image. Checklist saat menambah project baru:
- Isi konten `en` dan `id` (tagline, role, case study) — jangan hanya satu bahasa.
- Sertakan `slug`, `cover`, `gallery` (path di `public/assets/projects/{slug}/`).
- Cover/gallery boleh mulai sebagai placeholder desain sampai screenshot asli tersedia.

## Performance & Accessibility

- Budget: LCP < 2.5s (mobile), CLS < 0.05, first-load JS `/` < ~180KB gz (di luar chunk Three.js yang di-defer), Lighthouse ≥ 90 performance / ≥ 95 a11y & SEO.
- Hanya **satu** `<Canvas>` di seluruh situs (hero). Di-dynamic-import dengan `ssr: false`, di-defer sampai idle, `frameloop` dihentikan saat hero di luar viewport.
- Gambar selalu lewat `next/image` dengan `sizes` yang benar — jangan pakai `<img>` untuk aset lokal.
- `prefers-reduced-motion` wajib didukung penuh: tanpa pin, tanpa horizontal hijack, tanpa Lenis, tanpa animasi canvas — semua konten tetap terlihat dan fungsional.

## Gotchas

- `SplitText` harus dijalankan setelah `document.fonts.ready`, kalau tidak baris teks bisa salah ukur.
- Panggil `ScrollTrigger.refresh()` setelah preloader selesai dan setelah setiap transisi route.
- Lenis yang memegang scroll — gunakan `lenis.scrollTo(...)`, jangan `window.scrollTo` di tengah sesi (akan konflik).
- Komponen teks ter-animasi harus re-split saat locale berubah (`useGSAP({ dependencies: [locale] })` atau `key={locale}`).
- i18n memakai satu URL (bukan route `/en` `/id`): server selalu render English, Indonesia adalah client-side enhancement via `localStorage`.
