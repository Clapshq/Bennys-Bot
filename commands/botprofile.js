import { SlashCommandBuilder } from "discord.js";
import { handleProfilSlash } from "../handlers/botProfileHandler.js";

export const botProfilCommand = {
  data: new SlashCommandBuilder()
    .setName("botprofil")
    .setDescription("Ændr botens profilbillede, banner og beskrivelse (ledelse)")
    .addSubcommand((sc) =>
      sc
        .setName("avatar")
        .setDescription("Skift bot-profilbillede")
        .addAttachmentOption((opt) =>
          opt.setName("billede").setDescription("Nyt profilbillede").setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("url").setDescription("Eller billed-URL").setRequired(false)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("banner")
        .setDescription("Skift bot-banner")
        .addAttachmentOption((opt) =>
          opt.setName("billede").setDescription("Nyt banner").setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("url").setDescription("Eller billed-URL").setRequired(false)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("beskrivelse")
        .setDescription("Skift bot-beskrivelse (Om mig)")
        .addStringOption((opt) =>
          opt.setName("tekst").setDescription("Ny beskrivelse (max 400 tegn)").setRequired(true)
        )
    )
    .addSubcommand((sc) => sc.setName("logo").setDescription("Nulstil profilbillede til standard Benny's-logo"))
    .addSubcommand((sc) => sc.setName("vis").setDescription("Vis nuværende bot-profil")),

  async execute(interaction) {
    await handleProfilSlash(interaction);
  },
};
