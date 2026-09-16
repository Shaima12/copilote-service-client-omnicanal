"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("client");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          role: role,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Account created successfully. You can now sign in.");

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#14231f]">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#14231f] p-10 text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
          <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-[#e5a629]/20 blur-3xl" />
          <div className="relative">
            <Link href="/" className="flex items-center gap-2.5 text-lg font-bold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6c96e] text-sm text-[#14231f]">Z</span>
              ZEN
            </Link>
            <div className="mt-28 max-w-md">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f6c96e]">Start clearly</p>
              <h2 className="mt-5 text-5xl font-bold leading-[1.02] tracking-[-0.06em]">A calmer way to care for customers.</h2>
              <p className="mt-6 text-base leading-7 text-[#b8c9be]">Create your ZEN workspace and give every conversation the attention it deserves.</p>
            </div>
          </div>
          <div className="relative grid gap-3 text-sm text-[#b8c9be]"><span className="flex items-center gap-3"><Check size={16} className="text-[#f6c96e]" /> One view for every channel</span><span className="flex items-center gap-3"><Check size={16} className="text-[#f6c96e]" /> AI drafts, human decisions</span></div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-lg">
            <Link href="/" className="mb-10 flex items-center gap-2.5 text-lg font-bold lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#14231f] text-sm text-[#f6c96e]">Z</span>
              ZEN
            </Link>
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#71977b]">Create workspace</p>
              <h1 className="mt-3 text-4xl font-bold tracking-[-0.055em]">Make room for better support.</h1>
              <p className="mt-3 text-sm leading-6 text-[#718078]">Set up your ZEN account and bring your team into focus.</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="fullName" className="mb-2 block text-xs font-bold text-[#42514b]">Full name</label><input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required className="w-full rounded-xl border border-[#d5ded7] bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-[#a1ada5] focus:border-[#71977b] focus:ring-4 focus:ring-[#dcebdd]" /></div>
                <div><label htmlFor="phone" className="mb-2 block text-xs font-bold text-[#42514b]">Phone number</label><input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" required className="w-full rounded-xl border border-[#d5ded7] bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-[#a1ada5] focus:border-[#71977b] focus:ring-4 focus:ring-[#dcebdd]" /></div>
              </div>
              <div><label htmlFor="email" className="mb-2 block text-xs font-bold text-[#42514b]">Email address</label><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full rounded-xl border border-[#d5ded7] bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-[#a1ada5] focus:border-[#71977b] focus:ring-4 focus:ring-[#dcebdd]" /></div>
              <div><label htmlFor="password" className="mb-2 block text-xs font-bold text-[#42514b]">Password</label><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} className="w-full rounded-xl border border-[#d5ded7] bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-[#a1ada5] focus:border-[#71977b] focus:ring-4 focus:ring-[#dcebdd]" /></div>
              <div><label htmlFor="role" className="mb-2 block text-xs font-bold text-[#42514b]">Account type</label><select id="role" value={role} onChange={(e) => setRole(e.target.value)} required className="w-full rounded-xl border border-[#d5ded7] bg-white px-4 py-3.5 text-sm outline-none transition focus:border-[#71977b] focus:ring-4 focus:ring-[#dcebdd]"><option value="client">Client</option><option value="agent">Agent</option><option value="supervisor">Supervisor</option></select><p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#8a9890]"><Sparkles size={12} className="text-[#71977b]" /> Choose the role you will use in ZEN.</p></div>
              <button type="submit" disabled={loading} className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#14231f] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#263a33] disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Creating account..." : "Create account"}<ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></button>
            </form>

            {message && <div className="mt-5 rounded-xl border border-[#dce7de] bg-[#edf6ee] p-4 text-sm text-[#52705d]">{message}</div>}
            <p className="mt-7 text-center text-sm text-[#718078]">Already have an account? <Link href="/login" className="font-bold text-[#52705d] hover:text-[#14231f]">Sign in</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
