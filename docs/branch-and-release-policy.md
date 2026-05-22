# Dedicated Landlord Housing Branch And Release Policy

Last updated: 2026-05-19

## Repository Rule

This project is independent from CAPTYN Housing.

- Dedicated app path: `/home/captyn/landlord-housing`
- Source blueprint only: `/home/captyn/captyn-housing`
- Do not patch CAPTYN Housing for this landlord's custom behavior.
- Backport only generic bug fixes intentionally, after reviewing both apps.

## Branches

Use a simple branch policy until the app has multiple maintainers.

- `main`: production-ready code only.
- `dev`: integration branch for tested work before release.
- `feature/<short-name>`: scoped feature or fix work.
- `hotfix/<short-name>`: urgent production fix branched from `main`.

## Change Flow

1. Branch from `dev` for normal work.
2. Keep changes scoped to the dedicated landlord app.
3. Run verification before merging:
   - `npm run typecheck`
   - `npm test`
4. Merge feature branches into `dev`.
5. Promote `dev` to `main` only after a local or staging smoke test.
6. Tag production releases with dates, for example `release-2026-05-19`.

## Production Gate

Do not deploy a branch unless these pass:

- `npm ci`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run prisma:deploy` or the VPS2 deploy helper's migration step
- `npm run prisma:seed` only for first setup or intentional seed refresh
- `curl -fsS http://localhost:4100/health`

## Secrets Rule

Never commit:

- `.env`
- production credentials,
- local uploads,
- runtime `data/*.json`,
- database dumps.

Keep production secrets in the process manager, deployment secret store, or a server-local `.env` outside git backups.
