"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const REALTIME_TABLES = [
  "conversations",
  "messages",
  "tickets",
  "customers",
  "faq_articles",
  "faq_chunks",
  "conversation_audit_logs",
];

export function useRealtime(onChange?: () => void) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase.channel("zen-global-realtime");

    REALTIME_TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        (payload) => {
          console.log("🔥 REALTIME:", {
            table,
            event: payload.eventType,
            payload,
          });

          onChange?.();
        }
      );
    });

    channel.subscribe((status) => {
      console.log("🔥 REALTIME STATUS:", status);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}