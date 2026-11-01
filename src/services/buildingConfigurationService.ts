import type {
  BuildingConfiguration,
  Prisma,
  PrismaClient,
  UtilityBillingMode,
  WifiAccessMode
} from "@prisma/client";
import type { Building } from "../domain/types.js";
import type { BuildingPaymentAccessRecord } from "./paymentAccessService.js";

export type BuildingConfigurationRecord = {
  buildingId: string;
  rentEnabled: boolean;
  waterEnabled: boolean;
  electricityEnabled: boolean;
  wifiEnabled: boolean;
  tenantApplicationsEnabled: boolean;
  tenantAgreementsEnabled: boolean;
  incidentsEnabled: boolean;
  maintenanceEnabled: boolean;
  caretakerEnabled: boolean;
  expenditureTrackingEnabled: boolean;
  utilityBillingMode: UtilityBillingMode;
  defaultWaterRatePerUnitKsh: number | null;
  defaultElectricityRatePerUnitKsh: number | null;
  defaultWaterFixedChargeKsh: number | null;
  defaultElectricityFixedChargeKsh: number | null;
  defaultCombinedUtilityChargeKsh: number | null;
  defaultMonthlyRentKsh: number | null;
  defaultRentDueDay: number | null;
  meterReadingDay: number | null;
  includedWaterUnits: number | null;
  includedElectricityUnits: number | null;
  utilityBalanceVisibleDays: number;
  rentGraceDays: number;
  lateRentPenaltyEnabled: boolean;
  lateRentPenaltyAmountKsh: number;
  allowManualRentPosting: boolean;
  allowManualUtilityPosting: boolean;
  wifiAccessMode: WifiAccessMode;
  reminderPolicy?: Prisma.JsonValue | null;
  onboardingPolicy?: Prisma.JsonValue | null;
  agreementPolicy?: Prisma.JsonValue | null;
  metadata?: Prisma.JsonValue | null;
  updatedByRole?: string;
  updatedByUserId?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export interface UpdateBuildingConfigurationInput {
  rentEnabled?: boolean;
  waterEnabled?: boolean;
  electricityEnabled?: boolean;
  wifiEnabled?: boolean;
  tenantApplicationsEnabled?: boolean;
  tenantAgreementsEnabled?: boolean;
  incidentsEnabled?: boolean;
  maintenanceEnabled?: boolean;
  caretakerEnabled?: boolean;
  expenditureTrackingEnabled?: boolean;
  utilityBillingMode?: UtilityBillingMode;
  defaultWaterRatePerUnitKsh?: number | null;
  defaultElectricityRatePerUnitKsh?: number | null;
  defaultWaterFixedChargeKsh?: number | null;
  defaultElectricityFixedChargeKsh?: number | null;
  defaultCombinedUtilityChargeKsh?: number | null;
  defaultMonthlyRentKsh?: number | null;
  defaultRentDueDay?: number | null;
  meterReadingDay?: number | null;
  includedWaterUnits?: number | null;
  includedElectricityUnits?: number | null;
  utilityBalanceVisibleDays?: number;
  rentGraceDays?: number;
  lateRentPenaltyEnabled?: boolean;
  lateRentPenaltyAmountKsh?: number;
  allowManualRentPosting?: boolean;
  allowManualUtilityPosting?: boolean;
  wifiAccessMode?: WifiAccessMode;
  metadata?: Prisma.InputJsonValue;
  agreementPolicy?: Prisma.InputJsonValue;
  note?: string;
}

interface UpdateActor {
  role?: string;
  userId?: string;
}

const DEFAULT_CONFIG = {
  rentEnabled: true,
  waterEnabled: true,
  electricityEnabled: true,
  wifiEnabled: false,
  tenantApplicationsEnabled: true,
  tenantAgreementsEnabled: true,
  incidentsEnabled: true,
  maintenanceEnabled: true,
  caretakerEnabled: false,
  expenditureTrackingEnabled: false,
  utilityBillingMode: "metered" as UtilityBillingMode,
  defaultWaterRatePerUnitKsh: 150 as number | null,
  defaultElectricityRatePerUnitKsh: null as number | null,
  defaultWaterFixedChargeKsh: null as number | null,
  defaultElectricityFixedChargeKsh: null as number | null,
  defaultCombinedUtilityChargeKsh: null as number | null,
  defaultMonthlyRentKsh: null as number | null,
  defaultRentDueDay: null as number | null,
  meterReadingDay: null as number | null,
  includedWaterUnits: null as number | null,
  includedElectricityUnits: null as number | null,
  utilityBalanceVisibleDays: 7,
  rentGraceDays: 0,
  lateRentPenaltyEnabled: false,
  lateRentPenaltyAmountKsh: 0,
  allowManualRentPosting: true,
  allowManualUtilityPosting: true,
  wifiAccessMode: "disabled" as WifiAccessMode
};

function mapConfig(value: BuildingConfiguration): BuildingConfigurationRecord {
  return {
    buildingId: value.buildingId,
    rentEnabled: value.rentEnabled,
    waterEnabled: value.waterEnabled,
    electricityEnabled: value.electricityEnabled,
    wifiEnabled: value.wifiEnabled,
    tenantApplicationsEnabled: value.tenantApplicationsEnabled,
    tenantAgreementsEnabled: value.tenantAgreementsEnabled,
    incidentsEnabled: value.incidentsEnabled,
    maintenanceEnabled: value.maintenanceEnabled,
    caretakerEnabled: value.caretakerEnabled,
    expenditureTrackingEnabled: value.expenditureTrackingEnabled,
    utilityBillingMode: value.utilityBillingMode,
    defaultWaterRatePerUnitKsh: value.defaultWaterRatePerUnitKsh,
    defaultElectricityRatePerUnitKsh: value.defaultElectricityRatePerUnitKsh,
    defaultWaterFixedChargeKsh: value.defaultWaterFixedChargeKsh,
    defaultElectricityFixedChargeKsh: value.defaultElectricityFixedChargeKsh,
    defaultCombinedUtilityChargeKsh: value.defaultCombinedUtilityChargeKsh,
    defaultMonthlyRentKsh: value.defaultMonthlyRentKsh,
    defaultRentDueDay: value.defaultRentDueDay,
    meterReadingDay: value.meterReadingDay,
    includedWaterUnits: value.includedWaterUnits ?? null,
    includedElectricityUnits: value.includedElectricityUnits ?? null,
    utilityBalanceVisibleDays: value.utilityBalanceVisibleDays,
    rentGraceDays: value.rentGraceDays,
    lateRentPenaltyEnabled: value.lateRentPenaltyEnabled,
    lateRentPenaltyAmountKsh: value.lateRentPenaltyAmountKsh,
    allowManualRentPosting: value.allowManualRentPosting,
    allowManualUtilityPosting: value.allowManualUtilityPosting,
    wifiAccessMode: value.wifiAccessMode,
    reminderPolicy: value.reminderPolicy,
    onboardingPolicy: value.onboardingPolicy,
    agreementPolicy: value.agreementPolicy,
    metadata: value.metadata,
    updatedByRole: value.updatedByRole ?? undefined,
    updatedByUserId: value.updatedByUserId ?? undefined,
    note: value.note ?? undefined,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString()
  };
}

function normalizeOptionalNonNegativeNumber(value: number | null | undefined): number | null | undefined {
  if (value == null) {
    return value;
  }

  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return 0;
  }

  return Math.max(0, normalized);
}

