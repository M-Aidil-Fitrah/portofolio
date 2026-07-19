import { forwardRef } from "react";

/**
 * The AF monogram, traced from the brand artwork (`public/assets/AF
 * Logo.png`): an angular "A" chevron over a faceted, isometric "F" built
 * from five separate polygons. Fill-only (`currentColor`), so color is
 * controlled by the parent's text class. Each facet is its own `<path
 * data-logomark-facet>` so the Preloader can scatter and reassemble them
 * individually.
 */
export const Logomark = forwardRef<SVGSVGElement, { className?: string }>(
  function Logomark({ className }, ref) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 79.1 100"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path
          data-logomark-facet
          d="M31 0 L49 .2 L79.1 50.6 L60.4 38.3 L39.9 50.1 L22.9 41 L11.8 59.7 L0 51.4 L29.4 2 L38.1 18.5 L26.7 37.6 L39.4 30.5 L52.8 37.6 Z"
        />
        <path data-logomark-facet d="M62.1 43.2 L76.2 52.6 L53.9 65.9 L40.1 56.3 Z" />
        <path data-logomark-facet d="M26.1 48.8 L39.6 56.3 L39.6 76.8 L26.1 68.6 Z" />
        <path data-logomark-facet d="M64.8 65.7 L64.8 81.3 L63.7 82 L53.2 87.5 L39.9 80 Z" />
        <path data-logomark-facet d="M26.1 72.6 L39.6 80.2 L39.6 100 L26.1 92 Z" />
      </svg>
    );
  }
);
