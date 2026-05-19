export { BRAND, siteUrl, logoUrl } from './brand';
export { getAdminEmail } from './admin';
export { escapeHtml, formatUsd } from './utils';
export { emailLayout, emailButton, infoBox } from './layout';
export {
  getPaymentInstructions,
  paymentMethodLabel,
  renderPaymentInstructionsHtml,
} from './payment-details';
export { renderOrderConfirmationEmail } from './templates/order-confirmation';
export { renderPaymentInstructionsEmail } from './templates/payment-instructions';
export { renderPaymentStatusEmail } from './templates/payment-status';
export { renderShippingUpdateEmail } from './templates/shipping-update';
export { renderContactAdminEmail, renderContactConfirmationEmail } from './templates/contact';
export { renderNewsletterWelcomeEmail, renderNewsletterAdminEmail } from './templates/newsletter';
export { renderNewOrderAdminEmail } from './templates/new-order-admin';
export { sendTransactionalEmail, getFromAddress } from './send';
export type { SendEmailResult, SendEmailOptions } from './send';
export type {
  PaymentMethod,
  OrderLineItem,
  OrderConfirmationEmailData,
  PaymentInstructionsEmailData,
  PaymentStatusEmailData,
  ShippingUpdateEmailData,
} from './types';
