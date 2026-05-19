/** US standard shipping — must match `shipping_rates.free_threshold` in Supabase */
export const FREE_SHIPPING_THRESHOLD_US = 400;

export const FREE_SHIPPING_ANNOUNCEMENT =
  'Free shipping on US orders over $400';

export const FREE_SHIPPING_US_LABEL = 'Free US shipping on orders over $400';

/** Free shipping applies only to US standard delivery, never express. */
export function qualifiesForFreeStandardShipping(
  rate: { method: string; free_threshold?: number | null },
  subtotal: number
): boolean {
  return (
    rate.method === 'standard' &&
    rate.free_threshold != null &&
    subtotal >= rate.free_threshold
  );
}
