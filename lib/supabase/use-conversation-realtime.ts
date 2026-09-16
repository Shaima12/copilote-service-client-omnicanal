"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

type RealtimeRow = Record<string, unknown> & {
  id: string;
};

type ConversationRow = RealtimeRow & {
  status?: string;
};

type MessageRow = RealtimeRow & {
  conversation_id: string;
};

type TicketRow = RealtimeRow & {
  conversation_id: string;
};

type DraftRow = RealtimeRow & {
  conversation_id: string | null;
};

type ConversationRealtimeOptions = {
  conversationId: string | null;
  listenToAllConversations?: boolean;
  onMessage?: (message: MessageRow) => void;
  onConversation?: (conversation: ConversationRow) => void;
  onTicket?: (ticket: TicketRow) => void;
  onDraft?: (draft: DraftRow) => void;
};

export function useConversationRealtime({
  conversationId,
  listenToAllConversations = false,
  onMessage,
  onConversation,
  onTicket,
  onDraft,
}: ConversationRealtimeOptions) {
  const callbacks = useRef({
    onMessage,
    onConversation,
    onTicket,
    onDraft,
  });

  useEffect(() => {
    callbacks.current = {
      onMessage,
      onConversation,
      onTicket,
      onDraft,
    };
  }, [onConversation, onDraft, onMessage, onTicket]);

  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!conversationId && !listenToAllConversations) {
      return;
    }

    const channel = supabase
      .channel(
        `conversation-realtime-${conversationId || "all"}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          ...(conversationId
            ? { filter: `conversation_id=eq.${conversationId}` }
            : {}),
        },
        (payload: RealtimePostgresChangesPayload<MessageRow>) => {
          if (payload.eventType === "INSERT") {
            callbacks.current.onMessage?.(payload.new);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          ...(conversationId
            ? { filter: `id=eq.${conversationId}` }
            : {}),
        },
        (payload: RealtimePostgresChangesPayload<ConversationRow>) => {
          if (payload.eventType === "UPDATE") {
            callbacks.current.onConversation?.(payload.new);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          ...(conversationId
            ? { filter: `id=eq.${conversationId}` }
            : {}),
        },
        (payload: RealtimePostgresChangesPayload<ConversationRow>) => {
          if (payload.eventType === "INSERT") {
            callbacks.current.onConversation?.(payload.new);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          ...(conversationId
            ? { filter: `conversation_id=eq.${conversationId}` }
            : {}),
        },
        (payload: RealtimePostgresChangesPayload<TicketRow>) => {
          if (payload.eventType === "UPDATE") {
            callbacks.current.onTicket?.(payload.new);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_versions",
          ...(conversationId
            ? { filter: `conversation_id=eq.${conversationId}` }
            : {}),
        },
        (payload: RealtimePostgresChangesPayload<DraftRow>) => {
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            callbacks.current.onDraft?.(payload.new);
          }
        }
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || error) {
          console.error("Conversation realtime error:", error);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, listenToAllConversations, supabase]);
}
