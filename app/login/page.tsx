"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    // Get the requested destination from the URL
    const requestedNext = searchParams.get("next");

    // Security: only allow internal paths
    const next =
      requestedNext && requestedNext.startsWith("/")
        ? requestedNext
        : null;

    // 1. Sign in
    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    // 2. Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Could not get the authenticated user.");
      setLoading(false);
      return;
    }

    console.log("Authenticated user:", user);

    // 3. Get user's role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    console.log("Profile:", profile);
    console.log("Profile error:", profileError);

    if (profileError) {
      setError(`Profile error: ${profileError.message}`);
      setLoading(false);
      return;
    }

    if (!profile) {
      setError("No profile found for this account.");
      setLoading(false);
      return;
    }

    // 4. If login came from a protected deep link,
    // return to that exact page.
    if (next) {
      router.replace(next);
      router.refresh();
      return;
    }

    // 5. Normal login → role dashboard
    switch (profile.role) {
      case "client":
        router.replace(`/client/${user.id}`);
        break;

      case "agent":
        router.replace(`/agent/${user.id}`);
        break;

      case "supervisor":
        router.replace(`/supervisor/${user.id}`);
        break;

      default:
        setError(`Unknown role: ${profile.role}`);
        setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#14231f]">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[0.95fr_1.05fr]">

        <section className="relative hidden overflow-hidden bg-[#14231f] p-10 text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#71977b]/30 blur-3xl" />

          <div className="relative">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-lg font-bold"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6c96e] text-sm text-[#14231f]">
                Z
              </span>
              ZEN
            </Link>

            <div className="mt-28 max-w-md">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f6c96e]">
                Welcome back
              </p>

              <h2 className="mt-5 text-5xl font-bold leading-[1.02] tracking-[-0.06em]">
                Good conversations start with a clear view.
              </h2>

              <p className="mt-6 text-base leading-7 text-[#b8c9be]">
                Pick up where your team left off. ZEN keeps every customer
                moment organized, human, and ready for action.
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-3 text-sm text-[#b8c9be]">
            <Check size={16} className="text-[#f6c96e]" />
            Your workspace is waiting for you.
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">

            <Link
              href="/"
              className="mb-12 flex items-center gap-2.5 text-lg font-bold lg:hidden"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#14231f] text-sm text-[#f6c96e]">
                Z
              </span>
              ZEN
            </Link>

            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#71977b]">
                Agent workspace
              </p>

              <h1 className="mt-3 text-4xl font-bold tracking-[-0.055em]">
                Sign in to ZEN.
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#718078]">
                Your customer conversations are just a moment away.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-bold text-[#42514b]"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-[#d5ded7] bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-[#a1ada5] focus:border-[#71977b] focus:ring-4 focus:ring-[#dcebdd]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-[#42514b]"
                  >
                    Password
                  </label>

                  <span className="text-[11px] text-[#9aa69f]">
                    Keep it secure
                  </span>
                </div>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl border border-[#d5ded7] bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-[#a1ada5] focus:border-[#71977b] focus:ring-4 focus:ring-[#dcebdd]"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#14231f] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#263a33] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight
                  size={16}
                  className="transition group-hover:translate-x-0.5"
                />
              </button>

            </form>

            <p className="mt-8 text-center text-sm text-[#718078]">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-bold text-[#52705d] hover:text-[#14231f]"
              >
                Create one
              </Link>
            </p>

          </div>
        </section>

      </div>
    </main>
  );
}