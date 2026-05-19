import type { Building, Incident, VacancySnapshot } from "../domain/types.js";
import type {
  CreateBuildingInput,
  BuildingMediaUpdateInput,
  LandlordAddBuildingHousesInput,
  CreateIncidentInput,
  CreateVacancySnapshotInput,
  ResolveIncidentInput
} from "../validation/schemas.js";

export interface BuildingRepository {
  listBuildings(): Promise<Building[]>;
  getBuilding(id: string): Promise<Building | undefined>;
  createBuilding(
    input: CreateBuildingInput,
    options?: { landlordUserId?: string }
  ): Promise<Building>;
  updateBuildingMedia(
    buildingId: string,
    input: BuildingMediaUpdateInput
  ): Promise<Building | undefined>;
  addHouseUnits(
    buildingId: string,
    input: LandlordAddBuildingHousesInput
  ): Promise<{ building: Building; addedHouseNumbers: string[] } | undefined>;
  removeHouseUnit(
    buildingId: string,
    houseNumber: string
  ): Promise<{ building: Building; removedHouseNumber: string } | undefined>;
  deleteBuilding(id: string): Promise<Building | undefined>;
  addIncident(
    buildingId: string,
    input: CreateIncidentInput
  ): Promise<Incident | undefined>;
  resolveIncident(
    buildingId: string,
    incidentId: string,
    input: ResolveIncidentInput
  ): Promise<Incident | undefined>;
  addVacancySnapshot(
    buildingId: string,
    input: CreateVacancySnapshotInput
  ): Promise<VacancySnapshot | undefined>;
}
