import { PermissionFlagsBits, ChannelType } from "discord.js";
import { isStaffMember } from "../utils/modHelpers.js";

export const THREAD_CHANNEL_TYPES = [
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
];

export function canManageThreads(member) {
  return (
    member.permissions.has(PermissionFlagsBits.ManageThreads) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

export function canManageThreadAction(member) {
  return canManageThreads(member) || isStaffMember(member);
}

export async function lockThread(member, thread, reason) {
  if (!canManageThreadAction(member)) {
    return { ok: false, error: "Du mangler **Manage Threads** eller staff." };
  }

  if (!thread?.isThread?.()) {
    return { ok: false, error: "Dette er ikke en tråd." };
  }

  if (thread.locked) {
    return { ok: false, error: "Tråden er allerede låst." };
  }

  await thread.setLocked(true, reason ?? "Tråd låst");
  return { ok: true, thread };
}

export async function unlockThread(member, thread, reason) {
  if (!canManageThreadAction(member)) {
    return { ok: false, error: "Du mangler **Manage Threads** eller staff." };
  }

  if (!thread?.isThread?.()) {
    return { ok: false, error: "Dette er ikke en tråd." };
  }

  if (!thread.locked && !thread.archived) {
    return { ok: false, error: "Tråden er allerede låst op." };
  }

  if (thread.archived) {
    await thread.setArchived(false, reason ?? "Tråd genåbnet").catch(() => {});
  }

  if (thread.locked) {
    await thread.setLocked(false, reason ?? "Tråd låst op");
  }

  return { ok: true, thread };
}

export async function addMemberToThread(member, thread, targetMember) {
  if (!canManageThreadAction(member)) {
    return { ok: false, error: "Du mangler **Manage Threads** eller staff." };
  }

  if (!thread?.isThread?.()) {
    return { ok: false, error: "Vælg en gyldig tråd eller forum-post." };
  }

  if (targetMember.user.bot) {
    return { ok: false, error: "Bots kan ikke tilføjes på denne måde." };
  }

  await thread.members.add(targetMember.id);
  return { ok: true, thread, member: targetMember };
}
