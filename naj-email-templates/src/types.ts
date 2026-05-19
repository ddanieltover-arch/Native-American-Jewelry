export type PaymentMethod =
  | 'chime'
  | 'cashapp'
  | 'apple_cash'
  | 'zelle'
  | 'bank_transfer';

export type OrderLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type OrderConfirmationEmailData = {
  customerName: string;
  orderNumber: string;
  orderId: string;
  items: OrderLineItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  shippingMethod?: string;
  siteUrl?: string;
};

export type PaymentInstructionsEmailData = {
  customerName: string;
  orderNumber: string;
  total: number;
  paymentMethod: PaymentMethod;
  orderId: string;
  siteUrl?: string;
};

export type PaymentStatusEmailData = {
  customerName: string;
  orderNumber: string;
  status: 'confirmed' | 'failed' | 'refunded';
  total?: number;
  adminNote?: string;
  siteUrl?: string;
};

export type ShippingUpdateEmailData = {
  customerName: string;
  orderNumber: string;
  status: 'shipped' | 'delivered';
  shippingMethod?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  siteUrl?: string;
};
