import { SessionGuard } from "@/components/SessionGuard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionGuard>{children}</SessionGuard>;
}