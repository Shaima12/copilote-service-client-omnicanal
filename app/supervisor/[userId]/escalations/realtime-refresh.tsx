"use client";

import { useRouter } from "next/navigation";
import { useConversationRealtime } from "@/lib/supabase/use-conversation-realtime";

export default function EscalationRealtimeRefresh() {
  const router = useRouter();

  useConversationRealtime({
    conversationId: null,
    onConversation: () => router.refresh(),
    onTicket: () => router.refresh(),
  });

  return null;
}
