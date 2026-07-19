import type { Localized } from "@/lib/projects";

/** Data shapes deliberately mirror what a future backend would return, so
 * swapping this mock module for an API layer never has to touch the UI:
 * the feed/detail components only consume these types + the helpers below. */

export type ActivityCategory = "project" | "learning" | "daily" | "achievement";
export type ActivityStatus = "published" | "draft" | "hidden";
export type ActivityProgress = "learning" | "shipped" | "exploring";

export interface MediaAsset {
  type: "image" | "video";
  /** Path under public/. Omit to render the designed placeholder frame. */
  src?: string;
  alt: string;
}

export interface ActivityComment {
  id: string;
  author: string;
  body: string;
  /** ISO date */
  date: string;
}

export interface ActivityPost {
  slug: string;
  title: Localized;
  caption: Localized;
  /** Longer story shown on the detail page. */
  body: Localized;
  category: ActivityCategory;
  /** ISO date — also drives the month grouping on the feed. */
  date: string;
  tags: string[];
  media: MediaAsset[];
  status: ActivityStatus;
  pinned?: boolean;
  progress?: ActivityProgress;
  /** Slug into `projects.ts` when the activity relates to a project. */
  relatedProject?: string;
  /** Seed counts — a backend would own these later. */
  likes: number;
  comments: ActivityComment[];
}

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  "project",
  "learning",
  "daily",
  "achievement",
];

