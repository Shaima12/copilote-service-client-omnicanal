"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CircleHelp,
  Home,
  LogOut,
  Mail,
  MessageSquare,
  ShieldCheck,
  UserCircle,
  UserRound,
} from "lucide-react";

import WorkspaceTopBar from "@/components/workspace-top-bar";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  full_name: string;
  email: string | null;
  role: string;
};

export default function AgentProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const routeUserId = pathname.split("/")[2];
  const [supabase] = useState(() => createClient());
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

      if (error || !data || data.role !== "agent") {
        router.push("/login");
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    void loadProfile();
  }, [router, supabase]);

  async function signOut() {
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

  const navigation = [
    {
      href: `/agent/${routeUserId}`,
      label: "Home",
      icon: <Home size={18} strokeWidth={1.8} />,
    },
    {
      href: `/agent/${routeUserId}/faq`,
      label: "FAQ",
      icon: <CircleHelp size={18} strokeWidth={1.8} />,
    },
    {
      href: `/agent/${routeUserId}/conversations`,
      label: "Conversations",
      icon: <MessageSquare size={18} strokeWidth={1.8} />,
    },
    {
      href: `/agent/${routeUserId}/profile`,
      label: "Profile",
      icon: <UserCircle size={18} strokeWidth={1.8} />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-gray-200 bg-white md:flex md:flex-col">
          <div className="border-b border-gray-100 px-6 py-6">
            <h1 className="text-2xl font-bold tracking-tight">Customer Support Agent</h1>
            <p className="mt-1 text-xs text-gray-500">Agent workspace</p>
          </div>

          <nav className="flex-1 px-4 py-6">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Workspace
            </p>
            <div className="space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                    item.label === "Profile"
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className={item.label === "Profile" ? "text-gray-900" : "text-gray-500"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="border-t border-gray-100 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700">
                <UserRound size={17} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{profile?.full_name}</p>
                <p className="truncate text-xs text-gray-500">{profile?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut size={18} strokeWidth={1.8} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 md:ml-64">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <WorkspaceTopBar userId={routeUserId} role="agent" />

            <section>
              <p className="text-sm font-medium text-gray-500">Agent workspace</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your profile</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                View your account details and workspace access.
              </p>
            </section>

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="border-b border-gray-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                    <ShieldCheck size={20} strokeWidth={1.7} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Account information</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Your agent profile</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
                <ProfileItem
                  icon={<UserRound size={17} strokeWidth={1.7} />}
                  label="Full name"
                  value={profile?.full_name || "Not provided"}
                />
                <ProfileItem
                  icon={<Mail size={17} strokeWidth={1.7} />}
                  label="Email"
                  value={profile?.email || "Not provided"}
                />
                <ProfileItem
                  icon={<ShieldCheck size={17} strokeWidth={1.7} />}
                  label="Account type"
                  value="Agent"
                />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function ProfileItem({
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
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
