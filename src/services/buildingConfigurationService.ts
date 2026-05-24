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
  utilityBalanceVisibleDays?: number;
  rentGraceDays?: number;
  lateRentPenaltyEnabled?: boolean;
  lateRentPenaltyAmountKsh?: number;
  allowManualRentPosting?: boolean;
  allowManualUtilityPosting?: boolean;
  wifiAccessMode?: WifiAccessMode;
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
  constructor(private readonly prisma: PrismaClient) {}

  async ensureDefaultsForBuildings(buildings: Array<Pick<Building, "id">>): Promise<void> {
    if (buildings.length === 0) {
      return;
    }

    await this.prisma.$transaction(
      buildings.map((building) =>
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

    await this.prisma.$transaction(
      validRecords.map((row) =>
        this.prisma.buildingConfiguration.upsert({
          where: { buildingId: row.buildingId },
          update: {
            rentEnabled: row.rentEnabled,
            waterEnabled: row.waterEnabled,
            electricityEnabled: row.electricityEnabled,
            updatedByRole: row.updatedByRole ?? null,
            updatedByUserId: row.updatedByUserId ?? null,
            note: row.note ?? null
          },
          create: {
            buildingId: row.buildingId,
            ...DEFAULT_CONFIG,
            rentEnabled: row.rentEnabled,
            waterEnabled: row.waterEnabled,
            electricityEnabled: row.electricityEnabled,
            updatedByRole: row.updatedByRole,
            updatedByUserId: row.updatedByUserId,
            note: row.note
          }
        })
      )
    );
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
