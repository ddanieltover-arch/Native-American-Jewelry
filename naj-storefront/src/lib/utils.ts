import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { OrderStatus, PaymentStatus, PaymentMethod } from '@/types';

// ─── Tailwind class merger ────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Price formatting ─────────────────────────────────────
export function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Apply 5% discount ────────────────────────────────────
export function applyDiscount(price: number, rate = 0.05): number {
  return parseFloat((price * (1 - rate)).toFixed(2));
}

// ─── Date formatting ──────────────────────────────────────
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

// ─── Slug helpers ─────────────────────────────────────────
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Order status labels ──────────────────────────────────
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment:   'Awaiting Payment',
  payment_uploaded:   'Payment Uploaded',
  payment_confirmed:  'Payment Confirmed',
  processing:         'Processing',
  shipped:            'Shipped',
  delivered:          'Delivered',
  cancelled:          'Cancelled',
  refunded:           'Refunded',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  awaiting_payment:   'bg-amber-100 text-amber-800',
  payment_uploaded:   'bg-blue-100 text-blue-800',
  payment_confirmed:  'bg-teal-100 text-teal-800',
  processing:         'bg-indigo-100 text-indigo-800',
  shipped:            'bg-purple-100 text-purple-800',
  delivered:          'bg-green-100 text-green-800',
  cancelled:          'bg-red-100 text-red-800',
  refunded:           'bg-gray-100 text-gray-700',
};

// ─── Payment method labels ────────────────────────────────
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

// ─── USA States ───────────────────────────────────────────
export const USA_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
  'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas',
  'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana',
  'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
  'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

// ─── Truncate ─────────────────────────────────────────────
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trimEnd() + '…';
}

// ─── Star rating ──────────────────────────────────────────
export function ratingToStars(rating: number): string {
  return Array.from({ length: 5 }, (_, i) =>
    i < Math.round(rating) ? '★' : '☆'
  ).join('');
}

// ─── Product gradient placeholder (deterministic per ID) ──
const GRADIENTS = [
  'from-amber-100 to-stone-200',
  'from-teal-50 to-cyan-100',
  'from-rose-50 to-orange-100',
  'from-stone-100 to-amber-50',
  'from-slate-100 to-stone-100',
  'from-emerald-50 to-teal-100',
  'from-orange-50 to-amber-100',
  'from-neutral-100 to-stone-200',
];

export function getProductGradient(id: string): string {
  const hash = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

// ─── Debounce ─────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Coupon helpers ───────────────────────────────────────
export function applyCoupon(
  subtotal: number,
  type: 'percent' | 'flat',
  value: number
): number {
  if (type === 'percent') return subtotal * (value / 100);
  return Math.min(value, subtotal);
}

// ─── Random between ───────────────────────────────────────
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
