import { rolesConfig } from "../config/roles.js";

export async function handleRoleSelect(interaction) {
  const selected = interaction.values;
  const optional = rolesConfig.roles.filter((r) => !r.assignOnJoin && !r.staff);

  for (const cfg of optional) {
    const role = interaction.guild.roles.cache.find((r) => r.name === cfg.name);
    if (!role) continue;

    if (selected.includes(cfg.name)) {
      if (!interaction.member.roles.cache.has(role.id)) await interaction.member.roles.add(role).catch(() => {});
    } else {
      if (interaction.member.roles.cache.has(role.id)) await interaction.member.roles.remove(role).catch(() => {});
    }
  }

  await interaction.reply({
    content: selected.length
      ? `✅ Roller opdateret: ${selected.map((s) => `\`${s}\``).join(", ")}`
      : "✅ Valgfrie roller fjernet.",
    ephemeral: true,
  });
}
