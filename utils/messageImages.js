export async function collectMessageImageUrls(message, max = 5) {
  const urls = [];
  const collect = (msg) => {
    for (const att of msg.attachments.values()) {
      if (att.contentType?.startsWith("image/") && urls.length < max) urls.push(att.url);
    }
  };

  collect(message);

  if (urls.length < max && message.reference?.messageId) {
    const ref = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
    if (ref) collect(ref);
  }

  return urls;
}

export function messageHasImages(message) {
  return [...message.attachments.values()].some((a) => a.contentType?.startsWith("image/"));
}
