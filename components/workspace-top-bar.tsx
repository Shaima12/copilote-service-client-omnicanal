"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type WorkspaceRole = "client" | "agent" | "supervisor";

type WorkspaceTopBarProps = {
  userId: string;
  role: WorkspaceRole;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  kind: "resolved" | "ticket" | "escalation";
  href?: string;
  ticketId?: string;
};

export default function WorkspaceTopBar({
  userId,
  role,
}: WorkspaceTopBarProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [hasRestoredNotifications, setHasRestoredNotifications] =
    useState(false);
  const notificationStorageKey = `zen-notifications:${role}:${userId}`;

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      try {
        const savedNotifications = window.localStorage.getItem(
          notificationStorageKey
        );

        if (savedNotifications) {
          const parsedNotifications = JSON.parse(savedNotifications);

          if (!cancelled && Array.isArray(parsedNotifications)) {
            setNotifications((current) => {
              const allNotifications = [...current, ...parsedNotifications];

              return allNotifications
                .filter(
                  (notification, index, items) =>
                    items.findIndex((item) => item.id === notification.id) ===
                    index
                )
                .slice(0, 6);
            });
          }
        }
      } catch (error) {
        console.error("Could not restore notifications:", error);
      } finally {
        if (!cancelled) {
          setHasRestoredNotifications(true);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [notificationStorageKey]);

  useEffect(() => {
    if (!hasRestoredNotifications) {
      return;
    }

    try {
      window.localStorage.setItem(
        notificationStorageKey,
        JSON.stringify(notifications)
      );
    } catch (error) {
      console.error("Could not save notifications:", error);
    }
  }, [hasRestoredNotifications, notificationStorageKey, notifications]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function subscribeToNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("customer_id")
        .eq("id", user.id)
        .single();

      if (cancelled) {
        return;
      }

      channel = supabase.channel(`workspace-notifications-${role}-${userId}`);

      const isAssignedToAgent = (assignedTo: string | null | undefined) =>
        assignedTo === "agent" || assignedTo === user.id;

      if (role === "agent") {
        const { data: unreadTickets, error: unreadTicketsError } =
          await supabase
            .from("tickets")
            .select("id, conversation_id, assigned_to, reason, status")
            .or(`assigned_to.eq.agent,assigned_to.eq.${user.id}`)
            .eq("status", "new");

        if (unreadTicketsError) {
          console.error(
            "Unread ticket notification loading error:",
            unreadTicketsError
          );
        }

        unreadTickets?.forEach((ticket) => {
          if (!isAssignedToAgent(ticket.assigned_to)) {
            return;
          }

          addNotification({
            id: `ticket-${ticket.id}`,
            title: "Ticket assigned",
            message: ticket.reason || "A ticket has been assigned to you.",
            kind: "ticket",
            ticketId: ticket.id,
            href: `/agent/${userId}/conversations?conversationId=${ticket.conversation_id}`,
          });
        });
      }

      if (role === "client" && profile?.customer_id) {
        channel.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "conversations",
            filter: `customer_id=eq.${profile.customer_id}`,
          },
          (payload) => {
            if ((payload.new as { status?: string }).status !== "resolved") {
              return;
            }

            addNotification({
              id: `resolved-${payload.new.id}`,
              title: "Conversation resolved",
              message: "Your support conversation has been resolved.",
              kind: "resolved",
            });
          }
        );
      }

      if (role === "agent") {
        channel
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "tickets",
            },
            (payload) => {
              const ticket = payload.new as {
                id: string;
                conversation_id: string;
                assigned_to?: string | null;
                reason?: string | null;
                status?: string | null;
              };

              if (
                !isAssignedToAgent(ticket.assigned_to) ||
                ticket.status !== "new"
              ) {
                return;
              }

              addNotification({
                id: `ticket-${ticket.id}`,
                title: "Ticket assigned",
                message: ticket.reason || "A ticket has been assigned to you.",
                kind: "ticket",
                ticketId: ticket.id,
                href: `/agent/${userId}/conversations?conversationId=${ticket.conversation_id}`,
              });
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "tickets",
            },
            (payload) => {
              const ticket = payload.new as {
                id: string;
                conversation_id: string;
                assigned_to?: string | null;
                reason?: string | null;
                status?: string | null;
              };

              if (
                !isAssignedToAgent(ticket.assigned_to) ||
                ticket.status !== "new"
              ) {
                return;
              }

              addNotification({
                id: `ticket-${ticket.id}`,
                title: "Assigned ticket updated",
                message: ticket.reason || "An assigned ticket was updated.",
                kind: "ticket",
                ticketId: ticket.id,
                href: `/agent/${userId}/conversations?conversationId=${ticket.conversation_id}`,
              });
            }
          );
      }

      if (role === "supervisor") {
        channel
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "tickets",
            },
            (payload) => {
              const ticket = payload.new as {
                id: string;
                reason?: string | null;
              };

              addNotification({
                id: `escalation-${ticket.id}`,
                title: "New escalation ticket",
                message: ticket.reason || "A new escalation needs review.",
                kind: "escalation",
              });
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "conversations",
            },
            (payload) => {
              if ((payload.new as { status?: string }).status !== "escalated") {
                return;
              }

              addNotification({
                id: `escalation-conversation-${payload.new.id}`,
                title: "Conversation escalated",
                message: "A conversation requires supervisor attention.",
                kind: "escalation",
              });
            }
          );
      }

      channel.subscribe((status, error) => {
        if (error) {
          console.error("Workspace notifications realtime error:", error);
        }

        if (status === "CHANNEL_ERROR") {
          console.error("Workspace notifications channel error");
        }
      });
    }

    function addNotification(notification: Notification) {
      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }

        return [notification, ...current].slice(0, 6);
      });
      setOpen(true);
    }

    void subscribeToNotifications();

    return () => {
      cancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [role, supabase, userId]);

  function openNotification(notificationId: string) {
    setNotifications((current) => {
      const nextNotifications = current.filter(
        (notification) => notification.id !== notificationId
      );

      try {
        window.localStorage.setItem(
          notificationStorageKey,
          JSON.stringify(nextNotifications)
        );
      } catch (error) {
        console.error("Could not save notifications:", error);
      }

      return nextNotifications;
    });
    setOpen(false);
  }

  async function openTicketNotification(
    notificationId: string,
    ticketId: string,
    href: string
  ) {
    const { error } = await supabase
      .from("tickets")
      .update({ status: "open" })
      .eq("id", ticketId)
      .eq("status", "new");

    if (error) {
      console.error("Ticket opening error:", error);
      return;
    }

    openNotification(notificationId);
    router.push(href);
  }

  function iconFor(kind: Notification["kind"]) {
    if (kind === "resolved") {
      return <CheckCircle2 size={16} className="text-[#71977b]" />;
    }

    if (kind === "ticket") {
      return <AlertTriangle size={16} className="text-red-600" />;
    }

    return <ShieldAlert size={16} className="text-[#e5a629]" />;
  }

  return (
    <div className="relative z-40 mb-6 flex items-center justify-between rounded-2xl border border-[#d8e4da] bg-[#14231f] px-4 py-3 text-white shadow-[0_8px_24px_rgba(20,35,31,0.12)] sm:px-5">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6c96e] text-sm font-bold text-[#14231f]">
          Z
        </span>
        <span className="text-base font-bold tracking-[-0.04em]">ZEN</span>
      </Link>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="relative rounded-lg p-2 text-[#dcebdd] transition hover:bg-white/10 hover:text-white"
          aria-label="View notifications"
        >
          <Bell size={18} strokeWidth={1.8} />
          {notifications.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f6c96e] px-1 text-[9px] font-bold text-[#14231f]">
              {notifications.length}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-11 w-72 rounded-xl border border-[#d8e4da] bg-white p-3 text-gray-900 shadow-[0_12px_30px_rgba(20,35,31,0.16)]">
            {notifications.length === 0 ? (
              <p className="px-1 py-2 text-xs text-gray-500">
                No new notifications.
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const content = (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-2 rounded-lg p-2.5 ${
                        notification.kind === "ticket"
                          ? "border border-red-100 bg-red-50"
                          : "bg-gray-50"
                      }`}
                    >
                      <span className="mt-0.5">{iconFor(notification.kind)}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">{notification.title}</p>
                        <p className="mt-0.5 text-[11px] leading-4 text-gray-600">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  );

                  return notification.href ? (
                    <Link
                      key={notification.id}
                      href={notification.href}
                      onClick={(event) => {
                        if (
                          notification.kind === "ticket" &&
                          notification.ticketId
                        ) {
                          event.preventDefault();
                          void openTicketNotification(
                            notification.id,
                            notification.ticketId,
                            notification.href as string
                          );
                          return;
                        }

                        openNotification(notification.id);
                      }}
                      className="block transition hover:bg-gray-100"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
