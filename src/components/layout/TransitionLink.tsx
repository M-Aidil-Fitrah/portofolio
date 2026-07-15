"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useTransition } from "@/components/providers/TransitionProvider";

type TransitionLinkProps = ComponentProps<typeof Link> & {
  /** Shown centered in the transition overlay while it covers the screen. */
  label?: string;
};

export function TransitionLink({
  href,
  onClick,
  label,
  ...rest
}: TransitionLinkProps) {
  const { navigate } = useTransition();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    onClick?.(e);
    navigate(href.toString(), label);
  };

  return <Link href={href} onClick={handleClick} {...rest} />;
}
