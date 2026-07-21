import { cn } from '@/lib/utils';

export function formatCurrency(amount, currency = 'GHS') {
  if (amount === null || amount === undefined) return `${currency} 0`;
  const formatted = Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return `${currency} ${formatted}`;
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(date) {
  if (!date) return '—';
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(date);
}

export function cn_(...args) {
  return cn(...args);
}
