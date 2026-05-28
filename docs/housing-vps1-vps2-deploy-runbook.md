# Housing VPS1/VPS2 Deploy Runbook

> Legacy CAPTYN Housing reference. For this dedicated landlord app, use
> `docs/production-deployment-runbook.md` and `docs/branch-and-release-policy.md`.

## Topology

- VPS1 serves `housing.captyn.shop` static assets from `housing_web`.
- VPS1 proxies `/api/*` requests to the housing API upstream.
- VPS2 runs `housing_api` and `housing_db`.

Relevant files:

- `../captyn_ecommerce/byg-global/nginx/templates/captyn.vps1.conf.template`
- `../captyn_ecommerce/byg-global/docker-compose.vps1.yml`
- `../captyn_ecommerce/byg-global/docker-compose.vps2.yml`

## What To Deploy

- Frontend-only change:
  deploy VPS1
  examples: `public/landlord.js`, static HTML/CSS, frontend receipts, tenant UI copy
- Backend-only change:
  deploy VPS2
  examples: `src/server.ts`, Prisma-backed services, admin API behavior
- Full-stack housing change:
  deploy VPS1 and VPS2
  examples: landlord posting flow plus API validation or persistence changes

## Standard Deploy Order

1. Confirm which repo paths changed.
2. If `public/` changed, deploy VPS1 so the static housing bundle updates.
3. If `src/`, `prisma/`, or housing service logic changed, deploy VPS2.
4. Hard-refresh the landlord browser session after VPS1 deploy because `public/landlord.js` is cached aggressively.

## Health Checks

- Frontend:
  open `https://housing.captyn.shop`
- API:
  `curl -fsS http://${CORE_PRIVATE_HOST}:4100/health`
- Expected API health shape:
  `{"status":"ok","service":"captyn-housing-api","storage":"prisma"}`

## Repair Command

Use this when a monthly combined charge was skipped for active tenant rooms.

Dry run for one building:

```bash
npm run repair:missing-combined-utility-charges -- --building="Village Inn" --month=2026-04
```

Apply for one building:

```bash
npm run repair:missing-combined-utility-charges -- --building="Village Inn" --month=2026-04 --apply
```

Dry run across every building:

```bash
npm run repair:missing-combined-utility-charges -- --all-buildings --month=2026-04
```

Apply across every building:

```bash
npm run repair:missing-combined-utility-charges -- --all-buildings --month=2026-04 --apply
```

Rules enforced by the repair command:

- only active tenant rooms are considered
- room default combined charges win first
- monthly building adjustments win next
- building default combined charge is the fallback
- rooms that already have any positive utility bill for the target month are skipped
- zero-value water bills for the month are upgraded in place instead of creating duplicates

## Operational Notes

- The repair command updates `AppState.utility_billing_v1`.
- Room default combined charges and monthly adjustments are read from `AppState.runtime_queues_v1`.
- If a housing change is meant to affect live posting behavior and live balances, make sure both the code deploy and any one-time backfill are done. Redeploy alone does not recreate a skipped month.