export function toPaymentAccessRecord(
  value: BuildingConfigurationRecord
): BuildingPaymentAccessRecord {
  return {
    buildingId: value.buildingId,
    rentEnabled: value.rentEnabled,
    waterEnabled: value.waterEnabled,
    electricityEnabled: value.electricityEnabled,
    updatedAt: value.updatedAt,
    updatedByRole: value.updatedByRole,
    updatedByUserId: value.updatedByUserId,
    note: value.note
  };
}

export class BuildingConfigurationService {
  private readonly buildingsKnownToHaveConfig = new Set<string>();

  constructor(private readonly prisma: PrismaClient) {}

  async ensureDefaultsForBuildings(buildings: Array<Pick<Building, "id">>): Promise<void> {
    // This is called on every landlord startup/refresh for every visible building — once a
    // building has a config row (the overwhelmingly common case), re-upserting it every time
    // is pure wasted round trips, so skip anything we've already confirmed exists.
    const pending = buildings.filter(
      (building) => !this.buildingsKnownToHaveConfig.has(building.id)
    );
    if (pending.length === 0) {
      return;
    }

    await this.prisma.$transaction(
      pending.map((building) =>
        this.prisma.buildingConfiguration.upsert({
          where: { buildingId: building.id },
          update: {},
          create: {
            buildingId: building.id,
            ...DEFAULT_CONFIG
          }
        })
      )
    );

    for (const building of pending) {
      this.buildingsKnownToHaveConfig.add(building.id);
    }
  }

