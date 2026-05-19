# CAPTYN Housing Building Configuration Platform Plan

## Goal

Make CAPTYN Housing configurable per building without turning the product into custom software for every landlord.

The platform should provide a fixed core and a strong menu of landlord-selectable options. A landlord should be able to enable, disable, and tune supported modules per building while CAPTYN keeps the data model, workflows, and audit surface consistent.

## Current Baseline

The codebase already has some useful building-level controls:

- `PaymentAccessService` stores building payment toggles for `rent`, `water`, and `electricity`.
- `TenantAgreement` already stores building-specific lease terms such as `monthlyRentKsh`, `depositKsh`, and `paymentDueDay`.
- The service layer already has separate modules for rent, utility billing, Wi-Fi, support, incidents, and user accounts.

The main gap is that customization is inconsistent:

- some controls are per building,
- some are global,
- some are hardcoded for a specific building name.

Examples of current limitations:

- combined utility billing is hardcoded by building name (`Village Inn`) during server startup,
- Wi-Fi package management is global instead of building-scoped,
- there is no single source of truth for building capabilities and rules.

## Product Principle

Do not let landlords define arbitrary logic.

Instead, define a platform-owned configuration model with:

- standard modules,
- standard billing rules,
- standard workflow knobs,
- standard document and onboarding options.

This keeps the app flexible enough for real buildings while preserving testability, supportability, and auditability.

## Recommended Model

Add a first-class building configuration object tied to `Building`.

Recommended new Prisma models:

```prisma
enum BuildingModuleKey {
  rent
  water
  electricity
  wifi
  tenant_applications
  tenant_agreements
  incidents
  maintenance
  caretaker
  expenditure_tracking
}

enum UtilityBillingMode {
  metered
  fixed_charge
  combined_charge
  disabled
}

enum WifiAccessMode {
  disabled
  voucher_packages
}

model BuildingConfiguration {
  id                          String   @id @default(uuid())
  buildingId                  String   @unique
  rentEnabled                 Boolean  @default(true)
  waterEnabled                Boolean  @default(true)
  electricityEnabled          Boolean  @default(true)
  wifiEnabled                 Boolean  @default(false)
  tenantApplicationsEnabled   Boolean  @default(true)
  tenantAgreementsEnabled     Boolean  @default(true)
  incidentsEnabled            Boolean  @default(true)
  maintenanceEnabled          Boolean  @default(true)
  caretakerEnabled            Boolean  @default(false)
  expenditureTrackingEnabled  Boolean  @default(false)

  utilityBillingMode          UtilityBillingMode @default(metered)
  utilityBalanceVisibleDays   Int                @default(7)
  rentGraceDays               Int                @default(0)
  allowManualRentPosting      Boolean            @default(true)
  allowManualUtilityPosting   Boolean            @default(true)
  wifiAccessMode              WifiAccessMode     @default(disabled)
  reminderPolicy              Json?
  onboardingPolicy            Json?
  agreementPolicy             Json?
  metadata                    Json?
  createdAt                   DateTime           @default(now())
  updatedAt                   DateTime           @updatedAt

  building Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)
}

model BuildingWifiPackage {
  id          String   @id @default(uuid())
  buildingId  String
  packageCode String
  name        String
  hours       Int
  priceKsh    Int
  profile     String
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  building Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)

  @@unique([buildingId, packageCode])
  @@index([buildingId, enabled])
}
```

## Why This Shape

Use typed columns for high-value, frequently-checked settings.

Examples:

- module enablement,
- utility billing mode,
- rent grace days,
- Wi-Fi mode.

Use JSON only for less frequent and evolving policy detail.

Examples:

- reminder schedule definitions,
- custom agreement clauses,
- onboarding field requirements,
- landlord notes or labels.

This gives enough structure for validation and queries while avoiding endless migrations for low-risk metadata.

## What Should Become Configurable

### 1. Module Access Per Building

Landlord should be able to toggle:

- rent collection,
- water billing,
- electricity billing,
- Wi-Fi billing,
- tenant applications,
- tenant agreements,
- incident reporting,
- maintenance queue,
- caretaker access,
- building expenditure tracking.

This replaces scattered or partial enablement logic with one building-level source of truth.

### 2. Billing Rules Per Building

Landlord should be able to configure:

- rent enabled or disabled,
- default due day,
- grace period,
- manual vs automated posting allowed,
- utility billing mode per channel,
- fixed utility charge support,
- combined utility charge support,
- visibility window for balances,
- accepted payment channels,
- whether partial payments are allowed.

Important boundary:

Do not allow arbitrary formulas in MVP. Support named billing modes and a few numeric parameters only.

### 3. Wi-Fi Per Building

Wi-Fi should move from global packages to building-scoped packages.

Each building should be able to choose:

- Wi-Fi enabled or disabled,
- voucher mode enabled or disabled,
- which packages are offered,
- package prices,
- hotspot profile names,
- whether the building uses CAPTYN-managed provisioning.

This replaces the current global package registry.

### 4. Tenant Intake and Agreement Rules

Each building should be able to choose:

- whether tenant applications are required,
- whether ID details are mandatory,
- whether occupation details are mandatory,
- whether emergency contact is mandatory,
- whether agreements are required before activation,
- whether deposit is required,
- standard house rules and special terms template.

### 5. Workflow Settings

