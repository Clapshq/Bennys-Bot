import { createClient } from "@supabase/supabase-js";
import type { BotSnapshot } from "./types";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Mangler miljøvariabel: ${name}`);
  return v;
}

export function getSupabase() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

export async function fetchSnapshot(guildId: string): Promise<BotSnapshot | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("bot_snapshots")
    .select("data, updated_at")
    .eq("guild_id", guildId)
    .maybeSingle();

  if (error || !data) return null;
  return data.data as BotSnapshot;
}

export async function queueCommand(input: {
  guildId: string;
  commandType: string;
  payload: Record<string, unknown>;
  requestedById: string;
}) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("bot_commands")
    .insert({
      guild_id: input.guildId,
      command_type: input.commandType,
      payload: input.payload,
      status: "pending",
      requested_by_id: input.requestedById,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchPayrollLogs(guildId: string, limit = 50) {
  const sb = getSupabase();
  const { data } = await sb
    .from("payroll_logs")
    .select("*")
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
