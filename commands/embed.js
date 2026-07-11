import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { handleEmbedCommand } from "../handlers/embedHandler.js";

export const embedCommand = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Gem og administrér embeds")
    .addSubcommand((sub) => sub.setName("help").setDescription("Vis embed-kommandoer"))
    .addSubcommand((sub) =>
      sub
        .setName("preview")
        .setDescription("Forhåndsvis en gemt embed")
        .addStringOption((opt) =>
          opt.setName("navn").setDescription("Navnet på embeden").setRequired(true).setAutocomplete(true)
        )
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("List alle gemte embeds"))
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Opret en ny gemt embed")
        .addStringOption((opt) =>
          opt.setName("navn").setDescription("Unikt navn (fx velkommen)").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("copy")
        .setDescription("Kopiér embed fra en besked")
        .addStringOption((opt) =>
          opt.setName("messagelink").setDescription("Link til Discord-beskeden").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Slet en gemt embed")
        .addStringOption((opt) =>
          opt.setName("navn").setDescription("Navnet på embeden").setRequired(true).setAutocomplete(true)
        )
    ),

  async execute(interaction) {
    return handleEmbedCommand(interaction);
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "navn") return interaction.respond([]);

    const { listEmbeds } = await import("../utils/embedStore.js");
    const items = listEmbeds(interaction.guild.id);
    const query = focused.value.toLowerCase();

    const choices = items
      .filter((e) => e.name.includes(query))
      .slice(0, 25)
      .map((e) => ({ name: e.name, value: e.name }));

    return interaction.respond(choices);
  },
};
