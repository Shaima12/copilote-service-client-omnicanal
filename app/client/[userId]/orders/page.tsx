"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ClipboardList,
  Home,
  LogOut,
  MessageCircle,
  Package,
  RefreshCw,
  ShoppingBag,
  UserCircle,
  UserRound,
} from "lucide-react";
import WorkspaceTopBar from "@/components/workspace-top-bar";

type Order = {
  id: string;
  order_number: string;
  status:
    | "pending"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled";
  total_amount: number;
  currency: string;
  ordered_at: string;
  expected_delivery_at: string | null;
  delivered_at: string | null;
  tracking_number: string | null;
};

export default function ClientPage() {
  const router = useRouter();
  const pathname = usePathname();
  const routeUserId = pathname.split("/")[2];
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("Customer");
  const [error, setError] = useState("");

  useEffect(() => {
    loadClientData();
  }, []);

  async function loadClientData() {
    setLoading(true);
    setError("");

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You are not authenticated.");
      setLoading(false);
      return;
    }

    console.log("Authenticated user:", user.id);

    // Get client profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, customer_id, role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile error:", profileError);
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (!profile?.customer_id) {
      setError("Customer profile not found.");
      setLoading(false);
      return;
    }

    console.log("Client profile:", profile);
    console.log("Customer ID:", profile.customer_id);

    setCustomerName(profile.full_name || "Customer");

    // Get this customer's orders
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total_amount,
        currency,
        ordered_at,
        expected_delivery_at,
        delivered_at,
        tracking_number
      `)
      .eq("customer_id", profile.customer_id)
      .order("ordered_at", { ascending: false });

    console.log("========== ORDERS DEBUG ==========");
console.log("Customer ID:", profile.customer_id);
console.log("Orders data:", ordersData);
console.log("Orders error:", ordersError);
console.log("Orders count:", ordersData?.length);
console.log("==================================");

    if (ordersError) {
      setError(ordersError.message);
      setLoading(false);
      return;
    }

    setOrders((ordersData as Order[]) || []);
    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function getStatusStyle(status: Order["status"]) {
    switch (status) {
      case "delivered":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";

      case "shipped":
        return "bg-blue-50 text-blue-700 ring-blue-600/20";

      case "confirmed":
        return "bg-amber-50 text-amber-700 ring-amber-600/20";

      case "pending":
        return "bg-gray-100 text-gray-700 ring-gray-500/20";

      case "cancelled":
        return "bg-red-50 text-red-700 ring-red-600/20";

      default:
        return "bg-gray-100 text-gray-700 ring-gray-500/20";
    }
  }

  function formatDate(date: string | null) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusLabel(status: Order["status"]) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-gray-900">

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
            <LogOut size={18} />
          </button>
        </div>

        {/* Mobile navigation */}
        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2">

          <a
            href={`/client/${routeUserId}`}
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            <Home size={17} strokeWidth={1.8} /> Home
          </a>

          <a
            href={`/client/${routeUserId}/orders`}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700"
          >
            <ShoppingBag size={16} /> Orders
          </a>

          <a
            href={`/client/${routeUserId}/support`}
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            <MessageCircle size={16} /> Support
          </a>

          <a
            href={`/client/${routeUserId}/requests`}
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            <ClipboardList size={16} /> Requests
          </a>

          <a
            href={`/client/${routeUserId}/profile`}
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            <UserCircle size={16} /> Profile
          </a>

        </nav>
      </header>

      <div className="flex min-h-screen">

        {/* ================= DESKTOP SIDEBAR ================= */}
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
          <nav className="flex-1 px-3 py-6">

            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              My space
            </p>

            <a
              href={`/client/${routeUserId}`}
              className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <Home size={18} strokeWidth={1.8} />
              <span>Home</span>
            </a>

            <a
              href={`/client/${routeUserId}/orders`}
              className="mb-1 flex items-center gap-3 rounded-lg bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700"
            >
              <ShoppingBag size={18} />
              <span>Orders</span>
            </a>

            <a
              href={`/client/${routeUserId}/support`}
              className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <MessageCircle size={18} />
              <span>Customer Support</span>
            </a>

            <a
              href={`/client/${routeUserId}/requests`}
              className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <ClipboardList size={18} />
              <span>Requests</span>
            </a>

            <a
              href={`/client/${routeUserId}/profile`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <UserCircle size={18} />
              <span>Profile</span>
            </a>

          </nav>

          {/* User */}
          <div className="border-t border-gray-100 p-4">

            <div className="mb-4 flex items-center gap-3 px-2">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-sm font-semibold text-green-700">
                {customerName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {customerName}
                </p>

                <p className="text-xs text-gray-500">
                  Client
                </p>
              </div>

            </div>

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut size={17} />
              Sign out
            </button>

          </div>
        </aside>

        {/* ================= MAIN CONTENT ================= */}
        <section className="min-h-screen flex-1 md:ml-64">

          <div className="px-4 pt-6 sm:px-6 lg:px-8">
            <WorkspaceTopBar userId={routeUserId} role="client" />
          </div>

          {/* Header */}
          <header className="border-b border-[#e4eae5] bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">

              <div>
                <p className="text-sm text-[#8a9890]">
                  Welcome back, {customerName}
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">
                  My Orders
                </h1>

                <p className="mt-2 text-sm text-[#718078]">
                  Track and manage your orders.
                </p>
              </div>

              <button
                onClick={loadClientData}
                disabled={loading}
                className="hidden items-center gap-2 rounded-xl border border-[#d5ded7] bg-white px-4 py-2.5 text-sm font-semibold text-[#42514b] shadow-sm transition hover:border-[#9eafa5] hover:bg-[#f7f8f5] disabled:opacity-50 sm:flex"
              >
                <RefreshCw size={15} />
                {loading ? "Refreshing..." : "Refresh"}
              </button>

            </div>
          </header>

          {/* Content */}
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

            {/* Mobile refresh */}
            <button
              onClick={loadClientData}
              disabled={loading}
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d5ded7] bg-white px-4 py-3 text-sm font-semibold text-[#42514b] shadow-sm sm:hidden"
            >
              <RefreshCw size={15} />
              {loading ? "Refreshing..." : "Refresh orders"}
            </button>

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle size={18} className="shrink-0 text-red-500" />

                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Something went wrong
                    </p>

                    <p className="mt-1 text-sm text-red-600">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="space-y-4">

                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 sm:p-6"
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="h-3 w-16 rounded bg-gray-200" />
                        <div className="mt-2 h-5 w-32 rounded bg-gray-200" />
                      </div>

                      <div className="h-7 w-20 rounded-full bg-gray-200" />
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
                      {[1, 2, 3, 4].map((field) => (
                        <div key={field}>
                          <div className="h-3 w-20 rounded bg-gray-200" />
                          <div className="mt-2 h-4 w-24 rounded bg-gray-200" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

              </div>
            ) : orders.length === 0 ? (

              /* Empty state */
              <div className="rounded-2xl border border-[#dce7de] bg-white px-6 py-16 text-center shadow-[0_8px_24px_rgba(38,64,52,0.05)]">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf6ee] text-[#71977b]">
                  <Package size={28} />
                </div>

                <h2 className="mt-5 text-lg font-bold">
                  No orders yet
                </h2>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#718078]">
                  You don&apos;t have any orders associated with your account yet.
                  Your future orders will appear here.
                </p>

              </div>

            ) : (

              /* Orders */
              <div className="space-y-4">

                {/* Summary */}
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">

                    <div className="rounded-2xl border border-[#dce7de] bg-white p-5 shadow-[0_8px_24px_rgba(38,64,52,0.05)]">
                      <p className="text-xs font-medium text-[#8a9890]">
                      Total orders
                    </p>

                    <p className="mt-1 text-3xl font-bold tracking-[-0.04em]">
                      {orders.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#dce7de] bg-white p-5 shadow-[0_8px_24px_rgba(38,64,52,0.05)]">
                    <p className="text-xs font-medium text-[#8a9890]">
                      In progress
                    </p>

                    <p className="mt-1 text-3xl font-bold tracking-[-0.04em]">
                      {
                        orders.filter(
                          (order) =>
                            order.status === "pending" ||
                            order.status === "confirmed" ||
                            order.status === "shipped"
                        ).length
                      }
                    </p>
                  </div>

                  <div className="col-span-2 rounded-2xl border border-[#dce7de] bg-white p-5 shadow-[0_8px_24px_rgba(38,64,52,0.05)] sm:col-span-1">
                    <p className="text-xs font-medium text-[#8a9890]">
                      Delivered
                    </p>

                    <p className="mt-1 text-3xl font-bold tracking-[-0.04em]">
                      {
                        orders.filter(
                          (order) => order.status === "delivered"
                        ).length
                      }
                    </p>
                  </div>

                </div>

                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="overflow-hidden rounded-2xl border border-[#dce7de] bg-white shadow-[0_8px_24px_rgba(38,64,52,0.05)] transition hover:-translate-y-0.5 hover:border-[#b8cdbb] hover:shadow-[0_14px_32px_rgba(38,64,52,0.1)]"
                  >

                    {/* Order header */}
                    <div className="flex flex-col gap-4 border-b border-[#edf0ed] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a9890]">
                          Order
                        </p>

                        <h2 className="mt-1 text-xl font-bold tracking-[-0.03em]">
                          #{order.order_number}
                        </h2>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${getStatusStyle(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>

                    </div>

                    {/* Order details */}
                    <div className="grid grid-cols-2 gap-y-6 p-5 sm:grid-cols-2 sm:gap-6 sm:p-6 md:grid-cols-4">

                      <div>
                        <p className="text-xs font-medium text-[#8a9890]">
                          Total
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#263a33]">
                          {Number(order.total_amount).toFixed(2)}{" "}
                          {order.currency}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-[#8a9890]">
                          Ordered
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[#42514b]">
                          {formatDate(order.ordered_at)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-[#8a9890]">
                          Expected delivery
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[#42514b]">
                          {formatDate(order.expected_delivery_at)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-[#8a9890]">
                          Tracking
                        </p>

                        <p className="mt-1 break-all text-sm font-semibold text-[#42514b]">
                          {order.tracking_number || "Not available"}
                        </p>
                      </div>

                    </div>

                    {/* Footer */}
                    <div className="flex flex-col gap-3 border-t border-[#edf0ed] bg-[#fafcf9] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                      <p className="text-xs text-[#718078]">
                        {order.status === "delivered"
                          ? `Delivered on ${formatDate(order.delivered_at)}`
                          : order.status === "cancelled"
                          ? "This order was cancelled"
                          : "Order information"}
                      </p>

                      <button
                        onClick={() =>
                          console.log("View order:", order.id)
                        }
                        className="w-full rounded-lg border border-[#d5ded7] bg-white px-4 py-2 text-sm font-bold text-[#42514b] transition hover:border-[#9eafa5] hover:bg-[#f7f8f5] sm:w-auto"
                      >
                        View details <span aria-hidden="true">→</span>
                      </button>

                    </div>

                  </article>
                ))}

              </div>
            )}

          </div>
        </section>
      </div>
    </main>
  );
}

