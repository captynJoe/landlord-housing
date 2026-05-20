# Dedicated Landlord Housing Production Deployment Runbook

Last updated: 2026-05-19

## Target Shape

Deploy EstateDesk as its own service, database, uploads volume, and public domain.
CAPTYN Housing remains separate and keeps its current deployment.

Recommended production topology:

- VPS2: `landlord_housing_api` plus `landlord_housing_db`.
- VPS2 private bind: `<vps2-private-ip>:4110 -> container port 4100`.
- VPS1: `estatedesk_web` static Nginx service for `public/`.
- VPS1 public Nginx: proxies `/api`, `/uploads`, and `/health` to VPS2.
- Database: dedicated PostgreSQL database named `landlord_housing`.
- Uploads: dedicated Docker volume mounted at `/var/lib/landlord-housing/uploads`.
- Memory fallback: disabled.

Port `4110` is intentional so this service does not collide with the existing
CAPTYN Housing backend on `4100`.

## Deployment Files

- `Dockerfile`: production API image.
- `.dockerignore`: keeps mutable/runtime files out of the image build context.
- `docker-compose.vps2.yml`: VPS2 API and PostgreSQL deployment.
- `deploy/vps2/env.estatedesk.example`: VPS2 environment template.
- `deploy/vps1/docker-compose.estatedesk.yml`: VPS1 compose override for the static web service and public Nginx template mount.
- `deploy/vps1/estatedesk-web.conf`: static Nginx config for the frontend routes.
- `deploy/vps1/estatedesk.vps1.conf.template`: public reverse proxy template.
- `deploy/vps1/env.estatedesk.example`: VPS1 environment template.
- `deploy/vps2/check-env.sh` and `deploy/vps2/deploy.sh`: VPS2 validation and deploy helpers.
- `deploy/vps1/check-env.sh` and `deploy/vps1/deploy.sh`: VPS1 validation and deploy helpers.

## VPS2 Backend Deploy

Run these on the backend VPS that hosts the API and database.

```bash
cd /home/captyn/landlord-housing
cp deploy/vps2/env.estatedesk.example .env.vps2
```

Edit `.env.vps2` and set at minimum:

```bash
ESTATEDESK_PRIVATE_BIND_IP=<vps2-private-ip>
ESTATEDESK_BASE_URL=https://<customer-domain>
ESTATEDESK_CORS_ORIGIN=https://<customer-domain>
LANDLORD_HOUSING_DB_PASSWORD=<strong-database-password>
ESTATEDESK_WIFI_PAYMENT_CALLBACK_TOKEN=<strong-unique-token>
ESTATEDESK_MPESA_RENT_CALLBACK_TOKEN=<strong-unique-token>
ESTATEDESK_RECOVERY_LANDLORD_PASSWORD=<strong-owner-recovery-password>
ESTATEDESK_RECOVERY_ADMIN_PASSWORD=<strong-admin-recovery-password>
ESTATEDESK_RECOVERY_ROOT_PASSWORD=<strong-root-recovery-password>
ESTATEDESK_SEED_OWNER_PASSWORD=<temporary-owner-password>
```

Start the service:

```bash
deploy/vps2/check-env.sh
deploy/vps2/deploy.sh
```

Apply the seed once after the first deploy. The helper runs Prisma migrations
before the seed so the database tables exist:

```bash
deploy/vps2/deploy.sh --seed
```

Keep `ESTATEDESK_RUN_SEED_ON_START=false` for normal operation. Set it to
`true` only for a deliberate first-launch seed, because the seed carries owner
account defaults that should not be rewritten on every restart.

Backend health check:

```bash
curl -fsS http://<vps2-private-ip>:4110/health
```

Expected shape:

```json
{"status":"ok","service":"landlord-housing-api","storage":"prisma"}
```

## VPS1 Frontend And Public Proxy Deploy

Run these on the frontend VPS that already hosts the public Nginx entrypoint.
The frontend VPS needs this repo present so it can mount `public/` and the
EstateDesk Nginx templates.

```bash
cd /home/captyn/landlord-housing
cp deploy/vps1/env.estatedesk.example .env.vps1
```

Edit `.env.vps1` and set:

```bash
ESTATEDESK_SERVER_NAME=<customer-domain>
ESTATEDESK_PUBLIC_DIR=/home/captyn/landlord-housing/public
ESTATEDESK_API_UPSTREAM=http://<vps2-private-ip>:4110
ESTATEDESK_SSL_CERTIFICATE=/etc/letsencrypt/live/captyn.shop/fullchain.pem
ESTATEDESK_SSL_CERTIFICATE_KEY=/etc/letsencrypt/live/captyn.shop/privkey.pem
```

Then run the compose override from the existing frontend stack:

```bash
deploy/vps1/check-env.sh
deploy/vps1/deploy.sh
```

The VPS1 helper expects the frontend stack at
`/home/captyn/captyn_ecommerce/byg-global/docker-compose.vps1.yml`. If that
path changes, set `ESTATEDESK_VPS1_BASE_COMPOSE` before running it. The helper
also loads `.env`, `.env.common`, `.env.backend`, and `.env.frontend` from the
frontend stack when those files exist, because the base compose file needs those
values during interpolation.

Manual equivalent:

```bash
cd /home/captyn/captyn_ecommerce/byg-global
docker compose --env-file .env \
  --env-file .env.common \
  --env-file .env.backend \
  --env-file .env.frontend \
  --env-file /home/captyn/landlord-housing/.env.vps1 \
  -f docker-compose.vps1.yml \
  -f /home/captyn/landlord-housing/deploy/vps1/docker-compose.estatedesk.yml \
  up -d estatedesk_web nginx

docker compose --env-file .env \
  --env-file .env.common \
  --env-file .env.backend \
  --env-file .env.frontend \
  --env-file /home/captyn/landlord-housing/.env.vps1 \
  -f docker-compose.vps1.yml \
  -f /home/captyn/landlord-housing/deploy/vps1/docker-compose.estatedesk.yml \
  exec -T nginx nginx -t
```

Public health check:

```bash
curl -fsS https://<customer-domain>/health
```

## DNS And Cloudflare

Point the customer domain or subdomain at VPS1. The public Nginx template
matches the current CAPTYN pattern and rejects traffic without Cloudflare's
`CF-Ray` header, so the domain should be proxied through Cloudflare unless that
guard is intentionally removed.

## Payment Environment

Before enabling live M-PESA:

```bash
ESTATEDESK_MPESA_STK_ENABLED=false
ESTATEDESK_MPESA_ENVIRONMENT=sandbox
ESTATEDESK_MPESA_CALLBACK_URL=https://<customer-domain>/api/payments/mpesa/rent-callback
ESTATEDESK_MPESA_PAYMENT_PROFILES_JSON=[]
```

Switch `ESTATEDESK_MPESA_STK_ENABLED=true` only after sandbox STK and callback
verification pass. Use customer-specific callback tokens and M-PESA credentials;
do not reuse CAPTYN Housing production payment secrets.

For building-level payment routing, keep the default `ESTATEDESK_MPESA_*`
credentials as the fallback account and add extra building-selectable profiles
with `ESTATEDESK_MPESA_PAYMENT_PROFILES_JSON`. Example shape:

```bash
ESTATEDESK_MPESA_PAYMENT_PROFILES_JSON=[{"id":"building-a","name":"Building A Rent Account","shortCode":"123456","partyB":"123456","consumerKey":"<safaricom-consumer-key>","consumerSecret":"<safaricom-consumer-secret>","passkey":"<safaricom-passkey>","accountReferencePrefix":"BLDGA"}]
```

The manager UI shows profile names, shortcodes, and assignment status. It does
not expose consumer secrets or passkeys.

## Smoke Test

After deployment:

- owner login at `/landlord/login`,
- owner/staff list via `/api/landlord/staff`,
- building creation or existing building load,
- resident signup,
- owner approval,
- resident phone login,
- resident dashboard only shows the assigned room,
- image upload writes under the `landlord_housing_uploads` volume,
- M-PESA callback token rejects bad requests.

## Rollback

1. On VPS1, roll back the public assets/templates or point the domain away.
2. On VPS2, redeploy the previous image or git tag with the same compose file.
3. Keep the database unchanged unless a migration explicitly requires rollback.
4. Keep the uploads volume; do not delete `landlord_housing_uploads`.
5. Recheck `/health` on both the private and public URLs.