export const activities: ActivityPost[] = [
  {
    slug: "portfolio-motion-system",
    title: {
      en: "Building this portfolio's motion system",
      id: "Membangun sistem animasi portofolio ini",
    },
    caption: {
      en: "GSAP + Lenis, one motion language: reversible scroll reveals, a facet-assembly preloader, and a cursor that survived three rewrites.",
      id: "GSAP + Lenis, satu bahasa animasi: reveal scroll yang reversibel, preloader rakitan logo, dan cursor yang bertahan tiga kali penulisan ulang.",
    },
    body: {
      en: "This site's motion layer went through several full passes — a counter-only preloader, then a mercury-fill numeral, and finally the faceted logomark assembling itself piece by piece. Along the way the custom cursor moved from tween-driven positioning to a raw rAF lerp loop after a subtle GSAP overwrite bug kept freezing it mid-glide. Every scroll reveal is now reversible, so the page choreographs in both directions.",
      id: "Lapisan animasi situs ini melewati beberapa iterasi penuh — preloader berbasis angka, lalu numeral mercury-fill, dan akhirnya logomark facet yang merakit dirinya sendiri. Di tengah jalan, custom cursor berpindah dari posisi berbasis tween ke loop lerp rAF murni setelah bug overwrite GSAP terus membekukannya. Semua reveal scroll kini reversibel, jadi halaman terkoreografi dua arah.",
    },
    category: "project",
    date: "2026-07-19",
    tags: ["GSAP", "Next.js", "Motion"],
    media: [
      { type: "image", alt: "Preloader logomark assembly frames" },
      { type: "video", alt: "Cursor and scroll choreography capture" },
    ],
    status: "published",
    pinned: true,
    progress: "shipped",
    likes: 24,
    comments: [
      {
        id: "c1",
        author: "Raka",
        body: "The preloader assembly is so satisfying to watch.",
        date: "2026-07-19",
      },
    ],
  },
  {
    slug: "ml-course-week-6",
    title: {
      en: "Week 6 of the machine learning track",
      id: "Pekan ke-6 jalur machine learning",
    },
    caption: {
      en: "Regularization finally clicked — L1 vs L2 isn't about the math, it's about what you want the model to forget.",
      id: "Regularisasi akhirnya masuk akal — L1 vs L2 bukan soal matematikanya, tapi soal apa yang ingin dilupakan model.",
    },
    body: {
      en: "Spent the week on overfitting: ridge, lasso, and dropout. The mental model that stuck — regularization is a budget you give the model for complexity, and choosing L1 vs L2 decides whether it spends that budget sparsely or smoothly. Next: cross-validation strategies for small datasets.",
      id: "Sepekan penuh membahas overfitting: ridge, lasso, dan dropout. Model mental yang menempel — regularisasi adalah anggaran kompleksitas untuk model, dan memilih L1 vs L2 menentukan apakah anggaran itu dihabiskan secara jarang atau merata. Berikutnya: strategi cross-validation untuk dataset kecil.",
    },
    category: "learning",
    date: "2026-07-14",
    tags: ["Machine Learning", "Python"],
    media: [{ type: "image", alt: "Regularization comparison notebook" }],
    status: "published",
    progress: "learning",
    likes: 11,
    comments: [],
  },
  {
    slug: "agrilink-traceability-sprint",
    title: {
      en: "AgriLink traceability sprint",
      id: "Sprint keterlacakan AgriLink",
    },
    caption: {
      en: "Two-day push to surface product origin and freshness estimates on every listing.",
      id: "Dua hari fokus menampilkan asal produk dan estimasi kesegaran di setiap listing.",
    },
    body: {
      en: "The traceability feature needed origin, distribution distance, and a freshness estimate on every listing without cluttering the card. Ended up with a collapsible provenance strip and a freshness badge computed from harvest date. The hardest part was the data model — normalizing farm locations so distance calculations stay cheap.",
      id: "Fitur keterlacakan membutuhkan asal, jarak distribusi, dan estimasi kesegaran di setiap listing tanpa membuat kartu penuh sesak. Hasil akhirnya: strip provenance yang bisa dilipat dan badge kesegaran yang dihitung dari tanggal panen. Bagian tersulitnya justru model data — menormalkan lokasi kebun agar kalkulasi jarak tetap murah.",
    },
    category: "project",
    date: "2026-07-08",
    tags: ["Next.js", "PostgreSQL", "AgriLink"],
    media: [
      { type: "image", alt: "Traceability strip design iterations" },
      { type: "image", alt: "Freshness badge states" },
      { type: "image", alt: "Provenance data model sketch" },
    ],
    status: "published",
    progress: "shipped",
    relatedProject: "agrilink",
    likes: 18,
    comments: [
      {
        id: "c2",
        author: "Nadia",
        body: "Love the freshness badge idea — is it computed client-side?",
        date: "2026-07-09",
      },
      {
        id: "c3",
        author: "Fikri",
        body: "This would be useful for fishery products too.",
        date: "2026-07-10",
      },
    ],
  },
  {
    slug: "campus-hackathon-demo-day",
    title: {
      en: "Demo day at the campus hackathon",
      id: "Demo day di hackathon kampus",
    },
    caption: {
      en: "Pitched a disaster-reporting flow in seven minutes — the projector died at minute five.",
      id: "Mempresentasikan alur pelaporan bencana dalam tujuh menit — proyektornya mati di menit kelima.",
    },
    body: {
      en: "Presented the geotagging reporting flow to the judges: capture, verify, respond. The projector cut out mid-demo, so the last two minutes ran entirely on narration and a phone screen passed around the room. Lesson learned: rehearse the no-slides version too. We made finals.",
      id: "Mempresentasikan alur pelaporan geotagging ke juri: rekam, verifikasi, respons. Proyektor mati di tengah demo, jadi dua menit terakhir berjalan penuh dengan narasi dan layar ponsel yang diedarkan. Pelajaran: latih juga versi tanpa slide. Kami lolos final.",
    },
    category: "achievement",
    date: "2026-06-21",
    tags: ["Hackathon", "Geotagging"],
    media: [
      { type: "image", alt: "Demo day stage" },
      { type: "video", alt: "Seven-minute pitch recording" },
    ],
    status: "published",
    relatedProject: "geotagging",
    likes: 32,
    comments: [
      {
        id: "c4",
        author: "Salsa",
        body: "The projector story is legendary at this point.",
        date: "2026-06-22",
      },
    ],
  },
  {
    slug: "reading-refactoring-ui",
    title: {
      en: "Reading: Refactoring UI",
      id: "Membaca: Refactoring UI",
    },
    caption: {
      en: "Halfway through — the chapter on visual hierarchy already changed how I space section headings.",
      id: "Baru setengah jalan — bab tentang hierarki visual sudah mengubah cara saya memberi jarak heading section.",
    },
    body: {
      en: "Working through Refactoring UI slowly, applying one idea per day to this portfolio. The biggest shift so far: letting spacing carry hierarchy instead of font size, and reserving the accent color for exactly one job per screen. It reads like a checklist of everything a design system should make automatic.",
      id: "Membaca Refactoring UI pelan-pelan, menerapkan satu ide per hari ke portofolio ini. Perubahan terbesar sejauh ini: membiarkan spacing membawa hierarki alih-alih ukuran font, dan menyimpan warna aksen untuk tepat satu tugas per layar. Buku ini terasa seperti checklist untuk semua hal yang seharusnya diotomatiskan design system.",
    },
    category: "learning",
    date: "2026-06-15",
    tags: ["Design", "UI/UX"],
    media: [{ type: "image", alt: "Notes on visual hierarchy" }],
    status: "published",
    progress: "learning",
    likes: 9,
    comments: [],
  },
  {
    slug: "morning-at-ulee-lheue",
    title: {
      en: "Morning run, then code review by the sea",
      id: "Lari pagi, lalu code review di tepi laut",
    },
    caption: {
      en: "Some pull requests read better with a horizon in the background.",
      id: "Beberapa pull request terbaca lebih baik dengan cakrawala di latar belakang.",
    },
    body: {
      en: "Started the day with a 5k, then settled at a warung near the harbor to review a teammate's PR on the JakSabang marketplace flow. There's something about reviewing code away from the desk — the nitpicks fade and the architectural questions get louder.",
      id: "Memulai hari dengan lari 5k, lalu duduk di warung dekat pelabuhan untuk me-review PR rekan tim di alur marketplace JakSabang. Ada yang berbeda saat me-review kode jauh dari meja — nitpick memudar dan pertanyaan arsitektural terdengar lebih keras.",
    },
    category: "daily",
    date: "2026-06-08",
    tags: ["Daily", "Code Review"],
    media: [{ type: "image", alt: "Harbor morning" }],
    status: "published",
    relatedProject: "jaksabang",
    likes: 14,
    comments: [
      {
        id: "c5",
        author: "Dimas",
        body: "Warung-driven development — the superior methodology.",
        date: "2026-06-08",
      },
    ],
  },
  {
    slug: "uiux-competition-first-place",
    title: {
      en: "First place, UI/UX competition",
      id: "Juara satu, kompetisi UI/UX",
    },
    caption: {
      en: "The winning case study: rethinking a campus service portal around task completion, not menus.",
      id: "Studi kasus pemenang: memikir ulang portal layanan kampus berbasis penyelesaian tugas, bukan menu.",
    },
    body: {
      en: "The brief asked for a redesign of a campus service portal. Instead of reorganizing the menu tree, we mapped the ten most common student tasks and built the whole interface around finishing them — search-first, forms that remember context, and a status timeline for every request. The judges' feedback: the flow prototype felt shippable, not conceptual.",
      id: "Brief-nya meminta desain ulang portal layanan kampus. Alih-alih menyusun ulang pohon menu, kami memetakan sepuluh tugas mahasiswa paling umum dan membangun seluruh antarmuka untuk menyelesaikannya — search-first, formulir yang mengingat konteks, dan timeline status untuk setiap permintaan. Umpan balik juri: prototipe alurnya terasa siap rilis, bukan sekadar konsep.",
    },
    category: "achievement",
    date: "2026-05-24",
    tags: ["UI/UX", "Figma", "Competition"],
    media: [
      { type: "image", alt: "Winning prototype screens" },
      { type: "image", alt: "Task-first information architecture map" },
    ],
    status: "published",
    likes: 41,
    comments: [
      {
        id: "c6",
        author: "Putri",
        body: "Congrats! Is the case study public anywhere?",
        date: "2026-05-25",
      },
    ],
  },
  {
    slug: "trying-shader-gradients",
    title: {
      en: "A weekend detour into shaders",
      id: "Belokan akhir pekan ke dunia shader",
    },
    caption: {
      en: "Wrote my first fragment shader — immediately understood why everyone warns about the glow-blob phase.",
      id: "Menulis fragment shader pertama — langsung paham kenapa semua orang memperingatkan fase glow-blob.",
    },
    body: {
      en: "Spent a weekend with GLSL basics: UV coordinates, noise functions, and why additive blending turns everything into a radioactive smoothie. Nothing shipped, and that's fine — the goal was to understand what WebGL can add to this portfolio without turning it into a tech demo. Verdict: micro-details over centerpieces.",
      id: "Menghabiskan akhir pekan dengan dasar GLSL: koordinat UV, fungsi noise, dan kenapa additive blending mengubah semuanya menjadi jus radioaktif. Tidak ada yang dirilis, dan itu tidak apa-apa — tujuannya memahami apa yang bisa ditambahkan WebGL ke portofolio ini tanpa mengubahnya jadi demo teknologi. Kesimpulan: micro-detail lebih baik daripada centerpiece.",
    },
    category: "learning",
    date: "2026-05-17",
    tags: ["WebGL", "GLSL", "Exploration"],
    media: [{ type: "video", alt: "Shader experiment capture" }],
    status: "published",
    progress: "exploring",
    likes: 7,
    comments: [],
  },
  {
    slug: "kkn-field-notes",
    title: {
      en: "Field notes from the disaster-response program",
      id: "Catatan lapangan dari program tanggap bencana",
    },
    caption: {
      en: "Interviewing village officials about how damage reports actually travel — spoiler: through three WhatsApp groups.",
      id: "Mewawancarai perangkat desa tentang bagaimana laporan kerusakan benar-benar mengalir — spoiler: lewat tiga grup WhatsApp.",
    },
    body: {
      en: "Before building the geotagging verification flow, we spent days mapping how reports move today: photos in one WhatsApp group, locations described in words, and a recap typed manually every evening. The software problem turned out to be a trust problem — officials need to know who verified what, and when. That insight shaped the whole review workflow.",
      id: "Sebelum membangun alur verifikasi geotagging, kami menghabiskan beberapa hari memetakan bagaimana laporan mengalir hari ini: foto di satu grup WhatsApp, lokasi dijelaskan dengan kata-kata, dan rekap diketik manual setiap malam. Masalah perangkat lunaknya ternyata masalah kepercayaan — perangkat desa perlu tahu siapa memverifikasi apa, dan kapan. Wawasan itu membentuk seluruh alur review.",
    },
    category: "daily",
    date: "2026-05-06",
    tags: ["Field Research", "Geotagging"],
    media: [
      { type: "image", alt: "Village interview session" },
      { type: "image", alt: "Report flow mapping on paper" },
    ],
    status: "published",
    relatedProject: "geotagging",
    likes: 21,
    comments: [],
  },
  {
    slug: "draft-example-not-visible",
    title: {
      en: "Draft: activity admin planning",
      id: "Draf: perencanaan admin aktivitas",
    },
    caption: {
      en: "This draft never appears in the public feed — it exists to prove status filtering works.",
      id: "Draf ini tidak pernah muncul di feed publik — keberadaannya membuktikan filter status bekerja.",
    },
    body: { en: "", id: "" },
    category: "project",
    date: "2026-07-01",
    tags: ["Admin"],
    media: [],
    status: "draft",
    likes: 0,
    comments: [],
  },
];

/** Public feed source: published only, pinned first, then newest first. */
export function getPublishedActivities(): ActivityPost[] {
  return activities
    .filter((a) => a.status === "published")
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return b.date.localeCompare(a.date);
    });
}

export function getActivity(slug: string): ActivityPost | undefined {
  return activities.find(
    (a) => a.slug === slug && a.status === "published"
  );
}

/** Same-category first, then recency — excludes the current post. */
export function getRelatedActivities(slug: string, count = 2): ActivityPost[] {
  const current = getActivity(slug);
  if (!current) return [];
  return getPublishedActivities()
    .filter((a) => a.slug !== slug)
    .sort((a, b) => {
      const aSame = a.category === current.category ? 0 : 1;
      const bSame = b.category === current.category ? 0 : 1;
      return aSame - bSame || b.date.localeCompare(a.date);
    })
    .slice(0, count);
}
