import type { Metadata } from "next";
import localFont from "next/font/local";
import { Instrument_Serif, Geist_Mono } from "next/font/google";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { TransitionProvider } from "@/components/providers/TransitionProvider";
import { Preloader } from "@/components/layout/Preloader";
import { CustomCursor } from "@/components/layout/CustomCursor";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { SITE_URL, SOCIAL } from "@/lib/site";
import "./globals.css";

const clashDisplay = localFont({
  variable: "--font-clash-display",
  display: "swap",
  src: [
    {
      path: "../../public/assets/fonts/clash-display-font/ClashDisplay-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/assets/fonts/clash-display-font/ClashDisplay-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/assets/fonts/clash-display-font/ClashDisplay-Semibold.otf",
      weight: "600",
      style: "normal",
    },
  ],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const title = {
  template: "%s — Muhammad Aidil Fitrah",
  default: "Muhammad Aidil Fitrah — Software Engineer & Web Developer",
};
const description =
  "Portfolio of Muhammad Aidil Fitrah, Informatics student at Syiah Kuala University building web platforms and machine learning projects.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title,
    description,
    url: SITE_URL,
    siteName: "Muhammad Aidil Fitrah",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: title.default,
    description,
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Muhammad Aidil Fitrah",
  jobTitle: "Software Engineering Student",
  affiliation: {
    "@type": "CollegeOrUniversity",
    name: "Universitas Syiah Kuala",
  },
  url: SITE_URL,
  sameAs: [SOCIAL.linkedin],
  knowsAbout: [
    "TypeScript",
    "Next.js",
    "React",
    "PostgreSQL",
    "Machine Learning",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${clashDisplay.variable} ${instrumentSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-ink text-foreground"
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <LocaleProvider>
          <SmoothScrollProvider>
            <TransitionProvider>
              <AmbientBackground />
              <Preloader />
              <CustomCursor />
              {children}
            </TransitionProvider>
          </SmoothScrollProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
