import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type {
  Building,
  Incident,
  MaintenanceRecord,
  VacancySnapshot
} from "../domain/types.js";
import type { BuildingRepository } from "./buildingRepository.js";
import type {
  CreateBuildingInput,
  BuildingMediaUpdateInput,
  LandlordAddBuildingHousesInput,
  CreateIncidentInput,
  CreateVacancySnapshotInput,
  ResolveIncidentInput
} from "../validation/schemas.js";

type BuildingWithRelations = Prisma.BuildingGetPayload<{
  include: {
    incidents: true;
    maintenanceRecords: true;
    vacancySnapshots: true;
    houseUnits: {
      orderBy: {
        houseNumber: "asc";
      };
    };
  };
}>;

function jsonToStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mapIncident(value: BuildingWithRelations["incidents"][number]): Incident {
  return {
    id: value.id,
    title: value.title,
    details: value.details,
    severity: value.severity,
    status: value.status,
    createdAt: value.createdAt.toISOString(),
    resolvedAt: value.resolvedAt?.toISOString(),
    resolutionNotes: value.resolutionNotes ?? undefined
  };
}

function mapMaintenanceRecord(
  value: BuildingWithRelations["maintenanceRecords"][number]
): MaintenanceRecord {
  return {
    id: value.id,
    details: value.details,
    createdAt: value.createdAt.toISOString(),
    completedAt: value.completedAt?.toISOString()
  };
}

function mapVacancySnapshot(
  value: BuildingWithRelations["vacancySnapshots"][number]
): VacancySnapshot {
  return {
    id: value.id,
    movedOutAt: value.movedOutAt.toISOString(),
    beforeImageUrls: jsonToStringArray(value.beforeImageUrls),
    afterImageUrls: jsonToStringArray(value.afterImageUrls),
    videoUrls: jsonToStringArray(value.videoUrls),
    structuralChanges: jsonToStringArray(value.structuralChanges),
    damages: jsonToStringArray(value.damages),
    repairs: jsonToStringArray(value.repairs),
    notes: value.notes ?? undefined
  };
}

function mapBuilding(value: BuildingWithRelations): Building {
  return {
    id: value.id,
    landlordUserId: value.landlordUserId ?? undefined,
    name: value.name,
    address: value.address,
    county: value.county,
    cctvStatus: value.cctvStatus,
    units: value.units ?? undefined,
    houseNumbers: value.houseUnits.map((item) => item.houseNumber),
    media: {
      imageUrls: jsonToStringArray(value.mediaImageUrls),
      videoUrls: jsonToStringArray(value.mediaVideoUrls),
      floorPlanUrl: value.mediaFloorPlanUrl ?? undefined,
      neighborhoodNotes: value.mediaNeighborhoodNotes ?? undefined
    },
    incidents: value.incidents.map(mapIncident),
    maintenanceRecords: value.maintenanceRecords.map(mapMaintenanceRecord),
    vacancySnapshots: value.vacancySnapshots.map(mapVacancySnapshot),
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString()
  };
}

export class PrismaBuildingRepository implements BuildingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listBuildings(): Promise<Building[]> {
    const buildings = await this.prisma.building.findMany({
      include: {
        incidents: { orderBy: { createdAt: "desc" } },
        maintenanceRecords: { orderBy: { createdAt: "desc" } },
        vacancySnapshots: { orderBy: { movedOutAt: "desc" } },
        houseUnits: { orderBy: { houseNumber: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    });

    return buildings.map(mapBuilding);
  }

  async getBuilding(id: string): Promise<Building | undefined> {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        incidents: { orderBy: { createdAt: "desc" } },
        maintenanceRecords: { orderBy: { createdAt: "desc" } },
        vacancySnapshots: { orderBy: { movedOutAt: "desc" } },
        houseUnits: { orderBy: { houseNumber: "asc" } }
      }
    });

