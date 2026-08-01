# Portofolio — Muhammad Aidil Fitrah

Personal portfolio and activity journal for an Informatics student at
Universitas Syiah Kuala. Dark editorial design, bilingual EN/ID, heavy GSAP
motion over Lenis smooth scroll, with a self-hosted media pipeline behind an
admin area.

Live URL: not deployed yet.

## What is in here

A Next.js front end and a Go back end in one repository.

- **Public site** — one-page landing (hero, about, works, skills, awards,
  contact), project case studies at `/projects/[slug]`, and an activity feed at
  `/activities`. Every section server-renders full English content, so nothing
  depends on JavaScript to be readable or indexable. Indonesian is a
  client-side enhancement on the same URL.
- **Admin area** (`/admin`) — writes activities, uploads media and documents,
  crops covers, and previews the result against the real public renderer before
  publishing.
- **Go API** — activities, engagement (likes and comments), the contact form,
  and direct-to-storage asset uploads.
- **Media worker** — turns every upload into web-ready derivatives: responsive
  lossless WebP for images, MP4 H.264 with a poster for video, and a PDF
  preview with a thumbnail for documents.

## Stack

| Layer | Choice |
| --- | --- |
| Front end | Next.js 16 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS v4, configured through `@theme` in `globals.css` |
| Motion | GSAP 3.13 with ScrollTrigger, SplitText, DrawSVG, plus Lenis |
| Data | TanStack Query over a client generated from OpenAPI by Orval |
| Back end | Go 1.26, Gin, PostgreSQL via sqlc, Goose migrations |
| Storage | S3-compatible object storage (MinIO locally) |
| Processing | ImageMagick, FFmpeg, LibreOffice, Poppler |
| Tests | Playwright end to end, Go integration tests against a real database |

## Requirements

Node 20+ with pnpm, plus everything listed in
[`backend/README.md`](backend/README.md) for the API: Go 1.26, PostgreSQL 14+,
S3-compatible storage, ImageMagick 7, FFmpeg, LibreOffice, and Poppler.

The public site alone needs only Node and pnpm — the activity feed simply stays
empty without the API.

## Running it

```bash
pnpm install
cp .env.example .env.local     # then fill in the values

# terminal 1 — API and media worker, see backend/README.md for first-time setup
cd backend && make run
cd backend && go run ./cmd/worker

# terminal 2 — web
pnpm dev
```

`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, and `API_URL` are required and
have no fallbacks: a missing value fails the build instead of shipping a
sitemap and canonical URLs that point at the wrong host.

## Checks

```bash
pnpm lint          # eslint
pnpm build         # production build, runs the TypeScript check
pnpm test:e2e      # Playwright, boots its own Postgres, MinIO, API, and worker
cd backend && make check
```

`pnpm test:e2e` needs `initdb`, `postgres`, and a `minio` binary on `PATH`; it
starts and tears down the whole stack itself. CI runs all four on every pull
request.

## Layout

```text
src/
├── app/                 # routes, metadata, sitemap, robots, OG images
├── components/
│   ├── sections/        # landing sections
│   ├── project/         # case study and gallery
│   ├── activities/      # public activity feed and detail
│   ├── admin/           # admin workspace and editor
│   ├── layout/          # header, footer, preloader, cursor, transitions
│   ├── providers/       # locale, smooth scroll, preview, toaster
│   └── ui/              # animated text, marquee, tech icons, PDF viewer
└── lib/
    ├── gsap.ts          # the only place plugins are registered
    ├── animation.ts     # easing, duration, and stagger constants
    ├── projects.ts      # project content, bilingual
    ├── api/             # fetcher plus the generated client
    └── i18n/            # en.ts is the source of truth, id.ts mirrors it

backend/                 # Go API, media worker, migrations — see its README
```

[`CLAUDE.md`](CLAUDE.md) documents the conventions this codebase is held to:
reduced-motion support, design tokens, i18n parity, and the performance budget.

## Content

Projects live in [`src/lib/projects.ts`](src/lib/projects.ts) — the single
source for landing cards, detail pages, the sitemap, and OG images. Activities
are written from `/admin`, not from the repository.
