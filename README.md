# Dedicated Landlord Housing

Dedicated landlord housing app copied from CAPTYN Housing.

This project is intended to run independently from `/home/captyn/captyn-housing`.
Keep the original CAPTYN Housing deployment untouched.

Current core modules:

- Building registry + CCTV status
- Incident + vacancy snapshots
- Resident support tickets (maintenance/security) with lifecycle + SLA
- Resident auth via phone + password with house-number + building binding
- Tenant-private report/rent/notification access
- Rent ledger with M-PESA callback ingestion + auto reminders (D-3, D-1, overdue)
- Wi-Fi checkout + provisioning flow
- Owner/staff management with a 3-account active limit
- Private recovery admin route with role-checked sessions

Storage modes:

- In-memory (no `DATABASE_URL`)
- Prisma + PostgreSQL (`DATABASE_URL` set)
- Guarded fallback to memory (`ALLOW_MEMORY_FALLBACK_ON_DB_ERROR=true`)

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Configure env:

```bash
cp .env.example .env
```

3. Start development server:

```bash
npm run dev
```

API base URL: `http://localhost:4100`

- Public portal: `GET /`
- Resident desk: `GET /users`
- Admin login: `GET /admin/login`
- Owner console: `GET /landlord`
- Private recovery login: `GET /admin/login`
- Health check: `GET /health`

## One-command local startup

```bash
npm run dev:local
```

Useful DB commands:

```bash
npm run db:up
npm run db:down
npm run db:logs
```

## Split VPS Docker deploy

EstateDesk can deploy like CAPTYN Housing without sharing its runtime:

- VPS2 runs `landlord_housing_api` and `landlord_housing_db` from `docker-compose.vps2.yml`.
- VPS2 binds the API privately on `<vps2-private-ip>:4110`, leaving CAPTYN Housing's `4100` path alone.
- VPS1 runs `estatedesk_web` from `deploy/vps1/docker-compose.estatedesk.yml`.
- VPS1 public Nginx proxies `/api`, `/uploads`, and `/health` to the VPS2 API.

Use `docs/production-deployment-runbook.md` for the full deploy sequence and
copy the environment templates from `deploy/vps1/` and `deploy/vps2/`. The
`deploy/vps1/check-env.sh`, `deploy/vps1/deploy.sh`, `deploy/vps2/check-env.sh`,
and `deploy/vps2/deploy.sh` helpers validate env files before running compose.

## Auth + security controls

