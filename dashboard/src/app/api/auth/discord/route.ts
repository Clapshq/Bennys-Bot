import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSession, staffRoleNames } from "@/lib/session";

const DISCORD_API = "https://discord.com/api/v10";

export async function GET(req: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !appUrl) {
    return NextResponse.json({ error: "Discord OAuth ikke konfigureret" }, { status: 500 });
  }

  const redirectUri = `${appUrl}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds.members.read",
  });

  return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
}
