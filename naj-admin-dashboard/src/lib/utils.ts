import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { OrderStatus, PaymentStatus, PaymentMethod, ProductStatus, AdminRole } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency ─────────────────────────────────────────────
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ─── Dates ───────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}
export function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const min  = Math.floor(diff / 60000);
  const hr   = Math.floor(min / 60);
  const day  = Math.floor(hr / 24);
  if (min < 1)   return 'just now';
  if (min < 60)  return `${min}m ago`;
  if (hr  < 24)  return `${hr}h ago`;
  if (day < 7)   return `${day}d ago`;
  return formatDate(date);
}

// ─── Order status ─────────────────────────────────────────
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment:  'Awaiting Payment',
  payment_uploaded:  'Payment Uploaded',
  payment_confirmed: 'Payment Confirmed',
  processing:        'Processing',
  shipped:           'Shipped',
  delivered:         'Delivered',
  cancelled:         'Cancelled',
  refunded:          'Refunded',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  awaiting_payment:  'bg-amber-100 text-amber-800',
  payment_uploaded:  'bg-blue-100 text-blue-800',
  payment_confirmed: 'bg-teal-100 text-teal-800',
  processing:        'bg-indigo-100 text-indigo-800',
  shipped:           'bg-purple-100 text-purple-800',
  delivered:         'bg-green-100 text-green-800',
  cancelled:         'bg-red-100 text-red-800',
  refunded:          'bg-gray-100 text-gray-600',
};

// ─── Payment status ───────────────────────────────────────
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending:   'Pending',
  uploaded:  'Proof Uploaded',
  confirmed: 'Confirmed',
  failed:    'Failed',
  refunded:  'Refunded',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending:   'bg-amber-100 text-amber-800',
  uploaded:  'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  failed:    'bg-red-100 text-red-800',
  refunded:  'bg-gray-100 text-gray-600',
};

// ─── Payment methods ──────────────────────────────────────
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  chime:         'Chime',
  cashapp:       'Cash App',
  apple_cash:    'Apple Cash',
  zelle:         'Zelle',
  bank_transfer: 'Bank Transfer',
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  chime:         '💚',
  cashapp:       '💵',
  apple_cash:    '🍎',
  zelle:         '💙',
  bank_transfer: '🏦',
};

// ─── Product status ───────────────────────────────────────
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  pending:  'Pending Review',
  active:   'Active',
  archived: 'Archived',
};

export const PRODUCT_STATUS_COLORS: Record<ProductStatus, string> = {
  pending:  'bg-amber-100 text-amber-800',
  active:   'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-500',
};

// ─── Admin roles ──────────────────────────────────────────
export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  editor:      'Editor',
  support:     'Support',
  analyst:     'Analyst',
};

export const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  admin:       'bg-blue-100 text-blue-800',
  editor:      'bg-teal-100 text-teal-800',
  support:     'bg-orange-100 text-orange-800',
  analyst:     'bg-gray-100 text-gray-700',
};

// ─── Scrape status ────────────────────────────────────────
export const SCRAPE_STATUS_COLORS: Record<string, string> = {
  running:   'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed:    'bg-red-100 text-red-800',
  partial:   'bg-amber-100 text-amber-800',
};

// ─── Number formatting ────────────────────────────────────
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatDuration(ms: number): string {
  if (ms < 1000)         return `${ms}ms`;
  if (ms < 60_000)       return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000)    return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

// ─── Truncate ─────────────────────────────────────────────
export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '…';
}

// ─── Debounce ─────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