  async listForBuildings(buildingIds: string[]): Promise<BuildingConfigurationRecord[]> {
    if (buildingIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.buildingConfiguration.findMany({
      where: { buildingId: { in: buildingIds } },
      orderBy: { buildingId: "asc" }
    });

    return rows.map(mapConfig);
  }

  async getForBuilding(buildingId: string): Promise<BuildingConfigurationRecord | null> {
    const row = await this.prisma.buildingConfiguration.findUnique({
      where: { buildingId }
    });

    return row ? mapConfig(row) : null;
  }

  async syncLegacyPaymentAccess(records: BuildingPaymentAccessRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const knownBuildingIds = new Set(
      (
        await this.prisma.building.findMany({
          where: {
            id: {
              in: records.map((row) => row.buildingId)
            }
          },
          select: { id: true }
        })
      ).map((item) => item.id)
    );
    const validRecords = records.filter((row) => knownBuildingIds.has(row.buildingId));
    if (validRecords.length === 0) {
      return;
    }

    const existingConfigurations = await this.prisma.buildingConfiguration.findMany({
      where: { buildingId: { in: validRecords.map((row) => row.buildingId) } },
      select: { buildingId: true }
    });
    const existingBuildingIds = new Set(
      existingConfigurations.map((row) => row.buildingId)
    );
    const recordsToSeed = validRecords.filter(
      (row) => !existingBuildingIds.has(row.buildingId)
    );

    if (recordsToSeed.length === 0) {
      return;
    }

    await this.prisma.buildingConfiguration.createMany({
      data: recordsToSeed.map((row) => ({
        buildingId: row.buildingId,
        ...DEFAULT_CONFIG,
        rentEnabled: row.rentEnabled,
        waterEnabled: row.waterEnabled,
        electricityEnabled: row.electricityEnabled,
        updatedByRole: row.updatedByRole,
        updatedByUserId: row.updatedByUserId,
        note: row.note
      })),
      skipDuplicates: true
    });
  }

  async updateForBuilding(
    buildingId: string,
    input: UpdateBuildingConfigurationInput,
    actor?: UpdateActor
  ): Promise<BuildingConfigurationRecord> {
    const normalizedDefaultWaterRatePerUnitKsh = normalizeOptionalNonNegativeNumber(
      input.defaultWaterRatePerUnitKsh
    );
    const normalizedDefaultElectricityRatePerUnitKsh =
      normalizeOptionalNonNegativeNumber(input.defaultElectricityRatePerUnitKsh);
    const normalizedDefaultWaterFixedChargeKsh = normalizeOptionalNonNegativeNumber(
      input.defaultWaterFixedChargeKsh
    );
    const normalizedDefaultElectricityFixedChargeKsh = normalizeOptionalNonNegativeNumber(
      input.defaultElectricityFixedChargeKsh
    );
    const normalizedDefaultCombinedUtilityChargeKsh =
      input.defaultCombinedUtilityChargeKsh == null
        ? input.defaultCombinedUtilityChargeKsh
        : Math.max(0, Math.round(Number(input.defaultCombinedUtilityChargeKsh) || 0));
    const normalizedDefaultMonthlyRentKsh =
      input.defaultMonthlyRentKsh == null
        ? input.defaultMonthlyRentKsh
        : Math.max(0, Math.round(Number(input.defaultMonthlyRentKsh) || 0));
    const normalizedDefaultRentDueDay =
      input.defaultRentDueDay == null
        ? input.defaultRentDueDay
        : Math.min(31, Math.max(1, Math.round(Number(input.defaultRentDueDay) || 1)));
    const normalizedMeterReadingDay =
      input.meterReadingDay == null
        ? input.meterReadingDay
        : Math.min(31, Math.max(1, Math.round(Number(input.meterReadingDay) || 1)));
    const normalizeIncludedUnits = (value: number | null | undefined) =>
      value == null ? value : Math.min(100_000, Math.max(0, Number(value) || 0));
    const normalizedIncludedWaterUnits = normalizeIncludedUnits(input.includedWaterUnits);
    const normalizedIncludedElectricityUnits = normalizeIncludedUnits(
      input.includedElectricityUnits
    );
    const normalizedLateRentPenaltyAmountKsh =
      input.lateRentPenaltyAmountKsh == null
        ? input.lateRentPenaltyAmountKsh
        : Math.max(0, Math.round(Number(input.lateRentPenaltyAmountKsh) || 0));

    const row = await this.prisma.buildingConfiguration.upsert({
      where: { buildingId },
      update: {
        ...input,
        defaultWaterRatePerUnitKsh: normalizedDefaultWaterRatePerUnitKsh,
        defaultElectricityRatePerUnitKsh: normalizedDefaultElectricityRatePerUnitKsh,
        defaultWaterFixedChargeKsh: normalizedDefaultWaterFixedChargeKsh,
        defaultElectricityFixedChargeKsh: normalizedDefaultElectricityFixedChargeKsh,
        defaultCombinedUtilityChargeKsh: normalizedDefaultCombinedUtilityChargeKsh,
        defaultMonthlyRentKsh: normalizedDefaultMonthlyRentKsh,
        defaultRentDueDay: normalizedDefaultRentDueDay,
        meterReadingDay: normalizedMeterReadingDay,
        includedWaterUnits: normalizedIncludedWaterUnits,
        includedElectricityUnits: normalizedIncludedElectricityUnits,
        lateRentPenaltyAmountKsh: normalizedLateRentPenaltyAmountKsh,
        updatedByRole: actor?.role ?? null,
        updatedByUserId: actor?.userId ?? null,
        note: input.note?.trim() || null
      },
      create: {
        buildingId,
        ...DEFAULT_CONFIG,
        ...input,
        defaultWaterRatePerUnitKsh: normalizedDefaultWaterRatePerUnitKsh,
        defaultElectricityRatePerUnitKsh: normalizedDefaultElectricityRatePerUnitKsh,
        defaultWaterFixedChargeKsh: normalizedDefaultWaterFixedChargeKsh,
        defaultElectricityFixedChargeKsh: normalizedDefaultElectricityFixedChargeKsh,
        defaultCombinedUtilityChargeKsh: normalizedDefaultCombinedUtilityChargeKsh,
        defaultMonthlyRentKsh: normalizedDefaultMonthlyRentKsh,
        defaultRentDueDay: normalizedDefaultRentDueDay,
        meterReadingDay: normalizedMeterReadingDay,
        includedWaterUnits: normalizedIncludedWaterUnits,
        includedElectricityUnits: normalizedIncludedElectricityUnits,
        lateRentPenaltyAmountKsh: normalizedLateRentPenaltyAmountKsh,
        updatedByRole: actor?.role,
        updatedByUserId: actor?.userId,
        note: input.note?.trim() || undefined
      }
    });

    return mapConfig(row);
  }

  async listCombinedChargeBuildingIds(): Promise<string[]> {
    const rows = await this.prisma.buildingConfiguration.findMany({
      where: { utilityBillingMode: "combined_charge" },
      select: { buildingId: true }
    });

    return rows.map((item) => item.buildingId);
  }
}
