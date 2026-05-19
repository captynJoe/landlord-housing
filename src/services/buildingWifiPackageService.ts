import type { PrismaClient } from "@prisma/client";
import type { Building } from "../domain/types.js";
import type { UpdateWifiPackageInput } from "../validation/schemas.js";
import type { WifiPackage } from "./wifiAccessService.js";

export interface BuildingWifiPackageRecord extends WifiPackage {
  buildingId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_BUILDING_WIFI_PACKAGES: WifiPackage[] = [
  {
    id: "hour_1",
    name: "Quick Check-In",
    hours: 1,
    priceKsh: 15,
    profile: "Short tasks"
  },
  {
    id: "hour_3",
    name: "Focused Session",
    hours: 3,
    priceKsh: 30,
    profile: "Meetings + classes"
  },
  {
    id: "hour_8",
    name: "Work Block",
    hours: 8,
    priceKsh: 65,
    profile: "Full shift"
  },
  {
    id: "day_24",
    name: "Day Pass",
    hours: 24,
    priceKsh: 120,
    profile: "24-hour access"
  }
];

function mapRow(
  row: {
    buildingId: string;
    packageCode: string;
    name: string;
    hours: number;
    priceKsh: number;
    profile: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
): BuildingWifiPackageRecord {
  return {
    buildingId: row.buildingId,
    id: row.packageCode as WifiPackage["id"],
    name: row.name,
    hours: row.hours,
    priceKsh: row.priceKsh,
    profile: row.profile,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export class BuildingWifiPackageService {
  constructor(private readonly prisma: PrismaClient) {}

  async ensureDefaultsForBuildings(buildings: Array<Pick<Building, "id">>): Promise<void> {
    if (buildings.length === 0) {
      return;
    }

    const operations = buildings.flatMap((building) =>
      DEFAULT_BUILDING_WIFI_PACKAGES.map((pkg) =>
        this.prisma.buildingWifiPackage.upsert({
          where: {
            buildingId_packageCode: {
              buildingId: building.id,
              packageCode: pkg.id
            }
          },
          update: {},
          create: {
            buildingId: building.id,
            packageCode: pkg.id,
            name: pkg.name,
            hours: pkg.hours,
            priceKsh: pkg.priceKsh,
            profile: pkg.profile,
            enabled: true
          }
        })
      )
    );

    await this.prisma.$transaction(operations);
  }

  async listForBuilding(
    buildingId: string,
    options?: { enabledOnly?: boolean }
  ): Promise<BuildingWifiPackageRecord[]> {
    const rows = await this.prisma.buildingWifiPackage.findMany({
      where: {
        buildingId,
        ...(options?.enabledOnly ? { enabled: true } : {})
      },
      orderBy: [{ enabled: "desc" }, { hours: "asc" }, { packageCode: "asc" }]
    });

    return rows.map(mapRow);
  }

  async getForBuildingPackage(
    buildingId: string,
    packageId: WifiPackage["id"]
  ): Promise<BuildingWifiPackageRecord | null> {
    const row = await this.prisma.buildingWifiPackage.findUnique({
      where: {
        buildingId_packageCode: {
          buildingId,
          packageCode: packageId
        }
      }
    });

    return row ? mapRow(row) : null;
  }

  async updateForBuilding(
    buildingId: string,
    packageId: WifiPackage["id"],
    input: UpdateWifiPackageInput
  ): Promise<BuildingWifiPackageRecord | null> {
    const existing = await this.prisma.buildingWifiPackage.findUnique({
      where: {
        buildingId_packageCode: {
          buildingId,
          packageCode: packageId
        }
      }
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.buildingWifiPackage.update({
      where: { id: existing.id },
      data: {
        name: input.name ?? existing.name,
        profile: input.profile ?? existing.profile,
        hours: input.hours ?? existing.hours,
        priceKsh: input.priceKsh ?? existing.priceKsh,
        enabled: typeof input.enabled === "boolean" ? input.enabled : existing.enabled
      }
    });

    return mapRow(updated);
  }
}
