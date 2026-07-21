import { TechIcon, hasTechIcon } from "@/components/ui/TechIcon";

const TECH_ICON_ALIASES: Record<string, string> = {
  React: "React.js",
  Prisma: "Prisma ORM",
  "Tailwind": "Tailwind CSS",
  "AI": "AI Chatbot",
};

type TechStackVariant = "chip" | "row";

function iconNameFor(name: string) {
  return TECH_ICON_ALIASES[name] ?? name;
}

export function TechStackItem({
  name,
  variant = "chip",
  colorOnHover = false,
  className = "",
}: {
  name: string;
  variant?: TechStackVariant;
  colorOnHover?: boolean;
  className?: string;
}) {
  const iconName = iconNameFor(name);
  const hasIcon = hasTechIcon(iconName);

  if (variant === "row") {
    return (
      <span
        className={`group flex items-center gap-3 text-lg uppercase tracking-tight text-foreground/90 ${className}`}
        title={name}
      >
        {hasIcon && (
          <TechIcon
            name={iconName}
            className="h-5 w-5 shrink-0 text-muted"
            colorOnHover={colorOnHover}
          />
        )}
        <span>{name}</span>
      </span>
    );
  }

  return (
    <span
      className={`group inline-flex h-7 items-center gap-2 rounded-pill border border-hairline px-2.5 font-mono text-[11px] uppercase tracking-widest text-muted ${className}`}
      title={name}
    >
      {hasIcon && (
        <TechIcon
          name={iconName}
          className="h-3.5 w-3.5 shrink-0 text-muted"
          colorOnHover={colorOnHover}
        />
      )}
      <span>{name}</span>
    </span>
  );
}

export function TechStackList({
  items,
  limit,
  variant = "chip",
  colorOnHover = false,
  className = "",
}: {
  items: string[];
  limit?: number;
  variant?: TechStackVariant;
  colorOnHover?: boolean;
  className?: string;
}) {
  const shown = typeof limit === "number" ? items.slice(0, limit) : items;

  return (
    <span className={`flex flex-wrap gap-2 ${className}`}>
      {shown.map((item) => (
        <TechStackItem
          key={item}
          name={item}
          variant={variant}
          colorOnHover={colorOnHover}
        />
      ))}
    </span>
  );
}
