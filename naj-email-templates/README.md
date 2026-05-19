# NAJ transactional email templates

Branded HTML emails for Resend, shared by **naj-storefront** and **naj-admin-dashboard**.

## Templates

| Template | When sent |
|----------|-----------|
| **Order confirmation** | Customer places an order (includes payment instructions) |
| **Payment instructions** | Resend / standalone payment details |
| **Payment status** | Admin confirms, fails, or refunds a payment |
| **Shipping update** | Admin sets order to `shipped` or `delivered` |

## Payment handles (env)

Set on Vercel (storefront + admin):

```env
FROM_EMAIL=orders@nativeamericanjewelry.com
RESEND_API_KEY=re_...
PAYMENT_CHIME_HANDLE=$YourChime
PAYMENT_CASHAPP_TAG=$YourCashApp
PAYMENT_APPLE_CASH_PHONE=+1-555-555-5555
PAYMENT_ZELLE_EMAIL=orders@nativeamericanjewelry.com
PAYMENT_BANK_NAME=Bank Name
PAYMENT_BANK_ROUTING=000000000
PAYMENT_BANK_ACCOUNT=0000000000
```

## Usage

```typescript
import {
  renderOrderConfirmationEmail,
  sendTransactionalEmail,
} from '@naj/emails';

const { subject, html, text } = renderOrderConfirmationEmail({ ... });
await sendTransactionalEmail({ to: customerEmail, subject, html, text });
```
