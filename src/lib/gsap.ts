import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";

declare global {
  interface Window {
    __gsapPluginsRegistered?: boolean;
  }
}

if (typeof window !== "undefined") {
  // ScrollTrigger and SplitText can race their own cleanup on resize and throw
  // NotFoundError, so removeChild ignores nodes that already moved.
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode === this) {
      return originalRemoveChild.call(this, child) as T;
    }
    return child;
  };

  if (!window.__gsapPluginsRegistered) {
    window.__gsapPluginsRegistered = true;
    gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, useGSAP);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }
}

export { gsap, ScrollTrigger, SplitText, useGSAP };