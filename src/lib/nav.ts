export interface NavItem {
  /** Either a landing-page section anchor ("#about") or a standalone page
   * path ("/activities") — NavOverlay branches on the prefix. */
  href: string;
  key: "about" | "works" | "skills" | "awards" | "activities" | "contact";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "#about", key: "about" },
  { href: "#works", key: "works" },
  { href: "#skills", key: "skills" },
  { href: "#awards", key: "awards" },
  { href: "/activities", key: "activities" },
  { href: "#contact", key: "contact" },
];
