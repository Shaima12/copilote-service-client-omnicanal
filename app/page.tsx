import Link from "next/link";
import {
  ArrowRight,
  Check,
  Inbox,
  MessageCircle,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f5] text-[#14231f]">
      <div className="relative isolate">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] opacity-80"
          style={{
            backgroundImage:
              "radial-gradient(circle at 78% 18%, rgba(216, 234, 220, 0.95), transparent 32%), radial-gradient(circle at 8% 20%, rgba(246, 224, 189, 0.7), transparent 24%)",
          }}
        />

        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#14231f] text-sm font-bold text-[#f6c96e] shadow-sm">
              C
            </span>
            <span className="text-lg font-bold tracking-[-0.04em]">
              Customer Support Agent
            </span>
          </Link>

          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link
              href="/login"
              className="hidden px-3 py-2 text-[#42514b] transition hover:text-[#14231f] sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#14231f] px-4 py-2.5 text-white shadow-[0_8px_20px_rgba(20,35,31,0.16)] transition hover:-translate-y-0.5 hover:bg-[#263a33]"
            >
              Get started
            </Link>
          </div>
        </nav>

        <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-12 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:pb-28 lg:pt-20">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cbdccf] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#52705d] shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e5a629]" />
              Customer care, with clarity
            </div>

            <h1 className="max-w-2xl text-5xl font-bold leading-[0.98] tracking-[-0.065em] text-[#14231f] sm:text-6xl lg:text-[76px]">
              Support that feels beautifully human.
            </h1>

            <p className="mt-7 max-w-lg text-base leading-7 text-[#5d6c65] sm:text-lg">
              Customer Support Agent brings every customer conversation into focus, helping your team respond faster, stay thoughtful, and never lose the thread.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#e5a629] px-5 py-3.5 text-sm font-bold text-[#14231f] shadow-[0_10px_24px_rgba(229,166,41,0.22)] transition hover:-translate-y-0.5 hover:bg-[#f0b63c]"
              >
                Start with Customer Support Agent
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-[#cfd8d2] bg-white/60 px-5 py-3.5 text-sm font-bold text-[#263a33] transition hover:border-[#9eafa5] hover:bg-white"
              >
                Sign in to workspace
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#718078]">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-[#71977b]" /> Omnichannel inbox</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-[#71977b]" /> AI-assisted replies</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-[#71977b]" /> Human control</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl lg:pt-8">
            <div className="absolute -inset-6 -z-10 rounded-[40px] bg-[#dcebdd]/60 blur-2xl" />
            <div className="overflow-hidden rounded-[22px] border border-[#d9e1dc] bg-white shadow-[0_28px_70px_rgba(38,64,52,0.16)]">
              <div className="flex items-center justify-between border-b border-[#edf0ed] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#14231f] text-xs font-bold text-[#f6c96e]">Z</div>
                  <div>
                    <p className="text-xs font-bold">Customer inbox</p>
                    <p className="text-[10px] text-[#8a9890]">Tuesday, 09:41</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#edf6ee] px-2.5 py-1 text-[10px] font-bold text-[#608269]">4 open</span>
              </div>

              <div className="grid md:grid-cols-[0.82fr_1.18fr]">
                <div className="border-b border-[#edf0ed] bg-[#fafcf9] p-4 md:border-b-0 md:border-r">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a9890]">Inbox</p>
                    <Inbox size={14} className="text-[#9baa9f]" />
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-xl border-l-2 border-[#e5a629] bg-white p-3 shadow-sm">
                      <div className="flex justify-between gap-2"><p className="text-[11px] font-bold">Loli</p><span className="text-[9px] font-bold text-[#c28a16]">MEDIUM</span></div>
                      <p className="mt-1 truncate text-[10px] text-[#66756d]">My order has not arrived yet...</p>
                      <p className="mt-2 text-[9px] text-[#9aa69f]">Delivery · 12m</p>
                    </div>
                    <div className="rounded-xl border border-[#edf0ed] bg-white p-3">
                      <p className="text-[11px] font-bold">Sarah D.</p>
                      <p className="mt-1 truncate text-[10px] text-[#66756d]">Can I change my address?</p>
                      <p className="mt-2 text-[9px] text-[#9aa69f]">General · 26m</p>
                    </div>
                    <div className="rounded-xl border border-[#edf0ed] bg-white p-3">
                      <p className="text-[11px] font-bold">Marc T.</p>
                      <p className="mt-1 truncate text-[10px] text-[#66756d]">Question about my refund</p>
                      <p className="mt-2 text-[9px] text-[#9aa69f]">Billing · 41m</p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-bold">Loli</p><p className="text-[10px] text-[#8a9890]">Delivery · Customer message</p></div>
                    <MessageCircle size={16} className="text-[#9baa9f]" />
                  </div>
                  <div className="mt-6 rounded-2xl rounded-tl-sm bg-[#f0f3f0] p-4 text-xs leading-5 text-[#46564e]">
                    Bonjour, ma commande devait être livrée hier mais je ne l&apos;ai toujours pas reçue.
                  </div>
                  <div className="mt-5 rounded-2xl border border-[#dcebdd] bg-[#f8fbf7] p-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#608269]"><Sparkles size={13} /> AI-assisted response</div>
                    <p className="mt-2 text-xs leading-5 text-[#52645a]">Bonjour Loli, nous sommes désolés pour ce retard. Je vérifie le suivi de votre commande et reviens vers vous rapidement.</p>
                    <div className="mt-4 flex items-center justify-between"><span className="text-[9px] font-semibold text-[#93a198]">Ready for review</span><span className="rounded-full bg-[#e5a629] px-2.5 py-1 text-[9px] font-bold text-[#14231f]">Send reply</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-[#dce7de] bg-white px-4 py-3 shadow-[0_14px_32px_rgba(38,64,52,0.12)] sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf6ee] text-[#71977b]"><Zap size={15} /></div>
              <div><p className="text-[10px] font-bold">Response time improved</p><p className="text-xs font-bold text-[#71977b]">+32% this week</p></div>
            </div>
          </div>
        </section>

        <section className="border-t border-[#e4eae5] bg-white/45">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:grid-cols-3 lg:px-8">
            <div className="flex gap-3"><Star size={18} className="mt-0.5 shrink-0 text-[#e5a629]" /><div><p className="text-sm font-bold">Every channel, one calm view</p><p className="mt-1 text-xs leading-5 text-[#718078]">Bring email, chat, and social conversations together.</p></div></div>
            <div className="flex gap-3"><Sparkles size={18} className="mt-0.5 shrink-0 text-[#71977b]" /><div><p className="text-sm font-bold">AI that stays in your hands</p><p className="mt-1 text-xs leading-5 text-[#718078]">Draft thoughtful replies your team can review and shape.</p></div></div>
            <div className="flex gap-3"><MessageCircle size={18} className="mt-0.5 shrink-0 text-[#8b7a62]" /><div><p className="text-sm font-bold">A better customer feeling</p><p className="mt-1 text-xs leading-5 text-[#718078]">Make every interaction more personal, clear, and useful.</p></div></div>
          </div>
        </section>
      </div>
    </main>
  );
}