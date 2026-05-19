/** Admin inbox for storefront notifications (contact, orders, newsletter). */
export function getAdminEmail(): string {
  return (
    process.env.ADMIN_EMAIL ??
    process.env.FROM_EMAIL ??
    'orders@nativeamericanjewelry.com'
  );
}

/** Admin dashboard base URL — not the public storefront. */
export function getAdminSiteUrl(): string {
  return (
    process.env.ADMIN_SITE_URL ??
    process.env.NEXT_PUBLIC_ADMIN_URL ??
    'https://admin.nativeamericajewelry.com'
  ).replace(/\/$/, '');
}
