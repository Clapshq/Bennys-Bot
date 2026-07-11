import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  Ticket,
  ClipboardList,
  DollarSign,
  Coins,
  Gift,
  Mail,
  Shield,
  ArrowRight,
  Wrench,
} from "lucide-react";

const features = [
  { icon: Ticket, title: "Tickets", desc: "Luk, transcripts & ratings" },
  { icon: ClipboardList, title: "Ansøgninger", desc: "Godkend mekanikere" },
  { icon: DollarSign, title: "JG-priser", desc: "Live prisstyring" },
  { icon: Coins, title: "Løn", desc: "Faktura → 20% udbetaling" },
  { icon: Gift, title: "Giveaways", desc: "Opret & afslut events" },
  { icon: Mail, title: "Embeds", desc: "Byg & send beskeder" },
];

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/overview");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[length:48px_48px] opacity-50" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-16">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-benny-gold to-benny-orange shadow-glow">
              <Wrench className="h-6 w-6 text-black" />
            </div>
            <div>
              <p className="font-display text-lg font-bold">BENNY&apos;S</p>
              <p className="text-xs text-benny-muted">Original Motor Works</p>
            </div>
          </div>
          <Link href="/login" className="btn-primary">
            Log ind
            <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <section className="my-20 flex flex-1 flex-col items-center justify-center text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-benny-gold">Staff Panel</p>
          <h1 className="max-w-3xl font-display text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            Command Center
          </h1>
          <p className="mt-6 max-w-xl text-lg text-benny-muted">
            Avanceret staff-panel til at styre tickets, priser, løn, ansøgninger og hele Discord-botten — ét sted.
          </p>
          <Link href="/login" className="btn-primary mt-10 px-8 py-3 text-base">
            Fortsæt med Discord
          </Link>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="glass-card p-5">
                <Icon className="mb-3 h-6 w-6 text-benny-gold" />
                <h3 className="font-semibold text-white">{f.title}</h3>
                <p className="mt-1 text-sm text-benny-muted">{f.desc}</p>
              </div>
            );
          })}
        </section>

        <footer className="mt-16 border-t border-benny-border/40 pt-8 text-center text-sm text-benny-muted">
          Benny&apos;s Original Motor Works · Strawberry værkstedet
        </footer>
      </div>
    </div>
  );
}
