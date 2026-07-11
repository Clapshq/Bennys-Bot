import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "gold",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  accent?: "gold" | "orange" | "green" | "blue";
}) {
  const accents = {
    gold: "from-benny-gold/20 to-benny-gold/5 text-benny-gold",
    orange: "from-benny-orange/20 to-benny-orange/5 text-benny-orange",
    green: "from-emerald-500/20 to-emerald-500/5 text-emerald-400",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-400",
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-benny-muted">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-white">{value}</p>
          {trend && <p className="mt-1 text-xs text-benny-muted">{trend}</p>}
        </div>
        <div className={cn("rounded-xl bg-gradient-to-br p-2.5", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
