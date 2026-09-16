"use client";

import { useEffect, useRef } from "react";
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
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel(
      `zen-global-realtime-${crypto.randomUUID()}`
    );

    console.log("🟡 REALTIME: creating channel");

    REALTIME_TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        (payload) => {
          console.log("🔥 REALTIME EVENT:", {
            table,
            event: payload.eventType,
            payload,
          });

          onChangeRef.current?.();
        }
      );
    });

    channel.subscribe((status, error) => {
      console.log("🔥 REALTIME STATUS:", status);

      if (error) {
        console.error("❌ REALTIME ERROR:", error);
      }
    });

    return () => {
      console.log("🔴 REALTIME: removing channel");
      supabase.removeChannel(channel);
    };
  }, []);
}