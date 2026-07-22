import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useGSAP } from "@gsap/react";

declare global {
  interface Window {
    __gsapPluginsRegistered?: boolean;
  }
}

if (typeof window !== "undefined") {
  // Defensive guard: prevents DOM manipulation race conditions (like
  // ScrollTrigger's _refresh100vh measurement div or SplitText cleanups)
  // from throwing unhandled NotFoundError on removeChild during media query / resize changes.
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode === this) {
      return originalRemoveChild.call(this, child) as T;
    }
    return child;
  };

  if (!window.__gsapPluginsRegistered) {
    window.__gsapPluginsRegistered = true;
    gsap.registerPlugin(
      ScrollTrigger,
      SplitText,
      ScrambleTextPlugin,
      DrawSVGPlugin,
      useGSAP
    );
    ScrollTrigger.config({ ignoreMobileResize: true });
  }
}

export { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin, useGSAP };
