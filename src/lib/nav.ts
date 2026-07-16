export interface NavItem {
  href: string;
  key: "about" | "works" | "skills" | "awards" | "contact";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "#about", key: "about" },
  { href: "#works", key: "works" },
  { href: "#skills", key: "skills" },
  { href: "#awards", key: "awards" },
  { href: "#contact", key: "contact" },
];
