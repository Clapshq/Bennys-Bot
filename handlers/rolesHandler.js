import { PermissionFlagsBits } from "discord.js";
import { rolesConfig, getHierarchyOrder } from "../config/roles.js";

export async function setupRoles(guild, onProgress) {
  const roles = {};
  const results = { created: 0, migrated: 0, assigned: 0 };

  onProgress?.("Opretter roller...");

  for (const cfg of rolesConfig.roles) {
    const role = await ensureRole(guild, cfg, results);
    roles[cfg.name] = role;
  }

  onProgress?.("Sorterer rolle-hierarki...");
  await orderRoleHierarchy(guild, roles);

  onProgress?.("Tildeler Kunde-rolle...");
  results.assigned = await assignDefaultRoleToMembers(guild, roles);

  return { roles, results };
}

async function ensureRole(guild, cfg, results) {
  const permissions = cfg.permissions ?? [];

  let role = guild.roles.cache.find((r) => r.name === cfg.name);

  if (!role) {
    const legacyName = Object.entries(rolesConfig.legacyNames).find(([, target]) => target === cfg.name)?.[0];
    const legacyRole = legacyName ? guild.roles.cache.find((r) => r.name === legacyName) : null;

    if (legacyRole) {
      await legacyRole.edit({
        name: cfg.name,
        colors: { primaryColor: cfg.color },
        hoist: cfg.hoist ?? false,
        mentionable: cfg.mentionable ?? false,
        permissions,
        reason: "Benny's one-time setup — migreret rolle",
      });
      role = legacyRole;
      results.migrated++;
    } else {
      role = await guild.roles.create({
        name: cfg.name,
        colors: { primaryColor: cfg.color },
        hoist: cfg.hoist ?? false,
        mentionable: cfg.mentionable ?? false,
        permissions,
        reason: "Benny's one-time setup",
      });
      results.created++;
    }
  } else {
    await role.edit({
      colors: { primaryColor: cfg.color },
      hoist: cfg.hoist ?? false,
      mentionable: cfg.mentionable ?? false,
      permissions,
      reason: "Benny's one-time setup — opdateret rolle",
    });
  }

  return role;
}

async function orderRoleHierarchy(guild, roles) {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return;

  const botTop = me.roles.highest.position;
  if (botTop <= 1) return;

  const order = getHierarchyOrder();

  for (let i = 0; i < order.length; i++) {
    const role = roles[order[i]];
    if (!role || role.position >= botTop) continue;

    const position = Math.max(1, botTop - 1 - i);
    if (role.position !== position) {
      await role.setPosition(position).catch(() => {});
      await sleep(300);
    }
  }
}

async function assignDefaultRoleToMembers(guild, roles) {
  const kundeRole = roles[rolesConfig.defaultJoin];
  if (!kundeRole) return 0;

  const staffNames = rolesConfig.roles.filter((r) => r.staff).map((r) => r.name);
  let assigned = 0;

  // Brug kun cache — undgår hang uden Server Members Intent
  const members = guild.members.cache;

  for (const member of members.values()) {
    if (member.user.bot) continue;
    if (member.roles.cache.some((r) => staffNames.includes(r.name))) continue;
    if (member.roles.cache.has(kundeRole.id)) continue;

    const ok = await member.roles.add(kundeRole, "Benny's setup — Kunde").catch(() => false);
    if (ok !== false) assigned++;
  }

  return assigned;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
