import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(
    ScrollTrigger,
    SplitText,
    ScrambleTextPlugin,
    DrawSVGPlugin,
    useGSAP
  );
}

export { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin, useGSAP };
