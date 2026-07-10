import { securityConfig } from "../config/security.js";
import { createLogger } from "../core/logger.js";

const log = createLogger("linkFilter");

const URL_REGEX = /https?:\/\/[^\s<]+|www\.[^\s<]+/gi;

function extractDomain(url) {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedDomain(domain) {
  if (!domain) return false;
  return securityConfig.allowedDomains.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`)
  );
}

function isBlockedDomain(domain) {
  if (!domain) return false;
  return securityConfig.blockedDomains.some(
    (blocked) => domain === blocked || domain.endsWith(`.${blocked}`)
  );
}

export function scanLinks(content) {
  if (!content) return { violation: false, links: [], reason: null };

  const matches = content.match(URL_REGEX) ?? [];
  const links = matches.map((m) => m.replace(/[>,)\]}]+$/, ""));

  for (const link of links) {
    const domain = extractDomain(link);
    if (isBlockedDomain(domain)) {
      return { violation: true, links, reason: `Blokeret link-domæne: ${domain}`, domain, link };
    }
    if (securityConfig.strictLinkMode && domain && !isAllowedDomain(domain)) {
      return { violation: true, links, reason: `Ikke-whitelistet link: ${domain}`, domain, link };
    }
  }

  return { violation: false, links, reason: null };
}

export function containsSuspiciousLink(content) {
  const result = scanLinks(content);
  return result.violation ? result.reason : null;
}

export { extractDomain, isAllowedDomain, isBlockedDomain };
