const DEFAULT_RESIDENT_BRAND = "Ruminjo Resident";
const DEFAULT_RESIDENT_PROFILE = "Ruminjo Profile";
const DEFAULT_LANDLORD_BRAND = "Ruminjo";
const DEFAULT_PUBLIC_HOME = "Ruminjo Resident";
const DEFAULT_PORTFOLIO_BRAND = "Ruminjo";

export function normalizeBuildingBrand(value) {
  const normalized = String(value ?? "").trim();
  return normalized || "";
}

export function getResidentShellBrand(buildingName) {
  return normalizeBuildingBrand(buildingName) || DEFAULT_RESIDENT_BRAND;
}

export function getResidentPortalTitle(buildingName) {
  const brand = normalizeBuildingBrand(buildingName);
  return brand ? `${brand} Resident Desk` : DEFAULT_RESIDENT_BRAND;
}

export function getResidentProfileTitle(buildingName) {
  const brand = normalizeBuildingBrand(buildingName);
  return brand ? `${brand} Resident Profile` : DEFAULT_RESIDENT_PROFILE;
}

export function getLandlordShellBrand(buildingName) {
  return normalizeBuildingBrand(buildingName) || DEFAULT_PORTFOLIO_BRAND;
}

export function getLandlordPortalTitle(buildingName) {
  const brand = normalizeBuildingBrand(buildingName);
  return brand ? `${brand} · Ruminjo` : DEFAULT_LANDLORD_BRAND;
}

export function getPublicHomeTitle(buildingName) {
  const brand = normalizeBuildingBrand(buildingName);
  return brand ? `${brand} Resident Desk` : DEFAULT_PUBLIC_HOME;
}

export function applyDocumentBranding(title, appTitle = title) {
  document.title = title;

  const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitleMeta instanceof HTMLMetaElement) {
    appleTitleMeta.content = appTitle;
  }
}