    if (!building) return undefined;
    return mapBuilding(building);
  }

  async createBuilding(
    input: CreateBuildingInput,
    options?: { landlordUserId?: string }
  ): Promise<Building> {
    const id = await this.createBuildingId();
    const normalizedHouseNumbers = Array.from(
      new Set(
        (input.houseNumbers ?? [])
          .map((value) => value.trim().toUpperCase())
          .filter((value) => value.length > 0)
      )
    );

    const building = await this.prisma.building.create({
      data: {
        id,
        landlordUserId: options?.landlordUserId,
        name: input.name,
        address: input.address,
        county: input.county,
        cctvStatus: input.cctvStatus,
        units:
          input.units ??
          (normalizedHouseNumbers.length > 0
            ? normalizedHouseNumbers.length
            : undefined),
        mediaImageUrls: input.media.imageUrls,
        mediaVideoUrls: input.media.videoUrls,
        mediaFloorPlanUrl: input.media.floorPlanUrl,
        mediaNeighborhoodNotes: input.media.neighborhoodNotes,
        houseUnits:
          normalizedHouseNumbers.length > 0
            ? {
                createMany: {
                  data: normalizedHouseNumbers.map((houseNumber) => ({
                    houseNumber
                  }))
                }
              }
            : undefined
      },
      include: {
        incidents: true,
        maintenanceRecords: true,
        vacancySnapshots: true,
        houseUnits: { orderBy: { houseNumber: "asc" } }
      }
    });

    return mapBuilding(building);
  }

  async updateBuildingMedia(
    buildingId: string,
    input: BuildingMediaUpdateInput
  ): Promise<Building | undefined> {
    const building = await this.prisma.building.update({
      where: { id: buildingId },
      data: {
        mediaImageUrls: input.imageUrls
      },
      include: {
        incidents: { orderBy: { createdAt: "desc" } },
        maintenanceRecords: { orderBy: { createdAt: "desc" } },
        vacancySnapshots: { orderBy: { movedOutAt: "desc" } },
        houseUnits: { orderBy: { houseNumber: "asc" } }
      }
    }).catch((error: unknown) => {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "P2025"
      ) {
        return undefined;
      }
      throw error;
    });

    if (!building) {
      return undefined;
    }

    return mapBuilding(building);
  }

  async addHouseUnits(
    buildingId: string,
    input: LandlordAddBuildingHousesInput
  ): Promise<{ building: Building; addedHouseNumbers: string[] } | undefined> {
    const normalizedHouseNumbers = Array.from(
      new Set(
        input.houseNumbers
          .map((value) => value.trim().toUpperCase())
          .filter((value) => value.length > 0)
      )
    );

    const existing = await this.prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        incidents: { orderBy: { createdAt: "desc" } },
        maintenanceRecords: { orderBy: { createdAt: "desc" } },
        vacancySnapshots: { orderBy: { movedOutAt: "desc" } },
        houseUnits: { orderBy: { houseNumber: "asc" } }
      }
    });

    if (!existing) {
      return undefined;
    }

    const existingSet = new Set(existing.houseUnits.map((item) => item.houseNumber));
    const addedHouseNumbers = normalizedHouseNumbers.filter(
      (houseNumber) => !existingSet.has(houseNumber)
    );

    if (addedHouseNumbers.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.houseUnit.createMany({
          data: addedHouseNumbers.map((houseNumber) => ({
            buildingId,
            houseNumber,
            isActive: true
          })),
          skipDuplicates: true
        });

        const totalUnits = await tx.houseUnit.count({
          where: { buildingId }
        });

        await tx.building.update({
          where: { id: buildingId },
          data: {
            units: totalUnits
          }
        });
      });
    }

    const updated = await this.prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        incidents: { orderBy: { createdAt: "desc" } },
        maintenanceRecords: { orderBy: { createdAt: "desc" } },
        vacancySnapshots: { orderBy: { movedOutAt: "desc" } },
        houseUnits: { orderBy: { houseNumber: "asc" } }
      }
    });

    if (!updated) {
      return undefined;
    }

    return {
      building: mapBuilding(updated),
      addedHouseNumbers
    };
  }

  async removeHouseUnit(
    buildingId: string,
    houseNumber: string
  ): Promise<{ building: Building; removedHouseNumber: string } | undefined> {
    const normalizedHouseNumber = houseNumber.trim().toUpperCase();

    const unit = await this.prisma.houseUnit.findUnique({
      where: {
        buildingId_houseNumber: {
          buildingId,
          houseNumber: normalizedHouseNumber
        }
      },
      include: {
        tenancies: { select: { id: true } }
      }
    });

    if (!unit) {
      return undefined;
    }

    if (unit.tenancies.length > 0) {
      throw new Error(
        "Room has tenancy history and cannot be removed. Clear the resident or archive the room instead."
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.houseUnit.delete({
        where: {
          buildingId_houseNumber: {
            buildingId,
            houseNumber: normalizedHouseNumber
          }
        }
      });

      const totalUnits = await tx.houseUnit.count({
        where: { buildingId }
      });

      await tx.building.update({
        where: { id: buildingId },
        data: {
          units: totalUnits
        }
      });
    });

    const updated = await this.prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        incidents: { orderBy: { createdAt: "desc" } },
        maintenanceRecords: { orderBy: { createdAt: "desc" } },
        vacancySnapshots: { orderBy: { movedOutAt: "desc" } },
        houseUnits: { orderBy: { houseNumber: "asc" } }
      }
    });

    if (!updated) {
      return undefined;
    }

    return {
      building: mapBuilding(updated),
      removedHouseNumber: normalizedHouseNumber
    };
  }

  async deleteBuilding(id: string): Promise<Building | undefined> {
    const existing = await this.prisma.building.findUnique({
      where: { id },
      include: {
        incidents: { orderBy: { createdAt: "desc" } },
        maintenanceRecords: { orderBy: { createdAt: "desc" } },
        vacancySnapshots: { orderBy: { movedOutAt: "desc" } },
        houseUnits: { orderBy: { houseNumber: "asc" } }
      }
    });

    if (!existing) {
      return undefined;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tenancy.deleteMany({
        where: { buildingId: id }
      });

      await tx.tenantApplication.deleteMany({
        where: { buildingId: id }
      });

      await tx.householdMemberRegistry.deleteMany({
        where: { buildingId: id }
      });

      await tx.buildingConfiguration.deleteMany({
        where: { buildingId: id }
      });

      await tx.buildingWifiPackage.deleteMany({
        where: { buildingId: id }
      });

      await tx.building.delete({
        where: { id }
      });
    });

    return mapBuilding(existing);
  }

  async addIncident(
    buildingId: string,
    input: CreateIncidentInput
  ): Promise<Incident | undefined> {
    const exists = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true }
    });
    if (!exists) return undefined;

    const incident = await this.prisma.incident.create({
      data: {
        buildingId,
        title: input.title,
        details: input.details,
        severity: input.severity
      }
    });

    return {
      id: incident.id,
      title: incident.title,
      details: incident.details,
      severity: incident.severity,
      status: incident.status,
      createdAt: incident.createdAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString(),
      resolutionNotes: incident.resolutionNotes ?? undefined
    };
  }

  async resolveIncident(
    buildingId: string,
    incidentId: string,
    input: ResolveIncidentInput
  ): Promise<Incident | undefined> {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, buildingId }
    });
    if (!incident) return undefined;

    const updated = await this.prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
        resolutionNotes: input.resolutionNotes
      }
    });

    return {
      id: updated.id,
      title: updated.title,
      details: updated.details,
      severity: updated.severity,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      resolvedAt: updated.resolvedAt?.toISOString(),
      resolutionNotes: updated.resolutionNotes ?? undefined
    };
  }

  async addVacancySnapshot(
    buildingId: string,
    input: CreateVacancySnapshotInput
  ): Promise<VacancySnapshot | undefined> {
    const exists = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true }
    });
    if (!exists) return undefined;

    const snapshot = await this.prisma.vacancySnapshot.create({
      data: {
        buildingId,
        movedOutAt: new Date(input.movedOutAt),
        beforeImageUrls: input.beforeImageUrls,
        afterImageUrls: input.afterImageUrls,
        videoUrls: input.videoUrls,
        structuralChanges: input.structuralChanges,
        damages: input.damages,
        repairs: input.repairs,
        notes: input.notes
      }
    });

    return {
      id: snapshot.id,
      movedOutAt: snapshot.movedOutAt.toISOString(),
      beforeImageUrls: jsonToStringArray(snapshot.beforeImageUrls),
      afterImageUrls: jsonToStringArray(snapshot.afterImageUrls),
      videoUrls: jsonToStringArray(snapshot.videoUrls),
      structuralChanges: jsonToStringArray(snapshot.structuralChanges),
      damages: jsonToStringArray(snapshot.damages),
      repairs: jsonToStringArray(snapshot.repairs),
      notes: snapshot.notes ?? undefined
    };
  }

  private async createBuildingId(): Promise<string> {
    const rows = await this.prisma.building.findMany({
      select: { id: true }
    });

    const maxIndex = rows.reduce((max, row) => {
      const match = /^CAPTYN-BLDG-(\d{5})$/.exec(row.id);
      if (!match) return max;
      const current = Number(match[1]);
      return Number.isFinite(current) ? Math.max(max, current) : max;
    }, 0);

    return `CAPTYN-BLDG-${String(maxIndex + 1).padStart(5, "0")}`;
  }
}
