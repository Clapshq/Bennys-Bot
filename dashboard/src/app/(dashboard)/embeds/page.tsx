"use client";

import { useState } from "react";
import { Send, Palette } from "lucide-react";
import { Header } from "@/components/header";
import { useSnapshot, sendCommand } from "@/hooks/useSnapshot";

export default function EmbedsPage() {
  const { snapshot, refresh } = useSnapshot();
  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const channels = (snapshot?.channels ?? []).slice(0, 100);

  async function send() {
    if (!channelId) return;
    setBusy(true);
    setOk(false);
    try {
      await sendCommand("SEND_EMBED", {
        channelId,
        content: content || undefined,
        embed: { title: title || undefined, description: description || undefined, color: 0xf1c40f },
      });
      setOk(true);
      setTitle("");
      setDescription("");
      setContent("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header title="Embeds" subtitle="Byg og send beskeder til Discord" snapshot={snapshot} onRefresh={refresh} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-display font-semibold">
            <Palette className="h-4 w-4 text-benny-gold" />
            Builder
          </h2>
          <select className="input-field" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
            <option value="">Vælg kanal...</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </select>
          <input className="input-field" placeholder="Tekst over embed (valgfrit)" value={content} onChange={(e) => setContent(e.target.value)} />
          <input className="input-field" placeholder="Embed titel" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className="input-field min-h-[120px] resize-y"
            placeholder="Embed beskrivelse"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button type="button" className="btn-primary" disabled={busy || !channelId} onClick={send}>
            <Send className="h-4 w-4" />
            Send
          </button>
          {ok && <p className="text-sm text-emerald-400">Besked sendt til bot-kø!</p>}
        </div>

        <div className="glass-panel p-6">
          <h2 className="mb-4 font-display font-semibold">Preview</h2>
          <div className="rounded-xl border-l-4 border-benny-gold bg-[#2b2d31] p-4">
            {title && <p className="font-semibold text-white">{title}</p>}
            {description && <p className="mt-2 whitespace-pre-wrap text-sm text-[#dbdee1]">{description}</p>}
            {!title && !description && <p className="text-sm text-benny-muted">Udfyld felter for preview</p>}
            <p className="mt-4 text-xs text-[#949ba4]">Benny&apos;s · Original Motor Works</p>
          </div>
        </div>
      </div>
    </>
  );
}
