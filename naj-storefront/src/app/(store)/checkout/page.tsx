'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/lib/store';
import { createClient } from '@/lib/supabase-client';
import Logo from '@/components/brand/Logo';
import { cn, formatPrice, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from '@/lib/utils';
import { FREE_SHIPPING_ANNOUNCEMENT, FREE_SHIPPING_THRESHOLD_US } from '@/lib/shipping-constants';
import type { PaymentMethod, ShippingRate } from '@/types';

type Step = 'information' | 'shipping' | 'payment' | 'confirmation';

const STEPS: Step[] = ['information', 'shipping', 'payment', 'confirmation'];
const STEP_LABELS: Record<Step, string> = {
  information:  'Contact & Shipping',
  shipping:     'Shipping Method',
  payment:      'Payment',
  confirmation: 'Confirmation',
};

const PAYMENT_METHODS: PaymentMethod[] = ['chime', 'cashapp', 'apple_cash', 'zelle', 'bank_transfer'];

const PAYMENT_INSTRUCTIONS: Record<PaymentMethod, string> = {
  chime:         'Send payment to our Chime account. Details will be emailed to you after placing your order.',
  cashapp:       'Send to our Cash App $cashtag. Include your order number in the note.',
  apple_cash:    'Send via iMessage to our Apple Cash account. We will provide the number via email.',
  zelle:         'Send to our Zelle-registered email. Include your order number.',
  bank_transfer: 'Bank routing and account details will be sent to your email immediately after checkout.',
};

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore();
  const [step, setStep] = useState<Step>('information');
  const [orderNumber, setOrderNumber] = useState('');
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [placing, setPlacing] = useState(false);

  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', phone: '',
    line1: '', line2: '', city: '', state: '', zip: '', country: 'US',
  });
  const [shippingRateId, setShippingRateId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cashapp');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetch('/api/shipping?zone=usa')
      .then((r) => r.json())
      .then((d) => {
        const rates = (d.data ?? []) as ShippingRate[];
        setShippingRates(rates);
        if (rates[0]) setShippingRateId(rates[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: customer } = await supabase
        .from('customers')
        .select('first_name, last_name, phone')
        .eq('id', user.id)
        .maybeSingle();
      setForm((f) => ({
        ...f,
        email: user.email ?? f.email,
        firstName: customer?.first_name ?? f.firstName,
        lastName: customer?.last_name ?? f.lastName,
        phone: customer?.phone ?? f.phone,
      }));
    });
  }, []);

  const subtotal = total();
  const selectedRate = shippingRates.find((r) => r.id === shippingRateId);
  const shippingCost =
    selectedRate && selectedRate.free_threshold && subtotal >= selectedRate.free_threshold
      ? 0
      : (selectedRate?.rate ?? 0);
  const discount = discountAmount;
  const orderTotal = subtotal + shippingCost - discount;

  const stepIndex = STEPS.indexOf(step);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: coupon, subtotal }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? 'Invalid coupon');
      return;
    }
    setDiscountAmount(data.data.discount);
    setCouponApplied(true);
    toast.success('Coupon applied');
  };

  const handlePlaceOrder = async () => {
    if (!shippingRateId || !selectedRate) {
      toast.error('Select a shipping method');
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || undefined,
          address: {
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city,
            state: form.state || undefined,
            country: form.country,
            zip: form.zip || undefined,
          },
          shippingRateId,
          paymentMethod,
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.name,
            variantId: i.variantId,
            quantity: i.quantity,
            unitPrice: i.price,
          })),
          couponCode: couponApplied ? coupon : undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Order failed');
      setOrderNumber(data.data.orderNumber);
      clearCart();
      setStep('confirmation');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not place order');
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0 && step !== 'confirmation') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-2xl font-light text-brand-obsidian" style={{ fontFamily: 'var(--font-display)' }}>
          Your cart is empty
        </p>
        <Link href="/shop" className="btn-primary text-sm">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
      {/* Back link */}
      {step !== 'confirmation' && (
        <Link href="/shop" className="inline-flex items-center gap-2 text-sm text-brand-sienna hover:text-brand-turquoise transition-colors mb-8" style={{ fontFamily: 'var(--font-body)' }}>
          <ArrowLeft size={14} /> Continue Shopping
        </Link>
      )}

      {/* Step indicator */}
      {step !== 'confirmation' && (
        <div className="flex items-center gap-0 mb-10">
          {STEPS.slice(0, 3).map((s, i) => {
            const done = i < stepIndex;
            const active = s === step;
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                      done   && 'bg-brand-turquoise text-white',
                      active && 'bg-brand-obsidian text-brand-bone',
                      !done && !active && 'bg-brand-bone text-brand-sienna border border-brand-sand'
                    )}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {done ? <Check size={12} /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      'hidden md:block text-xs',
                      active ? 'text-brand-obsidian font-medium' : 'text-brand-sienna'
                    )}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {STEP_LABELS[s]}
                  </span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-brand-bone mx-3" />}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-10">
        {/* Main form column */}
        <div>
          {/* Step 1: Information */}
          {step === 'information' && (
            <div className="space-y-6">
              <h2 className="text-heading-md text-brand-obsidian" style={{ fontFamily: 'var(--font-display)' }}>
                Contact & Shipping Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name *">
                  <input className="input-base" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="Sarah" />
                </Field>
                <Field label="Last Name *">
                  <input className="input-base" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Johnson" />
                </Field>
              </div>

              <Field label="Email *">
                <input type="email" className="input-base" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="sarah@email.com" />
              </Field>

              <Field label="Phone (optional)">
                <input type="tel" className="input-base" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+1 (505) 000-0000" />
              </Field>

              <Field label="Address *">
                <input className="input-base mb-2" value={form.line1} onChange={e => setForm({...form, line1: e.target.value})} placeholder="123 Main Street" />
                <input className="input-base" value={form.line2} onChange={e => setForm({...form, line2: e.target.value})} placeholder="Apt, Suite, etc. (optional)" />
              </Field>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="City *" className="col-span-1">
                  <input className="input-base" value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Santa Fe" />
                </Field>
                <Field label="State">
                  <input className="input-base" value={form.state} onChange={e => setForm({...form, state: e.target.value})} placeholder="NM" />
                </Field>
                <Field label="ZIP">
                  <input className="input-base" value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} placeholder="87501" />
                </Field>
              </div>

              <Field label="Country *">
                <div className="relative">
                  <select className="input-base appearance-none pr-8" value={form.country} onChange={e => setForm({...form, country: e.target.value})}>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="NG">Nigeria</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-sienna pointer-events-none" />
                </div>
              </Field>

              <button
                onClick={() => setStep('shipping')}
                disabled={!form.email || !form.firstName || !form.line1 || !form.city}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Continue to Shipping <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Shipping */}
          {step === 'shipping' && (
            <div className="space-y-6">
              <h2 className="text-heading-md text-brand-obsidian" style={{ fontFamily: 'var(--font-display)' }}>
                Shipping Method
              </h2>
              <p className="text-xs text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>
                {FREE_SHIPPING_ANNOUNCEMENT} on standard US delivery.
              </p>

              <div className="space-y-3">
                {shippingRates.filter(r =>
                  form.country === 'US' ? r.zone === 'usa' : r.zone === 'international'
                ).map((rate) => {
                  const isFree = rate.free_threshold && subtotal >= rate.free_threshold;
                  return (
                    <label
                      key={rate.id}
                      className={cn(
                        'flex items-center justify-between p-4 border cursor-pointer transition-colors',
                        shippingRateId === rate.id
                          ? 'border-brand-turquoise bg-brand-turquoise/5'
                          : 'border-brand-bone hover:border-brand-sand'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          value={rate.id}
                          checked={shippingRateId === rate.id}
                          onChange={() => setShippingRateId(rate.id)}
                          className="accent-brand-turquoise"
                        />
                        <div>
                          <p className="text-sm font-medium text-brand-obsidian" style={{ fontFamily: 'var(--font-body)' }}>
                            {rate.label}
                          </p>
                          <p className="text-xs text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>
                            {rate.est_days_min}–{rate.est_days_max} business days
                          </p>
                        </div>
                      </div>
                      <span className={cn('text-sm font-medium', isFree ? 'text-brand-turquoise' : 'text-brand-obsidian')} style={{ fontFamily: 'var(--font-body)' }}>
                        {isFree ? 'FREE' : formatPrice(rate.rate)}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('information')} className="btn-ghost flex-1 text-sm flex items-center justify-center gap-2">
                  <ArrowLeft size={14} /> Back
                </button>
                <button onClick={() => setStep('payment')} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Continue to Payment <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 'payment' && (
            <div className="space-y-6">
              <h2 className="text-heading-md text-brand-obsidian" style={{ fontFamily: 'var(--font-display)' }}>
                Payment Method
              </h2>

              <div className="bg-brand-bone border border-brand-sand/30 p-4 text-sm text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>
                <p className="font-medium text-brand-obsidian mb-1">How manual payment works:</p>
                <p>Select your preferred method below. After placing your order, you'll receive an email with exact payment instructions. Once you've sent the payment, upload a screenshot as proof from your account. We'll confirm and start fulfillment within 24–48 hours.</p>
              </div>

              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method}
                    className={cn(
                      'flex items-start gap-4 p-4 border cursor-pointer transition-colors',
                      paymentMethod === method
                        ? 'border-brand-turquoise bg-brand-turquoise/5'
                        : 'border-brand-bone hover:border-brand-sand'
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="mt-1 accent-brand-turquoise"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden="true">{PAYMENT_METHOD_ICONS[method]}</span>
                        <span className="text-sm font-medium text-brand-obsidian" style={{ fontFamily: 'var(--font-body)' }}>
                          {PAYMENT_METHOD_LABELS[method]}
                        </span>
                      </div>
                      {paymentMethod === method && (
                        <p className="text-xs text-brand-sienna mt-1 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                          {PAYMENT_INSTRUCTIONS[method]}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <Field label="Order Notes (optional)">
                <textarea
                  className="input-base min-h-[80px] resize-none"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Special requests, gift message, etc."
                />
              </Field>

              <div className="flex gap-3">
                <button onClick={() => setStep('shipping')} className="btn-ghost flex-1 text-sm flex items-center justify-center gap-2">
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {placing ? 'Placing order…' : 'Place Order'} <Check size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Confirmation */}
          {step === 'confirmation' && (
            <div className="text-center py-12">
              <div className="flex justify-center mb-6">
                <Logo height={72} href="/" />
              </div>
              <div className="w-16 h-16 rounded-full bg-brand-turquoise/15 border border-brand-turquoise/30 flex items-center justify-center mx-auto mb-6">
                <Check size={28} className="text-brand-turquoise" />
              </div>
              <h2
                className="text-heading-lg text-brand-obsidian mb-3"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Order Placed!
              </h2>
              <p className="text-brand-sienna mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                Order <span className="font-medium text-brand-obsidian">{orderNumber}</span>
              </p>
              <p className="text-sm text-brand-sienna max-w-md mx-auto mb-8 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                A confirmation email with {PAYMENT_METHOD_LABELS[paymentMethod]} payment instructions has been sent to{' '}
                <strong className="text-brand-obsidian">{form.email}</strong>.
                Please complete payment within 48 hours to secure your order.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/account/orders" className="btn-ghost text-sm">View My Orders</Link>
                <Link href="/shop" className="btn-primary text-sm">Continue Shopping</Link>
              </div>
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        {step !== 'confirmation' && (
          <aside className="bg-brand-bone border border-brand-sand/30 p-6 h-fit sticky top-24">
            <h3
              className="text-base font-light text-brand-obsidian mb-4 border-b border-brand-sand/40 pb-3"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Order Summary
            </h3>

            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-amber-100 to-stone-200 rounded relative"
                  >
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-obsidian text-brand-bone text-[10px] flex items-center justify-center font-medium">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-brand-obsidian font-medium line-clamp-1" style={{ fontFamily: 'var(--font-body)' }}>
                      {item.name}
                    </p>
                    {item.variantLabel && (
                      <p className="text-[10px] text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>{item.variantLabel}</p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-brand-obsidian whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon */}
            {!couponApplied && (
              <div className="flex gap-2 mb-4">
                <input
                  className="input-base flex-1 text-xs py-2"
                  placeholder="Coupon code"
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                />
                <button
                  onClick={applyCoupon}
                  className="btn-ghost text-xs py-2 px-4"
                >
                  Apply
                </button>
              </div>
            )}
            {couponApplied && (
              <p className="text-xs text-brand-turquoise mb-4" style={{ fontFamily: 'var(--font-body)' }}>
                ✓ {coupon.toUpperCase()} — {formatPrice(discount)} off
              </p>
            )}

            <div className="border-t border-brand-sand/40 pt-4 space-y-2">
              <div className="flex justify-between text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                <span className="text-brand-sienna">Subtotal</span>
                <span className="text-brand-obsidian">{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                  <span className="text-brand-turquoise">Discount</span>
                  <span className="text-brand-turquoise">−{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                <span className="text-brand-sienna">Shipping</span>
                <span className="text-brand-obsidian">
                  {shippingCost === 0 ? (
                    <span className="text-brand-turquoise">FREE</span>
                  ) : formatPrice(shippingCost)}
                </span>
              </div>
              {form.country === 'US' &&
                shippingCost > 0 &&
                subtotal < FREE_SHIPPING_THRESHOLD_US && (
                  <p className="text-xs text-brand-sienna" style={{ fontFamily: 'var(--font-body)' }}>
                    Add {formatPrice(FREE_SHIPPING_THRESHOLD_US - subtotal)} more for free standard
                    shipping (orders over ${FREE_SHIPPING_THRESHOLD_US}).
                  </p>
                )}
              <div className="flex justify-between pt-2 border-t border-brand-sand/40">
                <span
                  className="font-medium text-brand-obsidian"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Total
                </span>
                <span
                  className="text-xl font-light text-brand-obsidian"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {formatPrice(orderTotal)}
                </span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        className="text-xs font-medium tracking-wide text-brand-sienna uppercase"
        style={{ fontFamily: 'var(--font-body)', letterSpacing: '0.1em' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
