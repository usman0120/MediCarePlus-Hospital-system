import { assert, decodeAttachment, hospitalDate } from './transactions.js';

export const formatCurrency = amount => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(amount);
export const formatMinor = amount => formatCurrency(amount / 100);
export const formatDate = value => {
  if (!value) return 'Not recorded';
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Invalid date';
};
export const formatTime = time => {
  const [hour, minute] = time.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
};
export const searchName = value => String(value).normalize('NFKC').trim().toLocaleLowerCase('en-PK');
export const fieldValues = form => Object.fromEntries(new FormData(form));
export const csvValues = value => String(value).split(',').map(item => item.trim()).filter(Boolean);
export const currentDate = hospitalDate;
export const safeFileName = name => name.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 150) || 'document';
export const downloadBlob = (blob, name) => {
  assert(blob instanceof Blob, 'validation', 'No downloadable file was generated.');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = safeFileName(name); anchor.rel = 'noopener';
  document.body.append(anchor); anchor.click(); anchor.remove();
  // Browsers must consume the URL before it is revoked.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
export const downloadAttachment = async attachment => downloadBlob(await decodeAttachment(attachment), attachment.name);
export const downloadJSON = (data, name) => downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), name);
export const availabilityNotice = (profile, at = new Date()) => {
  const hours = profile?.messagingHours;
  if (!hours) return null;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
  const weekday = new Date(`${hospitalDate(at)}T00:00:00Z`).getUTCDay();
  return hours.days.includes(weekday) && parts >= hours.start && parts < hours.end ? null : hours.autoReply;
};
