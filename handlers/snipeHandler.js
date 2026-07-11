const snipeCache = new Map();
const recentMessages = new Map();

export function trackMessage(message) {
  if (!message.guild || message.author.bot) return;
  if (!message.content && message.attachments.size === 0) return;

  recentMessages.set(message.channel.id, {
    content: message.content,
    authorTag: message.author.tag,
    authorId: message.author.id,
    attachmentUrl: message.attachments.first()?.url ?? null,
    createdAt: message.createdTimestamp,
  });
}

export function cacheDeletedMessage(message) {
  if (!message.guild) return;

  const tracked = recentMessages.get(message.channel.id);
  if (tracked) {
    snipeCache.set(message.channel.id, { ...tracked, deletedAt: Date.now() });
    return;
  }

  if (message.author && !message.author.bot) {
    snipeCache.set(message.channel.id, {
      content: message.content ?? "",
      authorTag: message.author.tag,
      authorId: message.author.id,
      attachmentUrl: message.attachments?.first?.()?.url ?? null,
      createdAt: message.createdTimestamp ?? Date.now(),
      deletedAt: Date.now(),
    });
  }
}

export function getSnipe(channelId) {
  return snipeCache.get(channelId) ?? null;
}
