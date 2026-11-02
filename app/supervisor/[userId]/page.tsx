"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  LayoutDashboard,
  AlertTriangle,
  LogOut,
  UserRound,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import WorkspaceTopBar from "@/components/workspace-top-bar";

type Profile = {
  full_name: string;
  email: string | null;
  role: string;
};

export default function SupervisorPage() {
  const router = useRouter();
  const pathname = usePathname();
  const routeUserId = pathname.split("/")[2];
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error(error);
        return;
      }

      if (data.role !== "supervisor") {
        router.push("/login");
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Supervisor";

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">

      {/* Mobile header */}
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

        {/* Mobile navigation */}
        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2">
          <MobileNavItem
            icon={<Home size={17} strokeWidth={1.8} />}
            label="Home"
            active
            onClick={() => router.push(`/supervisor/${routeUserId}`)}
          />

          <MobileNavItem
            icon={<BookOpen size={17} strokeWidth={1.8} />}
            label="Knowledge Base"
            onClick={() => router.push(`/supervisor/${routeUserId}/knowledge-base`)}
          />

          <MobileNavItem
            icon={<LayoutDashboard size={17} strokeWidth={1.8} />}
            label="Dashboard"
            onClick={() => router.push(`/supervisor/${routeUserId}/dashboard`)}
          />

          <MobileNavItem
            icon={<AlertTriangle size={17} strokeWidth={1.8} />}
            label="Escalations"
            onClick={() => router.push(`/supervisor/${routeUserId}/escalations`)}
          />
        </nav>
      </header>

      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">

          {/* Logo */}
          <div className="border-b border-gray-100 px-6 py-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Customer Support Agent
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Supervisor
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">

            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Workspace
            </p>

            <div className="space-y-1">

              <SidebarItem
                icon={<Home size={18} strokeWidth={1.8} />}
                label="Home"
                active
                onClick={() => router.push(`/supervisor/${routeUserId}`)}
              />

              <SidebarItem
                icon={<BookOpen size={18} strokeWidth={1.8} />}
                label="Knowledge Base"
                onClick={() => router.push(`/supervisor/${routeUserId}/knowledge-base`)}
              />

              <SidebarItem
                icon={<LayoutDashboard size={18} strokeWidth={1.8} />}
                label="Dashboard"
                onClick={() => router.push(`/supervisor/${routeUserId}/dashboard`)}
              />

              <SidebarItem
                icon={<AlertTriangle size={18} strokeWidth={1.8} />}
                label="Escalations"
                onClick={() => router.push(`/supervisor/${routeUserId}/escalations`)}
              />

            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-gray-100 p-4">

            <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                <UserRound size={17} strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {profile?.full_name}
                </p>

                <p className="truncate text-xs text-gray-500">
                  {profile?.email}
                </p>
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

        {/* Main */}
        <main className="flex-1">

          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">

            <WorkspaceTopBar userId={routeUserId} role="supervisor" />

            {/* Welcome */}
            <section>

              <p className="text-sm font-medium text-gray-500">
                Supervisor workspace
              </p>

              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
                Welcome back, {firstName}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Manage your customer service knowledge base and monitor
                support operations from one place.
              </p>

            </section>

            {/* Profile card */}
            <section className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

              <div className="border-b border-gray-100 px-6 py-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                    <ShieldCheck size={20} strokeWidth={1.7} />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Supervisor information
                    </h3>

                    <p className="mt-0.5 text-xs text-gray-500">
                      Your account details
                    </p>
                  </div>

                </div>

              </div>

              <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">

                <InfoItem
                  icon={<UserRound size={17} strokeWidth={1.7} />}
                  label="Full name"
                  value={profile?.full_name || "—"}
                />

                <InfoItem
                  icon={<Mail size={17} strokeWidth={1.7} />}
                  label="Email"
                  value={profile?.email || "—"}
                />

                <InfoItem
                  icon={<ShieldCheck size={17} strokeWidth={1.7} />}
                  label="Account type"
                  value="Supervisor"
                />

              </div>

            </section>

          </div>

        </main>
      </div>
    </div>
  );
}


/* ---------------- Sidebar Item ---------------- */

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
          ? "bg-gray-100 font-medium text-gray-900"
          : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span className={active ? "text-gray-900" : "text-gray-500"}>
        {icon}
      </span>

      <span>{label}</span>
    </button>
  );
}


/* ---------------- Mobile Item ---------------- */

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
          ? "bg-gray-100 text-gray-900"
          : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}


/* ---------------- Info Item ---------------- */

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
        {icon}
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium text-gray-900">
          {value}
        </p>
      </div>

    </div>
  );
}