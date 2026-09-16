import { requireRole } from "@/lib/auth/require-role";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  await requireRole(userId, "client");

  return <>{children}</>;
}