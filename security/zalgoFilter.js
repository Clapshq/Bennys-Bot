import { securityConfig } from "../config/security.js";

const COMBINING_MARK = /[\u0300-\u036f\u0483-\u0489\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;

export function checkZalgoSpam(content) {
  if (!securityConfig.zalgo.enabled || !content) return null;

  const marks = content.match(COMBINING_MARK);
  const count = marks?.length ?? 0;

  if (count >= securityConfig.zalgo.maxCombiningMarks) {
    return `Zalgo/unicode spam (${count} combining marks)`;
  }

  return null;
}

export function stripCombiningMarks(content) {
  return content?.replace(COMBINING_MARK, "") ?? "";
}
