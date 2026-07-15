import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Works } from "@/components/sections/Works";
import { Skills } from "@/components/sections/Skills";
import { Awards } from "@/components/sections/Awards";
import { Contact } from "@/components/sections/Contact";
import { LandingSceneLoader } from "@/components/three/LandingSceneLoader";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-volt focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-widest focus:text-ink"
      >
        Skip to content
      </a>
      <LandingSceneLoader />
      <Header />
      <main id="main" className="flex-1">
        <Hero />
        <About />
        <Works />
        <Skills />
        <Awards />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
