"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  MessageSquare,
  CircleHelp,
  AlertTriangle,
  UserCircle,
  LogOut,
  Clock3,
  CheckCircle2,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  full_name: string;
  email: string | null;
  role: string;
};

type Conversation = {
  id: string;
  status: string;
  priority: string;
  urgency_score: number | null;
};

export default function AgentHomePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgentData();
  }, []);

  async function loadAgentData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .single();

    if (
      profileError ||
      !profileData ||
      profileData.role !== "agent"
    ) {
      router.push("/login");
      return;
    }

    const { data: conversationData } = await supabase
      .from("conversations")
      .select(
        "id, status, priority, urgency_score"
      );

    setProfile(profileData);
    setConversations(conversationData || []);
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const openCount = conversations.filter(
    (conversation) =>
      conversation.status === "open" ||
      conversation.status === "new"
  ).length;

  const escalatedCount = conversations.filter(
    (conversation) =>
      conversation.status === "escalated"
  ).length;

  const urgentCount = conversations.filter(
    (conversation) =>
      conversation.priority === "urgent"
  ).length;

  const resolvedCount = conversations.filter(
    (conversation) =>
      conversation.status === "resolved"
  ).length;

  const firstName =
    profile?.full_name?.split(" ")[0] || "there";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 border-r border-gray-200 bg-white md:block" />

          <main className="flex-1 p-6 md:p-10">
            <div className="mx-auto max-w-6xl">
              <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
              <div className="mt-8 h-40 animate-pulse rounded-2xl bg-white" />
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="h-28 animate-pulse rounded-2xl bg-white" />
                <div className="h-28 animate-pulse rounded-2xl bg-white" />
                <div className="h-28 animate-pulse rounded-2xl bg-white" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">

      {/* ================= MOBILE HEADER ================= */}

      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white md:hidden">

        <div className="flex items-center justify-between px-5 py-4">

          <div>
            <h1 className="text-xl font-bold tracking-tight">
              ZEN
            </h1>

            <p className="text-[11px] text-gray-500">
              Agent workspace
            </p>
          </div>

          <button
            onClick={signOut}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <LogOut size={19} />
          </button>

        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2">

          <MobileNavItem
            icon={<Home size={17} />}
            label="Home"
            active
            onClick={() => router.push("/agent")}
          />

          <MobileNavItem
            icon={<CircleHelp size={17} />}
            label="FAQ"
            onClick={() => router.push("/agent/faq")}
          />

          <MobileNavItem
            icon={<MessageSquare size={17} />}
            label="Conversations"
            onClick={() => router.push("/agent/conversations")}
          />

          <MobileNavItem
            icon={<AlertTriangle size={17} />}
            label="Escalations"
            onClick={() => router.push("/agent/escalations")}
          />

          <MobileNavItem
            icon={<UserCircle size={17} />}
            label="Profile"
            onClick={() => router.push("/agent/profile")}
          />

        </nav>

      </header>


      <div className="flex min-h-screen">

        {/* ================= SIDEBAR ================= */}

        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-gray-200 bg-white md:flex md:flex-col">

          <div className="border-b border-gray-100 px-6 py-6">

            <h1 className="text-2xl font-bold tracking-tight">
              ZEN
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Agent workspace
            </p>

          </div>


          <nav className="flex-1 px-4 py-6">

            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Workspace
            </p>

            <div className="space-y-1">

              <SidebarItem
                icon={<Home size={18} />}
                label="Home"
                active
                onClick={() => router.push("/agent")}
              />

              <SidebarItem
                icon={<CircleHelp size={18} />}
                label="FAQ"
                onClick={() =>
                  router.push("/agent/faq")
                }
              />

              <SidebarItem
                icon={<MessageSquare size={18} />}
                label="Conversations"
                onClick={() =>
                  router.push("/agent/conversations")
                }
              />

              <SidebarItem
                icon={<AlertTriangle size={18} />}
                label="Escalations"
                onClick={() =>
                  router.push("/agent/escalations")
                }
              />

              <SidebarItem
                icon={<UserCircle size={18} />}
                label="Profile"
                onClick={() =>
                  router.push("/agent/profile")
                }
              />

            </div>

          </nav>


          <div className="border-t border-gray-100 p-4">

            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut size={18} />
              Sign out
            </button>

          </div>

        </aside>


        {/* ================= MAIN ================= */}

        <main className="flex-1 md:ml-64">

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">

            {/* HEADER */}

            <div>

              <p className="text-sm font-medium text-gray-500">
                Agent workspace
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Welcome back, {firstName}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Manage customer conversations, find answers,
                and handle escalations from one place.
              </p>

            </div>


            {/* QUICK ACTION */}

            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Inbox size={20} />
                  </div>

                  <h2 className="mt-4 text-base font-semibold">
                    Customer inbox
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    View and respond to incoming customer
                    conversations.
                  </p>

                </div>

                <button
                  onClick={() =>
                    router.push("/agent/conversations")
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Open conversations
                  <ArrowRight size={16} />
                </button>

              </div>

            </div>


            {/* STATS */}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <StatCard
                icon={<Clock3 size={19} />}
                label="Open conversations"
                value={openCount}
                accent="blue"
              />

              <StatCard
                icon={<AlertTriangle size={19} />}
                label="Escalated"
                value={escalatedCount}
                accent="orange"
              />

              <StatCard
                icon={<AlertTriangle size={19} />}
                label="Urgent"
                value={urgentCount}
                accent="red"
              />

              <StatCard
                icon={<CheckCircle2 size={19} />}
                label="Resolved"
                value={resolvedCount}
                accent="green"
              />

            </div>


            {/* FAQ SHORTCUT */}

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

              <div className="flex items-center justify-between gap-4">

                <div className="flex items-center gap-4">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <CircleHelp size={20} />
                  </div>

                  <div>

                    <h2 className="text-sm font-semibold">
                      FAQ
                    </h2>

                    <p className="mt-1 text-xs text-gray-500">
                      Find approved answers for customer questions.
                    </p>

                  </div>

                </div>

                <button
                  onClick={() =>
                    router.push("/agent/faq")
                  }
                  className="rounded-lg p-2.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <ArrowRight size={18} />
                </button>

              </div>

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}


/* ========================================================= */
/* STAT CARD                                                  */
/* ========================================================= */

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: "blue" | "orange" | "red" | "green";
}) {
  const accentClasses = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

      <div className="flex items-center justify-between">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentClasses[accent]}`}
        >
          {icon}
        </div>

      </div>

      <p className="mt-4 text-2xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {label}
      </p>

    </div>
  );
}


/* ========================================================= */
/* SIDEBAR ITEM                                               */
/* ========================================================= */

function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
        active
          ? "bg-blue-50 font-medium text-blue-700"
          : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span
        className={
          active ? "text-blue-600" : "text-gray-500"
        }
      >
        {icon}
      </span>

      <span>{label}</span>
    </button>
  );
}


/* ========================================================= */
/* MOBILE ITEM                                                */
/* ========================================================= */

function MobileNavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

