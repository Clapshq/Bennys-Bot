export type PayrollEmployee = {
  userId: string;
  userTag: string | null;
  channelId: string | null;
  channelName: string | null;
  pendingPay: number;
  totalEarned: number;
  totalPaid: number;
  invoiceCount?: number;
  lastPayout?: { amount: number; paidByTag?: string; date: string } | null;
};

export type BotSnapshot = {
  bot?: { tag: string; id: string; online: boolean; guilds: number };
  guild?: { id: string; name: string; memberCount: number; icon: string | null };
  stats?: {
    openTickets: number;
    closedTickets: number;
    pendingApplications: number;
    activeGiveaways: number;
    modCases: number;
  };
  openTickets?: Array<Record<string, unknown>>;
  closedTickets?: Array<Record<string, unknown>>;
  applications?: Array<Record<string, unknown>>;
  giveaways?: Array<Record<string, unknown>>;
  payroll?: PayrollEmployee[];
  prices?: {
    store: Record<string, number>;
    catalog: Array<{ id: string; label: string; category: string }>;
  };
  transcripts?: Array<Record<string, unknown>>;
  channels?: Array<{ id: string; name: string; parent: string | null }>;
  modCases?: Array<Record<string, unknown>>;
  blockedWords?: string[];
  roles?: Array<{ id: string; name: string; color: string }>;
  env?: { moderation: boolean; security: boolean; aiConfigured: boolean; payrollAutoScan: boolean };
};

export type SessionUser = {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  roles: string[];
};

export function displayNameFromChannel(channelName: string | null | undefined) {
  if (!channelName) return "Ukendt";
  const slug = channelName
    .replace(/^💰-?/i, "")
    .replace(/^løn-/i, "")
    .replace(/^lon-/i, "");
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatKr(amount: number) {
  return `${Math.round(amount).toLocaleString("da-DK")} kr.`;
}
