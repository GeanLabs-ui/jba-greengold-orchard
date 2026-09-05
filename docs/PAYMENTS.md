# Paystack and Stripe payments

The application now has hosted checkout adapters, customer payment recovery, signed webhooks, and verified order/invoice/payment updates. Online payments are **disabled by default**. The existing pay-after-confirmation options continue to work. Adding credentials and completing provider test-mode acceptance are still required before launch.

## Configuration

Merge the values in `apps/api/payments.env.example` into the existing **API** `apps/api/.dev.vars` for local testing. Do not replace that file: it also contains unrelated application settings. For deployed Workers, put nonsecret settings in the correct environment's `vars` and credentials in Worker secrets. Never put secret keys in `VITE_*`, browser storage, source control, or the frontend.

| Setting | Purpose |
| --- | --- |
| `PAYMENTS_ENABLED` | Must equal `true` to start payments. Leave `false` until ready. Verification of in-flight payments continues when disabled. |
| `PAYMENT_RETURN_ORIGIN` | Exact frontend origin without trailing slash; must also appear in `ALLOWED_ORIGINS`. HTTPS required outside local development. |
| `PAYSTACK_SECRET_KEY` | Paystack test or live secret for the merchant account. Also verifies webhook HMAC signatures. |
| `PAYSTACK_MERCHANT_COUNTRY` | Merchant country, e.g. `GH`; determines local wallet/bank eligibility. |
| `PAYSTACK_CURRENCIES` | Explicit comma-separated allowlist approved for that account, e.g. `GHS`. Empty disables Paystack. |
| `STRIPE_SECRET_KEY` | Stripe test or live secret for the merchant account. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this environment's webhook endpoint. Required to enable Stripe. |
| `STRIPE_CURRENCIES` | Explicit comma-separated account-supported presentment currencies, e.g. `GHS`. Empty disables Stripe. |

Hosted checkout needs no public frontend key or card collection form. Card numbers, CVVs, bank credentials and mobile money PINs are entered only on the provider's checkout. Apple Pay and Google Pay appear through Stripe's card checkout when the account, browser, device and wallet qualify; the app groups these as one wallet option with card fallback. They are not separately registered payment method types.

## Webhooks and customer returns

Register these public API endpoints in the respective provider dashboards, using your real deployed frontend/API origin:

- `https://YOUR_HOST/api/v1/payments/webhooks/paystack`: subscribe to `charge.success`.
- `https://YOUR_HOST/api/v1/payments/webhooks/stripe`: subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`.

Do not put an interactive Cloudflare Access login in front of webhook endpoints. They authenticate with provider signatures, not browser sessions or CSRF. Stripe's signature timestamp tolerance is five minutes. The raw body must pass through unchanged.

Both providers return customers to `/portal/payments/return?attempt=...`. A return URL, `cancelled` parameter, or completed checkout session is never evidence that money was received. The server re-fetches payment status and checks the reference, order ID, amount and currency. A valid pending payment remains pending. The customer can select **Check payment status**, reopen an order's **Pay / check payment**, or use **Pay invoice**.

## Country and currency coverage

The storefront prices and charges in **GHS**. Selecting a country does not convert prices or change delivery eligibility. International Visa/Mastercard payments depend on the merchant's international acceptance settings and card issuer. The card issuer may convert the charge and apply fees.

Paystack documents mobile money for Ghana (MTN, Telecel, ATMoney), Kenya (M-PESA, Airtel Money), and Côte d'Ivoire (MTN, Orange, Wave). This implementation requires the customer payment country, merchant country and currency to match: GH/GHS, KE/KES or CI/XOF. Pay-by-bank transfer is enabled only for GH/GHS and NG/NGN with matching merchant country. Current GHS storefront orders therefore cannot pay with Nigerian NGN bank transfers or Ivorian XOF wallets. Those require separately approved merchant accounts and deliberate local-currency pricing/FX work.

Togo and Burkina Faso are selectable for international cards; their local mobile wallets are not advertised as supported by these two integrations. Adding those wallets requires a provider/account arrangement that explicitly supports them. Configuring a country name or API key alone cannot establish coverage.

Internally amounts use ISO-style minor units; the Paystack adapter handles its special XOF x100 wire format. No exchange rate is invented.

## Persistence and recovery

No schema migration is needed. Internal `PaymentAttempt` records use the existing `entity_records` table and are inaccessible through the generic entity API. Orders, invoices, payment receipts, and audit events retain their current storage contracts.

Checkout submissions use a per-customer idempotency key persisted for lost-response retries. Order creation takes a transaction advisory lock. Payment reservation and settlement lock the order; only one active checkout is reused. Provider/method/country switching is blocked while that checkout remains active. Verified failure/expiry allows a new attempt.

Stripe initialization reuses the exact request and idempotency key within 23 hours. Paystack initialization is never blindly retried after an ambiguous network failure. If initialization cannot be reconciled, staff must inspect the provider dashboard/reference before enabling another attempt; the app keeps the order unpaid and prevents a speculative second charge. Changing the configured return origin during an initializing Stripe attempt requires reconciliation before retrying, because its idempotency key must retain the original payload.

Successful settlement updates the order and invoice, inserts one payment receipt, and writes an audit event in a single transaction. Repeated callbacks/webhooks are idempotent. Partial/manual invoice payments, changed totals, or a second successful attempt are held for staff reconciliation. Automatic refund/dispute processing and recurring billing are outside this implementation; manage those through provider dashboards and the finance workflow.

## Validation before activation

Automated tests mock external providers and database I/O; they do not establish merchant eligibility or live payment success. After credentials are available, use each provider's test mode to exercise successful/declined cards, mobile approval and timeout, eligible Apple/Google wallet rendering, cancellation, return after session expiry, duplicate webhooks, lost callback, provider timeout, and invoice reconciliation. Confirm receipt and invoice totals against the provider dashboard, then configure the live environment separately.

Run `npm run build`, `npm run lint:web`, and the payment/checkout test files. No real payment, data migration, push or deployment was performed as part of this implementation.

## Provider references

- [Paystack channels and country coverage](https://paystack.com/docs/payments/payment-channels/)
- [Paystack transaction initialization](https://paystack.com/docs/api/transaction/)
- [Paystack currency and XOF rules](https://paystack.com/docs/api/#supported-currency)
- [Paystack webhooks](https://paystack.com/docs/payments/webhooks/)
- [Stripe Checkout sessions](https://docs.stripe.com/api/checkout/sessions/create)
- [Stripe wallets](https://docs.stripe.com/payments/wallets)
- [Stripe webhook signatures](https://docs.stripe.com/webhooks/signature)
