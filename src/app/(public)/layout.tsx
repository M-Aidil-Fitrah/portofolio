import { PublicExperience } from "@/components/providers/PublicExperience";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PublicExperience>{children}</PublicExperience>;
}
