import { ActivityType } from "discord.js";

export const brand = {
  name: "Benny's Original Motor Works",
  shortName: "BENNY'S",
  tagline: "Original Motor Works",
  logoFile: "bennys-logo.png",

  colors: {
    primary: 0xffffff,
    dark: 0x1a1a1a,
    discord: 0x2b2d31,
    accent: 0xe67e22,
    success: 0x57f287,
    warning: 0xfee75c,
    error: 0xed4245,
    gold: 0xf1c40f,
    blue: 0x5865f2,
  },

  divider: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  bolt: "⬡",

  activities: [
    { name: "Strawberry værkstedet", type: ActivityType.Watching },
    { name: "over kundernes biler", type: ActivityType.Watching },
    { name: "kundeservice i top", type: ActivityType.Watching },
    { name: "biltræf & mekaniker-RP", type: ActivityType.Watching },
    { name: "Benny's Original Motor Works", type: ActivityType.Playing },
  ],
};
