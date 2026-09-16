"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ShoppingBag,
  MessageCircle,
  ClipboardList,
  UserRound,
  LogOut,
  Mail,
  Phone,
  UserCircle,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  customer_id: string | null;
};

type Customer = {
  full_name: string;
  email: string | null;
  phone: string | null;
};

export default function ClientHomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const routeUserId = pathname.split("/")[2];
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, []);

  async function loadClientData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData) {
      console.error("Profile error:", profileError);
      setLoading(false);
      return;
    }

    setProfile(profileData);

    if (profileData.customer_id) {
      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select("full_name, email, phone")
          .eq("id", profileData.customer_id)
          .single();

      if (!customerError && customerData) {
        setCustomer(customerData);
      }
    }

    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 border-r border-gray-200 bg-white md:block" />

          <main className="flex-1 p-6 md:p-10">
            <div className="mx-auto max-w-6xl">
              <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
              <div className="mt-8 h-64 animate-pulse rounded-2xl bg-white" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  const displayName =
    customer?.full_name ||
    profile?.full_name ||
    "there";

  const firstName = displayName.split(" ")[0];

  const initials = displayName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">

      {/* ================= MOBILE HEADER ================= */}

      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white md:hidden">

        <div className="flex items-center justify-between px-5 py-4">

          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              ZEN
            </h1>

            <p className="mt-0.5 text-[11px] text-gray-500">
              Customer Portal
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
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
            onClick={() => router.push(`/client/${routeUserId}`)}
          />

          <MobileNavItem
            icon={<ShoppingBag size={17} strokeWidth={1.8} />}
            label="Orders"
            onClick={() => router.push(`/client/${routeUserId}/orders`)}
          />

          <MobileNavItem
            icon={<MessageCircle size={17} strokeWidth={1.8} />}
            label="Support"
            onClick={() => router.push(`/client/${routeUserId}/support`)}
          />

          <MobileNavItem
            icon={<ClipboardList size={17} strokeWidth={1.8} />}
            label="Requests"
            onClick={() => router.push(`/client/${routeUserId}/requests`)}
          />

          <MobileNavItem
            icon={<UserCircle size={17} strokeWidth={1.8} />}
            label="Profile"
            onClick={() => router.push(`/client/${routeUserId}/profile`)}
          />

        </nav>

      </header>


      <div className="flex min-h-screen">

        {/* ================= SIDEBAR ================= */}

        <aside className="fixed inset-y-0 left-0 hidden w-64 shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">

          {/* Logo */}

          <div className="border-b border-gray-100 px-6 py-6">

            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              ZEN
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Customer Portal
            </p>

          </div>


          {/* Navigation */}

          <nav className="flex-1 px-4 py-6">

            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              My space
            </p>

            <div className="space-y-1">

              <SidebarItem
                icon={<Home size={18} strokeWidth={1.8} />}
                label="Home"
                active
                onClick={() => router.push(`/client/${routeUserId}`)}
              />

              <SidebarItem
                icon={<ShoppingBag size={18} strokeWidth={1.8} />}
                label="Orders"
                onClick={() => router.push(`/client/${routeUserId}/orders`)}
              />

              <SidebarItem
                icon={<MessageCircle size={18} strokeWidth={1.8} />}
                label="Customer Support"
                onClick={() => router.push(`/client/${routeUserId}/support`)}
              />

              <SidebarItem
                icon={<ClipboardList size={18} strokeWidth={1.8} />}
                label="Requests"
                onClick={() => router.push(`/client/${routeUserId}/requests`)}
              />

              <SidebarItem
                icon={<UserCircle size={18} strokeWidth={1.8} />}
                label="Profile"
                onClick={() => router.push(`/client/${routeUserId}/profile`)}
              />

            </div>

          </nav>


          {/* User */}

          <div className="border-t border-gray-100 p-4">

            <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3">

              {/* Client-specific green avatar */}

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">

                <UserRound
                  size={17}
                  strokeWidth={1.8}
                />

              </div>

              <div className="min-w-0">

                <p className="truncate text-sm font-medium text-gray-900">
                  {displayName}
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


        {/* ================= MAIN ================= */}

        <main className="flex-1 md:ml-64">

          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">


            {/* ================= WELCOME ================= */}

            <section>

              <p className="text-sm font-medium text-green-700">
                Customer space
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
                Welcome back, {firstName}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Manage your account, follow your orders, and get help from
                the ZEN support team whenever you need it.
              </p>

            </section>


            {/* ================= PROFILE SUMMARY ================= */}

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

              {/* Header */}

              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">

                <div className="flex items-center gap-3">

                  {/* Green client identity */}

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">

                    <UserCircle
                      size={21}
                      strokeWidth={1.7}
                    />

                  </div>

                  <div>

                    <h2 className="text-sm font-semibold text-gray-900">
                      Your information
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-500">
                      Your basic account information
                    </p>

                  </div>

                </div>


                <button
                  onClick={() => router.push(`/client/${routeUserId}/profile`)}
                  className="hidden items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:flex"
                >
                  Edit profile

                  <ArrowRight
                    size={15}
                    strokeWidth={1.8}
                  />
                </button>

              </div>


              {/* Information */}

              <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">

                <InfoItem
                  icon={<UserRound size={17} strokeWidth={1.7} />}
                  label="Full name"
                  value={
                    customer?.full_name ||
                    profile?.full_name ||
                    "—"
                  }
                />

                <InfoItem
                  icon={<Mail size={17} strokeWidth={1.7} />}
                  label="Email"
                  value={
                    profile?.email ||
                    customer?.email ||
                    "—"
                  }
                />

                <InfoItem
                  icon={<Phone size={17} strokeWidth={1.7} />}
                  label="Phone"
                  value={customer?.phone || "Not provided"}
                />

                <InfoItem
                  icon={<UserCircle size={17} strokeWidth={1.7} />}
                  label="Account type"
                  value="Client"
                />

              </div>


              {/* Mobile edit button */}

              <div className="border-t border-gray-100 px-6 py-4 sm:hidden">

                <button
                  onClick={() => router.push(`/client/${routeUserId}/profile`)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Edit profile

                  <ArrowRight
                    size={15}
                    strokeWidth={1.8}
                  />

                </button>

              </div>

            </section>


            {/* Small client identity indicator */}

            <div className="mt-5 flex items-center gap-2 text-xs text-gray-400">

              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />

              <span>Your customer account is active</span>

            </div>

          </div>

        </main>

      </div>

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
          ? "bg-green-50 font-medium text-green-700"
          : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span className={active ? "text-green-700" : "text-gray-500"}>
        {icon}
      </span>

      <span>{label}</span>
    </button>
  );
}


/* ========================================================= */
/* MOBILE NAV ITEM                                            */
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
          ? "bg-green-50 text-green-700"
          : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {icon}

      <span>{label}</span>
    </button>
  );
}


/* ========================================================= */
/* INFORMATION ITEM                                           */
/* ========================================================= */

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

      <div className="min-w-0">

        <p className="text-xs font-medium text-gray-400">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-medium text-gray-900">
          {value}
        </p>

      </div>

    </div>
  );
}