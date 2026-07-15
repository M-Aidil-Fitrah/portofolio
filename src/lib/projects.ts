export interface Localized {
  en: string;
  id: string;
}

export interface ProjectFeature {
  title: Localized;
  body: Localized;
}

export interface Project {
  slug: "agrilink" | "geotagging" | "jaksabang";
  index: string;
  title: string;
  year: string;
  date: string;
  role: Localized;
  tagline: Localized;
  stack: string[];
  links?: { live?: string; repo?: string };
  caseStudy: {
    overview: Localized;
    problem: Localized;
    features: ProjectFeature[];
    outcome: Localized;
  };
}

export const projects: Project[] = [
  {
    slug: "agrilink",
    index: "01",
    title: "AgriLink",
    year: "2026",
    date: "2026-06-01",
    role: { en: "Full Stack Developer", id: "Full Stack Developer" },
    tagline: {
      en: "A sustainable agriculture marketplace connecting local farmers directly with consumers.",
      id: "Marketplace pertanian berkelanjutan yang menghubungkan petani lokal langsung dengan konsumen.",
    },
    stack: ["Next.js", "TypeScript", "React", "Tailwind CSS", "PostgreSQL"],
    caseStudy: {
      overview: {
        en: "AgriLink is a web-based marketplace built to connect local farmers directly with consumers through one integrated digital platform, improving distribution efficiency and price transparency.",
        id: "AgriLink adalah marketplace berbasis web yang dikembangkan untuk menghubungkan petani lokal secara langsung dengan konsumen melalui satu platform digital terpadu, meningkatkan efisiensi distribusi dan transparansi harga.",
      },
      problem: {
        en: "Farmers lacked a direct channel to reach buyers with clear provenance, freshness, and pricing information — value was lost to opaque, multi-step distribution chains.",
        id: "Petani tidak memiliki kanal langsung menuju pembeli dengan informasi asal produk, kesegaran, dan harga yang jelas — nilai hilang akibat rantai distribusi berlapis yang tidak transparan.",
      },
      features: [
        {
          title: { en: "Farmer store management", id: "Manajemen toko petani" },
          body: {
            en: "Farmers manage stores, products, stock, pricing, harvest dates, and cultivation methods from one dashboard.",
            id: "Petani mengelola toko, produk, stok, harga, tanggal panen, dan metode budidaya dari satu dasbor.",
          },
        },
        {
          title: { en: "Buyer discovery", id: "Pencarian pembeli" },
          body: {
            en: "Product search by category and location, detail pages, order management, and transaction status tracking.",
            id: "Pencarian produk berdasarkan kategori dan lokasi, halaman detail, manajemen pesanan, dan pelacakan status transaksi.",
          },
        },
        {
          title: { en: "Traceability", id: "Keterlacakan produk" },
          body: {
            en: "Product origin, distribution distance, and estimated freshness are surfaced on every listing.",
            id: "Asal produk, jarak distribusi, dan estimasi kesegaran ditampilkan pada setiap listing.",
          },
        },
      ],
      outcome: {
        en: "Shipped a working two-sided marketplace with a full transaction flow, purpose-built for transparent, traceable agriculture commerce.",
        id: "Merilis marketplace dua sisi yang berfungsi penuh dengan alur transaksi lengkap, dirancang khusus untuk perdagangan pertanian yang transparan dan terlacak.",
      },
    },
  },
  {
    slug: "geotagging",
    index: "02",
    title: "Geotagging",
    year: "2026",
    date: "2026-01-01",
    role: { en: "Full Stack Developer", id: "Full Stack Developer" },
    tagline: {
      en: "A geospatial disaster reporting system for field documentation and community response.",
      id: "Sistem pelaporan bencana berbasis geospasial untuk dokumentasi lapangan dan respons komunitas.",
    },
    stack: ["Next.js", "TypeScript", "Prisma", "PostgreSQL", "Leaflet"],
    caseStudy: {
      overview: {
        en: "Geotagging supports field-based documentation, spatial monitoring, and community-level disaster response, built alongside a disaster-themed community service program in Aceh.",
        id: "Geotagging mendukung dokumentasi lapangan, pemantauan spasial, dan respons bencana berbasis komunitas, dikembangkan bersamaan dengan kegiatan KKN Tematik Bencana di Aceh.",
      },
      problem: {
        en: "Infrastructure damage reports after disasters lacked structured location data, making verification and response coordination slow and inconsistent.",
        id: "Laporan kerusakan infrastruktur pascabencana tidak memiliki data lokasi yang terstruktur, membuat verifikasi dan koordinasi respons lambat dan tidak konsisten.",
      },
      features: [
        {
          title: { en: "GPS-based capture", id: "Pengambilan lokasi GPS" },
          body: {
            en: "GPS location capture, manual coordinate selection, and reverse geocoding for accurate reports.",
            id: "Pengambilan lokasi berbasis GPS, pemilihan koordinat manual, dan reverse geocoding untuk laporan yang akurat.",
          },
        },
        {
          title: { en: "Interactive map", id: "Peta interaktif" },
          body: {
            en: "React-Leaflet visualization of every report, classified by damage type and severity.",
            id: "Visualisasi React-Leaflet untuk setiap laporan, diklasifikasikan berdasarkan jenis dan tingkat kerusakan.",
          },
        },
        {
          title: { en: "Verification workflow", id: "Alur verifikasi" },
          body: {
            en: "Report status, handling progress, and administrative review support structured response.",
            id: "Status laporan, progres penanganan, dan tinjauan administratif mendukung respons yang terstruktur.",
          },
        },
      ],
      outcome: {
        en: "Delivered a centralized reporting platform now tied to ongoing community disaster-monitoring activity in Aceh.",
        id: "Merilis platform pelaporan terpusat yang kini terhubung dengan kegiatan pemantauan bencana komunitas yang berjalan di Aceh.",
      },
    },
  },
  {
    slug: "jaksabang",
    index: "03",
    title: "JakSabang",
    year: "2025",
    date: "2025-07-01",
    role: { en: "Front-end Developer", id: "Front-end Developer" },
    tagline: {
      en: "A community-based tourism platform digitizing accommodation, transport, and local guide bookings in Sabang.",
      id: "Platform pariwisata berbasis komunitas yang mendigitalkan pemesanan akomodasi, transportasi, dan pemandu lokal di Sabang.",
    },
    stack: ["React.js", "Midtrans", "AI Chatbot", "Figma"],
    links: {},
    caseStudy: {
      overview: {
        en: "JakSabang integrates accommodation, transportation, local guides, a marketplace, an AI chatbot, and a payment gateway into one digital tourism ecosystem, built with an Agile process.",
        id: "JakSabang mengintegrasikan akomodasi, transportasi, pemandu lokal, marketplace, AI chatbot, dan payment gateway dalam satu ekosistem pariwisata digital, dikembangkan dengan proses Agile.",
      },
      problem: {
        en: "Sabang's tourism services were fragmented across informal channels, making bookings and payments slow and hard to trust for visitors.",
        id: "Layanan pariwisata Sabang tersebar di berbagai kanal informal, membuat pemesanan dan pembayaran lambat dan sulit dipercaya wisatawan.",
      },
      features: [
        {
          title: { en: "Responsive interface", id: "Antarmuka responsif" },
          body: {
            en: "Landing, marketplace, and destination pages built with React.js for consistent cross-device experience.",
            id: "Halaman utama, marketplace, dan destinasi dibangun dengan React.js untuk pengalaman lintas perangkat yang konsisten.",
          },
        },
        {
          title: { en: "Payment integration", id: "Integrasi pembayaran" },
          body: {
            en: "Collaborated with the back-end team to integrate an AI chatbot and the Midtrans payment gateway.",
            id: "Berkolaborasi dengan tim back-end untuk mengintegrasikan AI chatbot dan payment gateway Midtrans.",
          },
        },
        {
          title: { en: "Usability refinement", id: "Penyempurnaan usability" },
          body: {
            en: "Iterative interface refinement driven by usability testing and user feedback.",
            id: "Penyempurnaan antarmuka berulang berdasarkan pengujian usability dan umpan balik pengguna.",
          },
        },
      ],
      outcome: {
        en: "Contributed to a 91 SEO score and 100 desktop performance score at launch.",
        id: "Berkontribusi pada skor SEO 91 dan skor performa desktop 100 saat peluncuran.",
      },
    },
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
