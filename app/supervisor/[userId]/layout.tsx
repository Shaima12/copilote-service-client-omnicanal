import { requireRole } from "@/lib/auth/require-role";

export default async function SupervisorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  await requireRole(userId, "supervisor");

  return <>{children}</>;
}