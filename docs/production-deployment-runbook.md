# Dedicated Landlord Housing Production Deployment Runbook

Last updated: 2026-05-19

## Target Shape

Run this app as its own deployment, database, uploads directory, and domain or subdomain.

Recommended production defaults:

- app port: `4100` or another unused local port,
- database: dedicated PostgreSQL database,
- public URL: customer-specific HTTPS domain,
- uploads: persistent server directory outside release artifacts,
- memory fallback: disabled.

## Required Environment

Set these before production start:

```bash
NODE_ENV=production
PORT=4100
BASE_URL=https://<customer-domain>
CORS_ORIGIN=https://<customer-domain>
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>?schema=public
ALLOW_MEMORY_FALLBACK_ON_DB_ERROR=false
UPLOADS_DIR=/var/lib/landlord-housing/uploads
USER_SESSION_COOKIE_NAME=landlord_housing_user_session
ADMIN_SESSION_COOKIE_NAME=landlord_housing_admin_session
HOUSING_COOKIE_SECURE=true
HOUSING_COOKIE_DOMAIN=
```

Leave `HOUSING_COOKIE_DOMAIN` blank for host-only cookies. Set it only when the same session should intentionally work across subdomains.

## Payment Environment

Before enabling live M-PESA:

```bash
MPESA_STK_ENABLED=false
MPESA_ENVIRONMENT=sandbox
MPESA_CALLBACK_URL=https://<customer-domain>/api/payments/mpesa/rent-callback
MPESA_RENT_CALLBACK_TOKEN=<strong-unique-token>
WIFI_PAYMENT_CALLBACK_TOKEN=<strong-unique-token>
```

Switch `MPESA_STK_ENABLED=true` only after sandbox STK and callback verification pass.

## First Server Setup

1. Create PostgreSQL database and user.
2. Create persistent uploads directory:

```bash
sudo mkdir -p /var/lib/landlord-housing/uploads
sudo chown -R captyn:captyn /var/lib/landlord-housing
```

3. Install dependencies:

```bash
npm ci
```

4. Apply schema and seed the primary owner:

```bash
npm run prisma:deploy
npm run prisma:seed
```

5. Build and start:

```bash
npm run build
npm start
```

## Reverse Proxy

Proxy the customer domain to the local app port.

Minimum requirements:

- preserve `Host`,
- set `X-Forwarded-Proto https`,
- allow `/uploads/*`,
- route `/api/payments/mpesa/rent-callback` to this app,
- keep request body limits high enough for image uploads.

## Smoke Test

After deployment:

```bash
curl -fsS https://<customer-domain>/health
```

Then verify:

- owner login at `/landlord/login`,
- owner/staff list via `/api/landlord/staff`,
- building creation or existing building load,
- resident signup,
- owner approval,
- resident phone login,
- resident dashboard only shows the assigned room,
- image upload writes under `UPLOADS_DIR`,
- M-PESA callback token rejects bad requests.

## Rollback

1. Stop the app process.
2. Restore the previous release directory or git tag.
3. Keep the database unchanged unless a migration explicitly requires rollback.
4. Restart and check `/health`.
5. If uploads changed, do not delete the uploads directory.

