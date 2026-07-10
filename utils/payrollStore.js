import { dataFile } from "./paths.js";
import { readCachedJson, writeCachedJson } from "./jsonCache.js";

const FILE = dataFile("payroll.json");

function readStore() {
  return readCachedJson(FILE, { employees: {}, byChannel: {} });
}

function writeStore(data, immediate = false) {
  writeCachedJson(FILE, data, { immediate });
}

function employeeKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function channelKey(guildId, channelId) {
  return `${guildId}:${channelId}`;
}

function ensureEmployee(data, guildId, userId) {
  const key = employeeKey(guildId, userId);
  if (!data.employees[key]) {
    data.employees[key] = {
      guildId,
      userId,
      userTag: null,
      channelId: null,
      channelName: null,
      pendingPay: 0,
      totalEarned: 0,
      totalPaid: 0,
      invoices: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return data.employees[key];
}

export function registerPayrollEmployee(guildId, { userId, userTag, channelId, channelName }) {
  const data = readStore();
  const emp = ensureEmployee(data, guildId, userId);
  emp.userTag = userTag ?? emp.userTag;
  emp.channelId = channelId ?? emp.channelId;
  emp.channelName = channelName ?? emp.channelName;
  emp.updatedAt = new Date().toISOString();

  if (channelId) {
    data.byChannel[channelKey(guildId, channelId)] = employeeKey(guildId, userId);
  }

  writeStore(data);
  return emp;
}

export function getPayrollEmployee(guildId, userId) {
  const data = readStore();
  return data.employees[employeeKey(guildId, userId)] ?? null;
}

export function getPayrollEmployeeByChannel(guildId, channelId) {
  const data = readStore();
  const key = data.byChannel[channelKey(guildId, channelId)];
  return key ? data.employees[key] ?? null : null;
}

export function listPayrollEmployees(guildId) {
  const data = readStore();
  return Object.values(data.employees).filter((e) => e.guildId === guildId);
}

export function hasPayrollInvoiceMessage(guildId, userId, messageId) {
  const emp = getPayrollEmployee(guildId, userId);
  if (!emp || !messageId) return false;
  return emp.invoices.some((i) => i.messageId === messageId);
}

export function recalculatePayrollBalance(emp) {
  const earned = (emp.invoices ?? []).reduce((s, i) => s + (Number(i.employeePay) || 0), 0);
  emp.totalEarned = earned;
  emp.pendingPay = Math.max(0, earned - (Number(emp.totalPaid) || 0));
  return emp;
}

export function setEmployeeInvoices(guildId, userId, invoices, { preservePaid = true } = {}) {
  const data = readStore();
  const key = employeeKey(guildId, userId);
  const emp = data.employees[key];
  if (!emp) return null;

  const totalPaid = preservePaid ? emp.totalPaid ?? 0 : 0;
  emp.invoices = invoices.slice(-200);
  emp.totalPaid = totalPaid;
  recalculatePayrollBalance(emp);
  emp.updatedAt = new Date().toISOString();
  writeStore(data, true);
  return emp;
}

export function addPayrollInvoice(guildId, channelId, {
  invoiceTotal,
  employeePay,
  scannedById,
  scannedByTag,
  messageId,
  messageDate,
}) {
  const data = readStore();
  const empKey = data.byChannel[channelKey(guildId, channelId)];
  if (!empKey || !data.employees[empKey]) return null;

  const emp = data.employees[empKey];
  const pay = Math.round(Number(employeePay) || 0);
  const total = Math.round(Number(invoiceTotal) || 0);
  if (pay <= 0) return emp;

  if (messageId && emp.invoices.some((i) => i.messageId === messageId)) {
    return emp;
  }

  emp.invoices.push({
    messageId: messageId ?? null,
    invoiceTotal: total,
    employeePay: pay,
    scannedById: scannedById ?? null,
    scannedByTag: scannedByTag ?? null,
    date: messageDate ?? new Date().toISOString(),
  });
  if (emp.invoices.length > 200) emp.invoices = emp.invoices.slice(-200);
  recalculatePayrollBalance(emp);
  emp.updatedAt = new Date().toISOString();

  writeStore(data);
  return emp;
}

export function removePayrollInvoicesForDeletedMessage(guildId, channelId, { sourceMessageId, botMessageId } = {}) {
  const data = readStore();
  const empKey = data.byChannel[channelKey(guildId, channelId)];
  if (!empKey || !data.employees[empKey]) return null;

  const emp = data.employees[empKey];
  const before = emp.invoices?.length ?? 0;

  emp.invoices = (emp.invoices ?? []).filter((inv) => {
    if (sourceMessageId && inv.sourceMessageId === sourceMessageId) return false;
    if (botMessageId) {
      if (inv.botMessageId === botMessageId) return false;
      if (inv.messageId === `embed:${botMessageId}:0` || inv.messageId?.startsWith(`embed:${botMessageId}:`)) {
        return false;
      }
    }
    return true;
  });

  if (emp.invoices.length !== before) {
    recalculatePayrollBalance(emp);
    emp.updatedAt = new Date().toISOString();
    writeStore(data, true);
  }

  return emp;
}

/** Husk slettede upload-beskeder så sync ikke tæller dem igen */
export function trackDeletedPayrollUpload(guildId, channelId, messageId) {
  if (!messageId) return null;

  const data = readStore();
  const empKey = data.byChannel[channelKey(guildId, channelId)];
  if (!empKey || !data.employees[empKey]) return null;

  const emp = data.employees[empKey];
  if (!emp.deletedUploadIds) emp.deletedUploadIds = [];
  if (!emp.deletedUploadIds.includes(messageId)) {
    emp.deletedUploadIds.push(messageId);
    if (emp.deletedUploadIds.length > 500) {
      emp.deletedUploadIds = emp.deletedUploadIds.slice(-500);
    }
    emp.updatedAt = new Date().toISOString();
    writeStore(data, true);
  }

  return emp;
}

export function isDeletedPayrollUpload(guildId, channelId, messageId) {
  const emp = getPayrollEmployeeByChannel(guildId, channelId);
  return Boolean(messageId && emp?.deletedUploadIds?.includes(messageId));
}

export function payoutPayrollEmployee(guildId, userId, { paidById, paidByTag } = {}) {
  const data = readStore();
  const key = employeeKey(guildId, userId);
  const emp = data.employees[key];
  if (!emp) return { ok: false, error: "Medarbejder findes ikke i lønsystemet." };

  const amount = emp.pendingPay;
  if (amount <= 0) return { ok: false, error: "Ingen udestående løn at udbetale.", employee: emp };

  emp.totalPaid += amount;
  emp.pendingPay = 0;
  emp.lastPayout = {
    amount,
    paidById: paidById ?? null,
    paidByTag: paidByTag ?? null,
    date: new Date().toISOString(),
  };
  emp.updatedAt = new Date().toISOString();

  writeStore(data, true);
  return { ok: true, amount, employee: emp };
}

export function removePayrollEmployee(guildId, userId) {
  const data = readStore();
  const key = employeeKey(guildId, userId);
  const emp = data.employees[key];
  if (!emp) return { ok: false, error: "Medarbejder findes ikke i lønsystemet." };

  if (emp.channelId) {
    delete data.byChannel[channelKey(guildId, emp.channelId)];
  }
  delete data.employees[key];
  writeStore(data, true);

  return { ok: true, employee: emp };
}

export function unlinkPayrollChannel(guildId, channelId) {
  const data = readStore();
  const empKey = data.byChannel[channelKey(guildId, channelId)];
  if (!empKey) return null;

  const emp = data.employees[empKey];
  if (emp) {
    emp.channelId = null;
    emp.channelName = null;
    emp.updatedAt = new Date().toISOString();
  }
  delete data.byChannel[channelKey(guildId, channelId)];
  writeStore(data);
  return emp;
}
