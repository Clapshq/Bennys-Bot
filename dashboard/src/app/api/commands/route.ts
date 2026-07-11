import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { queueCommand } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return NextResponse.json({ error: "Guild ikke konfigureret" }, { status: 500 });

  const body = await req.json();
  const { commandType, payload } = body;
  if (!commandType) return NextResponse.json({ error: "commandType kræves" }, { status: 400 });

  const cmd = await queueCommand({
    guildId,
    commandType,
    payload: payload ?? {},
    requestedById: session.id,
  });

  return NextResponse.json({ ok: true, id: cmd.id });
}
