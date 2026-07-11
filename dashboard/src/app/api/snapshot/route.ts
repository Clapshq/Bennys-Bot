import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchSnapshot } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return NextResponse.json({ error: "Guild ikke konfigureret" }, { status: 500 });

  const snapshot = await fetchSnapshot(guildId);
  return NextResponse.json({ snapshot, user: session });
}
