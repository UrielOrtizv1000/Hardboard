# Planned backend: donations

> **Status: scaffold only; not implemented.**
> This directory reserves space for a future donations backend so it can be
> added without reorganizing the project. The frontend already has integration
> points (see [Frontend integration](#frontend-integration)).

## Why a backend is needed

Accepting donations requires a server because:

- Payment provider secret keys (Stripe, Mercado Pago, PayPal, etc.) must never
  be exposed in the browser.
- Provider webhooks must be verified to confirm that a payment actually completed.
- Donation records are useful for audits, thank-you messages, and reports.

The rest of the site (editor, PDF, languages, and theme) runs entirely in the
browser and does not depend on this backend.

## Planned structure

```text
backend/
├─ docs/
│  └─ donations-api.md   API contract (endpoints, payloads, errors)
├─ src/
│  ├─ config/            Environment variables and payment provider client
│  ├─ routes/            HTTP route definitions (routing only)
│  ├─ controllers/       Request validation and service calls
│  ├─ services/          Business logic (checkout creation, webhook processing)
│  └─ models/            Donation persistence
├─ tests/                Tests
└─ .env.example          Environment variable template (copy to .env)
```

Layering rule: `routes → controllers → services → models`. Each layer depends
only on the next; routes must not contain business logic.

## Open decisions

| Topic | Options | Notes |
|-------|---------|-------|
| Language / framework | Node (Express/Fastify), Python (FastAPI), etc. | Not decided |
| Payment provider | Stripe Checkout, Mercado Pago, PayPal | Choose based on country and fees |
| Database | PostgreSQL, SQLite | For donation records |
| Hosting | Same domain (`/api`) or a subdomain | Determines `apiBaseUrl` and CORS settings |

## Frontend integration

The frontend already includes:

- `assets/js/services/config.js`: `apiBaseUrl` and the `donations.enabled` flag.
- `assets/js/services/donations.js`: calls `POST /donations/checkout` and redirects to `checkoutUrl`.
- A Donate button in `index.html` (`data-action="donate"`).

To enable donations once the backend is implemented:

1. Implement the endpoints described in [`docs/donations-api.md`](docs/donations-api.md).
2. Set `apiBaseUrl` and `donations.enabled = true` in `assets/js/services/config.js`.
3. Configure backend CORS to allow the site's domain.
4. Optionally, add thank-you and cancellation pages to the frontend.

## Security checklist

- [ ] Keep provider keys in environment variables only (`.env` is in `.gitignore`).
- [ ] Verify webhook signatures before trusting their contents.
- [ ] Validate and limit donation amounts received from the client.
- [ ] Restrict CORS to the site's domain.
- [ ] Apply rate limiting to `/donations/checkout`.
- [ ] Leave card data storage to the payment provider.