Each building should be able to choose:

- who can resolve incidents,
- who can create utility bills,
- whether caretakers can manage tenants,
- reminder schedule for rent,
- reminder schedule for utilities,
- whether landlord approval is needed for applications,
- whether tenant move-in activation requires agreement completion.

## Recommended API Surface

Add explicit building configuration endpoints.

### Admin or Landlord Configuration Endpoints

```text
GET    /api/buildings/:buildingId/configuration
PUT    /api/buildings/:buildingId/configuration
PATCH  /api/buildings/:buildingId/configuration/modules
PATCH  /api/buildings/:buildingId/configuration/billing
PATCH  /api/buildings/:buildingId/configuration/workflows
```

### Building Wi-Fi Endpoints

```text
GET    /api/buildings/:buildingId/wifi/packages
POST   /api/buildings/:buildingId/wifi/packages
PATCH  /api/buildings/:buildingId/wifi/packages/:packageId
DELETE /api/buildings/:buildingId/wifi/packages/:packageId
```

### Optional Read-Only Tenant Capability Endpoint

```text
GET    /api/buildings/:buildingId/capabilities
```

This endpoint should return only safe, tenant-visible capabilities such as:

- rent payments available,
- utility payments available,
- Wi-Fi purchase available,
- applications open,
- support modules active.

## Internal Service Refactor Plan

### PaymentAccessService

Current role:

- stores building toggles for rent, water, electricity.

Recommended change:

- absorb this behavior into `BuildingConfiguration`,
- keep a compatibility adapter during rollout,
- stop persisting payment access in a separate JSON/file-based state.

### UtilityBillingService

Current issue:

- combined billing is activated by hardcoded building name.

Recommended change:

- read utility billing mode from `BuildingConfiguration`,
- optionally allow separate mode per utility channel in phase 2,
- remove any building-name-based logic.

### WifiAccessService

Current issue:

- package catalog is global.

Recommended change:

- make packages building-scoped,
- when creating payment, validate package against the requested building,
- store the package identity in a building-safe way.

### RentLedgerService

Recommended change:

- keep ledger mechanics stable,
- use building config for visibility and workflow rules,
- continue storing per-unit financial facts separately from the config.

### UserAccountService

Recommended change:

- enforce agreement and intake rules from building config,
- keep tenant agreement record as the factual agreement instance,
- treat config as default policy, not as a replacement for actual agreements.

## Suggested Response Shape

Recommended configuration payload shape:

```json
{
  "buildingId": "bld_123",
  "modules": {
    "rent": true,
    "water": true,
    "electricity": false,
    "wifi": true,
    "tenantApplications": true,
    "tenantAgreements": true,
    "incidents": true,
    "maintenance": true,
    "caretaker": false,
    "expenditureTracking": true
  },
  "billing": {
    "utilityBillingMode": "combined_charge",
    "utilityBalanceVisibleDays": 7,
    "rentGraceDays": 3,
    "allowManualRentPosting": true,
    "allowManualUtilityPosting": true
  },
  "workflows": {
    "applicationsRequireApproval": true,
    "agreementRequiredBeforeMoveIn": true,
    "caretakerCanManageTenants": false
  },
  "agreements": {
    "depositRequired": true,
    "emergencyContactRequired": true,
    "occupationDetailsRequired": false,
    "defaultSpecialTerms": "No subletting. Quiet hours from 10pm."
  },
  "updatedAt": "2026-03-23T00:00:00.000Z"
}
```

## Rollout Phases

### Phase 1: Create the Source of Truth

- add `BuildingConfiguration`,
- backfill defaults for all existing buildings,
- mirror current `PaymentAccessService` values into the new table,
- add read path only first.

### Phase 2: Move Existing Logic

- switch rent/water/electricity enablement reads to `BuildingConfiguration`,
- replace hardcoded combined utility building selection,
- add building-scoped Wi-Fi package reads.

### Phase 3: Add Management APIs

- add landlord/admin endpoints for configuration,
- add validation and permission checks,
- add audit logging of config changes.

### Phase 4: Remove Legacy Paths

- deprecate file-based payment access state,
- remove global Wi-Fi package assumptions,
- remove hardcoded building-specific conditions.

## Audit and Safety Requirements

Every config update should record:

- actor user id,
- actor role,
- building id,
- changed fields,
- previous value,
- next value,
- timestamp,
- optional note.

This is important because building configuration affects money, access, and tenant-facing behavior.

## What Not To Build Yet

Avoid these for now:

- landlord-defined formulas,
- arbitrary workflow builders,
- plugin execution,
- custom script hooks,
- per-landlord schema branching,
- free-form permissions matrix.

Those features create a support and security burden far beyond the value needed for the current product stage.

## Recommended Immediate Implementation Order

1. Add `BuildingConfiguration` Prisma model and migration.
2. Backfill one config row per building.
3. Replace hardcoded combined utility logic with config reads.
4. Move payment access toggles into the new config read path.
5. Add building-scoped Wi-Fi package storage.
6. Add landlord/admin config endpoints.
7. Add audit history for config changes.

## Bottom Line

The correct direction is not to keep adding isolated switches.

The correct direction is to make `building configuration` a first-class platform concept. CAPTYN should stay one product, but each landlord should be able to choose from a controlled menu of supported building behaviors.
