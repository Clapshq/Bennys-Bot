import { PermissionFlagsBits } from "discord.js";

/**
 * Ingen Discord default-permission på slash-kommandoer.
 * Botten tjekker Stifter / Med-ejer / Ledelse internt (isLedelseMember).
 */
export const LEDelse_COMMAND_PERMISSIONS = null;

/** Kun server-administratorer (typisk ejer) — fx /setup */
export const ADMIN_COMMAND_PERMISSIONS = PermissionFlagsBits.Administrator;

/** Staff-kommandoer med Discord-permissions (Mekaniker+ har disse via rolle) */
export const STAFF_MOD_PERMISSIONS =
  PermissionFlagsBits.ModerateMembers | PermissionFlagsBits.KickMembers;

export const STAFF_TICKET_PERMISSIONS = PermissionFlagsBits.ManageChannels;

export const STAFF_PURGE_PERMISSIONS = PermissionFlagsBits.ManageMessages;

export const STAFF_THREAD_PERMISSIONS = PermissionFlagsBits.ManageThreads;
