import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Clock3,
  Home,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Mail,
  Smartphone,
  UserRound,
  Ticket,
  Flame,
  ShieldAlert,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import EscalationRealtimeRefresh from "./realtime-refresh";

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};

function formatWaitTime(createdAt: string) {
  const created = new Date(createdAt).getTime();
  const now = Date.now();

  const minutes = Math.max(
    0,
    Math.floor((now - created) / 60000)
  );

  if (minutes < 1) return "Just now";

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ${hours % 24}h`;
}

function getChannelIcon(channel: string | null) {
  switch (channel?.toLowerCase()) {
    case "whatsapp":
      return <MessageCircle size={15} strokeWidth={1.8} />;

    case "email":
      return <Mail size={15} strokeWidth={1.8} />;

    case "web":
      return <Smartphone size={15} strokeWidth={1.8} />;

    default:
      return <MessageCircle size={15} strokeWidth={1.8} />;
  }
}

function getChannelLabel(channel: string | null) {
  if (!channel) return "Unknown";

  return (
    channel.charAt(0).toUpperCase() +
    channel.slice(1).toLowerCase()
  );
}

function getPriorityStyles(priority: string | null) {
  switch (priority?.toLowerCase()) {
    case "critical":
      return {
        container: "bg-red-50 text-red-700 border-red-100",
        dot: "bg-red-500",
      };

    case "high":
      return {
        container:
          "bg-orange-50 text-orange-700 border-orange-100",
        dot: "bg-orange-500",
      };

    case "medium":
      return {
        container:
          "bg-amber-50 text-amber-700 border-amber-100",
        dot: "bg-amber-500",
      };

    default:
      return {
        container:
          "bg-gray-50 text-gray-600 border-gray-100",
        dot: "bg-gray-400",
      };
  }
}

function getTicketStyles(status: string | null) {
  switch (status) {
    case "in_progress":
      return "bg-blue-50 text-blue-700 border-blue-100";

    case "new":
      return "bg-red-50 text-red-700 border-red-100";

    case "resolved":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";

    default:
      return "bg-gray-50 text-gray-600 border-gray-100";
  }
}

export default async function EscalationPage({
  params,
}: PageProps) {
  const { userId } = await params;

  await requireRole(userId, "supervisor");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single()
    : { data: null };

  const {
    data: conversations,
    error: conversationsError,
  } = await supabase
    .from("conversations")
    .select(`
      id,
      customer_id,
      channel,
      status,
      queue,
      sentiment,
      urgency_score,
      priority,
      created_at,
      updated_at,
      order_number,
      intent
    `)
    .eq("status", "escalated")
    .order("created_at", {
      ascending: true,
    });

  if (conversationsError) {
    console.error(conversationsError);

    return (
      <SupervisorShell userId={userId} profile={profile}>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle
              size={19}
              className="text-red-600"
            />

            <p className="text-sm font-medium text-red-700">
              Unable to load escalations.
            </p>
          </div>
        </div>
      </SupervisorShell>
    );
  }

  const conversationIds =
    conversations?.map((conversation) => conversation.id) ?? [];

  const customerIds =
    conversations?.map(
      (conversation) => conversation.customer_id
    ) ?? [];

  const [{ data: tickets }, { data: customers }] =
    await Promise.all([
      conversationIds.length
        ? supabase
            .from("tickets")
            .select(`
              id,
              conversation_id,
              reason,
              priority,
              status,
              created_at,
              resolved_at
            `)
            .in("conversation_id", conversationIds)
            .order("created_at", {
              ascending: false,
            })
        : Promise.resolve({ data: [] }),

      customerIds.length
        ? supabase
            .from("customers")
            .select(`
              id,
              full_name,
              email,
              phone
            `)
            .in("id", customerIds)
        : Promise.resolve({ data: [] }),
    ]);

  const ticketByConversation = new Map();

  for (const ticket of tickets ?? []) {
    if (!ticketByConversation.has(ticket.conversation_id)) {
      ticketByConversation.set(ticket.conversation_id, ticket);
    }
  }

  const customerById = new Map(
    (customers ?? []).map((customer) => [
      customer.id,
      customer,
    ])
  );

  const escalations = (conversations ?? []).map(
    (conversation) => ({
      ...conversation,
      customer:
        customerById.get(conversation.customer_id) ?? null,
      ticket:
        ticketByConversation.get(conversation.id) ?? null,
    })
  );

  const highPriorityCount = escalations.filter(
    (item) =>
      item.priority?.toLowerCase() === "high" ||
      item.priority?.toLowerCase() === "critical"
  ).length;

  return (
    <SupervisorShell userId={userId} profile={profile}>
      <EscalationRealtimeRefresh />

        {/* Header */}
        <section>
          <div className="flex items-start justify-between gap-6">

            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <ShieldAlert
                    size={19}
                    strokeWidth={1.8}
                  />
                </div>

                <p className="text-sm font-medium text-gray-500">
                  Supervisor workspace
                </p>
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
                Escalation center
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Review conversations that require supervisor
                intervention and resolve them directly.
              </p>
            </div>

            {/* Counter */}
            <div className="hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:block">
              <p className="text-xs font-medium text-gray-400">
                Active escalations
              </p>

              <div className="mt-1 flex items-end gap-2">
                <span className="text-2xl font-semibold">
                  {escalations.length}
                </span>

                {highPriorityCount > 0 && (
                  <span className="mb-1 text-xs font-medium text-red-600">
                    {highPriorityCount} high priority
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Mobile stats */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:hidden">
          <StatCard
            label="Active"
            value={String(escalations.length)}
          />

          <StatCard
            label="High priority"
            value={String(highPriorityCount)}
            danger
          />
        </section>

        {/* Empty */}
        {escalations.length === 0 && (
          <section className="mt-8 rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)]">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ShieldAlert
                size={21}
                strokeWidth={1.7}
              />
            </div>

            <h2 className="mt-4 text-base font-semibold text-gray-900">
              No active escalations
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              There are currently no conversations waiting for
              supervisor intervention.
            </p>
          </section>
        )}

        {/* Escalation cards */}
        {escalations.length > 0 && (
          <section className="mt-8 space-y-3">

            {escalations.map((conversation) => {
              const customer = conversation.customer;
              const ticket = conversation.ticket;

              const priority = getPriorityStyles(
                conversation.priority
              );

              return (
                <Link
                  key={conversation.id}
                  href={`/supervisor/${userId}/escalations/${conversation.id}`}
                  className="group block"
                >
                  <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-200 hover:border-gray-300 hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)]">

                    {/* Escalation accent */}
                    <div className="absolute inset-y-0 left-0 w-1 bg-red-500" />

                    <div className="p-5 sm:p-6">

                      {/* Top */}
                      <div className="flex items-start justify-between gap-4">

                        <div className="flex min-w-0 items-start gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                            <UserRound
                              size={18}
                              strokeWidth={1.7}
                            />
                          </div>

                          <div className="min-w-0">

                            <h2 className="truncate text-sm font-semibold text-gray-900">
                              {customer?.full_name ??
                                "Unknown customer"}
                            </h2>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">

                              {customer?.email && (
                                <span className="truncate">
                                  {customer.email}
                                </span>
                              )}

                              {conversation.order_number && (
                                <>
                                  <span className="text-gray-300">
                                    •
                                  </span>

                                  <span>
                                    Order{" "}
                                    {conversation.order_number}
                                  </span>
                                </>
                              )}

                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 text-xs text-gray-400">
                          <Clock3
                            size={14}
                            strokeWidth={1.7}
                          />

                          {formatWaitTime(
                            conversation.created_at
                          )}
                        </div>
                      </div>

                      {/* Message / reason */}
                      <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3.5">

                        <div className="flex items-start gap-3">

                          <div className="mt-0.5 text-red-500">
                            <AlertTriangle
                              size={16}
                              strokeWidth={1.8}
                            />
                          </div>

                          <div className="min-w-0">

                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                              Escalation reason
                            </p>

                            <p className="mt-1 text-sm leading-5 text-gray-700">
                              {ticket?.reason ??
                                "Supervisor intervention required."}
                            </p>

                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">

                        <MetaBadge>
                          {getChannelIcon(
                            conversation.channel
                          )}

                          {getChannelLabel(
                            conversation.channel
                          )}
                        </MetaBadge>

                        <MetaBadge>
                          <Flame
                            size={14}
                            strokeWidth={1.8}
                          />

                          <span className="capitalize">
                            {conversation.sentiment ??
                              "Unknown"}
                          </span>
                        </MetaBadge>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${priority.container}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${priority.dot}`}
                          />

                          <span className="capitalize">
                            {conversation.priority ??
                              "Normal"}
                          </span>
                        </span>

                        {ticket && (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${getTicketStyles(
                              ticket.status
                            )}`}
                          >
                            <Ticket
                              size={13}
                              strokeWidth={1.8}
                            />

                            {ticket.status === "in_progress"
                              ? "In progress"
                              : ticket.status}
                          </span>
                        )}

                        {conversation.urgency_score !== null && (
                          <span className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-500">
                            Urgency{" "}
                            {conversation.urgency_score}/100
                          </span>
                        )}

                      </div>

                      {/* Bottom */}
                      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">

                        <div>
                          <p className="text-xs text-gray-400">
                            Queue
                          </p>

                          <p className="mt-0.5 text-sm font-medium capitalize text-gray-700">
                            {conversation.queue ??
                              conversation.intent ??
                              "Customer support"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition group-hover:text-gray-900">

                          Open conversation

                          <ArrowRight
                            size={16}
                            strokeWidth={1.8}
                            className="transition-transform group-hover:translate-x-0.5"
                          />

                        </div>

                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </section>
        )}
    </SupervisorShell>
  );
}

async function signOutAction() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function SupervisorShell({
  userId,
  profile,
  children,
}: {
  userId: string;
  profile: { full_name: string; email: string | null } | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white lg:hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">ZEN</h1>
            <p className="text-xs text-gray-500">Supervisor</p>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
              aria-label="Sign out"
            >
              <LogOut size={19} strokeWidth={1.8} />
            </button>
          </form>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2">
          <MobileNavLink
            href={`/supervisor/${userId}`}
            icon={<Home size={17} strokeWidth={1.8} />}
            label="Home"
          />
          <MobileNavLink
            href={`/supervisor/${userId}/knowledge-base`}
            icon={<BookOpen size={17} strokeWidth={1.8} />}
            label="Knowledge Base"
          />
          <MobileNavLink
            href={`/supervisor/${userId}/dashboard`}
            icon={<LayoutDashboard size={17} strokeWidth={1.8} />}
            label="Dashboard"
          />
          <MobileNavLink
            href={`/supervisor/${userId}/escalations`}
            icon={<AlertTriangle size={17} strokeWidth={1.8} />}
            label="Escalations"
            active
          />
        </nav>
      </header>

      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-gray-100 px-6 py-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              ZEN
            </h1>
            <p className="mt-1 text-xs text-gray-500">Supervisor</p>
          </div>

          <nav className="flex-1 px-4 py-6">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Workspace
            </p>

            <div className="space-y-1">
              <SidebarLink
                href={`/supervisor/${userId}`}
                icon={<Home size={18} strokeWidth={1.8} />}
                label="Home"
              />
              <SidebarLink
                href={`/supervisor/${userId}/knowledge-base`}
                icon={<BookOpen size={18} strokeWidth={1.8} />}
                label="Knowledge Base"
              />
              <SidebarLink
                href={`/supervisor/${userId}/dashboard`}
                icon={<LayoutDashboard size={18} strokeWidth={1.8} />}
                label="Dashboard"
              />
              <SidebarLink
                href={`/supervisor/${userId}/escalations`}
                icon={<AlertTriangle size={18} strokeWidth={1.8} />}
                label="Escalations"
                active
              />
            </div>
          </nav>

          <div className="border-t border-gray-100 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                <UserRound size={17} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {profile?.full_name ?? "Supervisor"}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {profile?.email ?? ""}
                </p>
              </div>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
              >
                <LogOut size={18} strokeWidth={1.8} />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </aside>

        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
        active
          ? "bg-gray-100 font-medium text-gray-900"
          : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span className={active ? "text-gray-900" : "text-gray-500"}>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function MobileNavLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
        active
          ? "bg-gray-100 text-gray-900"
          : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MetaBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600">
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-semibold ${
          danger ? "text-red-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}