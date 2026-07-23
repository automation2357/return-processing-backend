// Strips everything but digits and keeps the last 10 — so "+91 98765
// 43210", "919876543210", and "9876543210" all normalize to the same
// value for whitelist lookups and OTP matching.
const normalizePhone = (raw) => String(raw || '').replace(/\D/g, '').slice(-10);

module.exports = { normalizePhone };
