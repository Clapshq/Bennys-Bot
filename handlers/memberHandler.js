import { rolesConfig } from "../config/roles.js";

import { handlePotentialRaid, applyRaidKick, isLockdownActive } from "../security/antiRaid.js";

import { createLogger } from "../core/logger.js";

import { env } from "../core/env.js";

import { dispatchSystemMessages } from "./welcomeHandler.js";



const log = createLogger("member");



export async function handleMemberJoin(member) {

  if (member.user.bot) return;



  if (env.security && env.memberIntent) {

    const raid = await handlePotentialRaid(member);



    if (raid.action === "lockdown" || raid.action === "lockdown_active") {

      if (raid.accountIssue || raid.action === "lockdown_active") {

        const kicked = await applyRaidKick(member, `[Anti-Raid] ${raid.accountIssue ?? "Lockdown aktiv"}`);

        if (kicked) log.warn("Raid kick", { user: member.user.tag });

        return;

      }

    }



    if (raid.action === "young_account" && raid.accountIssue) {

      await applyRaidKick(member, `[Anti-Raid] ${raid.accountIssue}`).catch(() => {});

      return;

    }

  }



  const kundeRole = member.guild.roles.cache.find((r) => r.name === rolesConfig.defaultJoin);

  const staffNames = rolesConfig.roles.filter((r) => r.staff).map((r) => r.name);

  const isStaff = member.roles.cache.some((r) => staffNames.includes(r.name));



  if (kundeRole && !isStaff) {

    await member.roles.add(kundeRole, "Benny's — auto Kunde-rolle ved join").catch(() => {});

  }



  await dispatchSystemMessages(member.guild.id, "welcome", member).catch(() => {});

}



export async function handleMemberLeave(member) {

  if (member.user.bot) return;

  await dispatchSystemMessages(member.guild.id, "goodbye", member).catch(() => {});

}



export async function handleMemberBoost(oldMember, newMember) {

  if (newMember.user.bot) return;

  if (!oldMember.premiumSince && newMember.premiumSince) {

    await dispatchSystemMessages(newMember.guild.id, "boost", newMember).catch(() => {});

  }

}



export { isLockdownActive };


