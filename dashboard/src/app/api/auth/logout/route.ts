import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function POST() {
  await clearSession();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "/";
  return NextResponse.redirect(appUrl);
}
