export { BRAND, siteUrl } from './brand';
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
export { sendTransactionalEmail, getFromAddress } from './send';
export type {
  PaymentMethod,
  OrderLineItem,
  OrderConfirmationEmailData,
  PaymentInstructionsEmailData,
  PaymentStatusEmailData,
  ShippingUpdateEmailData,
} from './types';
