import { lockThread, unlockThread } from "./threadHandler.js";

export async function handleThreadPrefix(message, lock, reason) {
  if (!message.channel.isThread()) {
    await message.reply("❌ `,tl` og `,tu` virker kun **inde i en tråd**.").catch(() => {});
    return true;
  }

  const thread = message.channel;
  const result = lock
    ? await lockThread(message.member, thread, reason || undefined)
    : await unlockThread(message.member, thread, reason || undefined);

  if (!result.ok) {
    await message.reply(`❌ ${result.error}`).catch(() => {});
    return true;
  }

  const icon = lock ? "🔒" : "🔓";
  const action = lock ? "låst" : "låst op";
  await message.reply(`${icon} **${thread.name}** er ${action}.`).catch(() => {});
  await message.delete().catch(() => {});
  return true;
}