- `WIFI_ADMIN_TOKEN`: admin login token
- `WIFI_ROOT_ADMIN_TOKEN` (optional): root admin login token
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`: admin login credentials
- `ROOT_ADMIN_USERNAME`, `ROOT_ADMIN_PASSWORD` (optional): root admin credentials
- `WIFI_PAYMENT_CALLBACK_TOKEN`: token for Wi-Fi payment confirmation callback
- `MPESA_RENT_CALLBACK_TOKEN`: token for rent M-PESA callback endpoint
- `MPESA_STK_ENABLED`: enables Daraja STK initialization and verification
- `MPESA_CONSUMER_KEY` + `MPESA_CONSUMER_SECRET`: Safaricom app credentials
- `MPESA_BUSINESS_SHORT_CODE` + `MPESA_PASSKEY`: STK business credentials
- `MPESA_CALLBACK_URL` (optional): callback URL override for rent STK webhook
- `BASE_URL`: used to derive callback URL when `MPESA_CALLBACK_URL` is not set
- `UPLOADS_DIR`: persistent local media directory, defaults to `uploads`
- `USER_SESSION_COOKIE_NAME` + `ADMIN_SESSION_COOKIE_NAME`: app-specific cookie names
- `HOUSING_COOKIE_DOMAIN`: optional cookie domain; leave blank for host-only cookies
- `HOUSING_COOKIE_SECURE`: force secure cookies in HTTPS production

Resident auth flow:

1. First-time setup: `POST /api/auth/resident/setup-password`
2. Login: `POST /api/auth/resident/login-phone`
3. Use bearer token for resident APIs

Admin auth flow:

1. `POST /api/auth/admin/login` with either:
   - `{ "accessToken": "..." }`
   - `{ "username": "...", "password": "..." }`
2. Server sets secure `landlord_housing_admin_session` cookie by default
2. Access protected `/admin`
3. Admin APIs enforce role checks

Owner/staff auth flow:

1. `POST /api/auth/login` with the seeded owner or staff credentials.
2. Server sets secure `landlord_housing_user_session` cookie by default.
3. Access protected `/landlord`.
4. Owner/staff accounts can manage all buildings in this dedicated app.

## Implemented endpoints

Public + shared:

- `GET /health`
- `GET /api/buildings`
- `GET /api/buildings/:buildingId`
- `POST /api/buildings`
- `POST /api/buildings/:buildingId/incidents`
- `PATCH /api/buildings/:buildingId/incidents/:incidentId/resolve`
- `POST /api/buildings/:buildingId/vacancy-snapshots`
- `GET /api/wifi/packages`
- `POST /api/wifi/payments`
- `GET /api/wifi/payments/:checkoutReference`
- `POST /api/wifi/payments/:checkoutReference/confirm`
- `POST /api/payments/mpesa/rent-callback`

Resident auth:

- `POST /api/auth/resident/setup-password`
- `POST /api/auth/resident/login-phone`
- `GET /api/auth/resident/session`
- `POST /api/auth/resident/logout`

Resident private APIs (tenant-scoped):

- `POST /api/user/reports`
- `GET /api/user/reports`
- `GET /api/user/notifications`
- `GET /api/user/rent-due`
- `POST /api/user/rent/payments/mpesa/initialize`
- `POST /api/user/rent/payments/mpesa/verify`

Admin auth:

- `POST /api/auth/admin/login`
- `GET /api/auth/admin/session`
- `POST /api/auth/admin/logout`

Admin APIs (role checked):

- `GET /api/admin/wifi/packages`
- `PATCH /api/admin/wifi/packages/:packageId`
- `GET /api/admin/wifi/payments`
- `GET /api/admin/overview`
- `GET /api/admin/rent-ledger`
- `GET /api/admin/rent-due?houseNumber=...`
- `PUT /api/admin/rent-due/:houseNumber`
- `GET /api/admin/rent-payments`
- `GET /api/admin/tickets`
- `PATCH /api/admin/tickets/:ticketId/status`
- `POST /api/admin/auth/resident/password-reset`

Owner/staff APIs:

- `GET /api/landlord/startup`
- `GET /api/landlord/staff`
- `POST /api/landlord/staff`
- `DELETE /api/landlord/staff/:userId`

## Example resident password setup

```bash
curl -X POST http://localhost:4100/api/auth/resident/setup-password \
  -H "content-type: application/json" \
  -d '{
    "buildingId": "LANDLORD-BLDG-00001",
    "houseNumber": "A-12",
    "phoneNumber": "0712345678",
    "password": "StrongPass123!"
  }'
```

Then call resident APIs with:

```text
Authorization: Bearer <resident token>
```

Resident sign-in example:

```bash
curl -X POST http://localhost:4100/api/auth/resident/login-phone \
  -H "content-type: application/json" \
  -d '{
    "buildingId": "LANDLORD-BLDG-00001",
    "houseNumber": "A-12",
    "phoneNumber": "0712345678",
    "password": "StrongPass123!"
  }'
```

## Example M-PESA rent callback

```bash
curl -X POST http://localhost:4100/api/payments/mpesa/rent-callback \
  -H "content-type: application/json" \
  -H "x-mpesa-callback-token: change-me" \
  -d '{
    "houseNumber": "A-12",
    "amountKsh": 3500,
    "providerReference": "QWERTY123",
    "phoneNumber": "0712345678"
  }'
```

## Example resident rent M-PESA STK flow

```bash
curl -X POST http://localhost:4100/api/user/rent/payments/mpesa/initialize \
  -H "content-type: application/json" \
  -H "authorization: Bearer <resident token>" \
  -d '{
    "paymentMethod": "mpesa",
    "amountKsh": 3500,
    "billingMonth": "2026-03"
  }'
```

```bash
curl -X POST http://localhost:4100/api/user/rent/payments/mpesa/verify \
  -H "content-type: application/json" \
  -H "authorization: Bearer <resident token>" \
  -d '{
    "checkoutRequestId": "ws_CO_123456789"
  }'
```

## Example ticket lifecycle update (admin)

```bash
curl -X PATCH http://localhost:4100/api/admin/tickets/<ticket-id>/status \
  -H "content-type: application/json" \
  -H "Cookie: landlord_housing_admin_session=<session-cookie>" \
  -d '{
    "status": "in_progress",
    "adminNote": "Assigned to maintenance shift B"
  }'
```

## Production references

- Branch and release policy: `docs/branch-and-release-policy.md`
- Production deployment runbook: `docs/production-deployment-runbook.md`

## Development checks

```bash
npm run typecheck
npm test
```
# landlord-housing
