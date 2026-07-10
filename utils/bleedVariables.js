/** Bleed-kompatible variabler i beskeder og embeds */
export function applyBleedVariables(text, { member, guild, channel } = {}) {
  if (!text) return text;

  const user = member?.user;
  const displayName = member?.displayName ?? user?.username ?? "Bruger";

  return text
    .replace(/\{user\.mention\}/gi, member ? `<@${member.id}>` : "@Bruger")
    .replace(/\{user\.name\}/gi, displayName)
    .replace(/\{user\.tag\}/gi, user?.tag ?? "Bruger")
    .replace(/\{user\}/gi, displayName)
    .replace(/\{guild\.name\}/gi, guild?.name ?? "Server")
    .replace(/\{guild\.count\}/gi, String(guild?.memberCount ?? 0))
    .replace(/\{guild\}/gi, guild?.name ?? "Server")
    .replace(/\{channel\}/gi, channel ? `<#${channel.id}>` : "#kanal")
    .replace(/\{channel\.name\}/gi, channel?.name ?? "kanal")
    .replace(/\{mention\}/gi, member ? `<@${member.id}>` : "@Bruger")
    .replace(/\{server\}/gi, guild?.name ?? "Server")
    .replace(/\{membercount\}/gi, String(guild?.memberCount ?? 0))
    .replace(/\{tag\}/gi, user?.tag ?? "Bruger");
}

export function applyBleedVariablesToEmbed(embed, context) {
  const data = embed.data;
  if (data.title) embed.setTitle(applyBleedVariables(data.title, context));
  if (data.description) embed.setDescription(applyBleedVariables(data.description, context));
  if (data.fields?.length) {
    embed.setFields(
      data.fields.map((f) => ({
        ...f,
        name: applyBleedVariables(f.name, context),
        value: applyBleedVariables(f.value, context),
      }))
    );
  }
  if (data.footer?.text) {
    embed.setFooter({ ...data.footer, text: applyBleedVariables(data.footer.text, context) });
  }
  if (data.author?.name) {
    embed.setAuthor({
      ...data.author,
      name: applyBleedVariables(data.author.name, context),
    });
  }
  return embed;
}
