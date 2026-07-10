import fs from "fs";
import { brand } from "../config/brand.js";
import { LOGO_PATH, logoExists } from "../utils/assets.js";

export async function configureBotIdentity(client) {
  try {
    if (client.user.username !== brand.name) {
      await client.user.setUsername(brand.name);
      console.log(`Bot-navn sat til: ${brand.name}`);
    }
  } catch {
    console.warn("Kunne ikke ændre bot-navn — sæt det manuelt i Developer Portal.");
  }

  if (logoExists()) {
    try {
      await client.user.setAvatar(fs.readFileSync(LOGO_PATH));
      console.log("Bot-avatar opdateret med Benny's logo.");
    } catch (err) {
      console.warn("Kunne ikke sætte avatar:", err.message);
    }
  }

  client.user.setPresence({
    activities: [{ name: "Postal 102 · Benny's", type: 3 }],
    status: "online",
  });
}
