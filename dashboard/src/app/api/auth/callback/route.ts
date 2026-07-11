import { NextResponse } from "next/server";
import { createSession, staffRoleNames } from "@/lib/session";

const DISCORD_API = "https://discord.com/api/v10";

export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!appUrl || !clientId || !clientSecret || !guildId) {
    return NextResponse.redirect(`${appUrl}/login?error=config`);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${appUrl}/login?error=no_code`);

  const redirectUri = `${appUrl}/api/auth/callback`;

  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(`${appUrl}/login?error=token`);

  const token = await tokenRes.json();
  const userRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!userRes.ok) return NextResponse.redirect(`${appUrl}/login?error=user`);

  const user = await userRes.json();

  const memberRes = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });

  if (!memberRes.ok) return NextResponse.redirect(`${appUrl}/login?error=not_member`);

  const member = await memberRes.json();
  const rolesRes = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });

  let roleNames: string[] = [];
  if (rolesRes.ok) {
    const allRoles: Array<{ id: string; name: string }> = await rolesRes.json();
    const allowed = new Set(staffRoleNames());
    roleNames = allRoles
      .filter((r) => member.roles?.includes(r.id) && allowed.has(r.name))
      .map((r) => r.name);
  }

  if (!roleNames.length) return NextResponse.redirect(`${appUrl}/login?error=no_role`);

  await createSession({
    id: user.id,
    username: user.username,
    globalName: user.global_name ?? null,
    avatar: user.avatar,
    roles: roleNames,
  });

  return NextResponse.redirect(`${appUrl}/overview`);
}
