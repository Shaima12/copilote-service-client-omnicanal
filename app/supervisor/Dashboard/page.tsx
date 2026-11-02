
"use client";
function SupervisorShell({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const navigation = [
    {
      href: `/supervisor/${userId}`,
      label: "Home",
      icon: <Home size={18} strokeWidth={1.8} />,
    },
    {
      href: `/supervisor/${userId}/knowledge-base`,
      label: "Knowledge Base",
      icon: <BookOpen size={18} strokeWidth={1.8} />,
    },
    {
      href: `/supervisor/${userId}/dashboard`,
      label: "Dashboard",
      icon: <LayoutDashboard size={18} strokeWidth={1.8} />,
    },
    {
      href: `/supervisor/${userId}/escalations`,
      label: "Escalations",
      icon: <AlertTriangle size={18} strokeWidth={1.8} />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white lg:hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Customer Support Agent</h1>
            <p className="text-xs text-gray-500">Supervisor</p>
          </div>

          <button
            onClick={handleSignOut}
            className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
            aria-label="Sign out"
          >
            <LogOut size={19} strokeWidth={1.8} />
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                item.label === "Dashboard"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </header>

      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-gray-100 px-6 py-6">
            <h1 className="text-2xl font-bold tracking-tight">Customer Support Agent</h1>
            <p className="mt-1 text-xs text-gray-500">Supervisor</p>
          </div>

          <nav className="flex-1 px-4 py-6">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Workspace
            </p>

            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    item.label === "Dashboard"
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className={item.label === "Dashboard" ? "text-gray-900" : "text-gray-500"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          <div className="border-t border-gray-100 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                <UserRound size={17} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Supervisor</p>
                <p className="text-xs text-gray-500">Workspace access</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut size={18} strokeWidth={1.8} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}


import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Home,
  LayoutDashboard,
  LogOut,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import WorkspaceTopBar from "@/components/workspace-top-bar";

type Conversation = {
  id: string;
  channel: string | null;
  status: string | null;
  queue: string | null;
  assigned_agent_id: string | null;
  language: string | null;
  intent: string | null;
  sentiment: string | null;
  urgency_score: number | null;
  priority: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type Ticket = {
  id: string;
  conversation_id: string;
  priority: string | null;
  status: string | null;
  reason: string | null;
  created_at: string;
  resolved_at: string | null;
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function normalize(value: string | null | undefined) {
  return value?.toLowerCase().trim() || "unknown";
}

export default function SupervisorDashboardPage() {
  const params = useParams();
  const userId = params.userId as string;

  const supabase = useMemo(() => createClient(), []);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState<"today" | "7d" | "30d">("7d");

  async function loadDashboard() {
    setLoading(true);

    try {
      const now = new Date();

      const start = new Date(now);

      if (period === "today") {
        start.setHours(0, 0, 0, 0);
      }

      if (period === "7d") {
        start.setDate(start.getDate() - 7);
      }

      if (period === "30d") {
        start.setDate(start.getDate() - 30);
      }

      const [conversationResult, ticketResult] = await Promise.all([
        supabase
          .from("conversations")
          .select(`
            id,
            channel,
            status,
            queue,
            assigned_agent_id,
            language,
            intent,
            sentiment,
            urgency_score,
            priority,
            first_response_at,
            resolved_at,
            created_at,
            updated_at
          `)
          .gte("created_at", start.toISOString())
          .order("created_at", { ascending: false }),

        supabase
          .from("tickets")
          .select(`
            id,
            conversation_id,
            priority,
            status,
            reason,
            created_at,
            resolved_at
          `)
          .gte("created_at", start.toISOString())
          .order("created_at", { ascending: false }),
      ]);

      if (conversationResult.error) {
        console.error(
          "Dashboard conversations error:",
          conversationResult.error
        );
      }

      if (ticketResult.error) {
        console.error("Dashboard tickets error:", ticketResult.error);
      }

      setConversations(conversationResult.data ?? []);
      setTickets(ticketResult.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [period]);

  /*
   * REALTIME
   *
   * Dashboard refreshes its analytics when the underlying
   * operational tables change.
   */
  useEffect(() => {
    const channel = supabase
      .channel(`supervisor-dashboard-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          loadDashboard();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        () => {
          loadDashboard();
        }
      )
      .subscribe((status, error) => {
        console.log("📊 DASHBOARD REALTIME:", status);

        if (error) {
          console.error("📊 DASHBOARD REALTIME ERROR:", error);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, period]);

  const metrics = useMemo(() => {
    const total = conversations.length;

    const open = conversations.filter(
      (c) => normalize(c.status) !== "resolved"
    ).length;

    const resolved = conversations.filter(
      (c) => normalize(c.status) === "resolved"
    ).length;

    const escalated = tickets.length;

    const escalationRate =
      total > 0 ? (escalated / total) * 100 : 0;

    const conversationsWithResponse = conversations.filter(
      (c) => c.first_response_at
    );

    const responseTimes = conversationsWithResponse.map((c) => {
      return (
        new Date(c.first_response_at!).getTime() -
        new Date(c.created_at).getTime()
      ) / 1000;
    });

    const avgResponse =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) /
          responseTimes.length
        : 0;

    const avgUrgency =
      total > 0
        ? conversations.reduce(
            (sum, c) => sum + (c.urgency_score ?? 0),
            0
          ) / total
        : 0;

    const unassigned = conversations.filter(
      (c) => !c.assigned_agent_id && normalize(c.status) !== "resolved"
    ).length;

    const angry = conversations.filter(
      (c) => normalize(c.sentiment) === "angry"
    ).length;

    const highUrgency = conversations.filter(
      (c) => (c.urgency_score ?? 0) > 50
    ).length;

    return {
      total,
      open,
      resolved,
      escalated,
      escalationRate,
      avgResponse,
      avgUrgency,
      unassigned,
      angry,
      highUrgency,
    };
  }, [conversations, tickets]);

  const channelStats = useMemo(() => {
    const counts: Record<string, number> = {};

    conversations.forEach((conversation) => {
      const channel = normalize(conversation.channel);
      counts[channel] = (counts[channel] ?? 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [conversations]);

  const sentimentStats = useMemo(() => {
    const counts: Record<string, number> = {
      angry: 0,
      negative: 0,
      neutral: 0,
      positive: 0,
    };

    conversations.forEach((conversation) => {
      const sentiment = normalize(conversation.sentiment);
      if (sentiment in counts) {
        counts[sentiment] += 1;
      } else {
        counts.neutral += 1;
      }
    });

    return Object.entries(counts);
  }, [conversations]);

  const queueStats = useMemo(() => {
    const counts: Record<string, number> = {};

    conversations.forEach((conversation) => {
      const queue = normalize(conversation.queue);
      counts[queue] = (counts[queue] ?? 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [conversations]);

  const urgencyStats = useMemo(() => {
    return {
      critical: conversations.filter(
        (c) => (c.urgency_score ?? 0) >= 76
      ).length,

      high: conversations.filter(
        (c) =>
          (c.urgency_score ?? 0) >= 51 &&
          (c.urgency_score ?? 0) <= 75
      ).length,

      medium: conversations.filter(
        (c) =>
          (c.urgency_score ?? 0) >= 26 &&
          (c.urgency_score ?? 0) <= 50
      ).length,

      low: conversations.filter(
        (c) => (c.urgency_score ?? 0) <= 25
      ).length,
    };
  }, [conversations]);

  const ticketStats = useMemo(() => {
    const stats: Record<string, number> = {};

    tickets.forEach((ticket) => {
      const status = normalize(ticket.status);
      stats[status] = (stats[status] ?? 0) + 1;
    });

    return stats;
  }, [tickets]);

  const maxQueueValue =
    Math.max(...queueStats.map(([, value]) => value), 1);

  const maxChannelValue =
    Math.max(...channelStats.map(([, value]) => value), 1);

  return (
    <SupervisorShell userId={userId}>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <WorkspaceTopBar userId={userId} role="supervisor" />

        {/* HEADER */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#1f8f5f]" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1f8f5f]">
                Pilotage
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Customer Service Dashboard
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Operational overview of customer support activity,
              performance and escalations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
              {(["today", "7d", "30d"] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                    period === value
                      ? "bg-[#1f8f5f] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {value === "today"
                    ? "Today"
                    : value === "7d"
                    ? "7 days"
                    : "30 days"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#1f8f5f]" />
              Live
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="text-sm text-gray-500">
              Loading dashboard...
            </div>
          </div>
        ) : (
          <>
            {/* KPI GRID */}
            <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <MetricCard
                label="Total conversations"
                value={metrics.total}
                description="Customer conversations"
              />

              <MetricCard
                label="Open conversations"
                value={metrics.open}
                description="Currently active"
              />

              <MetricCard
                label="Resolved"
                value={metrics.resolved}
                description="Successfully resolved"
              />

              <MetricCard
                label="Escalated"
                value={metrics.escalated}
                description={`${formatPercent(
                  metrics.escalationRate
                )} escalation rate`}
                danger
              />
            </section>

            <section className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
              <MetricCard
                label="First response"
                value={formatDuration(metrics.avgResponse)}
                description="Average first response"
              />

              <MetricCard
                label="Average urgency"
                value={Math.round(metrics.avgUrgency)}
                description="Out of 100"
              />

              <MetricCard
                label="Unassigned"
                value={metrics.unassigned}
                description="Need agent assignment"
                danger={metrics.unassigned > 0}
              />
            </section>

            {/* VOLUME + CHANNELS */}
            <section className="mt-6 grid gap-6 xl:grid-cols-3">
              <DashboardCard
                title="Conversation overview"
                description="Current operational state"
                className="xl:col-span-2"
              >
                <div className="grid grid-cols-3 gap-6">
                  <MiniStat
                    label="Open"
                    value={metrics.open}
                    percent={
                      metrics.total
                        ? (metrics.open / metrics.total) * 100
                        : 0
                    }
                  />

                  <MiniStat
                    label="Resolved"
                    value={metrics.resolved}
                    percent={
                      metrics.total
                        ? (metrics.resolved / metrics.total) * 100
                        : 0
                    }
                  />

                  <MiniStat
                    label="Escalated"
                    value={metrics.escalated}
                    percent={metrics.escalationRate}
                  />
                </div>
              </DashboardCard>

              <DashboardCard
                title="Channels"
                description="Conversation distribution"
              >
                <div className="space-y-4">
                  {channelStats.length === 0 ? (
                    <EmptyState />
                  ) : (
                    channelStats.map(([channel, value]) => (
                      <BarRow
                        key={channel}
                        label={channel}
                        value={value}
                        max={maxChannelValue}
                      />
                    ))
                  )}
                </div>
              </DashboardCard>
            </section>

            {/* CUSTOMER EXPERIENCE */}
            <section className="mt-6 grid gap-6 xl:grid-cols-3">
              <DashboardCard
                title="Sentiment"
                description="Customer emotional state"
              >
                <div className="space-y-4">
                  {sentimentStats.map(([sentiment, value]) => (
                    <div
                      key={sentiment}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            sentiment === "angry"
                              ? "bg-red-500"
                              : sentiment === "negative"
                              ? "bg-orange-400"
                              : sentiment === "positive"
                              ? "bg-[#1f8f5f]"
                              : "bg-sky-400"
                          }`}
                        />

                        <span className="text-sm capitalize text-gray-700">
                          {sentiment}
                        </span>
                      </div>

                      <span className="text-sm font-semibold">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </DashboardCard>

              <DashboardCard
                title="Urgency"
                description="Qualification score distribution"
              >
                <div className="space-y-4">
                  {/* 0–25 low, 26–50 medium, 51–75 high, 76–100 critical. */}
                  <StatLine
                    label="Critical · 76–100"
                    value={urgencyStats.critical}
                    danger
                  />

                  <StatLine
                    label="High · 51–75"
                    value={urgencyStats.high}
                  />

                  <StatLine
                    label="Medium · 26–50"
                    value={urgencyStats.medium}
                  />

                  <StatLine
                    label="Low · 0–25"
                    value={urgencyStats.low}
                  />
                </div>
              </DashboardCard>

              <DashboardCard
                title="Customer experience signals"
                description="Operational attention points"
              >
                <div className="space-y-4">
                  {/* Angry sentiment, urgency above 50, and unresolved unassigned work. */}
                  <Signal
                    label="Angry conversations"
                    description="Customer angry sentiment"
                    value={metrics.angry}
                    danger
                  />

                  <Signal
                    label="High urgency (>50)"
                    description="Urgency score above 50"
                    value={metrics.highUrgency}
                    danger={metrics.highUrgency > 0}
                  />

                  <Signal
                    label="Unassigned conversations"
                    description="Conversation is not resolved"
                    value={metrics.unassigned}
                    danger={metrics.unassigned > 0}
                  />
                </div>
              </DashboardCard>
            </section>

            {/* QUEUES */}
            <section className="mt-6">
              <DashboardCard
                title="Queue performance"
                description="Conversation workload by support queue"
              >
                <div className="space-y-5">
                  {queueStats.length === 0 ? (
                    <EmptyState />
                  ) : (
                    queueStats.map(([queue, value]) => (
                      <BarRow
                        key={queue}
                        label={queue}
                        value={value}
                        max={maxQueueValue}
                      />
                    ))
                  )}
                </div>
              </DashboardCard>

            </section>

            {/* ESCALATIONS + TICKETS */}
            <section className="mt-6 grid gap-6 xl:grid-cols-2">
              <DashboardCard
                title="Escalation overview"
                description="Supervisor intervention workload"
              >
                <div className="grid grid-cols-2 gap-4">
                  <InsightCard
                    label="Total escalations"
                    value={tickets.length}
                    danger
                  />

                  <InsightCard
                    label="Escalation rate"
                    value={formatPercent(metrics.escalationRate)}
                    danger
                  />

                  <InsightCard
                    label="New tickets"
                    value={ticketStats.new ?? 0}
                  />

                  <InsightCard
                    label="Open tickets"
                    value={ticketStats.open ?? 0}
                  />
                </div>
              </DashboardCard>

              <DashboardCard
                title="Ticket status"
                description="Current escalation lifecycle"
              >
                <div className="space-y-4">
                  <StatusRow
                    label="New"
                    value={ticketStats.new ?? 0}
                  />

                  <StatusRow
                    label="Open"
                    value={ticketStats.open ?? 0}
                  />

                  <StatusRow
                    label="Resolved"
                    value={ticketStats.resolved ?? 0}
                  />
                </div>
              </DashboardCard>
            </section>

            {/* LIVE ACTIVITY */}
            <section className="mt-6">
              <DashboardCard
                title="Live activity"
                description="Latest operational events"
                right={
                  <span className="flex items-center gap-2 text-xs font-medium text-[#1f8f5f]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#1f8f5f]" />
                    Realtime
                  </span>
                }
              >
                <div className="space-y-3">
                  {conversations.slice(0, 6).map((conversation) => (
                    <div
                      key={conversation.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-[#1f8f5f]" />

                        <div>
                          <p className="text-sm font-medium">
                            Conversation updated
                          </p>

                          <p className="text-xs text-gray-500">
                            {conversation.channel ?? "Unknown channel"} ·{" "}
                            {conversation.queue ?? "General"}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs text-gray-400">
                        {new Date(
                          conversation.updated_at
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}

                  {conversations.length === 0 && <EmptyState />}
                </div>
              </DashboardCard>
            </section>
          </>
        )}
      </main>
    </SupervisorShell>
  );
}

/* -------------------------------------------------------------------------- */
/* UI COMPONENTS                                                              */
/* -------------------------------------------------------------------------- */

function MetricCard({
  label,
  value,
  description,
  danger = false,
}: {
  label: string;
  value: string | number;
  description: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>

        <span
          className={`h-2.5 w-2.5 rounded-full ${
            danger ? "bg-red-500" : "bg-[#1f8f5f]"
          }`}
        />
      </div>

      <p
        className={`mt-4 text-3xl font-semibold tracking-tight ${
          danger && Number(value) > 0 ? "text-red-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-400">{description}</p>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  children,
  className = "",
  right,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ${className}`}
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-gray-400">{description}</p>
        </div>

        {right}
      </div>

      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
  percent,
}: {
  label: string;
  value: number;
  percent: number;
}) {
  return (
    <div>
      <div className="flex items-end justify-between">
        <span className="text-sm text-gray-500">{label}</span>

        <span className="text-xs text-gray-400">
          {Math.round(percent)}%
        </span>
      </div>

      <p className="mt-2 text-3xl font-semibold">{value}</p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#1f8f5f]"
          style={{
            width: `${Math.min(percent, 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm capitalize text-gray-600">
          {label}
        </span>

        <span className="text-sm font-semibold">{value}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#1f8f5f]"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function StatLine({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>

      <span
        className={`rounded-lg px-3 py-1 text-sm font-semibold ${
          danger
            ? "bg-red-50 text-red-600"
            : "bg-gray-100 text-gray-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Signal({
  label,
  description,
  value,
  danger = false,
}: {
  label: string;
  description: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="mt-0.5 text-xs text-gray-400">{description}</p>
      </div>

      <span
        className={`text-lg font-semibold ${
          danger ? "text-red-600" : "text-gray-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function InsightCard({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
      <p className="text-xs text-gray-400">{label}</p>

      <p
        className={`mt-2 text-2xl font-semibold ${
          danger ? "text-red-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>

      <span className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-semibold">
        {value}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
      No data available for this period.
    </div>
  );
}
