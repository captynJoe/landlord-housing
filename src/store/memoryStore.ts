import { randomUUID } from "node:crypto";
import type { Building } from "../domain/types.js";
import type { BuildingRepository } from "../repositories/buildingRepository.js";
import type {
  CreateBuildingInput,
  BuildingMediaUpdateInput,
  LandlordAddBuildingHousesInput,
  CreateIncidentInput,
  CreateVacancySnapshotInput,
  ResolveIncidentInput
} from "../validation/schemas.js";

export class MemoryStore implements BuildingRepository {
  private readonly buildings = new Map<string, Building>();
  private buildingSequence = 1;

  constructor() {
    this.seed();
  }

  async listBuildings(): Promise<Building[]> {
    return [...this.buildings.values()];
  }

  async getBuilding(id: string): Promise<Building | undefined> {
    return this.buildings.get(id);
  }

  async createBuilding(
    input: CreateBuildingInput,
    options?: { landlordUserId?: string }
  ): Promise<Building> {
    const now = new Date().toISOString();
    const id = this.createBuildingId();

    const building: Building = {
      id,
      landlordUserId: options?.landlordUserId,
      name: input.name,
      address: input.address,
      county: input.county,
      cctvStatus: input.cctvStatus,
      units: input.units ?? input.houseNumbers?.length,
      houseNumbers: input.houseNumbers?.map((item) => item.trim().toUpperCase()),
      media: {
        imageUrls: input.media.imageUrls,
        videoUrls: input.media.videoUrls,
        floorPlanUrl: input.media.floorPlanUrl,
        neighborhoodNotes: input.media.neighborhoodNotes
      },
      incidents: [],
      maintenanceRecords: [],
      vacancySnapshots: [],
      createdAt: now,
      updatedAt: now
    };

    this.buildings.set(id, building);
    return building;
  }

  async updateBuildingMedia(
    buildingId: string,
    input: BuildingMediaUpdateInput
  ): Promise<Building | undefined> {
    const building = this.buildings.get(buildingId);
    if (!building) {
      return undefined;
    }

    building.media = {
      ...building.media,
      imageUrls: [...input.imageUrls]
    };
    building.updatedAt = new Date().toISOString();
    return building;
  }

  async addHouseUnits(
    buildingId: string,
    input: LandlordAddBuildingHousesInput
  ): Promise<{ building: Building; addedHouseNumbers: string[] } | undefined> {
    const building = this.buildings.get(buildingId);
    if (!building) {
      return undefined;
    }

    const normalized = Array.from(
      new Set(
        input.houseNumbers
          .map((item) => item.trim().toUpperCase())
          .filter((item) => item.length > 0)
      )
    );

    if (normalized.length === 0) {
      return { building, addedHouseNumbers: [] };
    }

    const existing = new Set((building.houseNumbers ?? []).map((item) => item.trim().toUpperCase()));
    const addedHouseNumbers = normalized.filter((item) => !existing.has(item));
    if (addedHouseNumbers.length === 0) {
      return { building, addedHouseNumbers: [] };
    }

    building.houseNumbers = [...existing, ...addedHouseNumbers].sort((a, b) =>
      a.localeCompare(b)
    );
    building.units = building.houseNumbers.length;
    building.updatedAt = new Date().toISOString();
    return { building, addedHouseNumbers };
  }

  async removeHouseUnit(
    buildingId: string,
    houseNumber: string
  ): Promise<{ building: Building; removedHouseNumber: string } | undefined> {
    const building = this.buildings.get(buildingId);
    if (!building) {
      return undefined;
    }

    const normalized = houseNumber.trim().toUpperCase();
    const existing = new Set(
      (building.houseNumbers ?? []).map((item) => item.trim().toUpperCase())
    );

    if (!existing.has(normalized)) {
      return undefined;
    }

    existing.delete(normalized);
    building.houseNumbers = [...existing].sort((a, b) => a.localeCompare(b));
    building.units = building.houseNumbers.length;
    building.updatedAt = new Date().toISOString();

    return { building, removedHouseNumber: normalized };
  }

  async deleteBuilding(id: string): Promise<Building | undefined> {
    const existing = this.buildings.get(id);
    if (!existing) {
      return undefined;
    }

    this.buildings.delete(id);
    return existing;
  }

  async addIncident(buildingId: string, input: CreateIncidentInput) {
    const building = this.buildings.get(buildingId);
    if (!building) return;

    const incident = {
      id: randomUUID(),
      title: input.title,
      details: input.details,
      severity: input.severity,
      status: "open" as const,
      createdAt: new Date().toISOString()
    };

    building.incidents.unshift(incident);
    building.updatedAt = new Date().toISOString();
    return incident;
  }

  async resolveIncident(
    buildingId: string,
    incidentId: string,
    input: ResolveIncidentInput
  ) {
    const building = this.buildings.get(buildingId);
    if (!building) return;

    const incident = building.incidents.find((item) => item.id === incidentId);
    if (!incident) return;

    incident.status = "resolved";
    incident.resolvedAt = new Date().toISOString();
    incident.resolutionNotes = input.resolutionNotes;
    building.updatedAt = new Date().toISOString();
    return incident;
  }

  async addVacancySnapshot(
    buildingId: string,
    input: CreateVacancySnapshotInput
  ) {
    const building = this.buildings.get(buildingId);
    if (!building) return;

    const snapshot = {
      id: randomUUID(),
      movedOutAt: input.movedOutAt,
      beforeImageUrls: input.beforeImageUrls,
      afterImageUrls: input.afterImageUrls,
      videoUrls: input.videoUrls,
      structuralChanges: input.structuralChanges,
      damages: input.damages,
      repairs: input.repairs,
      notes: input.notes
    };

    building.vacancySnapshots.unshift(snapshot);
    building.updatedAt = new Date().toISOString();
    return snapshot;
  }

  private createBuildingId(): string {
    const id = `CAPTYN-BLDG-${String(this.buildingSequence).padStart(5, "0")}`;
    this.buildingSequence += 1;
    return id;
  }

  private seed() {
    void this.createBuilding({
      name: "Nyota Heights",
      address: "Mirema Drive, Nairobi",
      county: "Nairobi",
      cctvStatus: "verified",
      units: 24,
      media: {
        imageUrls: [
          "https://example.com/nyota-heights/room-1.jpg",
          "https://example.com/nyota-heights/kitchen.jpg"
        ],
        videoUrls: ["https://example.com/nyota-heights/walkthrough.mp4"],
        neighborhoodNotes: "Quiet street, 5 minutes to stage."
      }
    });
  }
}
