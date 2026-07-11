"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  ClipboardList,
  DollarSign,
  Coins,
  Gift,
  Mail,
  Shield,
  Settings,
  LogOut,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/overview", label: "Oversigt", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/applications", label: "Ansøgninger", icon: ClipboardList },
  { href: "/prices", label: "JG-priser", icon: DollarSign },
  { href: "/payroll", label: "Løn", icon: Coins },
  { href: "/giveaways", label: "Giveaways", icon: Gift },
  { href: "/embeds", label: "Embeds", icon: Mail },
  { href: "/moderation", label: "Moderation", icon: Shield },
  { href: "/settings", label: "Indstillinger", icon: Settings },
];

export function Sidebar({ userName, userRoles }: { userName: string; userRoles: string[] }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-benny-border/60 bg-benny-panel/95 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 border-b border-benny-border/60 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-benny-gold to-benny-orange">
          <Wrench className="h-5 w-5 text-black" />
        </div>
        <div>
          <p className="font-display text-sm font-bold tracking-wide text-white">BENNY&apos;S</p>
          <p className="text-[10px] uppercase tracking-widest text-benny-muted">Command Center</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-gradient-to-r from-benny-gold/15 to-benny-orange/10 text-benny-gold"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-benny-gold")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-benny-border/60 p-4">
        <div className="mb-3 rounded-xl bg-benny-card/80 p-3">
          <p className="truncate text-sm font-medium text-white">{userName}</p>
          <p className="mt-0.5 truncate text-xs text-benny-muted">{userRoles.join(" · ")}</p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="btn-ghost w-full text-red-400/90 hover:text-red-400">
            <LogOut className="h-4 w-4" />
            Log ud
          </button>
        </form>
      </div>
    </aside>
  );
}
