# Dodo Payments: subscription & paywall

Radhe Radhe is a paid app: **₹100 / month**, with a **14-day free trial** in the app
(no card needed). After the trial, users without an active subscription see a
paywall instead of the app, and the jaap APIs return `402`.

## How access is decided (`lib/billing/access.ts`)

| State | When | Access |
|---|---|---|
| `subscribed` | Dodo subscription is `active`, or `cancelled` with paid time left (`next_billing_date` in the future) | ✅ |
| `free` | `PAYWALL_LAUNCH_DATE` is unset or still in the future | ✅ |
| `trial` | Less than 14 days since the trial started | ✅ |
| `expired` | Trial over, no current subscription (`on_hold`, `failed`, `expired`, …) | ❌ paywall |

The trial starts on the user's sign-up date, or on `PAYWALL_LAUNCH_DATE` for users
who signed up before the paywall launched, whichever is later. So on launch day
every existing user gets a full 14 days.

## Environment variables

```env
DODO_PAYMENTS_API_KEY="..."
DODO_PAYMENTS_ENVIRONMENT="test_mode"        # or "live_mode" — required, no default
DODO_PAYMENTS_WEBHOOK_SECRET="whsec_..."     # from the webhook endpoint in the Dodo dashboard
DODO_PRODUCT_ID="pdt_..."                    # the ₹100/month product (test and live IDs differ)
APP_URL="https://radhaajaap.com"             # used for the checkout return URL
PAYWALL_LAUNCH_DATE="2026-11-01"             # YYYY-MM-DD (IST). Unset = paywall off
```

`DODO_PAYMENTS_BASE_URL` is for testing against a mock API only; leave it unset.

## Dodo dashboard setup

1. **Product:** a subscription product priced **₹100 (INR), billed monthly**.
   Set its trial to 0 days (checkout also forces `trial_period_days: 0`, because
   the free trial already happened in the app). The pricing page reads the price
   from this product, falling back to `PLAN.fallbackPriceInr` in `lib/billing/plan.ts`.
2. **Webhook:** add `https://radhaajaap.com/api/webhook` and subscribe to all
   `subscription.*` events. Copy its signing secret into `DODO_PAYMENTS_WEBHOOK_SECRET`.
3. **Customer portal:** check it's enabled for your business (if the dashboard
   has the setting). Settings → Subscription → Manage subscription opens it, so
   users can cancel or update their card.

## Flow

1. User taps **Subscribe** (paywall, `/payments`, trial banner or Settings).
2. `POST /api/payments/create-session` creates a Dodo checkout with
   `metadata.userId` and redirects to Dodo.
3. Dodo sends the user back to `/payments/success?subscription_id=…`. That page
   polls `GET /api/payments/verify?subscription_id=…`, which reads the
   subscription from Dodo, checks it belongs to this user, and stores it — so
   access starts immediately even if the webhook is slow.
4. `POST /api/webhook` keeps the stored status current for renewals, failed
   renewals, cancellations and expiry. Events are verified (Standard Webhooks),
   matched to the user by `metadata.userId` or by customer email, and stored
   only if newer than what's already stored (deliveries can arrive out of order).

Subscription data lives in Redis at `radha:subscription:{userId}`.

## Testing in test mode

1. Set the env vars above with `DODO_PAYMENTS_ENVIRONMENT="test_mode"` and a test
   product ID, and set `PAYWALL_LAUNCH_DATE` to a date more than 14 days ago to
   see the paywall with an existing account.
2. Subscribe with a Dodo test card → you should land on "Subscription active".
3. In Settings, open **Manage subscription** and cancel → the app stays unlocked
   until the paid period ends ("Access until …").
4. Check the webhook deliveries in the Dodo dashboard all return `200`.

## Going live

1. Create the live product (₹100/month) and live webhook in the Dodo dashboard.
2. Set `DODO_PAYMENTS_ENVIRONMENT="live_mode"`, the live API key, product ID and
   webhook secret.
3. Set `PAYWALL_LAUNCH_DATE` to launch day. Until then everyone keeps free access.
