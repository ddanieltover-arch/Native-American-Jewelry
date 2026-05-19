/** Admin inbox for storefront notifications (contact, orders, newsletter). */
export function getAdminEmail(): string {
  return (
    process.env.ADMIN_EMAIL ??
    process.env.FROM_EMAIL ??
    'orders@nativeamericanjewelry.com'
  );
}
