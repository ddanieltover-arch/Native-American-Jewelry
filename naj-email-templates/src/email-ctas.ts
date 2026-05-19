import { siteUrl } from './brand';
import { emailButton } from './layout';

/** Standard customer CTAs appended to transactional emails */
export function emailCustomerCtas(options?: {
  baseUrl?: string;
  orderId?: string;
  includeShop?: boolean;
  includeContact?: boolean;
  includeAccount?: boolean;
}): string {
  const base = (options?.baseUrl ?? siteUrl()).replace(/\/$/, '');
  const parts: string[] = [];

  if (options?.includeAccount !== false) {
    const accountHref = options?.orderId
      ? `${base}/account/orders/${options.orderId}`
      : `${base}/account`;
    const accountLabel = options?.orderId ? 'View your order' : 'View my account';
    parts.push(emailButton(accountHref, accountLabel));
  }
  if (options?.includeShop !== false) {
    parts.push(emailButton(`${base}/shop`, 'Shop the collection'));
  }
  if (options?.includeContact !== false) {
    parts.push(emailButton(`${base}/contact`, 'Contact us'));
  }

  return parts.join('');
}
