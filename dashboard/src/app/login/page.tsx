import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Wrench, Shield, Zap, ArrowRight } from "lucide-react";

const errors: Record<string, string> = {
  config: "Dashboard er ikke konfigureret korrekt.",
  no_code: "Discord-login blev afbrudt.",
  token: "Kunne ikke hente Discord-token.",
  user: "Kunne ikke hente bruger.",
  not_member: "Du er ikke medlem af serveren.",
  no_role: "Du har ikke en staff-rolle (Mekaniker, Lærling, Ledelse osv.).",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/overview");

  const params = await searchParams;
  const errorMsg = params.error ? errors[params.error] ?? "Login fejlede." : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-benny-gold to-benny-orange shadow-glow">
            <Wrench className="h-7 w-7 text-black" />
          </div>
          <h1 className="font-display text-2xl font-bold">Log ind</h1>
          <p className="mt-2 text-sm text-benny-muted">
            Staff-adgang via Discord OAuth. Kun Mekaniker, Lærling og Ledelse.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        <Link href="/api/auth/discord" className="btn-primary w-full py-3 text-base">
          Fortsæt med Discord
          <ArrowRight className="h-4 w-4" />
        </Link>

        <ul className="mt-8 space-y-3 text-sm text-benny-muted">
          <li className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            Sikker JWT-session (7 dage)
          </li>
          <li className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            Rolle-baseret adgang
          </li>
          <li className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-benny-gold" />
            Real-time bot-sync via Supabase
          </li>
        </ul>
      </div>
    </div>
  );
}
