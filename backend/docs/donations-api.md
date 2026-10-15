# Donations API contract (draft v0)

This document defines the planned contract between the frontend
(`assets/js/services/donations.js`) and the backend. The backend is an
unimplemented scaffold; the endpoints below are specifications, not available
services. Changes to this contract require corresponding updates on both sides.

- **Base URL:** `apiBaseUrl` in `assets/js/services/config.js`
- **Format:** JSON (`Content-Type: application/json`)
- **Authentication:** none (donations are anonymous)

---

## `POST /donations/checkout`

The endpoint must create a payment session with the provider and return the URL
to which the frontend should redirect the user.

### Request

```json
{
  "amount": 5,
  "currency": "USD",
  "locale": "es"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | no | Suggested amount. If omitted, the provider displays its amount selector. The backend must validate the minimum and maximum. |
| `currency` | string | no | ISO 4217 code. Defaults to the currency configured in the backend. |
| `locale` | string | no | `"es"` or `"en"`. Language of the payment page. The frontend always sends this field. |

### Response: `201 Created`

```json
{
  "checkoutUrl": "https://checkout.proveedor.com/session/abc123"
}
```

### Errors

| Code | Condition | Body |
|------|-----------|------|
| `400` | Invalid amount or currency | `{ "error": "invalid_amount" }` |
| `429` | Too many requests | `{ "error": "rate_limited" }` |
| `502` | Payment provider failure | `{ "error": "provider_unavailable" }` |
| `500` | Internal error | `{ "error": "internal_error" }` |

---

## `POST /donations/webhook`

The payment provider, not the frontend, will call this endpoint when a payment's
status changes. The backend must:

1. Verify the webhook signature using the provider's secret.
2. Update or create the donation record.
3. Return `200` promptly and process time-consuming work in the background.

The payload details depend on the chosen provider.

---

## Suggested data model: `donation`

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Internal identifier |
| `provider` | string | `stripe`, `mercadopago`, etc. |
| `provider_payment_id` | string | Unique payment ID from the provider |
| `amount` | integer | In the minor currency unit (cents) |
| `currency` | string | ISO 4217 |
| `status` | enum | `pending`, `completed`, `failed`, `refunded` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

> Do not store card data. Store donor personal data only if the provider supplies
> it and there is a clear reason to retain it.
