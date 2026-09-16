import { requireRole } from "@/lib/auth/require-role";

export default async function SupervisorEscalationConversationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{
    userId: string;
    conversationId: string;
  }>;
}) {
  const { userId, conversationId } = await params;

  const nextPath =
    `/supervisor/${userId}/escalations/${conversationId}`;

  await requireRole(userId, "supervisor", nextPath);

  return <>{children}</>;
}
