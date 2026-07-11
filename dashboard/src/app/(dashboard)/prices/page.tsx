"use client";

import { useState } from "react";
import { Search, RotateCcw, Save } from "lucide-react";
import { Header } from "@/components/header";
import { useSnapshot, sendCommand } from "@/hooks/useSnapshot";

export default function PricesPage() {
  const { snapshot, refresh } = useSnapshot();
  const [filter, setFilter] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const catalog = snapshot?.prices?.catalog ?? [];
  const store = snapshot?.prices?.store ?? {};

  const filtered = catalog.filter(
    (p) =>
      p.label.toLowerCase().includes(filter.toLowerCase()) ||
      p.id.toLowerCase().includes(filter.toLowerCase())
  );

  async function save(partId: string) {
    const raw = edits[partId] ?? String(store[partId] ?? "");
    const price = Number(raw.replace(/\D/g, ""));
    if (!price) return;
    setBusy(true);
    try {
      await sendCommand("UPDATE_PRICE", { partId, price });
      setEdits((e) => {
        const n = { ...e };
        delete n[partId];
        return n;
      });
      setTimeout(refresh, 2000);
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    if (!confirm("Nulstil alle priser til katalog-defaults?")) return;
    setBusy(true);
    try {
      await sendCommand("RESET_PRICES", {});
      setTimeout(refresh, 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header title="JG-priser" subtitle="Live prisstyring · synkroniseret med bot" snapshot={snapshot} onRefresh={refresh} />

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-benny-muted" />
          <input
            className="input-field pl-10"
            placeholder="Søg dele..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <button type="button" className="btn-ghost" disabled={busy} onClick={resetAll}>
          <RotateCcw className="h-4 w-4" />
          Nulstil alle
        </button>
      </div>

      <div className="glass-panel max-h-[70vh] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-benny-card/95 backdrop-blur">
            <tr className="border-b border-benny-border/60">
              <th className="px-5 py-3 text-benny-muted">Del</th>
              <th className="px-5 py-3 text-benny-muted">Kategori</th>
              <th className="px-5 py-3 text-benny-muted">Pris (kr.)</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((part) => {
              const current = store[part.id] ?? 0;
              const val = edits[part.id] ?? String(current);
              return (
                <tr key={part.id} className="border-b border-benny-border/20 hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <p className="font-medium">{part.label}</p>
                    <p className="text-xs text-benny-muted">{part.id}</p>
                  </td>
                  <td className="px-5 py-3 text-benny-muted">{part.category}</td>
                  <td className="px-5 py-3">
                    <input
                      className="input-field w-28"
                      value={val}
                      onChange={(e) => setEdits((x) => ({ ...x, [part.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-5 py-3">
                    {edits[part.id] != null && edits[part.id] !== String(current) && (
                      <button type="button" className="btn-ghost text-xs" disabled={busy} onClick={() => save(part.id)}>
                        <Save className="h-3.5 w-3.5" />
                        Gem
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
