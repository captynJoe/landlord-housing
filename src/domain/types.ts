export type CCTVStatus = "none" | "partial" | "verified";

export type IncidentSeverity = "low" | "medium" | "high";
export type IncidentStatus = "open" | "resolved";

export interface BuildingMedia {
  imageUrls: string[];
  videoUrls: string[];
  floorPlanUrl?: string;
  neighborhoodNotes?: string;
}

export interface Incident {
  id: string;
  title: string;
  details: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface MaintenanceRecord {
  id: string;
  details: string;
  createdAt: string;
  completedAt?: string;
}

export interface VacancySnapshot {
  id: string;
  movedOutAt: string;
  beforeImageUrls: string[];
  afterImageUrls: string[];
  videoUrls: string[];
  structuralChanges: string[];
  damages: string[];
  repairs: string[];
  notes?: string;
}

export interface Building {
  id: string;
  landlordUserId?: string;
  name: string;
  address: string;
  county: string;
  cctvStatus: CCTVStatus;
  units?: number;
  houseNumbers?: string[];
  media: BuildingMedia;
  incidents: Incident[];
  maintenanceRecords: MaintenanceRecord[];
  vacancySnapshots: VacancySnapshot[];
  createdAt: string;
  updatedAt: string;
}
