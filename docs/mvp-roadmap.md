# CAPTYN Housing MVP Roadmap

## Phase 1: Data Integrity Foundation

- Replace in-memory store with PostgreSQL + Prisma. (In progress: schema + repository added)
- Add migration scripts and schema versioning. (In progress: Prisma migrate scripts added)
- Implement immutable event history for incidents and maintenance updates.

## Phase 2: Identity + Verification

- Add user accounts for tenants, landlords, and CAPTYN reviewers.
- Add role-based access control.
- Add media verification workflow and verification evidence.

## Phase 3: Tenant Trust Features

- Public building profile page.
- Incident timeline with resolution states.
- Vacancy transition timeline (before/after media comparison).

## Phase 4: Operational Security Layer

- CCTV checklist audit model.
- Verification badge issuance and expiry.
- Incident escalation workflow (tenant > property manager > CAPTYN).

## Phase 5: Launch Readiness

- API authentication and rate limits.
- Observability (structured logs, metrics, alerts).
- Seed data for pilot neighborhoods in Nairobi.
