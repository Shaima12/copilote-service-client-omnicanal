import { requireRole } from "@/lib/auth/require-role";

export default async function AgentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  await requireRole(userId, "agent");

  return <>{children}</>;
}