import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { CustomCursor } from "@/components/layout/CustomCursor";
import { Preloader } from "@/components/layout/Preloader";
import { PreviewProvider } from "@/components/providers/PreviewProvider";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { TransitionProvider } from "@/components/providers/TransitionProvider";

export function PublicExperience({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScrollProvider>
      <TransitionProvider>
        <PreviewProvider>
          <div className="public-experience contents">
            <AmbientBackground />
            <Preloader />
            <CustomCursor />
            {children}
          </div>
        </PreviewProvider>
      </TransitionProvider>
    </SmoothScrollProvider>
  );
}
