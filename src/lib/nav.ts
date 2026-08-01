export interface NavItem {
  /** Section anchor ("#about") or standalone page path ("/activities"). */
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
