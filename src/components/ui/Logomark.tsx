import { forwardRef } from "react";

/**
 * Geometric A+F monogram — two letterforms sharing one vertical spine.
 * Stroke-only (radius-0, no fills), sized to a 40x40 viewBox so it scales
 * cleanly at any size via `className`. Each stroke is its own `<path
 * data-logomark-stroke>` so the Preloader can target them individually for
 * a DrawSVG reveal.
 */
export const Logomark = forwardRef<SVGSVGElement, { className?: string }>(
  function Logomark({ className }, ref) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinecap="square"
        strokeLinejoin="miter"
        className={className}
        aria-hidden="true"
      >
        <path data-logomark-stroke d="M20 6 L20 34" />
        <path data-logomark-stroke d="M8 34 L20 6" />
        <path data-logomark-stroke d="M12 22 L20 22" />
        <path data-logomark-stroke d="M20 6 L32 6" />
        <path data-logomark-stroke d="M20 18 L30 18" />
      </svg>
    );
  }
);
