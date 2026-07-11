import fs from "fs";
import { isLedelseMember } from "../utils/modHelpers.js";
import { createEmbed } from "../utils/brand.js";
import { LOGO_PATH, logoExists } from "../utils/assets.js";
import { getGuildPrefix } from "../utils/guildMessageStore.js";

const DESC_MAX = 400;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp)(\?|$)/i;

function ledelseOnlyReply(target, ephemeral = false) {
  const payload = { content: "❌ Kun **ledelse & ejere** (Stifter, Med-ejer, Ledelse) kan ændre bot-profilen.", ephemeral };
  return target.reply ? target.reply(payload) : target.editReply?.(payload);
}

export function isProfilCommand(command) {
  return command === "profil" || command === "botprofil";
}

function helpText(prefix = ",") {
  return (
    `**Bot-profil** (ledelse)\n\n` +
    `\`${prefix}profil avatar\` + vedhæft billede **eller** URL — profilbillede\n` +
    `\`${prefix}profil banner\` + vedhæft billede **eller** URL — banner\n` +
    `\`${prefix}profil beskrivelse <tekst>\` — "Om mig" på bot-profilen (max ${DESC_MAX} tegn)\n` +
    `\`${prefix}profil logo\` — nulstil profilbillede til standard Benny's-logo\n` +
    `\`${prefix}profil vis\` — vis nuværende profil\n\n` +
    `Slash: \`/botprofil\` med samme underkommandoer.`
  );
}

async function fetchImageBuffer({ attachmentUrl, url }) {
  const source = attachmentUrl ?? url;
  if (!source) return null;

  const res = await fetch(source);
  if (!res.ok) throw new Error("Kunne ikke hente billedet — tjek URL eller vedhæftning.");

  const type = res.headers.get("content-type") ?? "";
  if (type && !type.startsWith("image/")) {
    throw new Error("Filen skal være et billede (PNG, JPG, GIF eller WebP).");
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) throw new Error("Billedet er for stort (max 8 MB).");
  return buf;
}

function pickAttachment(source) {
  if (source.attachments?.size) {
    const att = source.attachments.find(
      (a) => a.contentType?.startsWith("image/") || IMAGE_EXT.test(a.url ?? a.proxyURL ?? "")
    );
    return att?.url ?? att?.proxyURL ?? null;
  }

  const file = source.options?.getAttachment?.("billede");
  if (file && (file.contentType?.startsWith("image/") || IMAGE_EXT.test(file.url ?? ""))) {
    return file.url ?? file.proxyURL ?? null;
  }

  return null;
}

function discordProfileError(err) {
  const msg = err?.message ?? String(err);
  if (/rate limit|too many/i.test(msg)) {
    return "Discord rate limit — vent ~1 time før du ændrer profilbillede/banner igen.";
  }
  if (/Invalid Form Body|BASE_TYPE_MAX_LENGTH|Invalid image/i.test(msg)) {
    return "Ugyldigt billede — brug PNG/JPG/GIF/WebP under 8 MB.";
  }
  return msg;
}

export async function buildProfileStatusEmbed(client) {
  await client.application.fetch().catch(() => {});
  const user = client.user;
  const desc = client.application?.description?.trim() || "*(ingen beskrivelse sat)*";

  const embed = createEmbed("accent")
    .setTitle("🤖 Bot-profil")
    .setDescription(desc.slice(0, 400))
    .addFields(
      { name: "Navn", value: user?.username ?? "—", inline: true },
      { name: "ID", value: user?.id ?? "—", inline: true }
    )
    .setThumbnail(user?.displayAvatarURL({ size: 256 }) ?? null);

  if (user?.bannerURL()) {
    embed.setImage(user.bannerURL({ size: 512 }));
  }

  return embed;
}

async function setAvatar(client, buffer) {
  await client.user.setAvatar(buffer);
}

async function setBanner(client, buffer) {
  await client.user.setBanner(buffer);
}

async function setDescription(client, text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Beskrivelsen må ikke være tom.");
  if (trimmed.length > DESC_MAX) {
    throw new Error(`Beskrivelsen er for lang (max ${DESC_MAX} tegn — du har ${trimmed.length}).`);
  }
  await client.application.edit({ description: trimmed });
}

async function resetLogo(client) {
  if (!logoExists()) {
    throw new Error("Standard-logo findes ikke i assets/logo.png på serveren.");
  }
  await client.user.setAvatar(fs.readFileSync(LOGO_PATH));
}

export async function runProfilAction(client, action, { buffer, description, prefix = "," }) {
  switch (action) {
    case "help":
      return { content: helpText(prefix) };
    case "vis":
      return { embeds: [await buildProfileStatusEmbed(client)] };
    case "avatar":
      if (!buffer) throw new Error("Vedhæft et billede eller angiv en billed-URL.");
      await setAvatar(client, buffer);
      return { content: "✅ Bot-profilbillede opdateret." };
    case "banner":
      if (!buffer) throw new Error("Vedhæft et billede eller angiv en billed-URL.");
      await setBanner(client, buffer);
      return { content: "✅ Bot-banner opdateret." };
    case "beskrivelse":
      await setDescription(client, description ?? "");
      return { content: "✅ Bot-beskrivelse opdateret." };
    case "logo":
      await resetLogo(client);
      return { content: "✅ Profilbillede nulstillet til Benny's-logo." };
    default:
      return { content: helpText(prefix) };
  }
}

export async function handleProfilPrefix(message, args) {
  if (!isLedelseMember(message.member)) {
    await message.reply("❌ Kun **ledelse & ejere** kan ændre bot-profilen.").catch(() => {});
    return true;
  }

  const prefix = getGuildPrefix(message.guild.id);
  const parts = args.trim().split(/\s+/);
  const sub = (parts[0] || "help").toLowerCase();
  const rest = args.slice(parts[0]?.length ?? 0).trim();

  try {
    const attachmentUrl = pickAttachment(message);
    const urlArg = rest.match(/^https?:\/\/\S+/i)?.[0];
    const buffer =
      sub === "avatar" || sub === "banner"
        ? await fetchImageBuffer({ attachmentUrl, url: urlArg })
        : null;

    const result = await runProfilAction(message.client, sub, {
      buffer,
      description: sub === "beskrivelse" ? rest : undefined,
      prefix,
    });

    await message.reply(result).catch(() => {});
  } catch (err) {
    await message.reply(`❌ ${discordProfileError(err)}`).catch(() => {});
  }

  return true;
}

export async function handleProfilSlash(interaction) {
  if (!isLedelseMember(interaction.member)) {
    await ledelseOnlyReply(interaction, true);
    return;
  }

  const sub = interaction.options.getSubcommand();

  try {
    await interaction.deferReply({ ephemeral: true });

    const attachmentUrl = pickAttachment(interaction);
    const urlArg = interaction.options.getString("url");
    const buffer =
      sub === "avatar" || sub === "banner"
        ? await fetchImageBuffer({ attachmentUrl, url: urlArg ?? undefined })
        : null;

    const result = await runProfilAction(interaction.client, sub, {
      buffer,
      description: interaction.options.getString("tekst") ?? undefined,
      prefix: ",",
    });

    await interaction.editReply(result);
  } catch (err) {
    const msg = discordProfileError(err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: `❌ ${msg}` }).catch(() => {});
    } else {
      await interaction.reply({ content: `❌ ${msg}`, ephemeral: true }).catch(() => {});
    }
  }
}
