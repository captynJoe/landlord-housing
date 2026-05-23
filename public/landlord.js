import { initResponsiveTables } from "./mobile-table.js";
import { notifyError, notifyStatus } from "./notifications.js";
import {
  createUploadedImageGallery,
  renderSelectedImagePreviews,
  uploadImageFiles,
  validateImageFiles
} from "./media-upload.js";
import {
  applyDocumentBranding,
  getLandlordPortalTitle,
  getLandlordShellBrand
} from "./portal-branding.js?v=20260521b";

const LANDLORD_SW_URL = "/resident-sw.js?v=20260523e";
const authStatusEl = document.getElementById("auth-status");
const landlordRoleEl = document.getElementById("landlord-role");
const landlordBrandTagEl = document.getElementById("landlord-brand-tag");
const landlordBrandTitleEl = document.getElementById("landlord-brand-title");
const landlordNotificationsBtnEl = document.getElementById("landlord-notifications-btn");
const landlordNotificationsBadgeEl = document.getElementById(
  "landlord-notifications-badge"
);
const landlordPushAlertsBtnEl = document.getElementById("landlord-push-alerts-btn");
const landlordNotificationsPanelEl = document.getElementById(
  "landlord-notifications-panel"
);
const landlordNotificationsSummaryEl = document.getElementById(
  "landlord-notifications-summary"
);
const landlordNotificationsListEl = document.getElementById(
  "landlord-notifications-list"
);
const landlordNotificationsReadBtnEl = document.getElementById(
  "landlord-notifications-read-btn"
);
const landlordNotificationsRefreshBtnEl = document.getElementById(
  "landlord-notifications-refresh-btn"
);
const refreshAllBtnEl = document.getElementById("refresh-all-btn");
const landlordLogoutBtnEl = document.getElementById("landlord-logout-btn");
const landlordGlobalSearchFormEl = document.getElementById("landlord-global-search-form");
const landlordGlobalSearchInputEl = document.getElementById("landlord-global-search-input");
const landlordGlobalSearchBuildingEl = document.getElementById(
  "landlord-global-search-building"
);

const metricMetersEl = document.getElementById("metric-meters");
const metricUsersEl = document.getElementById("metric-users");
const metricBillsEl = document.getElementById("metric-bills");
const metricUnpaidEl = document.getElementById("metric-unpaid");
const metricOverdueEl = document.getElementById("metric-overdue");
const metricPaymentsEl = document.getElementById("metric-payments");
const metricBalanceEl = document.getElementById("metric-balance");
const landlordFocusBuildingSelectEl = document.getElementById(
  "landlord-focus-building-select"
);
const landlordFocusUnitsEl = document.getElementById("landlord-focus-units");
const landlordFocusResidentsEl = document.getElementById("landlord-focus-residents");
const landlordFocusOpenBillsEl = document.getElementById("landlord-focus-open-bills");
const landlordFocusOutstandingEl = document.getElementById("landlord-focus-outstanding");
const landlordFocusNoteEl = document.getElementById("landlord-focus-note");
const metricCardButtons = [...document.querySelectorAll("[data-metric-target]")];
const landlordNavButtons = [
  ...document.querySelectorAll("[data-landlord-view]")
];
const landlordViewPanels = [
  ...document.querySelectorAll("[data-landlord-view-panel]")
];
const landlordFocusTargetButtons = [
  ...document.querySelectorAll("[data-landlord-focus-target-view]")
];
const openCreateBuildingDrawerButtons = [
  ...document.querySelectorAll('[data-action="open-create-building-drawer"]')
];
const createBuildingDrawerEl = document.getElementById("create-building-drawer");
const closeCreateBuildingDrawerBtnEl = document.getElementById(
  "close-create-building-drawer-btn"
);
const closeBuildingDrawerBtnEl = document.getElementById("close-building-drawer-btn");
const buildingDrawerEl = document.getElementById("building-drawer");
const buildingDrawerBackdropEl = document.getElementById("building-drawer-backdrop");
const residentDrawerEl = document.getElementById("resident-drawer");
const residentDrawerBackdropEl = document.getElementById("resident-drawer-backdrop");
const residentDrawerBodyEl = document.getElementById("resident-drawer-body");
const closeResidentDrawerBtnEl = document.getElementById("close-resident-drawer-btn");

const createBuildingFormEl = document.getElementById("create-building-form");
const createBuildingNameEl = document.getElementById("create-building-name");
const createBuildingCountyEl = document.getElementById("create-building-county");
const createBuildingAddressEl = document.getElementById("create-building-address");
const createBuildingHouseNumbersEl = document.getElementById(
  "create-building-house-numbers"
);
const createBuildingPhotoEl = document.getElementById("create-building-photo");
const buildingFormEl = document.getElementById("building-form");
const roomTargetBuildingEl = document.getElementById("room-target-building");
const buildingHouseNumbersEl = document.getElementById("building-house-numbers");
const buildingHouseFormatEl = document.getElementById("building-house-format");
const buildingHousePrefixEl = document.getElementById("building-house-prefix");
const buildingHouseSeparatorEl = document.getElementById("building-house-separator");
const buildingHouseStartEl = document.getElementById("building-house-start");
const buildingHouseCountEl = document.getElementById("building-house-count");
const buildingHouseStepEl = document.getElementById("building-house-step");
const buildingHouseOrderEl = document.getElementById("building-house-order");
const generateHouseNumbersBtnEl = document.getElementById(
  "generate-house-numbers-btn"
);
const buildingHousePreviewEl = document.getElementById("building-house-preview");
const buildingCandidateRoomsEl = document.getElementById("building-candidate-rooms");
const buildingCandidateRoomsCountEl = document.getElementById(
  "building-candidate-rooms-count"
);
const buildingExistingRoomsEl = document.getElementById("building-existing-rooms");
const buildingExistingRoomsSummaryEl = document.getElementById(
  "building-existing-rooms-summary"
);
const buildingsBodyEl = document.getElementById("buildings-body");
const refreshBuildingsBtnEl = document.getElementById("refresh-buildings");
const buildingManagementSearchEl = document.getElementById("building-management-search");
const buildingManagementSummaryEl = document.getElementById(
  "building-management-summary"
);
const buildingPhotoFormEl = document.getElementById("building-photo-form");
const buildingPhotoBuildingSelectEl = document.getElementById(
  "building-photo-building-select"
);
const buildingPhotoFileEl = document.getElementById("building-photo-file");
const buildingPhotoPreviewEl = document.getElementById("building-photo-preview");
const ownerStaffManagementPanelEl = document.getElementById(
  "owner-staff-management-panel"
);
const ownerStaffSummaryEl = document.getElementById("owner-staff-summary");
const ownerStaffFormEl = document.getElementById("owner-staff-form");
const ownerStaffNameEl = document.getElementById("owner-staff-name");
const ownerStaffEmailEl = document.getElementById("owner-staff-email");
const ownerStaffPhoneEl = document.getElementById("owner-staff-phone");
const ownerStaffPasswordEl = document.getElementById("owner-staff-password");
const ownerStaffNoteEl = document.getElementById("owner-staff-note");
const ownerStaffSubmitBtnEl = document.getElementById("owner-staff-submit-btn");
const ownerStaffBodyEl = document.getElementById("owner-staff-body");
const refreshOwnerStaffBtnEl = document.getElementById("refresh-owner-staff");
const caretakerManagementPanelEl = document.getElementById(
  "caretaker-management-panel"
);
const caretakerFormEl = document.getElementById("caretaker-form");
const caretakerBuildingSelectEl = document.getElementById(
  "caretaker-building-select"
);
const caretakerIdentifierEl = document.getElementById("caretaker-identifier");
const caretakerHouseNumberEl = document.getElementById("caretaker-house-number");
const caretakerNoteEl = document.getElementById("caretaker-note");
const caretakerRequestsBodyEl = document.getElementById("caretaker-requests-body");
const caretakersBodyEl = document.getElementById("caretakers-body");
const refreshCaretakersBtnEl = document.getElementById("refresh-caretakers");

const applicationStatusFilterEl = document.getElementById("application-status-filter");
const applicationsBodyEl = document.getElementById("applications-body");
const refreshApplicationsBtnEl = document.getElementById("refresh-applications");
const applicationsSummaryEl = document.getElementById("applications-summary");
const applicationsNavBadgeEl = document.getElementById("applications-nav-badge");
const residentsBuildingSelectEl = document.getElementById("residents-building-select");
const residentsStatusFilterEl = document.getElementById("residents-status-filter");
const residentsSearchInputEl = document.getElementById("residents-search-input");
const residentsOpenMatchBtnEl = document.getElementById("residents-open-match-btn");
const residentsOverviewEl = document.getElementById("residents-overview");
const residentsSearchSummaryEl = document.getElementById("residents-search-summary");
const residentsBodyEl = document.getElementById("residents-body");
const refreshResidentsBtnEl = document.getElementById("refresh-residents");
const landlordTicketFilterStatusEl = document.getElementById(
  "landlord-ticket-filter-status"
);
const landlordTicketFilterQueueEl = document.getElementById(
  "landlord-ticket-filter-queue"
);
const landlordTicketBuildingSelectEl = document.getElementById(
  "landlord-ticket-building-select"
);
const landlordTicketsBodyEl = document.getElementById("landlord-tickets-body");
const refreshLandlordTicketsBtnEl = document.getElementById(
  "refresh-landlord-tickets"
);
const rentStatusBodyEl = document.getElementById("rent-status-body");
const refreshRentStatusBtnEl = document.getElementById("refresh-rent-status");
const rentPaymentFormEl = document.getElementById("rent-payment-form");
const rentPaymentBuildingSelectEl = document.getElementById("rent-payment-building-select");
const rentPaymentHouseEl = document.getElementById("rent-payment-house");
const rentPaymentMonthEl = document.getElementById("rent-payment-month");
const rentPaymentAmountEl = document.getElementById("rent-payment-amount");
const rentPaymentProviderEl = document.getElementById("rent-payment-provider");
const rentPaymentPaidAtEl = document.getElementById("rent-payment-paid-at");
const rentPaymentReferenceEl = document.getElementById("rent-payment-reference");
const rentPaymentHelpEl = document.getElementById("rent-payment-help");
const rentPaymentDetailsEl = document.getElementById("rent-payment-details");
const openRentSheetBtnEl = document.getElementById("open-rent-sheet-btn");
const rentSheetBackdropEl = document.getElementById("rent-sheet-backdrop");
const rentSheetModalEl = document.getElementById("rent-sheet-modal");
const closeRentSheetBtnEl = document.getElementById("close-rent-sheet-btn");
const rentSheetFormEl = document.getElementById("rent-sheet-form");
const rentSheetBuildingSelectEl = document.getElementById("rent-sheet-building-select");
const rentSheetBillingMonthEl = document.getElementById("rent-sheet-billing-month");
const rentSheetDueDateEl = document.getElementById("rent-sheet-due-date");
const rentSheetNoteEl = document.getElementById("rent-sheet-note");
const rentSheetBodyEl = document.getElementById("rent-sheet-body");
const rentSheetSubmitBtnEl = document.getElementById("rent-sheet-submit-btn");
const rentSheetReloadBtnEl = document.getElementById("rent-sheet-reload-btn");
const paymentAccessBodyEl = document.getElementById("payment-access-body");
const refreshPaymentAccessBtnEl = document.getElementById("refresh-payment-access");
const paymentProfilesBodyEl = document.getElementById("payment-profiles-body");
const paymentProfilesSummaryEl = document.getElementById("payment-profiles-summary");
const refreshPaymentProfilesBtnEl = document.getElementById("refresh-payment-profiles");
const paymentInstructionsBodyEl = document.getElementById("payment-instructions-body");
const paymentInstructionsSummaryEl = document.getElementById("payment-instructions-summary");
const refreshPaymentInstructionsBtnEl = document.getElementById(
  "refresh-payment-instructions"
);
const wifiPackageBuildingSelectEl = document.getElementById("wifi-package-building-select");
const wifiPackageListEl = document.getElementById("wifi-package-list");
const refreshWifiPackagesBtnEl = document.getElementById("refresh-wifi-packages");
const overviewWifiPackagesSectionEl = document.getElementById(
  "overview-wifi-packages-section"
);
const refreshOverviewDashboardBtnEl = document.getElementById("refresh-overview-dashboard");
const overviewCollectionsBodyEl = document.getElementById("overview-collections-body");
const overviewRoomBuildingSelectEl = document.getElementById("overview-room-building-select");
const overviewRoomSearchInputEl = document.getElementById("overview-room-search-input");
const overviewOpenRoomBtnEl = document.getElementById("overview-open-room-btn");
const openUtilitySetupBtnEl = document.getElementById("open-utility-setup-btn");
const utilitySetupBackdropEl = document.getElementById("utility-setup-backdrop");
const utilitySetupModalEl = document.getElementById("utility-setup-modal");
const closeUtilitySetupBtnEl = document.getElementById("close-utility-setup-btn");
const registryBuildingSelectEl = document.getElementById("registry-building-select");
const registryReadingMonthEl = document.getElementById("registry-reading-month");
const registryLoadBtnEl = document.getElementById("registry-load-btn");
const registrySaveBtnEl = document.getElementById("registry-save-btn");
const openUtilitySheetBtnEl = document.getElementById("open-utility-sheet-btn");
const registryChargeSummaryEl = document.getElementById("registry-charge-summary");
const registryBodyEl = document.getElementById("registry-body");
const utilitySheetBackdropEl = document.getElementById("utility-sheet-backdrop");
const utilitySheetModalEl = document.getElementById("utility-sheet-modal");
const closeUtilitySheetBtnEl = document.getElementById("close-utility-sheet-btn");
const utilitySheetFormEl = document.getElementById("utility-sheet-form");
const utilitySheetBuildingSelectEl = document.getElementById(
  "utility-sheet-building-select"
);
const utilitySheetBillingMonthEl = document.getElementById(
  "utility-sheet-billing-month"
);
const utilitySheetDueDateEl = document.getElementById("utility-sheet-due-date");
const utilitySheetWaterRateEl = document.getElementById("utility-sheet-water-rate");
const utilitySheetElectricRateEl = document.getElementById("utility-sheet-electric-rate");
const utilitySheetWaterFixedDefaultEl = document.getElementById(
  "utility-sheet-water-fixed-default"
);
const utilitySheetElectricFixedDefaultEl = document.getElementById(
  "utility-sheet-electric-fixed-default"
);
const utilitySheetBuildingCombinedChargeEl = document.getElementById(
  "utility-sheet-building-combined-charge"
);
const utilitySheetCombinedChargeEl = document.getElementById(
  "utility-sheet-combined-charge"
);
const utilitySheetNoteEl = document.getElementById("utility-sheet-note");
const utilitySheetBodyEl = document.getElementById("utility-sheet-body");
const utilitySheetSubmitBtnEl = document.getElementById("utility-sheet-submit-btn");
const utilitySheetReloadBtnEl = document.getElementById("utility-sheet-reload-btn");
const overviewUtilityPaymentBackdropEl = document.getElementById(
  "overview-utility-payment-backdrop"
);
const overviewUtilityPaymentModalEl = document.getElementById(
  "overview-utility-payment-modal"
);
const closeOverviewUtilityPaymentBtnEl = document.getElementById(
  "close-overview-utility-payment-btn"
);
const overviewUtilityPaymentFormEl = document.getElementById(
  "overview-utility-payment-form"
);
const overviewUtilityPaymentSummaryEl = document.getElementById(
  "overview-utility-payment-summary"
);
const overviewUtilityPaymentBuildingEl = document.getElementById(
  "overview-utility-payment-building"
);
const overviewUtilityPaymentHouseEl = document.getElementById(
  "overview-utility-payment-house"
);
const overviewUtilityPaymentTypeLabelEl = document.getElementById(
  "overview-utility-payment-type-label"
);
const overviewUtilityPaymentMonthEl = document.getElementById(
  "overview-utility-payment-month"
);
const overviewUtilityPaymentAmountEl = document.getElementById(
  "overview-utility-payment-amount"
);
const overviewUtilityPaymentPaidAtEl = document.getElementById(
  "overview-utility-payment-paid-at"
);
const overviewUtilityPaymentReferenceEl = document.getElementById(
  "overview-utility-payment-reference"
);
const overviewUtilityPaymentHelpEl = document.getElementById(
  "overview-utility-payment-help"
);
const overviewUtilityPaymentSubmitBtnEl = document.getElementById(
  "overview-utility-payment-submit-btn"
);
const moveOutSettlementBackdropEl = document.getElementById(
  "move-out-settlement-backdrop"
);
const moveOutSettlementModalEl = document.getElementById("move-out-settlement-modal");
const closeMoveOutSettlementBtnEl = document.getElementById(
  "close-move-out-settlement-btn"
);
const moveOutSettlementFormEl = document.getElementById("move-out-settlement-form");
const moveOutSettlementSummaryEl = document.getElementById(
  "move-out-settlement-summary"
);
const moveOutSettlementTotalsEl = document.getElementById(
  "move-out-settlement-totals"
);
const moveOutSettlementNoteEl = document.getElementById("move-out-settlement-note");
const moveOutSettlementHelpEl = document.getElementById("move-out-settlement-help");
const moveOutSettlementSubmitBtnEl = document.getElementById(
  "move-out-settlement-submit-btn"
);

const utilityMeterFormEl = document.getElementById("utility-meter-form");
const utilityMeterTypeEl = document.getElementById("utility-meter-type");
const utilityMeterHouseEl = document.getElementById("utility-meter-house");
const utilityMeterNumberEl = document.getElementById("utility-meter-number");
const metersBodyEl = document.getElementById("meters-body");
const refreshMetersBtnEl = document.getElementById("refresh-meters");

const utilityBillFormEl = document.getElementById("utility-bill-form");
const utilityBillTypeEl = document.getElementById("utility-bill-type");
const utilityBillHouseEl = document.getElementById("utility-bill-house");
const utilityBillMonthEl = document.getElementById("utility-bill-month");
const utilityBillPreviousReadingEl = document.getElementById(
  "utility-bill-previous-reading"
);
const utilityBillCurrentReadingEl = document.getElementById(
  "utility-bill-current-reading"
);
const utilityBillRateEl = document.getElementById("utility-bill-rate");
const utilityBillFixedEl = document.getElementById("utility-bill-fixed");
const utilityBillInputGuidanceEl = document.getElementById(
  "utility-bill-input-guidance"
);
const utilityBillDueDateEl = document.getElementById("utility-bill-due-date");
const utilityBillNoteEl = document.getElementById("utility-bill-note");
const utilityRoomSummaryBodyEls = [
  ...document.querySelectorAll("[data-utility-room-summary-body]")
];
const utilityBillsBodyEl = document.getElementById("utility-bills-body");
const refreshBillsBtnEl = document.getElementById("refresh-bills");

const utilityPaymentFormEl = document.getElementById("utility-payment-form");
const utilityPaymentTypeEl = document.getElementById("utility-payment-type");
const utilityPaymentHouseEl = document.getElementById("utility-payment-house");
const utilityPaymentMonthEl = document.getElementById("utility-payment-month");
const utilityPaymentAmountEl = document.getElementById("utility-payment-amount");
const utilityPaymentProviderEl = document.getElementById("utility-payment-provider");
const utilityPaymentPaidAtEl = document.getElementById("utility-payment-paid-at");
const utilityPaymentReferenceEl = document.getElementById("utility-payment-reference");
const utilityPaymentNoteEl = document.getElementById("utility-payment-note");
const utilityPaymentHelpEl = document.getElementById("utility-payment-help");
const utilityPaymentsBodyEl = document.getElementById("utility-payments-body");
const refreshPaymentsBtnEl = document.getElementById("refresh-payments");
const expenditureFormEl = document.getElementById("expenditure-form");
const expenditureHouseNumberEl = document.getElementById("expenditure-house-number");
const expenditureCategoryEl = document.getElementById("expenditure-category");
const expenditureAmountEl = document.getElementById("expenditure-amount");
const expenditureTitleEl = document.getElementById("expenditure-title");
const expenditureNoteEl = document.getElementById("expenditure-note");
const expenditureChargeableEl = document.getElementById("expenditure-chargeable");
const expenditureSubmitBtnEl = document.getElementById("expenditure-submit-btn");
const expendituresBodyEl = document.getElementById("expenditures-body");
const refreshExpendituresBtnEl = document.getElementById("refresh-expenditures");
const moveOutSettlementReportSummaryEl = document.getElementById(
  "move-out-settlement-report-summary"
);
const moveOutSettlementsBodyEl = document.getElementById("move-out-settlements-body");
const refreshMoveOutSettlementsBtnEl = document.getElementById(
  "refresh-move-out-settlements"
);

const landlordErrorEl = document.getElementById("landlord-error");

const state = {
  role: "-",
  activeLandlordView: "tenants",
  buildings: [],
  buildingById: new Map(),
  applications: [],
  pendingApplicationsCount: 0,
  rentStatus: [],
  selectedRentPaymentBuildingId: "",
  selectedRentSheetBuildingId: "",
  rentSheetRows: [],
  paymentAccess: [],
  paymentAccessByBuildingId: new Map(),
  paymentProfiles: [],
  buildingPaymentProfiles: [],
  buildingPaymentProfileByBuildingId: new Map(),
  buildingPaymentInstructions: [],
  buildingPaymentInstructionByBuildingId: new Map(),
  wifiPackages: [],
  wifiPackagesUnavailableReason: "",
  selectedWifiPackageBuildingId: "",
  selectedRoomBuildingId: "",
  selectedRegistryBuildingId: "",
  selectedCaretakerBuildingId: "",
  selectedTicketBuildingId: "",
  residentUsersCount: 0,
  registryRows: [],
  registryRoomByKey: new Map(),
  utilityRateDefaults: null,
  utilitySheetBuildingConfiguration: null,
  utilitySheetMonthlyCombinedCharge: null,
  ownerStaff: [],
  ownerStaffLimit: 3,
  ownerStaffRemaining: 0,
  ownerNotifications: [],
  ownerNotificationsUnreadCount: 0,
  ownerNotificationsOpen: false,
  landlordPushConfig: null,
  landlordPushSubscriptionEndpoint: "",
  caretakerRequests: [],
  caretakers: [],
  tickets: [],
  residentDirectory: [],
  residentDirectoryByKey: new Map(),
  buildingManagementQuery: "",
  selectedResidentsBuildingId: "",
  selectedOverviewRoomBuildingId: "all",
  residentStatusFilter: "all",
  residentSearchQuery: "",
  selectedResident: null,
  selectedResidentAgreement: null,
  selectedResidentAgreementError: "",
  residentAgreementLoading: false,
  meters: [],
  meterByKey: new Map(),
  bills: [],
  latestUtilityBillByKey: new Map(),
  utilityBillByMonthKey: new Map(),
  registryReadingMonth: "",
  registryReadingBills: [],
  registryReadingBillByKey: new Map(),
  registryMonthlyCombinedCharge: null,
  utilityRoomSummaryByKey: new Map(),
  payments: [],
  expenditures: [],
  moveOutSettlements: [],
  moveOutSettlement: null
};

const BUILDING_PHOTO_LIMIT = 1;
const APPLICATION_REFRESH_INTERVAL_MS = 30_000;
const UTILITY_BALANCE_VISIBILITY_WINDOW_DAYS = 7;
const buildingLabelCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base"
});
let landlordSwRegistrationPromise = null;

initResponsiveTables();

function normalizeLookupBuildingId(buildingId) {
  return String(buildingId ?? "").trim();
}

function buildingHouseLookupKey(buildingId, houseNumber) {
  const normalizedHouse = normalizeHouse(houseNumber);
  if (!normalizedHouse) {
    return "";
  }

  return `${normalizeLookupBuildingId(buildingId)}::${normalizedHouse}`;
}

function utilityBuildingHouseLookupKey(utilityType, buildingId, houseNumber) {
  const normalizedHouse = normalizeHouse(houseNumber);
  if (!normalizedHouse) {
    return "";
  }

  return `${String(utilityType ?? "").trim().toLowerCase()}::${normalizeLookupBuildingId(
    buildingId
  )}::${normalizedHouse}`;
}

function utilityBuildingHouseMonthLookupKey(
  utilityType,
  buildingId,
  houseNumber,
  billingMonth
) {
  const baseKey = utilityBuildingHouseLookupKey(utilityType, buildingId, houseNumber);
  const normalizedMonth = toBillingMonth(billingMonth);
  if (!baseKey || !normalizedMonth) {
    return "";
  }

  return `${baseKey}::${normalizedMonth}`;
}

function buildRoomIndex(rows) {
  const index = new Map();
  (Array.isArray(rows) ? rows : []).forEach((item) => {
    const key = buildingHouseLookupKey(item.buildingId, item.houseNumber);
    if (key) {
      index.set(key, item);
    }
  });
  return index;
}

function buildMeterIndex(rows) {
  const index = new Map();
  (Array.isArray(rows) ? rows : []).forEach((item) => {
    const key = utilityBuildingHouseLookupKey(
      item.utilityType,
      item.buildingId,
      item.houseNumber
    );
    if (key) {
      index.set(key, item);
    }
  });
  return index;
}

function buildLatestUtilityBillIndex(rows) {
  const index = new Map();

  (Array.isArray(rows) ? rows : []).forEach((item) => {
    const key = utilityBuildingHouseLookupKey(
      item.utilityType,
      item.buildingId,
      item.houseNumber
    );
    if (!key) {
      return;
    }

    const current = index.get(key);
    if (!current) {
      index.set(key, item);
      return;
    }

    const currentMonth = String(current.billingMonth ?? "");
    const nextMonth = String(item.billingMonth ?? "");
    if (nextMonth > currentMonth) {
      index.set(key, item);
      return;
    }

    if (nextMonth === currentMonth) {
      const currentUpdated = String(current.updatedAt ?? "");
      const nextUpdated = String(item.updatedAt ?? "");
      if (nextUpdated > currentUpdated) {
        index.set(key, item);
      }
    }
  });

  return index;
}

function buildUtilityBillMonthIndex(rows) {
  const index = new Map();

  (Array.isArray(rows) ? rows : []).forEach((item) => {
    const key = utilityBuildingHouseMonthLookupKey(
      item.utilityType,
      item.buildingId,
      item.houseNumber,
      item.billingMonth
    );
    if (!key) {
      return;
    }

    const current = index.get(key);
    if (!current) {
      index.set(key, item);
      return;
    }

    const currentUpdated = String(current.updatedAt ?? "");
    const nextUpdated = String(item.updatedAt ?? "");
    if (nextUpdated > currentUpdated) {
      index.set(key, item);
    }
  });

  return index;
}

function setBuildings(rows) {
  state.buildings = Array.isArray(rows) ? rows : [];
  state.buildingById = new Map(
    state.buildings
      .map((item) => [normalizeLookupBuildingId(item.id), item])
      .filter(([key]) => Boolean(key))
  );
  renderBuildingRoomDrawerState();
}

function setPaymentAccess(rows) {
  state.paymentAccess = Array.isArray(rows) ? rows : [];
  state.paymentAccessByBuildingId = new Map(
    state.paymentAccess
      .map((item) => [normalizeLookupBuildingId(item.buildingId), item])
      .filter(([key]) => Boolean(key))
  );
}

function setPaymentProfiles(payload) {
  const profiles = Array.isArray(payload?.profiles) ? payload.profiles : [];
  const assignments = Array.isArray(payload?.assignments) ? payload.assignments : [];
  state.paymentProfiles = profiles;
  state.buildingPaymentProfiles = assignments;
  state.buildingPaymentProfileByBuildingId = new Map(
    assignments
      .map((item) => [normalizeLookupBuildingId(item.buildingId), item])
      .filter(([key]) => Boolean(key))
  );
}

function setPaymentInstructions(rows) {
  const instructions = Array.isArray(rows) ? rows : [];
  state.buildingPaymentInstructions = instructions;
  state.buildingPaymentInstructionByBuildingId = new Map(
    instructions
      .map((item) => [normalizeLookupBuildingId(item.buildingId), item])
      .filter(([key]) => Boolean(key))
  );
}

function setRegistryRows(rows) {
  state.registryRows = Array.isArray(rows) ? rows : [];
  state.registryRoomByKey = buildRoomIndex(state.registryRows);
}

function setResidentDirectory(rows) {
  state.residentDirectory = Array.isArray(rows) ? rows : [];
  state.residentDirectoryByKey = buildRoomIndex(state.residentDirectory);
  renderBuildingRoomDrawerState();
}

function setMeters(rows) {
  state.meters = Array.isArray(rows) ? rows : [];
  state.meterByKey = buildMeterIndex(state.meters);
}

function setBills(rows) {
  state.bills = Array.isArray(rows) ? rows : [];
  state.latestUtilityBillByKey = buildLatestUtilityBillIndex(state.bills);
  state.utilityBillByMonthKey = buildUtilityBillMonthIndex(state.bills);
  state.utilityRoomSummaryByKey = new Map();
}

function setRegistryReadingBills(rows) {
  state.registryReadingBills = Array.isArray(rows) ? rows : [];
  state.registryReadingBillByKey = buildUtilityBillMonthIndex(
    state.registryReadingBills
  );
}

function getBuildingRecord(buildingId) {
  const normalizedBuildingId = normalizeLookupBuildingId(buildingId);
  if (!normalizedBuildingId) {
    return null;
  }

  return state.buildingById.get(normalizedBuildingId) ?? null;
}

function getPaymentAccessRecord(buildingId) {
  const normalizedBuildingId = normalizeLookupBuildingId(buildingId);
  if (!normalizedBuildingId) {
    return null;
  }

  return state.paymentAccessByBuildingId.get(normalizedBuildingId) ?? null;
}

function getIndexedRoom(index, buildingId, houseNumber) {
  const exactKey = buildingHouseLookupKey(buildingId, houseNumber);
  if (!exactKey) {
    return null;
  }

  return index.get(exactKey) ?? index.get(buildingHouseLookupKey("", houseNumber)) ?? null;
}

function getLatestUtilityBill(utilityType, buildingId, houseNumber) {
  const exactKey = utilityBuildingHouseLookupKey(utilityType, buildingId, houseNumber);
  if (!exactKey) {
    return null;
  }

  return (
    state.latestUtilityBillByKey.get(exactKey) ??
    state.latestUtilityBillByKey.get(
      utilityBuildingHouseLookupKey(utilityType, "", houseNumber)
    ) ??
    null
  );
}

function getUtilityBillForMonth(utilityType, buildingId, houseNumber, billingMonth) {
  const exactKey = utilityBuildingHouseMonthLookupKey(
    utilityType,
    buildingId,
    houseNumber,
    billingMonth
  );
  if (!exactKey) {
    return null;
  }

  const legacyKey = utilityBuildingHouseMonthLookupKey(
    utilityType,
    "",
    houseNumber,
    billingMonth
  );

  return (
    state.registryReadingBillByKey.get(exactKey) ??
    state.registryReadingBillByKey.get(legacyKey) ??
    state.utilityBillByMonthKey.get(exactKey) ??
    state.utilityBillByMonthKey.get(legacyKey) ??
    null
  );
}

function setStatus(message) {
  const formatted = formatHouseManagerText(message);
  authStatusEl.textContent = formatted;
  notifyStatus(formatted);
}

function showError(message) {
  const formatted = formatHouseManagerText(message);
  landlordErrorEl.textContent = formatted;
  landlordErrorEl.classList.remove("hidden");
  notifyError(formatted);
}

function clearError() {
  landlordErrorEl.textContent = "";
  landlordErrorEl.classList.add("hidden");
}

function formatHouseManagerText(message) {
  return String(message ?? "")
    .replace(/\bcaretakers\b/gi, (match) =>
      match[0] === "C" ? "House managers" : "house managers"
    )
    .replace(/\bcaretaker\b/gi, (match) =>
      match[0] === "C" ? "House manager" : "house manager"
    );
}

function formatRoleLabel(role) {
  return role === "caretaker" ? "house manager" : role;
}

function isCaretakerRole() {
  return state.role === "caretaker";
}

const applicationsNavButtonEl = landlordNavButtons.find(
  (button) => button instanceof HTMLButtonElement && button.dataset.landlordView === "applications"
);

function updateApplicationsIndicator() {
  const pendingCount = Number(state.pendingApplicationsCount ?? 0);
  const hasPending = pendingCount > 0;
  const summary = hasPending
    ? `${pendingCount} pending tenant application${
        pendingCount === 1 ? "" : "s"
      }. New resident access requests refresh automatically every 30 seconds.`
    : "New resident access requests update automatically while this page is open.";

  if (applicationsSummaryEl instanceof HTMLElement) {
    applicationsSummaryEl.textContent = summary;
  }

  if (applicationsNavBadgeEl instanceof HTMLElement) {
    applicationsNavBadgeEl.textContent = String(pendingCount);
    applicationsNavBadgeEl.classList.toggle("hidden", !hasPending);
  }

  if (applicationsNavButtonEl instanceof HTMLButtonElement) {
    applicationsNavButtonEl.classList.toggle("has-alert", hasPending);
  }
}

function isOwnerAlertRole() {
  return state.role === "landlord" || state.role === "admin" || state.role === "root_admin";
}

function updateOwnerNotificationControls() {
  const owner = isOwnerAlertRole();
  const unreadCount = Number(state.ownerNotificationsUnreadCount ?? 0);

  if (landlordNotificationsBtnEl instanceof HTMLButtonElement) {
    landlordNotificationsBtnEl.classList.toggle("hidden", !owner);
    landlordNotificationsBtnEl.setAttribute(
      "aria-expanded",
      state.ownerNotificationsOpen ? "true" : "false"
    );
    landlordNotificationsBtnEl.classList.toggle("has-alert", owner && unreadCount > 0);
  }

  if (landlordNotificationsBadgeEl instanceof HTMLElement) {
    landlordNotificationsBadgeEl.textContent = String(unreadCount);
    landlordNotificationsBadgeEl.classList.toggle("hidden", !owner || unreadCount <= 0);
  }

  if (landlordNotificationsPanelEl instanceof HTMLElement) {
    landlordNotificationsPanelEl.classList.toggle(
      "hidden",
      !owner || !state.ownerNotificationsOpen
    );
  }

  renderLandlordPushControls();
}

function renderOwnerNotifications() {
  updateOwnerNotificationControls();

  if (!(landlordNotificationsListEl instanceof HTMLElement)) {
    return;
  }

  const notifications = Array.isArray(state.ownerNotifications)
    ? state.ownerNotifications
    : [];
  const unreadCount = Number(state.ownerNotificationsUnreadCount ?? 0);

  if (landlordNotificationsSummaryEl instanceof HTMLElement) {
    landlordNotificationsSummaryEl.textContent =
      notifications.length === 0
        ? "No owner alerts yet."
        : `${unreadCount} unread of ${notifications.length} recent alert${
            notifications.length === 1 ? "" : "s"
          }.`;
  }

  if (landlordNotificationsReadBtnEl instanceof HTMLButtonElement) {
    landlordNotificationsReadBtnEl.disabled = unreadCount <= 0;
  }

  landlordNotificationsListEl.replaceChildren();
  if (notifications.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No manager actions have created owner alerts yet.";
    landlordNotificationsListEl.append(empty);
    return;
  }

  notifications.slice(0, 30).forEach((notification) => {
    const item = document.createElement(notification.url ? "a" : "article");
    item.className = `landlord-notification-item ${
      notification.read ? "is-read" : "is-unread"
    }`;
    if (notification.url) {
      item.href = notification.url;
    }

    const head = document.createElement("div");
    head.className = "landlord-notification-item-head";

    const title = document.createElement("strong");
    title.textContent = notification.title || "Owner Alert";

    const chip = document.createElement("span");
    chip.className = `landlord-notification-chip chip-${notification.level || "info"}`;
    chip.textContent = notification.level || "info";

    head.append(title, chip);

    const message = document.createElement("p");
    message.textContent = notification.message || "";

    const meta = document.createElement("small");
    const metaParts = [
      notification.buildingName || notification.buildingId,
      notification.houseNumber ? `House ${notification.houseNumber}` : "",
      notification.actorName ? `By ${notification.actorName}` : "",
      formatDateTime(notification.createdAt)
    ].filter(Boolean);
    meta.textContent = metaParts.join(" • ");

    item.append(head, message, meta);
    landlordNotificationsListEl.append(item);
  });
}

function applyRoleCapabilities() {
  const caretaker = isCaretakerRole();

  if (ownerStaffManagementPanelEl instanceof HTMLElement) {
    ownerStaffManagementPanelEl.classList.toggle("hidden", caretaker);
  }

  if (caretakerManagementPanelEl instanceof HTMLElement) {
    caretakerManagementPanelEl.classList.toggle("hidden", caretaker);
  }

  openCreateBuildingDrawerButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    button.classList.toggle("hidden", caretaker);
  });

  if (openRentSheetBtnEl instanceof HTMLButtonElement) {
    openRentSheetBtnEl.classList.toggle("hidden", caretaker);
  }

  updateOwnerNotificationControls();
}

function redirectToLogin() {
  window.location.href = "/landlord/login";
}

function getBuildingNameById(buildingId) {
  return getBuildingRecord(buildingId)?.name ?? "";
}

function getBuildingDisplayName(building, fallback = "Building") {
  const name = String(building?.name ?? "").trim();
  return name || fallback;
}

function getBuildingDisplayNameById(buildingId, fallback = "Selected building") {
  return getBuildingDisplayName(getBuildingRecord(buildingId), fallback);
}

function compareBuildingRecords(a, b) {
  const nameComparison = buildingLabelCollator.compare(
    String(a?.name ?? ""),
    String(b?.name ?? "")
  );
  if (nameComparison !== 0) {
    return nameComparison;
  }

  return buildingLabelCollator.compare(String(a?.id ?? ""), String(b?.id ?? ""));
}

function getFocusedBuildingId() {
  const candidates = [
    state.selectedRegistryBuildingId,
    state.selectedRoomBuildingId,
    state.selectedCaretakerBuildingId,
    state.selectedRentPaymentBuildingId,
    state.selectedWifiPackageBuildingId,
    state.buildings[0]?.id
  ];

  for (const candidate of candidates) {
    const normalizedBuildingId = normalizeLookupBuildingId(candidate);
    if (normalizedBuildingId && state.buildingById.has(normalizedBuildingId)) {
      return normalizedBuildingId;
    }
  }

  return "";
}

function resolveActiveLandlordBuildingName() {
  const candidates = [
    getFocusedBuildingId(),
    state.selectedResidentsBuildingId,
    state.selectedOverviewRoomBuildingId,
    state.selectedTicketBuildingId
  ];

  for (const candidate of candidates) {
    const buildingName = getBuildingNameById(candidate);
    if (buildingName) {
      return buildingName;
    }
  }

  return "";
}

function updateLandlordBranding() {
  const buildingName = resolveActiveLandlordBuildingName();
  const shellBrand = getLandlordShellBrand(buildingName);
  const portalTitle = getLandlordPortalTitle(buildingName);

  if (landlordBrandTagEl instanceof HTMLElement) {
    landlordBrandTagEl.textContent = shellBrand;
  }
  if (landlordBrandTitleEl instanceof HTMLElement) {
    landlordBrandTitleEl.textContent = portalTitle;
  }

  applyDocumentBranding(portalTitle, shellBrand);
}

function setActiveLandlordView(nextView) {
  const requestedView = String(nextView ?? "").trim();
  const normalizedView =
    requestedView === "residents" || requestedView === "utilities"
      ? "tenants"
      : requestedView;
  const targetView =
    normalizedView === "overview" ||
    normalizedView === "buildings" ||
    normalizedView === "applications" ||
    normalizedView === "tenants" ||
    normalizedView === "expenses"
      ? normalizedView
      : "overview";
  state.activeLandlordView = targetView;

  landlordNavButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    button.classList.toggle(
      "active",
      (button.dataset.landlordView || button.dataset.landlordFocusTargetView) === targetView
    );
  });

  landlordViewPanels.forEach((panel) => {
    if (!(panel instanceof HTMLElement)) {
      return;
    }
    panel.classList.toggle("hidden", panel.dataset.landlordViewPanel !== targetView);
  });
}

function scrollToLandlordSection(sectionId) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const section = document.getElementById(sectionId);
      if (!(section instanceof HTMLElement)) {
        return;
      }

      const top = Math.max(0, window.scrollY + section.getBoundingClientRect().top - 16);
      window.scrollTo({ top, behavior: "smooth" });
    });
  });
}

function openMetricTarget(target) {
  switch (target) {
    case "meters":
      setActiveLandlordView("tenants");
      scrollToLandlordSection("utilities-registry-section");
      void openUtilitySetupModal().catch((error) => {
        handleLandlordError(error, "Unable to open meter setup.");
      });
      break;
    case "users":
      setActiveLandlordView("tenants");
      scrollToLandlordSection("residents-section");
      break;
    case "posted-bills":
      setActiveLandlordView("tenants");
      scrollToLandlordSection("utilities-bills-section");
      break;
    case "payments":
      setActiveLandlordView("overview");
      scrollToLandlordSection("overview-collections-section");
      break;
    case "unpaid-bills":
    case "overdue-bills":
      setActiveLandlordView("tenants");
      scrollToLandlordSection("utility-room-status-section");
      break;
    case "outstanding":
      setActiveLandlordView("tenants");
      scrollToLandlordSection("residents-section");
      break;
    default:
      setActiveLandlordView("overview");
      break;
  }
}

function openCreateBuildingDrawer() {
  if (!(createBuildingDrawerEl instanceof HTMLElement)) {
    return;
  }

  if (buildingDrawerEl instanceof HTMLElement) {
    buildingDrawerEl.classList.add("hidden");
  }
  createBuildingDrawerEl.classList.remove("hidden");
  if (buildingDrawerBackdropEl instanceof HTMLElement) {
    buildingDrawerBackdropEl.classList.remove("hidden");
  }
}

function closeCreateBuildingDrawer() {
  if (!(createBuildingDrawerEl instanceof HTMLElement)) {
    return;
  }

  createBuildingDrawerEl.classList.add("hidden");
  if (
    buildingDrawerBackdropEl instanceof HTMLElement &&
    (!(buildingDrawerEl instanceof HTMLElement) || buildingDrawerEl.classList.contains("hidden"))
  ) {
    buildingDrawerBackdropEl.classList.add("hidden");
  }
}

function openBuildingDrawer(buildingId) {
  if (!(buildingDrawerEl instanceof HTMLElement)) {
    return;
  }

  if (createBuildingDrawerEl instanceof HTMLElement) {
    createBuildingDrawerEl.classList.add("hidden");
  }
  if (buildingId && roomTargetBuildingEl instanceof HTMLSelectElement) {
    roomTargetBuildingEl.value = buildingId;
    state.selectedRoomBuildingId = buildingId;
  }

  renderBuildingRoomDrawerState();
  buildingDrawerEl.classList.remove("hidden");
  if (buildingDrawerBackdropEl instanceof HTMLElement) {
    buildingDrawerBackdropEl.classList.remove("hidden");
  }
}

function closeBuildingDrawer() {
  if (!(buildingDrawerEl instanceof HTMLElement)) {
    return;
  }
  buildingDrawerEl.classList.add("hidden");
  if (
    buildingDrawerBackdropEl instanceof HTMLElement &&
    (!(createBuildingDrawerEl instanceof HTMLElement) ||
      createBuildingDrawerEl.classList.contains("hidden"))
  ) {
    buildingDrawerBackdropEl.classList.add("hidden");
  }
}

function openResidentDrawer(resident) {
  if (!(residentDrawerEl instanceof HTMLElement)) {
    return;
  }

  state.selectedResident = resident;
  state.selectedResidentAgreement = null;
  state.selectedResidentAgreementError = "";
  state.residentAgreementLoading = Boolean(resident?.hasActiveResident);
  renderResidentDrawer(resident);
  residentDrawerEl.classList.remove("hidden");
  if (residentDrawerBackdropEl instanceof HTMLElement) {
    residentDrawerBackdropEl.classList.remove("hidden");
  }

  if (resident?.hasActiveResident) {
    void loadResidentAgreement(resident).catch((error) => {
      state.residentAgreementLoading = false;
      state.selectedResidentAgreementError =
        error instanceof Error ? error.message : "Unable to load tenant agreement.";
      renderResidentDrawer(resident);
      handleLandlordError(error, "Unable to load tenant agreement.");
    });
  }

  if (
    landlordTicketBuildingSelectEl instanceof HTMLSelectElement &&
    landlordTicketBuildingSelectEl.value !== resident.buildingId
  ) {
    landlordTicketBuildingSelectEl.value = resident.buildingId;
    state.selectedTicketBuildingId = resident.buildingId;
    void loadLandlordTickets()
      .then(() => {
        if (sameResidentKey(state.selectedResident, resident)) {
          renderResidentDrawer(state.selectedResident);
        }
      })
      .catch((error) => {
        handleLandlordError(error, "Unable to load room issues.");
      });
  }
}

function closeResidentDrawer() {
  if (!(residentDrawerEl instanceof HTMLElement)) {
    return;
  }
  residentDrawerEl.classList.add("hidden");
  if (residentDrawerBackdropEl instanceof HTMLElement) {
    residentDrawerBackdropEl.classList.add("hidden");
  }
  state.selectedResident = null;
  state.selectedResidentAgreement = null;
  state.selectedResidentAgreementError = "";
  state.residentAgreementLoading = false;
}

function closeUtilitySetupModal() {
  if (utilitySetupModalEl instanceof HTMLElement) {
    utilitySetupModalEl.classList.add("hidden");
  }

  if (utilitySetupBackdropEl instanceof HTMLElement) {
    utilitySetupBackdropEl.classList.add("hidden");
  }
}

function showUtilitySetupModal() {
  if (utilitySetupModalEl instanceof HTMLElement) {
    utilitySetupModalEl.classList.remove("hidden");
  }

  if (utilitySetupBackdropEl instanceof HTMLElement) {
    utilitySetupBackdropEl.classList.remove("hidden");
  }
}

function closeUtilitySheetModal() {
  if (utilitySheetModalEl instanceof HTMLElement) {
    utilitySheetModalEl.classList.add("hidden");
  }

  if (utilitySheetBackdropEl instanceof HTMLElement) {
    utilitySheetBackdropEl.classList.add("hidden");
  }
}

function showUtilitySheetModal() {
  if (utilitySheetModalEl instanceof HTMLElement) {
    utilitySheetModalEl.classList.remove("hidden");
  }

  if (utilitySheetBackdropEl instanceof HTMLElement) {
    utilitySheetBackdropEl.classList.remove("hidden");
  }
}

function closeOverviewUtilityPaymentModal() {
  if (overviewUtilityPaymentModalEl instanceof HTMLElement) {
    overviewUtilityPaymentModalEl.classList.add("hidden");
  }

  if (overviewUtilityPaymentBackdropEl instanceof HTMLElement) {
    overviewUtilityPaymentBackdropEl.classList.add("hidden");
  }

  if (overviewUtilityPaymentFormEl instanceof HTMLFormElement) {
    overviewUtilityPaymentFormEl.reset();
    delete overviewUtilityPaymentFormEl.dataset.buildingId;
    delete overviewUtilityPaymentFormEl.dataset.houseNumber;
    delete overviewUtilityPaymentFormEl.dataset.utilityType;
    delete overviewUtilityPaymentFormEl.dataset.statusLabel;
  }
}

function showOverviewUtilityPaymentModal() {
  if (overviewUtilityPaymentModalEl instanceof HTMLElement) {
    overviewUtilityPaymentModalEl.classList.remove("hidden");
  }

  if (overviewUtilityPaymentBackdropEl instanceof HTMLElement) {
    overviewUtilityPaymentBackdropEl.classList.remove("hidden");
  }
}

function closeMoveOutSettlementModal() {
  if (moveOutSettlementModalEl instanceof HTMLElement) {
    moveOutSettlementModalEl.classList.add("hidden");
  }

  if (moveOutSettlementBackdropEl instanceof HTMLElement) {
    moveOutSettlementBackdropEl.classList.add("hidden");
  }

  if (moveOutSettlementFormEl instanceof HTMLFormElement) {
    moveOutSettlementFormEl.reset();
    delete moveOutSettlementFormEl.dataset.buildingId;
    delete moveOutSettlementFormEl.dataset.userId;
    delete moveOutSettlementFormEl.dataset.houseNumber;
    delete moveOutSettlementFormEl.dataset.residentName;
  }

  state.moveOutSettlement = null;
}

function showMoveOutSettlementModal() {
  if (moveOutSettlementModalEl instanceof HTMLElement) {
    moveOutSettlementModalEl.classList.remove("hidden");
  }

  if (moveOutSettlementBackdropEl instanceof HTMLElement) {
    moveOutSettlementBackdropEl.classList.remove("hidden");
  }
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatDateOnly(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "-";
  }

  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(date);
}

function formatBillingMonth(value) {
  const normalized = toBillingMonth(value);
  if (!normalized) {
    return "-";
  }

  const date = new Date(`${normalized}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return normalized;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatUtilityPaymentCoverage(data, fallbackBillingMonth) {
  const coveredMonths = Array.isArray(data?.allocations)
    ? [...new Set(
        data.allocations
          .map((item) =>
            String(item?.bill?.billingMonth ?? item?.event?.billingMonth ?? "").trim()
          )
          .filter(Boolean)
      )]
    : [];
  if (coveredMonths.length > 0) {
    return coveredMonths.map((item) => formatBillingMonth(item)).join(", ");
  }

  const fallback = String(fallbackBillingMonth ?? "").trim();
  return fallback ? formatBillingMonth(fallback) : "";
}

function formatCurrency(value) {
  return `KSh ${Number(value ?? 0).toLocaleString("en-US")}`;
}

const DEFAULT_WATER_RATE_PER_UNIT_KSH = 150;

function utilityTypeLabel(value) {
  return String(value ?? "").trim() === "water" ? "Water" : "Electricity";
}

function currentBillingMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthKeyFromValue(value) {
  const raw = String(value ?? "").trim();
  if (/^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
}

function previousBillingMonth(value = new Date()) {
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  parsed.setUTCDate(1);
  parsed.setUTCMonth(parsed.getUTCMonth() - 1);
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toMonthInputValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  if (/^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function utilityAmount(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function subtractUtcDays(value, days) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const copy = new Date(parsed);
  copy.setUTCDate(copy.getUTCDate() - days);
  return copy.toISOString();
}

function hasUtilityPayments(item) {
  return Array.isArray(item?.payments) && item.payments.length > 0;
}

function isUtilityPlaceholderBill(item) {
  return (
    utilityAmount(item?.amountKsh) <= 0 &&
    utilityAmount(item?.balanceKsh) <= 0 &&
    !hasUtilityPayments(item)
  );
}

function getUtilityPaidAmount(item) {
  if (hasUtilityPayments(item)) {
    return item.payments.reduce(
      (sum, payment) => sum + utilityAmount(payment?.amountKsh),
      0
    );
  }

  return Math.max(
    0,
    utilityAmount(item?.amountKsh) - utilityAmount(item?.balanceKsh)
  );
}

function findRegistryRoom(buildingId, houseNumber) {
  return (
    getIndexedRoom(state.registryRoomByKey, buildingId, houseNumber) ??
    getIndexedRoom(state.residentDirectoryByKey, buildingId, houseNumber) ??
    null
  );
}

function getRoomMeterProfile(buildingId, houseNumber) {
  const registryRoom = findRegistryRoom(buildingId, houseNumber);
  const configuredWater = findConfiguredMeter("water", buildingId, houseNumber)?.meterNumber;
  const configuredElectricity = findConfiguredMeter(
    "electricity",
    buildingId,
    houseNumber
  )?.meterNumber;
  const waterMeterNumber = normalizeUtilityMeterNumber(
    registryRoom?.waterMeterNumber ?? configuredWater ?? ""
  );
  const electricityMeterNumber = normalizeUtilityMeterNumber(
    registryRoom?.electricityMeterNumber ?? configuredElectricity ?? ""
  );

  return {
    waterMeterNumber,
    electricityMeterNumber,
    hasWaterMeter: Boolean(waterMeterNumber),
    hasElectricityMeter: Boolean(electricityMeterNumber),
    hasBothMeters: Boolean(waterMeterNumber && electricityMeterNumber),
    hasAnyMeter: Boolean(waterMeterNumber || electricityMeterNumber)
  };
}

function isCombinedFallbackUtilityBill(item) {
  const meterNumber = String(item?.meterNumber ?? "").trim().toUpperCase();
  const unitsConsumed = utilityAmount(item?.unitsConsumed);
  return (
    unitsConsumed <= 0 &&
    (meterNumber === "" || meterNumber === "NO-METER" || meterNumber === "METER-UNSET")
  );
}

function normalizeUtilityMeterNumber(value) {
  const normalized = String(value ?? "").trim();
  const upper = normalized.toUpperCase();
  if (!normalized || upper === "NO-METER" || upper === "METER-UNSET") {
    return "";
  }

  return normalized;
}

function hasUsableMeterNumber(value) {
  return Boolean(normalizeUtilityMeterNumber(value));
}

function shouldAwaitMeterReadings(item) {
  if (!item || isUtilityPlaceholderBill(item)) {
    return false;
  }

  // A posted positive bill is already real debt for the room, even if the
  // room later gets meter-based billing. Do not hide that debt behind a
  // "waiting for readings" status.
  if (utilityAmount(item.amountKsh) > 0) {
    return false;
  }

  if (String(item.status ?? "").trim() === "overdue") {
    return false;
  }

  if (utilityAmount(item.balanceKsh) <= 0 || getUtilityPaidAmount(item) > 0) {
    return false;
  }

  return (
    getRoomMeterProfile(item.buildingId, item.houseNumber).hasBothMeters &&
    isCombinedFallbackUtilityBill(item)
  );
}

function isUtilityBillBalanceVisible(item) {
  const dueDate = String(item?.dueDate ?? "").trim();
  if (!dueDate) {
    return true;
  }

  const visibleAt = subtractUtcDays(
    dueDate,
    UTILITY_BALANCE_VISIBILITY_WINDOW_DAYS
  );
  if (!visibleAt) {
    return true;
  }

  return Date.parse(visibleAt) <= Date.now();
}

function getVisibleUtilityBills(rows) {
  return (Array.isArray(rows) ? rows : []).filter(
    (item) => !isUtilityPlaceholderBill(item) && isUtilityBillBalanceVisible(item)
  );
}

function getActionableUtilityBills(rows) {
  return getVisibleUtilityBills(rows).filter((item) => !shouldAwaitMeterReadings(item));
}

function utilityStatusMeta(status) {
  switch (String(status ?? "").trim()) {
    case "overdue_payable":
      return { label: "Overdue + Payable", className: "overdue-payable" };
    case "overdue":
      return { label: "Overdue", className: "overdue" };
    case "payable":
      return { label: "Payable", className: "payable" };
    case "due_soon":
      return { label: "Due Soon", className: "due-soon" };
    case "clear":
      return { label: "Clear", className: "clear" };
    case "setup_pending":
      return { label: "Setup Pending", className: "setup-pending" };
    case "awaiting_readings":
      return { label: "Waiting for meter readings", className: "awaiting-readings" };
    default:
      return { label: "Unknown", className: "" };
  }
}

function renderUtilityStatus(status) {
  const meta = utilityStatusMeta(status);
  return `<span class="utility-status ${meta.className}">${meta.label}</span>`;
}

function renderUtilityStatusAction(summaryRow) {
  const meta = utilityStatusMeta(summaryRow?.status);
  const action = summaryRow?.overdueAction ?? summaryRow?.payableAction ?? null;
  if (!action) {
    return `<span class="utility-status ${meta.className}">${meta.label}</span>`;
  }

  return `
    <button
      type="button"
      class="utility-status utility-status-action ${meta.className}"
      data-action="open-overview-utility-payment"
      data-building-id="${escapeHtml(action.buildingId)}"
      data-house-number="${escapeHtml(action.houseNumber)}"
      data-utility-type="${escapeHtml(action.utilityType)}"
      data-billing-month="${escapeHtml(action.billingMonth)}"
      data-amount-ksh="${escapeHtml(action.amountKsh)}"
      data-status-label="${escapeHtml(meta.label)}"
      title="Record utility payment"
    >
      ${meta.label}
    </button>
  `;
}

function getUtilityDisplayStatus(item) {
  if (isUtilityPlaceholderBill(item)) {
    return "setup_pending";
  }

  if (shouldAwaitMeterReadings(item)) {
    return "awaiting_readings";
  }

  return String(item?.status || "").trim() || "clear";
}

function compareHouseNumber(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function buildResidentSearchText(resident) {
  const occupancy = resident?.hasActiveResident || resident?.residentUserId || resident?.residentName
    ? isResidentPendingVerification(resident)
      ? "pending review unverified"
      : "active"
    : "vacant";

  return [
    resident?.buildingName,
    resident?.buildingId,
    resident?.houseNumber,
    resident?.residentName,
    resident?.residentPhone,
    resident?.identityNumber,
    resident?.occupationLabel,
    resident?.occupationStatus,
    resident?.emergencyContactName,
    resident?.emergencyContactPhone,
    resident?.rentPaymentStatus,
    occupancy,
    numberToInputString(getResidentOutstandingBalanceKsh(resident))
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesResidentSearch(resident, query) {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return buildResidentSearchText(resident).includes(normalizedQuery);
}

function updateResidentsSearchSummary(totalRows, visibleRows) {
  if (!(residentsSearchSummaryEl instanceof HTMLElement)) {
    return;
  }

  const query = String(state.residentSearchQuery ?? "").trim();
  if (!query) {
    residentsSearchSummaryEl.textContent = `Showing ${visibleRows} room${
      visibleRows === 1 ? "" : "s"
    } for the selected building filter.`;
    return;
  }

  residentsSearchSummaryEl.textContent = `Found ${visibleRows} of ${totalRows} room${
    totalRows === 1 ? "" : "s"
  } for "${query}".`;
}

function getResidentOccupancyLabel(resident) {
  const hasResident =
    resident?.hasActiveResident || resident?.residentUserId || resident?.residentName;
  if (!hasResident) {
    return "vacant";
  }

  return isResidentPendingVerification(resident) ? "pending_review" : "occupied";
}

function matchesResidentStatusFilter(resident, filterValue) {
  const filter = String(filterValue ?? "all").trim();
  if (!filter || filter === "all") {
    return true;
  }

  const occupancy = getResidentOccupancyLabel(resident);
  const utilitySummary = getResidentUtilityRoomSummary(resident);
  const balanceKsh = getResidentOperationalOutstandingKsh(resident, utilitySummary);
  const currentDueKsh = getResidentOperationalCurrentDueKsh(resident, utilitySummary);
  const arrearsKsh = getResidentOperationalArrearsKsh(resident, utilitySummary);
  const openUtilityBalanceKsh = utilityAmount(utilitySummary?.totalOpenBalanceKsh);

  switch (filter) {
    case "overdue":
      return arrearsKsh > 0;
    case "current_due":
      return currentDueKsh > 0;
    case "awaiting_readings":
      return utilitySummary?.status === "awaiting_readings";
    case "clear":
      return (
        occupancy === "occupied" &&
        balanceKsh <= 0 &&
        currentDueKsh <= 0 &&
        arrearsKsh <= 0 &&
        openUtilityBalanceKsh <= 0 &&
        utilitySummary?.status !== "awaiting_readings"
      );
    case "with_balance":
      return balanceKsh > 0;
    case "vacant":
      return occupancy === "vacant";
    case "occupied":
      return occupancy !== "vacant";
    case "pending_review":
      return occupancy === "pending_review";
    default:
      return true;
  }
}

function buildUtilityRoomSummaryIndex(rows = state.bills) {
  const index = new Map();
  summarizeUtilityRooms(rows).forEach((item) => {
    const key = buildingHouseLookupKey(item.buildingId, item.houseNumber);
    if (key) {
      index.set(key, item);
    }
  });
  return index;
}

function getUtilityRoomSummaryIndex() {
  if (
    !(state.utilityRoomSummaryByKey instanceof Map) ||
    state.utilityRoomSummaryByKey.size === 0
  ) {
    state.utilityRoomSummaryByKey = buildUtilityRoomSummaryIndex(state.bills);
  }

  return state.utilityRoomSummaryByKey;
}

function getResidentUtilityRoomSummary(resident) {
  if (!resident) {
    return null;
  }

  const index = getUtilityRoomSummaryIndex();
  const exactKey = buildingHouseLookupKey(resident.buildingId, resident.houseNumber);
  const fallbackKey = buildingHouseLookupKey("", resident.houseNumber);
  return index.get(exactKey) ?? index.get(fallbackKey) ?? null;
}

function getUtilitySummaryResident(item) {
  if (!item) {
    return null;
  }

  return (
    findResidentDirectoryEntry(item.buildingId, item.houseNumber) ??
    findResidentDirectoryEntry("", item.houseNumber) ??
    null
  );
}

function matchesUtilitySummaryTenantFilters(item) {
  if (!item) {
    return false;
  }

  const selectedBuildingId = String(state.selectedResidentsBuildingId || "all").trim();
  if (
    selectedBuildingId &&
    selectedBuildingId !== "all" &&
    String(item.buildingId || "") !== selectedBuildingId
  ) {
    return false;
  }

  const resident = getUtilitySummaryResident(item);
  const query = String(state.residentSearchQuery || "").trim().toLowerCase();
  if (query) {
    const fallbackSearch = [
      item.buildingId,
      item.houseNumber,
      item.status,
      item.breakdown
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (
      !(resident && matchesResidentSearch(resident, query)) &&
      !fallbackSearch.includes(query)
    ) {
      return false;
    }
  }

  const filter = String(state.residentStatusFilter || "all").trim();
  if (!filter || filter === "all") {
    return true;
  }

  switch (filter) {
    case "overdue":
      return utilityAmount(item.overdueBalanceKsh) > 0;
    case "current_due":
      return utilityAmount(item.payableBalanceKsh) > 0;
    case "awaiting_readings":
      return item.status === "awaiting_readings";
    case "clear":
      return (
        item.status === "clear" &&
        utilityAmount(item.totalOpenBalanceKsh) <= 0 &&
        (!resident || matchesResidentStatusFilter(resident, "clear"))
      );
    case "with_balance":
      return utilityAmount(item.totalOpenBalanceKsh) > 0;
    case "vacant":
    case "occupied":
    case "pending_review":
      return resident ? matchesResidentStatusFilter(resident, filter) : false;
    default:
      return resident ? matchesResidentStatusFilter(resident, filter) : true;
  }
}

function getUtilityLedgerBuildingId() {
  const selectedBuildingId = String(state.selectedResidentsBuildingId || "").trim();
  if (selectedBuildingId && selectedBuildingId !== "all") {
    return selectedBuildingId;
  }

  return "";
}

function getResidentOperationalCurrentDueKsh(resident, utilitySummary = null) {
  const utilityCurrentDueKsh = Math.max(
    getResidentCurrentUtilityDueKsh(resident),
    utilityAmount(utilitySummary?.payableBalanceKsh)
  );
  return getResidentCurrentRentDueKsh(resident) + utilityCurrentDueKsh;
}

function getResidentOperationalArrearsKsh(resident, utilitySummary = null) {
  const utilityArrearsKsh = Math.max(
    getResidentUtilityArrearsKsh(resident),
    utilityAmount(utilitySummary?.overdueBalanceKsh)
  );
  return (
    getResidentRentArrearsKsh(resident) +
    utilityArrearsKsh +
    getResidentExpenseBalanceKsh(resident)
  );
}

function getResidentOperationalOutstandingKsh(resident, utilitySummary = null) {
  const calculatedBalanceKsh =
    getResidentOperationalCurrentDueKsh(resident, utilitySummary) +
    getResidentOperationalArrearsKsh(resident, utilitySummary);
  return Math.max(getResidentOutstandingBalanceKsh(resident), calculatedBalanceKsh);
}

function getResidentUtilityBillingStatusLabel(resident, utilitySummary = null) {
  const utilityArrearsKsh = Math.max(
    getResidentUtilityArrearsKsh(resident),
    utilityAmount(utilitySummary?.overdueBalanceKsh)
  );
  const currentUtilityDueKsh = Math.max(
    getResidentCurrentUtilityDueKsh(resident),
    utilityAmount(utilitySummary?.payableBalanceKsh)
  );

  if (utilityArrearsKsh > 0 && currentUtilityDueKsh > 0) {
    return "Utility overdue + due";
  }
  if (utilityArrearsKsh > 0) {
    return "Utility overdue";
  }
  if (currentUtilityDueKsh > 0) {
    return "Utility due";
  }
  if (utilitySummary?.status === "awaiting_readings") {
    return "Awaiting readings";
  }

  return "";
}

function isResidentRentEnabled(resident) {
  return resident?.rentEnabled !== false;
}

function getResidentCurrentUtilityDueKsh(resident) {
  if (!canDisplayResidentBilling(resident)) {
    return 0;
  }

  const explicitCurrentDue = Number(resident?.currentUtilityDueKsh);
  if (Number.isFinite(explicitCurrentDue)) {
    return Math.max(0, explicitCurrentDue);
  }

  const utilityBalanceKsh = getResidentUtilityBalanceKsh(resident);
  const utilityArrearsKsh = getResidentUtilityArrearsKsh(resident);
  return Math.max(0, utilityBalanceKsh - utilityArrearsKsh);
}

function getResidentUtilityArrearsKsh(resident) {
  if (!canDisplayResidentBilling(resident)) {
    return 0;
  }

  const explicitArrears = Number(resident?.utilityArrearsKsh);
  if (Number.isFinite(explicitArrears)) {
    return Math.max(0, explicitArrears);
  }

  const utilityBalanceKsh = getResidentUtilityBalanceKsh(resident);
  const explicitCurrentDue = Number(resident?.currentUtilityDueKsh);
  if (Number.isFinite(explicitCurrentDue)) {
    return Math.max(0, utilityBalanceKsh - Math.max(0, explicitCurrentDue));
  }

  return 0;
}

function getResidentExpenseBalanceKsh(resident) {
  if (!canDisplayResidentBilling(resident)) {
    return 0;
  }

  const explicitExpense = Number(
    resident?.expenseBalanceKsh ?? resident?.expenseArrearsKsh ?? 0
  );
  if (Number.isFinite(explicitExpense)) {
    return Math.max(0, explicitExpense);
  }

  return 0;
}

function getResidentCurrentMonthRentPaidKsh(resident, agreement) {
  if (!canDisplayResidentBilling(resident) || !isResidentRentEnabled(resident)) {
    return 0;
  }

  const explicitPaid = Number(resident?.currentMonthRentPaidKsh ?? resident?.paidAmountKsh);
  if (Number.isFinite(explicitPaid)) {
    return Math.max(0, explicitPaid);
  }

  const monthlyRentKsh = getResidentMonthlyRentKsh(resident, agreement);
  const currentRentDueKsh = getResidentCurrentRentDueKsh(resident, agreement);
  if (monthlyRentKsh <= 0) {
    return 0;
  }

  return Math.max(0, monthlyRentKsh - currentRentDueKsh);
}

function compareIsoDateDesc(leftValue, rightValue) {
  const left = new Date(leftValue || 0).getTime();
  const right = new Date(rightValue || 0).getTime();
  const safeLeft = Number.isFinite(left) ? left : 0;
  const safeRight = Number.isFinite(right) ? right : 0;
  return safeRight - safeLeft;
}

function matchesResidentRoomScope(item, resident) {
  return (
    item &&
    resident &&
    normalizeLookupBuildingId(item.buildingId) ===
      normalizeLookupBuildingId(resident.buildingId) &&
    normalizeHouse(item.houseNumber) === normalizeHouse(resident.houseNumber)
  );
}

function getResidentUtilityBills(resident) {
  return (Array.isArray(state.bills) ? state.bills : [])
    .filter((item) => matchesResidentRoomScope(item, resident))
    .sort(
      (left, right) =>
        compareIsoDateDesc(
          left?.dueDate || left?.updatedAt || left?.createdAt,
          right?.dueDate || right?.updatedAt || right?.createdAt
        ) || String(right?.billingMonth || "").localeCompare(String(left?.billingMonth || ""))
    );
}

function getResidentUtilityPayments(resident) {
  return (Array.isArray(state.payments) ? state.payments : [])
    .filter((item) => matchesResidentRoomScope(item, resident))
    .sort((left, right) =>
      compareIsoDateDesc(
        left?.paidAt || left?.createdAt,
        right?.paidAt || right?.createdAt
      )
    );
}

function getResidentRoomExpenditures(resident) {
  return (Array.isArray(state.expenditures) ? state.expenditures : [])
    .filter((item) => matchesResidentRoomScope(item, resident))
    .sort((left, right) => compareIsoDateDesc(left?.createdAt, right?.createdAt));
}

function getResidentOverappliedUtilityBills(utilityBills) {
  return (Array.isArray(utilityBills) ? utilityBills : []).filter((bill) => {
    const billAmountKsh = Number(bill?.amountKsh ?? 0);
    const paidAmountKsh = Array.isArray(bill?.payments)
      ? bill.payments.reduce((sum, payment) => sum + Number(payment?.amountKsh ?? 0), 0)
      : 0;
    return paidAmountKsh > billAmountKsh && billAmountKsh >= 0;
  });
}

function formatPaymentProvider(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "Unknown";
  }

  if (normalized === "mpesa") {
    return "M-PESA";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getResidentCurrentChargeDueKsh(resident, agreement) {
  return (
    getResidentCurrentRentDueKsh(resident, agreement) +
    getResidentCurrentUtilityDueKsh(resident)
  );
}

function getResidentArrearsBalanceKsh(resident, agreement) {
  return (
    getResidentRentArrearsKsh(resident, agreement) +
    getResidentUtilityArrearsKsh(resident) +
    getResidentExpenseBalanceKsh(resident)
  );
}

function getResidentNextDueDate(resident) {
  if (!resident) {
    return "";
  }

  if (!canDisplayResidentBilling(resident)) {
    return "";
  }

  if (!isResidentRentEnabled(resident)) {
    return String(resident.nextUtilityDueDate ?? "").trim();
  }

  const rentDueDate = String(resident.rentDueDate ?? "").trim();
  if (rentDueDate) {
    return rentDueDate;
  }

  return String(resident.nextUtilityDueDate ?? "").trim();
}

function getResidentOverdueStartDate(resident) {
  if (!resident || !canDisplayResidentBilling(resident) || !isResidentRentEnabled(resident)) {
    return "";
  }

  return (
    String(resident.rentOverdueStartsAt ?? "").trim() ||
    String(resident.rentDueDate ?? "").trim()
  );
}

function getResidentBillingStatusLabel(resident) {
  if (!resident?.hasActiveResident && !resident?.residentUserId && !resident?.residentName) {
    return "-";
  }

  if (!canDisplayResidentBilling(resident)) {
    return "Verification pending";
  }

  const expenseBalanceKsh = getResidentExpenseBalanceKsh(resident);
  const utilitySummary = getResidentUtilityRoomSummary(resident);
  const utilityLabel = getResidentUtilityBillingStatusLabel(resident, utilitySummary);

  if (!isResidentRentEnabled(resident)) {
    const label = utilityLabel || "Clear";

    if (expenseBalanceKsh > 0) {
      return label === "Clear" ? "Charge overdue" : `${label} + charge`;
    }

    return label;
  }

  const rentStatus = String(resident.rentStatus ?? "").trim();
  const currentRentDueKsh = getResidentCurrentRentDueKsh(resident);
  const rentArrearsKsh = getResidentRentArrearsKsh(resident);
  let label = "";
  if (rentStatus === "overdue") {
    if (rentArrearsKsh > 0 && currentRentDueKsh > 0) {
      label = "Rent overdue + due";
    } else {
      label = "Rent overdue";
    }
  } else if (currentRentDueKsh > 0) {
    label = rentArrearsKsh > 0 ? "Rent overdue + due" : "Rent due";
  } else {
    const hasRentProfile = Boolean(
      resident.rentPaymentStatus ||
        resident.rentStatus ||
        resident.rentDueDate ||
        resident.latestRentPaymentReference ||
        resident.latestRentPaymentAt
    );
    label = hasRentProfile ? "Clear" : "-";
  }

  if (expenseBalanceKsh > 0) {
    return label === "Clear" || label === "-" ? "Charge overdue" : `${label} + charge`;
  }

  if (!utilityLabel) {
    return label;
  }

  if (!label || label === "-" || label === "Clear") {
    return utilityLabel;
  }

  return `${label} + utility`;
}

function getResidentTotalRentPaidKsh(resident) {
  if (!canDisplayResidentBilling(resident)) {
    return 0;
  }

  const totalPaid = Number(
    resident?.totalRentPaidKsh ?? resident?.paidAmountKsh ?? resident?.rentPaidKsh
  );
  if (Number.isFinite(totalPaid)) {
    return Math.max(0, totalPaid);
  }

  return 0;
}

function getVisibleResidentDirectoryRows(rows) {
  const allRows = Array.isArray(rows) ? rows : [];
  return sortResidentsForDirectory(
    dedupeResidentDirectoryRows(allRows).filter(
      (resident) =>
        matchesResidentStatusFilter(resident, state.residentStatusFilter) &&
        matchesResidentSearch(resident, state.residentSearchQuery)
    )
  );
}

function residentDirectoryPreference(resident) {
  const billingLabel = String(getResidentBillingStatusLabel(resident) ?? "")
    .trim()
    .toLowerCase();
  const infoScore = [
    Boolean(resident?.residentName),
    Boolean(resident?.residentPhone),
    Boolean(resident?.identityNumber),
    Boolean(resident?.occupationStatus || resident?.occupationLabel),
    Boolean(resident?.emergencyContactName)
  ].filter(Boolean).length;

  return {
    billingPriority: billingLabel === "clear" ? 0 : 1,
    occupancyPriority:
      resident?.hasActiveResident || resident?.residentUserId || resident?.residentName ? 0 : 1,
    verificationPriority: resident?.verificationStatus === "pending_review" ? 1 : 0,
    infoScore,
    outstandingKsh: getResidentOutstandingBalanceKsh(resident)
  };
}

function compareResidentDirectoryPreference(candidate, current) {
  const candidatePref = residentDirectoryPreference(candidate);
  const currentPref = residentDirectoryPreference(current);

  if (candidatePref.billingPriority !== currentPref.billingPriority) {
    return candidatePref.billingPriority - currentPref.billingPriority;
  }
  if (candidatePref.occupancyPriority !== currentPref.occupancyPriority) {
    return candidatePref.occupancyPriority - currentPref.occupancyPriority;
  }
  if (candidatePref.verificationPriority !== currentPref.verificationPriority) {
    return candidatePref.verificationPriority - currentPref.verificationPriority;
  }
  if (candidatePref.infoScore !== currentPref.infoScore) {
    return currentPref.infoScore - candidatePref.infoScore;
  }
  if (candidatePref.outstandingKsh !== currentPref.outstandingKsh) {
    return candidatePref.outstandingKsh - currentPref.outstandingKsh;
  }

  return 0;
}

function dedupeResidentDirectoryRows(rows) {
  const uniqueRows = new Map();

  (Array.isArray(rows) ? rows : []).forEach((resident) => {
    const key = `${String(resident?.buildingId ?? "").trim()}::${normalizeHouse(
      resident?.houseNumber
    )}`;
    if (!key.endsWith("::")) {
      const current = uniqueRows.get(key);
      if (!current || compareResidentDirectoryPreference(resident, current) < 0) {
        uniqueRows.set(key, resident);
      }
    }
  });

  return [...uniqueRows.values()];
}

function getResidentLookupExactMatches(rows, query) {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return rows.filter((resident) => {
    const houseNumber = normalizeHouse(resident.houseNumber).toLowerCase();
    const residentPhone = String(resident.residentPhone ?? "").trim().toLowerCase();
    const residentName = String(resident.residentName ?? "").trim().toLowerCase();
    const buildingName = String(resident.buildingName ?? "").trim().toLowerCase();
    const buildingId = String(resident.buildingId ?? "").trim().toLowerCase();

    return (
      houseNumber === normalizedQuery ||
      residentPhone === normalizedQuery ||
      residentName === normalizedQuery ||
      `${buildingName} ${houseNumber}`.trim() === normalizedQuery ||
      `${buildingId} ${houseNumber}`.trim() === normalizedQuery
    );
  });
}

function findResidentDirectoryEntry(buildingId, houseNumber) {
  return getIndexedRoom(state.residentDirectoryByKey, buildingId, houseNumber);
}

function getRoomsDeepLinkBuildingId() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length !== 3 || segments[0] !== "landlord" || segments[1] !== "rooms") {
    return "";
  }

  return decodeURIComponent(segments[2] ?? "").trim();
}

function buildRoomAccountPath(buildingId, houseNumber) {
  return `/landlord/rooms/${encodeURIComponent(String(buildingId ?? "").trim())}/${encodeURIComponent(
    normalizeHouse(houseNumber)
  )}`;
}

function openRoomAccountPage(buildingId, houseNumber) {
  const normalizedBuildingId = String(buildingId ?? "").trim();
  const normalizedHouseNumber = normalizeHouse(houseNumber);
  if (!normalizedBuildingId || !normalizedHouseNumber) {
    showError("Room details missing. Refresh and retry.");
    return false;
  }

  window.location.href = buildRoomAccountPath(normalizedBuildingId, normalizedHouseNumber);
  return true;
}

async function openResidentDirectoryEntry(buildingId, houseNumber) {
  try {
    const normalizedBuildingId = normalizeLookupBuildingId(buildingId);
    const currentUtilityBuildingId = normalizeLookupBuildingId(getSelectedUtilityBuildingId());
    const currentResidentsBuildingId = normalizeLookupBuildingId(
      state.selectedResidentsBuildingId
    );

    if (
      normalizedBuildingId &&
      (normalizedBuildingId !== currentUtilityBuildingId ||
        normalizedBuildingId !== currentResidentsBuildingId)
    ) {
      await activateBuilding(normalizedBuildingId, {
        view: "tenants",
        includeResidents: true
      });
    }

    const resident = findResidentDirectoryEntry(buildingId, houseNumber);
    if (!resident) {
      showError("Resident details not found. Refresh and retry.");
      return false;
    }

    clearError();
    setActiveLandlordView("tenants");
    openResidentDrawer(resident);
    return true;
  } catch (error) {
    handleLandlordError(error, "Failed to load room details.");
    return false;
  }
}

function openResidentSearchMatch() {
  const visibleRows = getVisibleResidentDirectoryRows(state.residentDirectory);
  const query = String(state.residentSearchQuery ?? "").trim();

  if (visibleRows.length === 0) {
    showError(query ? `No rooms matched "${query}".` : "No rooms matched the current filters.");
    return;
  }

  const exactMatches = getResidentLookupExactMatches(visibleRows, query);
  if (exactMatches.length === 1) {
    openRoomAccountPage(
      exactMatches[0].buildingId,
      exactMatches[0].houseNumber
    );
    return;
  }

  if (visibleRows.length === 1) {
    openRoomAccountPage(visibleRows[0].buildingId, visibleRows[0].houseNumber);
    return;
  }

  if (!query) {
    showError("Enter a resident name, phone, or house number to open one room account directly.");
    return;
  }

  showError(
    `Found ${visibleRows.length} rooms for "${query}". Refine the search or choose a building first.`
  );
}

async function openResidentLookup(query, buildingId = "all") {
  const normalizedQuery = String(query ?? "").trim();
  const normalizedBuildingId = String(buildingId || "all").trim() || "all";

  if (!normalizedQuery) {
    showError("Enter a resident name, phone, or house number to open one room directly.");
    return;
  }

  state.residentSearchQuery = normalizedQuery;
  if (residentsSearchInputEl instanceof HTMLInputElement) {
    residentsSearchInputEl.value = normalizedQuery;
  }
  if (overviewRoomSearchInputEl instanceof HTMLInputElement) {
    overviewRoomSearchInputEl.value = normalizedQuery;
  }
  if (landlordGlobalSearchInputEl instanceof HTMLInputElement) {
    landlordGlobalSearchInputEl.value = normalizedQuery;
  }

  if (normalizedBuildingId !== state.selectedResidentsBuildingId) {
    state.selectedResidentsBuildingId = normalizedBuildingId;
    state.selectedOverviewRoomBuildingId = normalizedBuildingId;
    if (residentsBuildingSelectEl instanceof HTMLSelectElement) {
      residentsBuildingSelectEl.value = normalizedBuildingId;
    }
    if (overviewRoomBuildingSelectEl instanceof HTMLSelectElement) {
      overviewRoomBuildingSelectEl.value = normalizedBuildingId;
    }
    if (landlordGlobalSearchBuildingEl instanceof HTMLSelectElement) {
      landlordGlobalSearchBuildingEl.value = normalizedBuildingId;
    }
    await loadResidents();
  } else {
    renderResidentDirectory(state.residentDirectory);
  }

  openResidentSearchMatch();
}

function sortResidentsForDirectory(rows) {
  return [...rows].sort((a, b) => {
    const balanceDelta =
      getResidentOutstandingBalanceKsh(b) - getResidentOutstandingBalanceKsh(a);
    if (balanceDelta !== 0) {
      return balanceDelta;
    }

    const occupancyOrder = {
      pending_review: 0,
      occupied: 1,
      vacant: 2
    };
    const occupancyDelta =
      (occupancyOrder[getResidentOccupancyLabel(a)] ?? 9) -
      (occupancyOrder[getResidentOccupancyLabel(b)] ?? 9);
    if (occupancyDelta !== 0) {
      return occupancyDelta;
    }

    const buildingDelta = String(a.buildingName ?? a.buildingId ?? "").localeCompare(
      String(b.buildingName ?? b.buildingId ?? "")
    );
    if (buildingDelta !== 0) {
      return buildingDelta;
    }

    return compareHouseNumber(a.houseNumber, b.houseNumber);
  });
}

function renderResidentsOverview(rows) {
  if (!(residentsOverviewEl instanceof HTMLElement)) {
    return;
  }

  const items = dedupeResidentDirectoryRows(rows);
  const vacantCount = items.filter(
    (resident) => getResidentOccupancyLabel(resident) === "vacant"
  ).length;
  const pendingCount = items.filter(
    (resident) => getResidentOccupancyLabel(resident) === "pending_review"
  ).length;
  const withCurrentDue = items.filter((resident) =>
    matchesResidentStatusFilter(resident, "current_due")
  );
  const withArrears = items.filter((resident) =>
    matchesResidentStatusFilter(resident, "overdue")
  );
  const awaitingReadings = items.filter((resident) =>
    matchesResidentStatusFilter(resident, "awaiting_readings")
  );
  const clearRooms = items.filter((resident) =>
    matchesResidentStatusFilter(resident, "clear")
  );
  const totalCurrentDue = withCurrentDue.reduce(
    (sum, resident) =>
      sum +
      getResidentOperationalCurrentDueKsh(resident, getResidentUtilityRoomSummary(resident)),
    0
  );
  const totalArrears = withArrears.reduce(
    (sum, resident) =>
      sum +
      getResidentOperationalArrearsKsh(resident, getResidentUtilityRoomSummary(resident)),
    0
  );
  const activeFilter = String(state.residentStatusFilter || "all");
  const roomLabel = (count) => `room${count === 1 ? "" : "s"}`;
  const cards = [
    {
      filter: "all",
      label: "All Rooms",
      value: items.length,
      detail: "Full tenant register"
    },
    {
      filter: "overdue",
      label: "Overdue",
      value: formatCurrency(totalArrears),
      detail: `${withArrears.length} ${roomLabel(withArrears.length)}`
    },
    {
      filter: "current_due",
      label: "Due Now",
      value: formatCurrency(totalCurrentDue),
      detail: `${withCurrentDue.length} ${roomLabel(withCurrentDue.length)}`
    },
    {
      filter: "awaiting_readings",
      label: "Awaiting Readings",
      value: awaitingReadings.length,
      detail: "Meter follow-up"
    },
    {
      filter: "clear",
      label: "Clear",
      value: clearRooms.length,
      detail: "No open balance"
    },
    {
      filter: "vacant",
      label: "Vacant",
      value: vacantCount,
      detail: "Available rooms"
    },
    {
      filter: "pending_review",
      label: "Pending Review",
      value: pendingCount,
      detail: "Access requests"
    }
  ];

  residentsOverviewEl.innerHTML = cards
    .map((card) => {
      const isActive = activeFilter === card.filter;
      return `
        <button
          type="button"
          class="resident-overview-card${isActive ? " is-active" : ""}"
          data-resident-filter="${escapeHtml(card.filter)}"
          aria-pressed="${isActive ? "true" : "false"}"
        >
          <p>${escapeHtml(card.label)}</p>
          <strong>${escapeHtml(card.value)}</strong>
          <small>${escapeHtml(card.detail)}</small>
        </button>
      `;
    })
    .join("");
}

function summarizeUtilityRooms(rows) {
  const roomMonths = new Map();

  getVisibleUtilityBills(rows).forEach((item) => {
    if (!item) {
      return;
    }

    const amountKsh = utilityAmount(item.amountKsh);
    const balanceKsh = utilityAmount(item.balanceKsh);
    const paidKsh = getUtilityPaidAmount(item);
    const month = String(item.billingMonth || "").trim();
    const displayStatus = getUtilityDisplayStatus(item);
    if (!month) {
      return;
    }

    const monthKey = `${item.buildingId || ""}::${normalizeHouse(item.houseNumber)}::${month}`;
    const current = roomMonths.get(monthKey);
    const candidate = {
      buildingId: item.buildingId || "",
      houseNumber: normalizeHouse(item.houseNumber),
      billingMonth: month,
      amountKsh,
      paidKsh,
      balanceKsh,
      dueDate: String(item.dueDate || ""),
      status: displayStatus,
      utilityType: String(item.utilityType || ""),
      updatedAt: String(item.updatedAt || "")
    };

    if (!current) {
      roomMonths.set(monthKey, candidate);
      return;
    }

    const currentScore = [
      current.amountKsh,
      current.balanceKsh,
      current.paidKsh,
      current.updatedAt
    ];
    const candidateScore = [
      candidate.amountKsh,
      candidate.balanceKsh,
      candidate.paidKsh,
      candidate.updatedAt
    ];

    for (let index = 0; index < candidateScore.length; index += 1) {
      if (candidateScore[index] > currentScore[index]) {
        roomMonths.set(monthKey, candidate);
        break;
      }
      if (candidateScore[index] < currentScore[index]) {
        break;
      }
    }
  });

  const grouped = new Map();
  roomMonths.forEach((item) => {
    const key = `${item.buildingId}::${item.houseNumber}`;
    const existing =
      grouped.get(key) ??
      {
        buildingId: item.buildingId,
        houseNumber: item.houseNumber,
        overdueMonths: [],
        payableMonths: [],
        awaitingMonths: [],
        overdueBalanceKsh: 0,
        payableBalanceKsh: 0,
        totalOpenBalanceKsh: 0,
        nextDueDate: "",
        breakdown: [],
        overdueAction: null,
        payableAction: null
      };

    if (item.status === "awaiting_readings") {
      existing.awaitingMonths.push(item.billingMonth);
      if (!existing.nextDueDate || (item.dueDate && item.dueDate < existing.nextDueDate)) {
        existing.nextDueDate = item.dueDate;
      }
      existing.breakdown.push({
        month: item.billingMonth,
        rank: 2,
        text: `${item.billingMonth} waiting for meter readings`
      });
      grouped.set(key, existing);
      return;
    }

    if (item.balanceKsh > 0) {
      existing.totalOpenBalanceKsh += item.balanceKsh;
      if (item.status === "overdue") {
        existing.overdueMonths.push(item.billingMonth);
        existing.overdueBalanceKsh += item.balanceKsh;
      } else {
        existing.payableMonths.push(item.billingMonth);
        existing.payableBalanceKsh += item.balanceKsh;
      }
      if (
        !existing.nextDueDate ||
        (item.dueDate && item.dueDate < existing.nextDueDate)
      ) {
        existing.nextDueDate = item.dueDate;
      }

      const breakdownParts = [item.billingMonth, formatCurrency(item.balanceKsh)];
      breakdownParts.push(item.status === "overdue" ? "overdue" : "payable");
      if (item.paidKsh > 0) {
        breakdownParts.push(`paid ${formatCurrency(item.paidKsh)}`);
      }
      existing.breakdown.push({
        month: item.billingMonth,
        rank: item.status === "overdue" ? 0 : 1,
        text: breakdownParts.join(" ")
      });

      const actionKey = item.status === "overdue" ? "overdueAction" : "payableAction";
      const currentAction = existing[actionKey];
      if (
        !currentAction ||
        item.billingMonth.localeCompare(currentAction.billingMonth) < 0 ||
        (
          item.billingMonth === currentAction.billingMonth &&
          Number(item.balanceKsh) > Number(currentAction.amountKsh)
        )
      ) {
        existing[actionKey] = {
          buildingId: item.buildingId,
          houseNumber: item.houseNumber,
          utilityType: item.utilityType,
          billingMonth: item.billingMonth,
          amountKsh: item.balanceKsh
        };
      }
    }

    grouped.set(key, existing);
  });

  return [...grouped.values()]
    .map((item) => {
      let status = "clear";
      if (item.overdueBalanceKsh > 0 && item.payableBalanceKsh > 0) {
        status = "overdue_payable";
      } else if (item.overdueBalanceKsh > 0) {
        status = "overdue";
      } else if (item.payableBalanceKsh > 0) {
        status = "payable";
      } else if (item.awaitingMonths.length > 0) {
        status = "awaiting_readings";
      }

      const breakdown = item.breakdown
        .sort((a, b) => {
          if (a.rank !== b.rank) {
            return a.rank - b.rank;
          }
          return a.month.localeCompare(b.month);
        })
        .map((entry) => entry.text)
        .join(" | ");

      return {
        ...item,
        status,
        breakdown
      };
    })
    .sort((a, b) => {
      const buildingDelta = String(a.buildingId ?? "").localeCompare(
        String(b.buildingId ?? "")
      );
      if (buildingDelta !== 0) {
        return buildingDelta;
      }

      return compareHouseNumber(a.houseNumber, b.houseNumber);
    });
}

function isResidentPendingVerification(resident) {
  return resident?.verificationStatus === "pending_review";
}

function canDisplayResidentBilling(resident) {
  return !isResidentPendingVerification(resident);
}

function formatExpenditureCategory(value) {
  switch (value) {
    case "maintenance":
      return "Maintenance";
    case "utilities":
      return "Utilities";
    case "cleaning":
      return "Cleaning";
    case "security":
      return "Security";
    case "supplies":
      return "Supplies";
    case "staff":
      return "Staff";
    default:
      return "Other";
  }
}

function getResidentOutstandingBalanceKsh(resident) {
  if (!canDisplayResidentBilling(resident)) {
    return 0;
  }

  const roomBalance = Number(resident?.roomBalanceKsh);
  if (Number.isFinite(roomBalance)) {
    return Math.max(0, roomBalance);
  }

  const rentBalance = Number(resident?.rentBalanceKsh);
  const utilityBalance = Number(resident?.utilityBalanceKsh);
  const expenseBalance = Number(resident?.expenseBalanceKsh ?? resident?.expenseArrearsKsh);
  if (
    Number.isFinite(rentBalance) ||
    Number.isFinite(utilityBalance) ||
    Number.isFinite(expenseBalance)
  ) {
    return Math.max(
      0,
      (Number.isFinite(rentBalance) ? rentBalance : 0) +
        (Number.isFinite(utilityBalance) ? utilityBalance : 0) +
        (Number.isFinite(expenseBalance) ? expenseBalance : 0)
    );
  }

  const legacyBalance = Number(
    resident?.balanceKsh ?? resident?.outstandingBalanceKsh ?? 0
  );
  if (Number.isFinite(legacyBalance)) {
    return Math.max(0, legacyBalance);
  }

  return 0;
}

function getResidentUtilityBalanceKsh(resident) {
  if (!canDisplayResidentBilling(resident)) {
    return 0;
  }

  const explicitBalance = Number(resident?.utilityBalanceKsh);
  if (Number.isFinite(explicitBalance)) {
    return Math.max(0, explicitBalance);
  }

  const outstandingBalanceKsh = getResidentOutstandingBalanceKsh(resident);
  const rentBalanceKsh = Math.max(0, Number(resident?.rentBalanceKsh ?? 0));
  const expenseBalanceKsh = getResidentExpenseBalanceKsh(resident);
  return Math.max(0, outstandingBalanceKsh - rentBalanceKsh - expenseBalanceKsh);
}

function getResidentMonthlyRentKsh(resident, agreement) {
  const agreementRent = Number(agreement?.monthlyRentKsh);
  if (Number.isFinite(agreementRent) && agreementRent >= 0) {
    return agreementRent;
  }

  const residentRent = Number(resident?.monthlyRentKsh);
  if (Number.isFinite(residentRent) && residentRent >= 0) {
    return residentRent;
  }

  return 0;
}

function getResidentCurrentRentDueKsh(resident, agreement) {
  if (!canDisplayResidentBilling(resident)) {
    return 0;
  }

  const explicitCurrentDue = Number(resident?.currentRentDueKsh);
  if (Number.isFinite(explicitCurrentDue)) {
    return Math.max(0, explicitCurrentDue);
  }

  const rentBalanceKsh = Math.max(0, Number(resident?.rentBalanceKsh ?? 0));
  const monthlyRentKsh = getResidentMonthlyRentKsh(resident, agreement);
  if (monthlyRentKsh > 0) {
    return Math.min(rentBalanceKsh, monthlyRentKsh);
  }

  return rentBalanceKsh;
}

function getResidentRentArrearsKsh(resident, agreement) {
  if (!canDisplayResidentBilling(resident)) {
    return 0;
  }

  const explicitArrears = Number(resident?.rentArrearsKsh);
  if (Number.isFinite(explicitArrears)) {
    return Math.max(0, explicitArrears);
  }

  const rentBalanceKsh = Math.max(0, Number(resident?.rentBalanceKsh ?? 0));
  const currentRentDueKsh = getResidentCurrentRentDueKsh(resident, agreement);
  return Math.max(0, rentBalanceKsh - currentRentDueKsh);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeHouse(value) {
  return String(value ?? "").trim().toUpperCase();
}

function sameResidentKey(a, b) {
  return (
    Boolean(a) &&
    Boolean(b) &&
    String(a.buildingId || "") === String(b.buildingId || "") &&
    normalizeHouse(a.houseNumber) === normalizeHouse(b.houseNumber)
  );
}

function buildResidentAgreementUrl(resident) {
  return `/api/landlord/buildings/${encodeURIComponent(
    resident.buildingId
  )}/houses/${encodeURIComponent(resident.houseNumber)}/agreement`;
}

function formatAgreementIdentityType(value) {
  switch (value) {
    case "national_id":
      return "National ID";
    case "passport":
      return "Passport";
    case "alien_id":
      return "Alien ID";
    case "other":
      return "Other ID";
    default:
      return "Not recorded";
  }
}

function formatAgreementOccupationStatus(value) {
  switch (value) {
    case "employed":
      return "Employed";
    case "self_employed":
      return "Self-employed";
    case "student":
      return "Student";
    case "sponsored":
      return "Sponsored";
    case "unemployed":
      return "Unemployed";
    case "other":
      return "Other";
    default:
      return "Not recorded";
  }
}

function summarizeResidentIdentity(resident) {
  if (!resident?.identityNumber) {
    return "-";
  }

  return `${formatAgreementIdentityType(resident.identityType)} • ${resident.identityNumber}`;
}

function summarizeResidentOccupation(resident) {
  const occupationTitle = resident?.occupationLabel?.trim()
    ? resident.occupationLabel.trim()
    : resident?.occupationStatus
      ? formatAgreementOccupationStatus(resident.occupationStatus)
      : "";
  const organizationSummary = resident?.organizationName?.trim()
    ? `${resident.organizationName.trim()}${
        resident?.organizationLocation?.trim() ? ` • ${resident.organizationLocation.trim()}` : ""
      }`
    : "";

  if (!occupationTitle && !organizationSummary) {
    return { title: "-", details: "" };
  }

  return {
    title: occupationTitle || "Recorded",
    details: organizationSummary
  };
}

function summarizeEmergencyContact(resident) {
  if (!resident?.emergencyContactName?.trim()) {
    return "-";
  }

  return `${resident.emergencyContactName.trim()}${
    resident?.emergencyContactPhone?.trim() ? ` • ${resident.emergencyContactPhone.trim()}` : ""
  }`;
}

function toDateInputValue(value) {
  const raw = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

async function loadResidentAgreement(resident) {
  const payload = await requestJson(buildResidentAgreementUrl(resident), {
    cache: "no-store"
  });

  if (!sameResidentKey(state.selectedResident, resident)) {
    return;
  }

  state.selectedResidentAgreement = payload.data ?? null;
  state.selectedResidentAgreementError = "";
  state.residentAgreementLoading = false;
  renderResidentDrawer(resident);
}

function buildResidentAgreementPayload(form) {
  const formData = new FormData(form);
  return {
    identityType: String(formData.get("identityType") || "").trim() || undefined,
    identityNumber: String(formData.get("identityNumber") || "").trim() || undefined,
    occupationStatus: String(formData.get("occupationStatus") || "").trim() || undefined,
    occupationLabel: String(formData.get("occupationLabel") || "").trim() || undefined,
    organizationName: String(formData.get("organizationName") || "").trim() || undefined,
    organizationLocation:
      String(formData.get("organizationLocation") || "").trim() || undefined,
    studentRegistrationNumber:
      String(formData.get("studentRegistrationNumber") || "").trim() || undefined,
    sponsorName: String(formData.get("sponsorName") || "").trim() || undefined,
    sponsorPhone: String(formData.get("sponsorPhone") || "").trim() || undefined,
    emergencyContactName:
      String(formData.get("emergencyContactName") || "").trim() || undefined,
    emergencyContactPhone:
      String(formData.get("emergencyContactPhone") || "").trim() || undefined,
    leaseStartDate: String(formData.get("leaseStartDate") || "").trim() || undefined,
    leaseEndDate: String(formData.get("leaseEndDate") || "").trim() || undefined,
    monthlyRentKsh: toOptionalNumber(formData.get("monthlyRentKsh")),
    depositKsh: toOptionalNumber(formData.get("depositKsh")),
    paymentDueDay: toOptionalNumber(formData.get("paymentDueDay")),
    specialTerms: String(formData.get("specialTerms") || "").trim() || undefined
  };
}

async function saveResidentAgreement(form) {
  const resident = state.selectedResident;
  if (!resident) {
    showError("Resident details are no longer in view. Reopen the drawer and retry.");
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true;
  }

  clearError();

  try {
    const response = await requestJson(buildResidentAgreementUrl(resident), {
      method: "PUT",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(buildResidentAgreementPayload(form))
    });

    state.selectedResidentAgreement = response.data ?? null;
    state.selectedResidentAgreementError = "";
    state.residentAgreementLoading = false;
    renderResidentDrawer(resident);
    setStatus(
      response.data?.agreement
        ? `Tenant agreement updated for ${resident.houseNumber}.`
        : `Tenant agreement cleared for ${resident.houseNumber}.`
    );
  } catch (error) {
    handleLandlordError(error, "Unable to save tenant agreement.");
  } finally {
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = false;
    }
  }
}

function buildResidentRentPaymentPayload(form) {
  const resident = state.selectedResident;
  if (!resident) {
    throw new Error("Resident details are no longer in view. Reopen the drawer and retry.");
  }

  const formData = new FormData(form);
  return {
    buildingId: String(resident.buildingId ?? "").trim(),
    houseNumber: normalizeHouse(resident.houseNumber),
    payload: {
      buildingId: String(resident.buildingId ?? "").trim(),
      amountKsh: Number(formData.get("amountKsh")),
      billingMonth: toBillingMonth(formData.get("billingMonth")) || undefined,
      provider: "cash",
      providerReference: String(formData.get("providerReference") ?? "").trim() || undefined,
      paidAt: toIsoFromDateTimeLocal(formData.get("paidAt")) || undefined
    }
  };
}

function buildResidentRentProfilePayload(form) {
  const resident = state.selectedResident;
  if (!resident) {
    throw new Error("Resident details are no longer in view. Reopen the drawer and retry.");
  }

  const formData = new FormData(form);
  const dueDate = toIsoFromDateTimeLocal(formData.get("dueDate"));
  const overdueStartsAt = toIsoFromDateTimeLocal(formData.get("overdueStartsAt"));
  const monthlyRentKsh = Math.round(Number(resident.monthlyRentKsh ?? Number.NaN));
  const balanceKsh = Math.round(Number(resident.rentBalanceKsh ?? Number.NaN));

  return {
    buildingId: String(resident.buildingId ?? "").trim(),
    houseNumber: normalizeHouse(resident.houseNumber),
    payload: {
      buildingId: String(resident.buildingId ?? "").trim(),
      monthlyRentKsh,
      balanceKsh,
      dueDate,
      graceDays: overdueStartsAt ? undefined : 0,
      overdueStartsAt: overdueStartsAt || undefined
    }
  };
}

function syncSelectedResidentAfterRefresh(buildingId, houseNumber) {
  if (!state.selectedResident) {
    return;
  }

  if (
    String(state.selectedResident.buildingId ?? "") !== String(buildingId ?? "") ||
    normalizeHouse(state.selectedResident.houseNumber) !== normalizeHouse(houseNumber)
  ) {
    return;
  }

  const refreshedResident = findResidentDirectoryEntry(buildingId, houseNumber);
  if (!refreshedResident) {
    return;
  }

  state.selectedResident = refreshedResident;
  renderResidentDrawer(refreshedResident);
}

async function saveResidentRentProfile(form) {
  const resident = state.selectedResident;
  if (!resident) {
    showError("Resident details are no longer in view. Reopen the drawer and retry.");
    return;
  }

  if (isCaretakerRole()) {
    showError("House manager accounts cannot update rent settings.");
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true;
  }

  clearError();

  try {
    const rentProfile = buildResidentRentProfilePayload(form);
    if (!rentProfile.buildingId || !rentProfile.houseNumber || !rentProfile.payload.dueDate) {
      throw new Error("Rent settings require a room and due date.");
    }

    if (
      !Number.isFinite(rentProfile.payload.monthlyRentKsh) ||
      rentProfile.payload.monthlyRentKsh <= 0
    ) {
      throw new Error("Monthly rent is not configured for this room yet.");
    }

    if (!Number.isFinite(rentProfile.payload.balanceKsh)) {
      throw new Error("Current room balance is unavailable. Refresh and try again.");
    }

    if (
      rentProfile.payload.overdueStartsAt &&
      Date.parse(rentProfile.payload.overdueStartsAt) <
        Date.parse(rentProfile.payload.dueDate)
    ) {
      throw new Error("Overdue start must be on or after the due date.");
    }

    await requestJson(
      withBuildingQuery(
        `/api/landlord/rent-due/${encodeURIComponent(rentProfile.houseNumber)}`,
        rentProfile.buildingId
      ),
      {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(rentProfile.payload)
      }
    );

    await Promise.all([loadRentStatus(), loadResidents()]);
    syncSelectedResidentAfterRefresh(rentProfile.buildingId, rentProfile.houseNumber);
    setStatus(`Rent overdue policy updated for ${rentProfile.houseNumber}.`);
  } catch (error) {
    handleLandlordError(error, "Failed to update rent overdue settings.");
  } finally {
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = false;
    }
  }
}

async function saveResidentRentPayment(form) {
  const resident = state.selectedResident;
  if (!resident) {
    showError("Resident details are no longer in view. Reopen the drawer and retry.");
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true;
  }

  clearError();

  try {
    const rentPayment = buildResidentRentPaymentPayload(form);
    if (
      !rentPayment.buildingId ||
      !rentPayment.houseNumber ||
      !Number.isFinite(rentPayment.payload.amountKsh)
    ) {
      throw new Error("Cash rent payment requires room, amount, and month.");
    }

    if (rentPayment.payload.amountKsh <= 0) {
      throw new Error("Cash rent payment amount must be greater than zero.");
    }

    if (!rentPayment.payload.billingMonth) {
      throw new Error("Select the month this cash payment should be recorded against.");
    }

    await requestJson(
      withBuildingQuery(
        `/api/landlord/rent/${encodeURIComponent(rentPayment.houseNumber)}/payments`,
        rentPayment.buildingId
      ),
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(rentPayment.payload)
      }
    );

    await Promise.all([loadRentStatus(), loadResidents()]);
    syncSelectedResidentAfterRefresh(rentPayment.buildingId, rentPayment.houseNumber);
    setStatus(
      `Cash rent payment recorded for ${rentPayment.houseNumber} (${rentPayment.payload.billingMonth}).`
    );

    const amountInput = form.elements.namedItem("amountKsh");
    if (amountInput instanceof HTMLInputElement) {
      amountInput.value = "";
    }
    const paidAtInput = form.elements.namedItem("paidAt");
    if (paidAtInput instanceof HTMLInputElement) {
      paidAtInput.value = "";
    }
    const referenceInput = form.elements.namedItem("providerReference");
    if (referenceInput instanceof HTMLInputElement) {
      referenceInput.value = "";
    }
  } catch (error) {
    handleLandlordError(error, "Failed to record resident cash rent payment.");
  } finally {
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = false;
    }
  }
}

function parseHouseNumbers(value) {
  const items = splitHouseNumberEntries(value).flatMap((item) => {
    const expanded = expandHouseRangeExpression(item);
    return expanded ?? [normalizeHouse(item)];
  });

  const unique = [...new Set(items)];
  if (unique.length > 1000) {
    throw new Error("Add rooms in batches of 1000 or fewer.");
  }
  return unique;
}

function splitHouseNumberEntries(value) {
  return String(value ?? "")
    .replace(/\s+\band\b\s+/gi, "\n")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseRoomRangeEndpoint(value) {
  const normalized = String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^(.*?)(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    prefix: match[1] ?? "",
    number: Number(match[2]),
    width: /^0\d/.test(match[2]) ? match[2].length : 0
  };
}

function getRangePadWidth(...values) {
  return values.reduce((maxWidth, value) => {
    const text = String(value ?? "");
    return /^0\d/.test(text) ? Math.max(maxWidth, text.length) : maxWidth;
  }, 0);
}

function expandRoomRange(prefix, start, end, width = 0) {
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    return [];
  }

  const direction = end >= start ? 1 : -1;
  const count = Math.abs(end - start) + 1;
  if (count > 1000) {
    throw new Error("Room ranges can include at most 1000 rooms at a time.");
  }

  return Array.from({ length: count }, (_item, index) => {
    const value = start + index * direction;
    const numberText = String(value).padStart(width, "0");
    return normalizeHouse(`${prefix}${numberText}`);
  });
}

function expandHouseRangeExpression(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return [];
  }

  const blockMatch = raw.match(/^(.+?):\s*(\d+)\s*(?:-|to|through|thru)\s*(\d+)$/i);
  if (blockMatch) {
    const prefix = normalizeHouse(blockMatch[1]);
    const start = Number(blockMatch[2]);
    const end = Number(blockMatch[3]);
    const width = getRangePadWidth(blockMatch[2], blockMatch[3]);
    return expandRoomRange(prefix, start, end, width);
  }

  const toMatch = raw.match(/^(.+?)\s+(?:to|through|thru)\s+(.+)$/i);
  const dashMatch = raw.match(/^(.*?\d)\s*-\s*(.*\d)$/);
  const match = toMatch ?? dashMatch;
  if (!match) {
    return null;
  }

  const start = parseRoomRangeEndpoint(match[1]);
  const end = parseRoomRangeEndpoint(match[2]);
  if (!start || !end) {
    return null;
  }

  const prefix =
    start.prefix && end.prefix
      ? start.prefix === end.prefix
        ? start.prefix
        : null
      : start.prefix || end.prefix;
  if (prefix === null) {
    return null;
  }

  return expandRoomRange(
    prefix,
    start.number,
    end.number,
    Math.max(start.width, end.width)
  );
}

function buildGeneratedHouseNumbers() {
  const format = String(buildingHouseFormatEl?.value ?? "numbers");
  const prefixRaw = String(buildingHousePrefixEl?.value ?? "")
    .trim()
    .toUpperCase();
  const separator = String(buildingHouseSeparatorEl?.value ?? "-");
  const order = String(buildingHouseOrderEl?.value ?? "asc");
  const start = Number(buildingHouseStartEl?.value ?? 1);
  const count = Number(buildingHouseCountEl?.value ?? 0);
  const step = Number(buildingHouseStepEl?.value ?? 1);

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(count) ||
    !Number.isInteger(step) ||
    count <= 0 ||
    step <= 0
  ) {
    throw new Error("Start, count, and step must be positive whole numbers.");
  }

  const list = buildHouseNumberBlocks({
    format,
    prefixRaw,
    separator,
    start,
    count,
    step
  });

  if (list.length > 1000) {
    throw new Error("Add rooms in batches of 1000 or fewer.");
  }

  if (order === "desc") {
    list.reverse();
  }

  return list.map((item) => normalizeHouse(item));
}

function buildHouseNumberBlocks({ format, prefixRaw, separator, start, count, step }) {
  if (format !== "prefix_number") {
    return Array.from({ length: count }, (_item, index) => String(start + index * step));
  }

  const prefixEntries = splitHouseNumberEntries(prefixRaw);
  const blocks = prefixEntries.length > 0 ? prefixEntries : ["A"];

  return blocks.flatMap((entry) => {
    const blockMatch = entry.match(/^(.+?):\s*(\d+)\s*(?:-|to|through|thru)\s*(\d+)$/i);
    const prefix = normalizeHouse(blockMatch ? blockMatch[1] : entry);
    if (blockMatch) {
      const blockStart = Number(blockMatch[2]);
      const blockEnd = Number(blockMatch[3]);
      const width = getRangePadWidth(blockMatch[2], blockMatch[3]);
      return expandRoomRange(
        `${prefix}${separator}`,
        blockStart,
        blockEnd,
        width
      );
    }

    return Array.from({ length: count }, (_item, index) => {
      const value = start + index * step;
      return `${prefix}${separator}${value}`;
    });
  });
}

function renderGeneratedHousePreview(houses) {
  if (!(buildingHousePreviewEl instanceof HTMLElement)) {
    return;
  }

  if (!Array.isArray(houses) || houses.length === 0) {
    buildingHousePreviewEl.textContent = "Preview: -";
    return;
  }

  const preview = houses.slice(0, 12).join(", ");
  const suffix = houses.length > 12 ? "..." : "";
  const existingSet = new Set(
    getSelectedBuildingHouseNumbers().map((item) => normalizeHouse(item))
  );
  const newCount = houses.filter((item) => !existingSet.has(normalizeHouse(item))).length;
  const existingCount = houses.length - newCount;
  const summary =
    existingCount > 0
      ? `${houses.length} selected, ${newCount} new, ${existingCount} already exists`
      : `${houses.length} selected`;
  buildingHousePreviewEl.textContent = `Preview: ${summary}: ${preview}${suffix}`;
}

function getSelectedRoomBuilding() {
  const buildingId = normalizeLookupBuildingId(state.selectedRoomBuildingId);
  if (!buildingId) {
    return null;
  }

  return state.buildingById.get(buildingId) ?? null;
}

function getSelectedBuildingHouseNumbers() {
  const building = getSelectedRoomBuilding();
  const fromBuilding = Array.isArray(building?.houseNumbers) ? building.houseNumbers : [];
  const fromDirectory = state.residentDirectory
    .filter(
      (item) =>
        normalizeLookupBuildingId(item.buildingId) ===
        normalizeLookupBuildingId(building?.id)
    )
    .map((item) => item.houseNumber);

  return [
    ...new Set([...fromBuilding, ...fromDirectory].map((item) => normalizeHouse(item)))
  ]
    .filter(Boolean)
    .sort(compareHouseNumber);
}

function renderRoomChipList(container, rooms, options = {}) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  container.replaceChildren();
  const list = Array.isArray(rooms) ? rooms : [];
  if (list.length === 0) {
    const empty = document.createElement("p");
    empty.className = "building-room-empty";
    empty.textContent = options.emptyText ?? "-";
    container.append(empty);
    return;
  }

  const visibleLimit = Number(options.limit ?? 240);
  const visibleRooms = list.slice(0, visibleLimit);
  const existingSet = new Set(
    (options.existingRooms ?? []).map((item) => normalizeHouse(item))
  );

  visibleRooms.forEach((room) => {
    const chip = document.createElement("span");
    const normalized = normalizeHouse(room);
    chip.className = existingSet.has(normalized)
      ? "building-room-chip is-existing"
      : "building-room-chip";
    chip.textContent = normalized;
    container.append(chip);
  });

  if (list.length > visibleRooms.length) {
    const more = document.createElement("span");
    more.className = "building-room-chip is-muted";
    more.textContent = `+${list.length - visibleRooms.length}`;
    container.append(more);
  }
}

function renderBuildingRoomDrawerState() {
  const existingRooms = getSelectedBuildingHouseNumbers();
  const existingSet = new Set(existingRooms.map((item) => normalizeHouse(item)));
  let candidateRooms = [];
  let parseErrorMessage = "";

  try {
    candidateRooms = parseHouseNumbers(buildingHouseNumbersEl?.value ?? "");
  } catch (error) {
    candidateRooms = [];
    parseErrorMessage = error instanceof Error ? error.message : "Invalid room range.";
  }

  const newCandidateRooms = candidateRooms.filter(
    (item) => !existingSet.has(normalizeHouse(item))
  );

  if (buildingCandidateRoomsCountEl instanceof HTMLElement) {
    const existingCandidateCount = candidateRooms.length - newCandidateRooms.length;
    buildingCandidateRoomsCountEl.textContent = parseErrorMessage
      ? "Invalid"
      : existingCandidateCount > 0
        ? `${newCandidateRooms.length} new / ${candidateRooms.length} selected`
        : `${newCandidateRooms.length}`;
  }

  if (buildingCandidateRoomsEl instanceof HTMLElement && parseErrorMessage) {
    renderRoomChipList(buildingCandidateRoomsEl, [], {
      emptyText: parseErrorMessage
    });
  } else if (buildingCandidateRoomsEl instanceof HTMLElement && candidateRooms.length > 0) {
    renderRoomChipList(buildingCandidateRoomsEl, candidateRooms, {
      existingRooms,
      emptyText: "No rooms queued."
    });
  } else if (buildingCandidateRoomsEl instanceof HTMLElement && candidateRooms.length === 0) {
    renderRoomChipList(buildingCandidateRoomsEl, [], {
      emptyText: "No rooms queued."
    });
  }

  if (buildingExistingRoomsSummaryEl instanceof HTMLElement) {
    buildingExistingRoomsSummaryEl.textContent = `${existingRooms.length} room${
      existingRooms.length === 1 ? "" : "s"
    }`;
  }

  renderRoomChipList(buildingExistingRoomsEl, existingRooms, {
    emptyText: "No rooms in this building yet."
  });
}

function toIsoFromDateTimeLocal(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toBillingMonth(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  return raw.slice(0, 7);
}

function toOptionalNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toDateTimeLocalInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function numberToInputString(value) {
  if (value == null) {
    return "";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }

  return String(numeric);
}

function numericValueFromString(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return undefined;
  }
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeUtilityRateDefaults(rateDefaults, fallbackBuildingId = "") {
  const buildingId = String(rateDefaults?.buildingId || fallbackBuildingId || "").trim();
  if (!rateDefaults && !buildingId) {
    return null;
  }

  return {
    buildingId,
    waterRatePerUnitKsh:
      rateDefaults?.waterRatePerUnitKsh == null
        ? undefined
        : Number(rateDefaults.waterRatePerUnitKsh),
    electricityRatePerUnitKsh:
      rateDefaults?.electricityRatePerUnitKsh == null
        ? undefined
        : Number(rateDefaults.electricityRatePerUnitKsh)
  };
}

function rateDefaultsFromBuildingConfiguration(configuration, fallbackBuildingId = "") {
  if (!configuration) {
    return null;
  }

  return normalizeUtilityRateDefaults(
    {
      buildingId: configuration.buildingId || fallbackBuildingId,
      waterRatePerUnitKsh: configuration.defaultWaterRatePerUnitKsh,
      electricityRatePerUnitKsh: configuration.defaultElectricityRatePerUnitKsh
    },
    fallbackBuildingId
  );
}

function setUtilityPricingState(buildingConfiguration, rateDefaults, fallbackBuildingId = "") {
  const normalizedBuildingId = String(
    buildingConfiguration?.buildingId || fallbackBuildingId || ""
  ).trim();
  state.utilitySheetBuildingConfiguration = buildingConfiguration ?? null;
  state.utilityRateDefaults =
    rateDefaultsFromBuildingConfiguration(buildingConfiguration, normalizedBuildingId) ??
    normalizeUtilityRateDefaults(rateDefaults, normalizedBuildingId);
}

function getUtilityRateDefault(utilityType, buildingId) {
  const defaults = state.utilityRateDefaults;
  if (!defaults) {
    return utilityType === "water" ? DEFAULT_WATER_RATE_PER_UNIT_KSH : undefined;
  }

  const selectedBuildingId = String(buildingId ?? "").trim();
  const defaultsBuildingId = String(defaults.buildingId ?? "").trim();
  if (selectedBuildingId && defaultsBuildingId && selectedBuildingId !== defaultsBuildingId) {
    return utilityType === "water" ? DEFAULT_WATER_RATE_PER_UNIT_KSH : undefined;
  }

  const candidate =
    utilityType === "water"
      ? defaults.waterRatePerUnitKsh
      : defaults.electricityRatePerUnitKsh;
  if (Number.isFinite(Number(candidate))) {
    return Number(candidate);
  }

  return utilityType === "water" ? DEFAULT_WATER_RATE_PER_UNIT_KSH : undefined;
}

function syncUtilitySheetRateDefaults() {
  if (!(utilitySheetWaterRateEl instanceof HTMLInputElement)) {
    return;
  }
  if (!(utilitySheetElectricRateEl instanceof HTMLInputElement)) {
    return;
  }

  const defaults = state.utilityRateDefaults;
  const waterValue = numberToInputString(
    defaults?.waterRatePerUnitKsh ?? DEFAULT_WATER_RATE_PER_UNIT_KSH
  );
  const electricityValue = numberToInputString(defaults?.electricityRatePerUnitKsh);

  utilitySheetWaterRateEl.value = waterValue;
  utilitySheetElectricRateEl.value = electricityValue;
}

function syncUtilitySheetBuildingFixedDefaults() {
  if (!(utilitySheetWaterFixedDefaultEl instanceof HTMLInputElement)) {
    return;
  }
  if (!(utilitySheetElectricFixedDefaultEl instanceof HTMLInputElement)) {
    return;
  }

  utilitySheetWaterFixedDefaultEl.value = numberToInputString(
    state.utilitySheetBuildingConfiguration?.defaultWaterFixedChargeKsh
  );
  utilitySheetElectricFixedDefaultEl.value = numberToInputString(
    state.utilitySheetBuildingConfiguration?.defaultElectricityFixedChargeKsh
  );
}

function syncUtilitySheetCombinedCharge() {
  if (!(utilitySheetCombinedChargeEl instanceof HTMLInputElement)) {
    return;
  }

  utilitySheetCombinedChargeEl.value = numberToInputString(
    state.utilitySheetMonthlyCombinedCharge?.amountKsh
  );
}

function syncUtilitySheetBuildingCombinedCharge() {
  if (!(utilitySheetBuildingCombinedChargeEl instanceof HTMLInputElement)) {
    return;
  }

  utilitySheetBuildingCombinedChargeEl.value = numberToInputString(
    state.utilitySheetBuildingConfiguration?.defaultCombinedUtilityChargeKsh
  );
}

async function loadUtilitySheetBuildingConfiguration() {
  const buildingId = String(
    utilitySheetBuildingSelectEl?.value || state.selectedRegistryBuildingId || ""
  ).trim();

  setUtilityPricingState(null, null, buildingId);
  syncUtilitySheetRateDefaults();
  syncUtilitySheetBuildingFixedDefaults();
  syncUtilitySheetBuildingCombinedCharge();

  if (!buildingId) {
    return;
  }

  const payload = await requestJson(
    `/api/landlord/buildings/${encodeURIComponent(buildingId)}/configuration`
  );
  setUtilityPricingState(payload.data ?? null, null, buildingId);
  syncUtilitySheetRateDefaults();
  syncUtilitySheetBuildingFixedDefaults();
  syncUtilitySheetBuildingCombinedCharge();

  if (
    utilitySheetModalEl instanceof HTMLElement &&
    !utilitySheetModalEl.classList.contains("hidden")
  ) {
    renderUtilitySheetRows(state.registryRows);
  }
}

function getBuildingUtilityFixedChargeDefault(utilityType, buildingId) {
  const normalizedBuildingId = String(buildingId ?? "").trim();
  const configuration = state.utilitySheetBuildingConfiguration;
  const configurationBuildingId = String(configuration?.buildingId ?? "").trim();
  if (!configuration || !normalizedBuildingId || configurationBuildingId !== normalizedBuildingId) {
    return undefined;
  }

  const candidate =
    utilityType === "water"
      ? configuration.defaultWaterFixedChargeKsh
      : configuration.defaultElectricityFixedChargeKsh;
  if (!Number.isFinite(Number(candidate))) {
    return undefined;
  }

  return Math.max(0, Number(candidate));
}

function getRoomUtilityFixedChargeDefault(utilityType, buildingId, houseNumber) {
  const room = findRegistryRoom(buildingId, houseNumber);
  const roomValue =
    utilityType === "water"
      ? room?.waterFixedChargeKsh
      : room?.electricityFixedChargeKsh;
  if (Number.isFinite(Number(roomValue)) && Number(roomValue) > 0) {
    return Math.max(0, Number(roomValue));
  }

  return getBuildingUtilityFixedChargeDefault(utilityType, buildingId);
}

function utilityPricingNumbersEqual(left, right) {
  if (left == null || right == null) {
    return left == null && right == null;
  }

  return Math.abs(Number(left) - Number(right)) < 0.000001;
}

function getLatestAvailableUtilityBillingMonth(buildingId) {
  const normalizedBuildingId = String(buildingId ?? "").trim();
  let latestMonth = "";

  state.bills.forEach((item) => {
    const itemBuildingId = String(item?.buildingId ?? "").trim();
    if (normalizedBuildingId && itemBuildingId && itemBuildingId !== normalizedBuildingId) {
      return;
    }

    const candidate = toBillingMonth(item?.billingMonth);
    if (candidate && candidate > latestMonth) {
      latestMonth = candidate;
    }
  });

  return latestMonth;
}

function getSelectedRegistryReadingMonth() {
  const inputMonth = toBillingMonth(registryReadingMonthEl?.value);
  if (inputMonth) {
    return inputMonth;
  }

  const stateMonth = toBillingMonth(state.registryReadingMonth);
  if (stateMonth) {
    return stateMonth;
  }

  return (
    getLatestAvailableUtilityBillingMonth(getSelectedUtilityBuildingId()) ||
    previousBillingMonth()
  );
}

function syncRegistryReadingMonthInput() {
  const billingMonth = getSelectedRegistryReadingMonth();
  state.registryReadingMonth = billingMonth;

  if (registryReadingMonthEl instanceof HTMLInputElement) {
    registryReadingMonthEl.value = toMonthInputValue(billingMonth);
  }
}

function getRegistryBuildingConfiguration(buildingId) {
  const normalizedBuildingId = String(buildingId ?? "").trim();
  const configuration = state.utilitySheetBuildingConfiguration;
  if (
    !configuration ||
    String(configuration.buildingId ?? "").trim() !== normalizedBuildingId
  ) {
    return null;
  }

  return configuration;
}

function getRegistryMonthlyCombinedCharge(buildingId, billingMonth) {
  const normalizedBuildingId = String(buildingId ?? "").trim();
  const normalizedMonth = toBillingMonth(billingMonth);
  const record = state.registryMonthlyCombinedCharge;
  if (
    !record ||
    String(record.buildingId ?? "").trim() !== normalizedBuildingId ||
    toBillingMonth(record.billingMonth) !== normalizedMonth
  ) {
    return null;
  }

  return record;
}

function describeRegistryChargeSetup(item, buildingId, billingMonth) {
  const configuration = getRegistryBuildingConfiguration(buildingId);
  const monthlyCombinedCharge = getRegistryMonthlyCombinedCharge(buildingId, billingMonth);
  const billingMode = String(configuration?.utilityBillingMode ?? "metered").trim() || "metered";
  const hasWaterMeter = hasUsableMeterNumber(item?.waterMeterNumber);
  const hasElectricityMeter = hasUsableMeterNumber(item?.electricityMeterNumber);
  const hasBothMeters = hasWaterMeter && hasElectricityMeter;
  const roomCombinedChargeKsh = Math.max(0, Number(item?.combinedUtilityChargeKsh ?? 0));
  const monthlyOverrideKsh = Math.max(0, Number(monthlyCombinedCharge?.amountKsh ?? 0));
  const buildingDefaultCombinedKsh = Math.max(
    0,
    Number(configuration?.defaultCombinedUtilityChargeKsh ?? 0)
  );
  const resolvedWaterFixedKsh = getRoomUtilityFixedChargeDefault(
    "water",
    buildingId,
    item?.houseNumber
  );
  const resolvedElectricityFixedKsh = getRoomUtilityFixedChargeDefault(
    "electricity",
    buildingId,
    item?.houseNumber
  );
  const fixedParts = [];
  if (Number.isFinite(Number(resolvedWaterFixedKsh)) && Number(resolvedWaterFixedKsh) > 0) {
    fixedParts.push(`Water ${formatCurrency(Number(resolvedWaterFixedKsh))}`);
  }
  if (
    Number.isFinite(Number(resolvedElectricityFixedKsh)) &&
    Number(resolvedElectricityFixedKsh) > 0
  ) {
    fixedParts.push(`Electric ${formatCurrency(Number(resolvedElectricityFixedKsh))}`);
  }

  if (billingMode === "disabled") {
    return {
      tone: "warning",
      mode: "disabled",
      label: "Utility billing disabled",
      detail: "This building is not currently posting utility charges."
    };
  }

  if (billingMode === "combined_charge") {
    if (roomCombinedChargeKsh > 0) {
      return {
        tone: "custom",
        mode: "room_custom_combined",
        label: `Room custom ${formatCurrency(roomCombinedChargeKsh)}`,
        detail: "This room overrides the building-level combined utility charge."
      };
    }

    if (monthlyOverrideKsh > 0) {
      return {
        tone: "default",
        mode: "monthly_override_combined",
        label: `Month override ${formatCurrency(monthlyOverrideKsh)}`,
        detail: `Applied for ${formatBillingMonth(
          billingMonth
        )} when the room has no custom combined charge.`
      };
    }

    if (buildingDefaultCombinedKsh > 0) {
      return {
        tone: "default",
        mode: "building_default_combined",
        label: `Building default ${formatCurrency(buildingDefaultCombinedKsh)}`,
        detail: "Used when the room has no custom combined charge."
      };
    }
  }

  if (fixedParts.length > 0) {
    return {
      tone: "fixed",
      mode: "fixed_charge",
      label: "Fixed-charge fallback",
      detail: fixedParts.join(" • ")
    };
  }

  if (hasBothMeters) {
    return {
      tone: "metered",
      mode: "metered",
      label: "Metered room",
      detail: "No room-specific or combined default is configured, so meter-based posting still applies."
    };
  }

  return {
    tone: "warning",
    mode: "unconfigured",
    label: "Needs charge setup",
    detail: "Add meter readings, fixed charges, or a combined amount before posting bills."
  };
}

function formatRegistryChargeSetupMarkup(item, buildingId, billingMonth) {
  const setup = describeRegistryChargeSetup(item, buildingId, billingMonth);
  return `
    <div class="charge-setup-copy">
      <span class="charge-mode-badge is-${escapeHtml(setup.tone)}">${escapeHtml(
        setup.label
      )}</span>
      <small>${escapeHtml(setup.detail)}</small>
    </div>
  `;
}

function renderRegistryChargeSummary(rows) {
  if (!(registryChargeSummaryEl instanceof HTMLElement)) {
    return;
  }

  const buildingId = getSelectedUtilityBuildingId();
  const billingMonth = getSelectedRegistryReadingMonth();
  const configuration = getRegistryBuildingConfiguration(buildingId);
  const monthlyCombinedCharge = getRegistryMonthlyCombinedCharge(buildingId, billingMonth);
  const buildingMode = String(configuration?.utilityBillingMode ?? "metered").trim() || "metered";
  const setupRows = Array.isArray(rows) ? rows : [];
  const setupSummary = setupRows.map((item) =>
    describeRegistryChargeSetup(item, buildingId, billingMonth)
  );
  const countByMode = (mode) => setupSummary.filter((item) => item.mode === mode).length;
  const meteredCount = countByMode("metered");
  const customCombinedCount = countByMode("room_custom_combined");
  const monthlyOverrideCount = countByMode("monthly_override_combined");
  const buildingDefaultCount = countByMode("building_default_combined");
  const fixedChargeCount = countByMode("fixed_charge");
  const needsSetupCount = countByMode("unconfigured");
  const buildingDefaultCombinedKsh = Math.max(
    0,
    Number(configuration?.defaultCombinedUtilityChargeKsh ?? 0)
  );
  const buildingWaterFixedKsh = Number(configuration?.defaultWaterFixedChargeKsh ?? 0);
  const buildingElectricFixedKsh = Number(configuration?.defaultElectricityFixedChargeKsh ?? 0);
  const summaryLines = [];

  if (!buildingId) {
    registryChargeSummaryEl.textContent =
      "Select a building to review default and custom room charge rules.";
    return;
  }

  if (buildingMode === "combined_charge") {
    summaryLines.push(
      `Charge order: room custom amount -> ${formatBillingMonth(
        billingMonth
      )} override -> building default.`
    );
    summaryLines.push(
      monthlyCombinedCharge && Number(monthlyCombinedCharge.amountKsh) > 0
        ? `${formatBillingMonth(billingMonth)} override is ${formatCurrency(
            Number(monthlyCombinedCharge.amountKsh)
          )}.`
        : `${formatBillingMonth(billingMonth)} override is not set.`
    );
    summaryLines.push(
      buildingDefaultCombinedKsh > 0
        ? `Building default combined charge is ${formatCurrency(
            buildingDefaultCombinedKsh
          )}.`
        : "Building default combined charge is not set."
    );
  } else if (buildingMode === "fixed_charge") {
    summaryLines.push(
      "This building posts fixed-charge utility bills unless a room is fully metered."
    );
    summaryLines.push(
      `Building defaults: water ${
        buildingWaterFixedKsh > 0 ? formatCurrency(buildingWaterFixedKsh) : "not set"
      } • electricity ${
        buildingElectricFixedKsh > 0 ? formatCurrency(buildingElectricFixedKsh) : "not set"
      }.`
    );
  } else if (buildingMode === "disabled") {
    summaryLines.push("Utility billing is disabled for this building.");
  } else {
    summaryLines.push(
      "This building relies on meter readings by default, with fixed-charge fallback where needed."
    );
    summaryLines.push(
      `Building defaults: water ${
        buildingWaterFixedKsh > 0 ? formatCurrency(buildingWaterFixedKsh) : "not set"
      } • electricity ${
        buildingElectricFixedKsh > 0 ? formatCurrency(buildingElectricFixedKsh) : "not set"
      }.`
    );
  }

  registryChargeSummaryEl.innerHTML = `
    <h3>Charge Setup</h3>
    <p class="status-text">${escapeHtml(summaryLines.join(" "))}</p>
    <div class="registry-charge-summary-grid">
      <div>
        <span>Mode</span>
        <strong>${escapeHtml(buildingMode.replaceAll("_", " "))}</strong>
      </div>
      <div>
        <span>Month In View</span>
        <strong>${escapeHtml(formatBillingMonth(billingMonth))}</strong>
      </div>
      <div>
        <span>Room Custom Charges</span>
        <strong>${customCombinedCount}</strong>
      </div>
      <div>
        <span>Month Override Rooms</span>
        <strong>${monthlyOverrideCount}</strong>
      </div>
      <div>
        <span>Building Default Rooms</span>
        <strong>${buildingDefaultCount}</strong>
      </div>
      <div>
        <span>Metered Rooms</span>
        <strong>${meteredCount}</strong>
      </div>
      <div>
        <span>Fixed-Charge Rooms</span>
        <strong>${fixedChargeCount}</strong>
      </div>
      <div>
        <span>Needs Setup</span>
        <strong>${needsSetupCount}</strong>
      </div>
    </div>
  `;
}

function formatRegistryReadingMarkup(item, billingMonth) {
  const emptyDetail = billingMonth ? `${billingMonth} unread` : "No reading";
  if (!item) {
    return `
      <div class="registry-reading-cell is-empty">
        <strong>-</strong>
        <small>${escapeHtml(emptyDetail)}</small>
      </div>
    `;
  }

  const previousReading = Number(item.previousReading);
  const currentReading = Number(item.currentReading);
  const hasPreviousReading = Number.isFinite(previousReading) && previousReading > 0;
  const hasCurrentReading = Number.isFinite(currentReading) && currentReading > 0;
  const note = String(item.note ?? "").trim();
  const noteLower = note.toLowerCase();
  const isRestoredBaseline = noteLower.includes("restored");

  if (!hasPreviousReading && !hasCurrentReading) {
    return `
      <div class="registry-reading-cell is-empty">
        <strong>-</strong>
        <small>${escapeHtml(
          utilityAmount(item.amountKsh) > 0 ? "Combined charge" : "No reading"
        )}</small>
      </div>
    `;
  }

  const resolvedReading = hasCurrentReading ? currentReading : previousReading;
  let detail = "Saved";
  if (
    hasPreviousReading &&
    hasCurrentReading &&
    !utilityPricingNumbersEqual(previousReading, currentReading)
  ) {
    detail = `${numberToInputString(previousReading)} -> ${numberToInputString(
      currentReading
    )}`;
  } else if (isRestoredBaseline) {
    detail = "Restored baseline";
  } else if (noteLower.includes("baseline")) {
    detail = "Baseline";
  } else if (hasCurrentReading || hasPreviousReading) {
    detail = "Recorded";
  }

  return `
    <div class="registry-reading-cell${isRestoredBaseline ? " is-restored" : ""}" title="${escapeHtml(
      note || `${billingMonth || "Selected month"} reading`
    )}">
      <strong>${escapeHtml(numberToInputString(resolvedReading))}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

async function loadUtilitySheetMonthlyCombinedCharge() {
  const buildingId = String(
    utilitySheetBuildingSelectEl?.value || state.selectedRegistryBuildingId || ""
  ).trim();
  const billingMonth = toBillingMonth(utilitySheetBillingMonthEl?.value);

  state.utilitySheetMonthlyCombinedCharge = null;
  syncUtilitySheetCombinedCharge();

  if (!buildingId || !billingMonth) {
    return;
  }

  const payload = await requestJson(
    `/api/landlord/buildings/${encodeURIComponent(buildingId)}/monthly-combined-utility-charge?billingMonth=${encodeURIComponent(
      billingMonth
    )}`
  );
  state.utilitySheetMonthlyCombinedCharge = payload.data ?? null;
  syncUtilitySheetCombinedCharge();
}

async function loadRegistryMonthlyCombinedCharge() {
  const buildingId = getSelectedUtilityBuildingId();
  const billingMonth = getSelectedRegistryReadingMonth();

  state.registryMonthlyCombinedCharge = null;

  if (!buildingId || !billingMonth) {
    return;
  }

  const payload = await requestJson(
    `/api/landlord/buildings/${encodeURIComponent(buildingId)}/monthly-combined-utility-charge?billingMonth=${encodeURIComponent(
      billingMonth
    )}`
  );
  state.registryMonthlyCombinedCharge = payload.data ?? null;
}

function meterNumberForHouse(utilityType, buildingId, houseNumber, fallbackValue) {
  const configured = findConfiguredMeter(utilityType, buildingId, houseNumber);
  const configuredMeter = String(configured?.meterNumber ?? "").trim();
  if (configuredMeter) {
    return configuredMeter;
  }

  return String(fallbackValue ?? "").trim();
}

function syncUtilitySheetBuildingOptions() {
  if (!(utilitySheetBuildingSelectEl instanceof HTMLSelectElement)) {
    return;
  }

  utilitySheetBuildingSelectEl.replaceChildren();
  if (!Array.isArray(state.buildings) || state.buildings.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No buildings";
    utilitySheetBuildingSelectEl.append(option);
    utilitySheetBuildingSelectEl.disabled = true;
    return;
  }

  utilitySheetBuildingSelectEl.disabled = false;
  state.buildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    if (building.id === state.selectedRegistryBuildingId) {
      option.selected = true;
    }
    utilitySheetBuildingSelectEl.append(option);
  });
}

function renderUtilitySheetRows(rows) {
  if (!(utilitySheetBodyEl instanceof HTMLElement)) {
    return;
  }

  utilitySheetBodyEl.replaceChildren();
  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="9">No houses found for this building.</td>';
    utilitySheetBodyEl.append(row);
    return;
  }

  const buildingId = getSelectedUtilityBuildingId();
  const isCombinedChargeBuilding =
    String(state.utilitySheetBuildingConfiguration?.buildingId ?? "").trim() === buildingId &&
    String(state.utilitySheetBuildingConfiguration?.utilityBillingMode ?? "").trim() ===
      "combined_charge";
  [...rows].sort((a, b) => compareHouseNumber(a.houseNumber, b.houseNumber)).forEach((item) => {
    const houseNumber = normalizeHouse(item.houseNumber);
    const waterBill = getLatestUtilityBill("water", buildingId, houseNumber);
    const electricityBill = getLatestUtilityBill("electricity", buildingId, houseNumber);
    const waterPrev =
      waterBill && Number.isFinite(Number(waterBill.currentReading))
        ? Number(waterBill.currentReading)
        : undefined;
    const electricityPrev =
      electricityBill && Number.isFinite(Number(electricityBill.currentReading))
        ? Number(electricityBill.currentReading)
        : undefined;

    const waterMeterValue = meterNumberForHouse(
      "water",
      buildingId,
      houseNumber,
      item.waterMeterNumber
    );
    const electricityMeterValue = meterNumberForHouse(
      "electricity",
      buildingId,
      houseNumber,
      item.electricityMeterNumber
    );
    const configuredWaterMeter = findConfiguredMeter("water", buildingId, houseNumber);
    const configuredElectricityMeter = findConfiguredMeter(
      "electricity",
      buildingId,
      houseNumber
    );
    const transferredWaterReading =
      isCombinedChargeBuilding && !hasUsableMeterNumber(configuredWaterMeter?.meterNumber)
        ? numericValueFromString(item.waterMeterNumber)
        : undefined;
    const transferredElectricityReading =
      isCombinedChargeBuilding &&
      !hasUsableMeterNumber(configuredElectricityMeter?.meterNumber)
        ? numericValueFromString(item.electricityMeterNumber)
        : undefined;
    const waterMeterNumber =
      transferredWaterReading != null ? "" : normalizeUtilityMeterNumber(waterMeterValue);
    const electricityMeterNumber =
      transferredElectricityReading != null
        ? ""
        : normalizeUtilityMeterNumber(electricityMeterValue);
    const hasBothMeters =
      hasUsableMeterNumber(waterMeterNumber) && hasUsableMeterNumber(electricityMeterNumber);
    const roomWaterFixedCharge =
      Number.isFinite(Number(item.waterFixedChargeKsh)) && Number(item.waterFixedChargeKsh) > 0
        ? Number(item.waterFixedChargeKsh)
        : undefined;
    const roomElectricityFixedCharge =
      Number.isFinite(Number(item.electricityFixedChargeKsh)) &&
      Number(item.electricityFixedChargeKsh) > 0
        ? Number(item.electricityFixedChargeKsh)
        : undefined;
    const buildingWaterFixedCharge = getBuildingUtilityFixedChargeDefault(
      "water",
      buildingId
    );
    const buildingElectricityFixedCharge = getBuildingUtilityFixedChargeDefault(
      "electricity",
      buildingId
    );
    const latestWaterFixedCharge =
      Number.isFinite(Number(waterBill?.fixedChargeKsh)) && Number(waterBill?.fixedChargeKsh) > 0
        ? Number(waterBill?.fixedChargeKsh)
        : undefined;
    const latestElectricityFixedCharge =
      Number.isFinite(Number(electricityBill?.fixedChargeKsh)) &&
      Number(electricityBill?.fixedChargeKsh) > 0
        ? Number(electricityBill?.fixedChargeKsh)
        : undefined;
    const resolvedWaterFixedDefault = hasBothMeters
      ? 0
      : roomWaterFixedCharge ??
        buildingWaterFixedCharge ??
        latestWaterFixedCharge;
    const resolvedElectricityFixedDefault = hasBothMeters
      ? 0
      : roomElectricityFixedCharge ??
        buildingElectricityFixedCharge ??
        latestElectricityFixedCharge;
    const autoWaterFixedCharge =
      roomWaterFixedCharge != null ? undefined : resolvedWaterFixedDefault;
    const autoElectricityFixedCharge =
      roomElectricityFixedCharge != null ? undefined : resolvedElectricityFixedDefault;

    const row = document.createElement("tr");
    row.dataset.houseNumber = houseNumber;
    row.dataset.householdMembers = String(Number(item.householdMembers ?? 0));
    row.dataset.hasActiveResident = item.hasActiveResident ? "true" : "false";
    row.dataset.hasBothMeters = hasBothMeters ? "true" : "false";
    row.dataset.roomWaterFixedCharge = numberToInputString(roomWaterFixedCharge);
    row.dataset.roomElectricityFixedCharge = numberToInputString(roomElectricityFixedCharge);
    row.dataset.autoWaterFixedCharge = numberToInputString(autoWaterFixedCharge);
    row.dataset.autoElectricityFixedCharge = numberToInputString(autoElectricityFixedCharge);
    row.innerHTML = `
      <td><strong>${escapeHtml(houseNumber)}</strong></td>
      <td><input class="registry-table-input utility-sheet-input" data-field="waterMeterNumber" type="text" maxlength="80" placeholder="WTR-0001" value="${escapeHtml(waterMeterNumber)}" /></td>
      <td><input class="registry-table-input utility-sheet-input" data-field="waterPreviousReading" type="number" min="0" step="0.001" placeholder="auto" value="${escapeHtml(numberToInputString(waterPrev))}" /></td>
      <td><input class="registry-table-input utility-sheet-input" data-field="waterCurrentReading" type="number" min="0" step="0.001" placeholder="e.g. 358.5" value="${escapeHtml(numberToInputString(transferredWaterReading))}" /></td>
      <td><input class="registry-table-input utility-sheet-input" data-field="waterFixedChargeKsh" type="number" min="0" step="0.01" value="${escapeHtml(numberToInputString(resolvedWaterFixedDefault))}" /></td>
      <td><input class="registry-table-input utility-sheet-input" data-field="electricityMeterNumber" type="text" maxlength="80" placeholder="ELEC-0001" value="${escapeHtml(electricityMeterNumber)}" /></td>
      <td><input class="registry-table-input utility-sheet-input" data-field="electricityPreviousReading" type="number" min="0" step="0.001" placeholder="auto" value="${escapeHtml(numberToInputString(electricityPrev))}" /></td>
      <td><input class="registry-table-input utility-sheet-input" data-field="electricityCurrentReading" type="number" min="0" step="0.001" placeholder="e.g. 911.2" value="${escapeHtml(numberToInputString(transferredElectricityReading))}" /></td>
      <td><input class="registry-table-input utility-sheet-input" data-field="electricityFixedChargeKsh" type="number" min="0" step="0.01" value="${escapeHtml(numberToInputString(resolvedElectricityFixedDefault))}" /></td>
    `;
    utilitySheetBodyEl.append(row);
  });
}

function buildUtilitySheetRegistryPayload() {
  if (!(utilitySheetBodyEl instanceof HTMLElement)) {
    return [];
  }

  const rows = [];
  const trList = utilitySheetBodyEl.querySelectorAll("tr[data-house-number]");
  trList.forEach((tr) => {
    const houseNumber = normalizeHouse(tr.dataset.houseNumber);
    const householdMembers = Number(tr.dataset.householdMembers ?? 0);
    const waterInput = tr.querySelector('input[data-field="waterMeterNumber"]');
    const electricityInput = tr.querySelector(
      'input[data-field="electricityMeterNumber"]'
    );
    const waterFixedInput = tr.querySelector(
      'input[data-field="waterFixedChargeKsh"]'
    );
    const electricityFixedInput = tr.querySelector(
      'input[data-field="electricityFixedChargeKsh"]'
    );

    if (
      !(waterInput instanceof HTMLInputElement) ||
      !(electricityInput instanceof HTMLInputElement) ||
      !(waterFixedInput instanceof HTMLInputElement) ||
      !(electricityFixedInput instanceof HTMLInputElement)
    ) {
      return;
    }

    const waterFixedChargeInput = toOptionalNumber(waterFixedInput.value);
    const electricityFixedChargeInput = toOptionalNumber(electricityFixedInput.value);
    const roomWaterFixedCharge = numericValueFromString(tr.dataset.roomWaterFixedCharge);
    const roomElectricityFixedCharge = numericValueFromString(
      tr.dataset.roomElectricityFixedCharge
    );
    const autoWaterFixedCharge = numericValueFromString(tr.dataset.autoWaterFixedCharge);
    const autoElectricityFixedCharge = numericValueFromString(
      tr.dataset.autoElectricityFixedCharge
    );
    const waterFixedChargeKsh =
      waterFixedChargeInput == null
        ? 0
        : roomWaterFixedCharge != null && roomWaterFixedCharge > 0
          ? waterFixedChargeInput
          : autoWaterFixedCharge != null &&
              utilityPricingNumbersEqual(waterFixedChargeInput, autoWaterFixedCharge)
            ? 0
            : waterFixedChargeInput;
    const electricityFixedChargeKsh =
      electricityFixedChargeInput == null
        ? 0
        : roomElectricityFixedCharge != null && roomElectricityFixedCharge > 0
          ? electricityFixedChargeInput
          : autoElectricityFixedCharge != null &&
              utilityPricingNumbersEqual(
                electricityFixedChargeInput,
                autoElectricityFixedCharge
              )
            ? 0
            : electricityFixedChargeInput;

    rows.push({
      houseNumber,
      householdMembers: Number.isInteger(householdMembers) ? householdMembers : 0,
      waterMeterNumber: normalizeUtilityMeterNumber(waterInput.value) || undefined,
      electricityMeterNumber:
        normalizeUtilityMeterNumber(electricityInput.value) || undefined,
      waterFixedChargeKsh,
      electricityFixedChargeKsh
    });
  });
  return rows;
}

function buildUtilitySheetAuditRows() {
  if (!(utilitySheetBodyEl instanceof HTMLElement)) {
    return [];
  }

  const rows = [];
  const trList = utilitySheetBodyEl.querySelectorAll("tr[data-house-number]");
  trList.forEach((tr) => {
    const houseNumber = normalizeHouse(tr.dataset.houseNumber);
    if (!houseNumber) {
      return;
    }

    const householdMembers = Number(tr.dataset.householdMembers ?? 0);
    const waterMeterInput = tr.querySelector('input[data-field="waterMeterNumber"]');
    const waterPreviousInput = tr.querySelector(
      'input[data-field="waterPreviousReading"]'
    );
    const waterCurrentInput = tr.querySelector(
      'input[data-field="waterCurrentReading"]'
    );
    const waterFixedInput = tr.querySelector(
      'input[data-field="waterFixedChargeKsh"]'
    );
    const electricityMeterInput = tr.querySelector(
      'input[data-field="electricityMeterNumber"]'
    );
    const electricityPreviousInput = tr.querySelector(
      'input[data-field="electricityPreviousReading"]'
    );
    const electricityCurrentInput = tr.querySelector(
      'input[data-field="electricityCurrentReading"]'
    );
    const electricityFixedInput = tr.querySelector(
      'input[data-field="electricityFixedChargeKsh"]'
    );

    rows.push({
      houseNumber,
      householdMembers: Number.isInteger(householdMembers) ? householdMembers : 0,
      hasActiveResident: tr.dataset.hasActiveResident === "true",
      waterMeterNumber:
        waterMeterInput instanceof HTMLInputElement
          ? waterMeterInput.value.trim() || undefined
          : undefined,
      waterPreviousReading:
        waterPreviousInput instanceof HTMLInputElement
          ? toOptionalNumber(waterPreviousInput.value)
          : undefined,
      waterCurrentReading:
        waterCurrentInput instanceof HTMLInputElement
          ? toOptionalNumber(waterCurrentInput.value)
          : undefined,
      waterFixedChargeKsh:
        waterFixedInput instanceof HTMLInputElement
          ? toOptionalNumber(waterFixedInput.value)
          : undefined,
      electricityMeterNumber:
        electricityMeterInput instanceof HTMLInputElement
          ? electricityMeterInput.value.trim() || undefined
          : undefined,
      electricityPreviousReading:
        electricityPreviousInput instanceof HTMLInputElement
          ? toOptionalNumber(electricityPreviousInput.value)
          : undefined,
      electricityCurrentReading:
        electricityCurrentInput instanceof HTMLInputElement
          ? toOptionalNumber(electricityCurrentInput.value)
          : undefined,
      electricityFixedChargeKsh:
        electricityFixedInput instanceof HTMLInputElement
          ? toOptionalNumber(electricityFixedInput.value)
          : undefined
    });
  });

  return rows;
}

function csvCell(value) {
  const stringValue = String(value ?? "");
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}

function buildUtilityBulkAuditCsv(record) {
  const lines = [
    ["Audit ID", record.id || ""],
    ["Created At", record.createdAt || ""],
    ["Building ID", record.buildingId || ""],
    ["Building Name", record.buildingName || ""],
    ["Billing Month", record.billingMonth || ""],
    ["Due Date", record.dueDate || ""],
    [
      "Default Water Fixed Charge KSh",
      record.defaultWaterFixedChargeKsh ?? ""
    ],
    [
      "Default Electricity Fixed Charge KSh",
      record.defaultElectricityFixedChargeKsh ?? ""
    ],
    [
      "Default Combined Charge KSh",
      record.defaultCombinedUtilityChargeKsh ?? ""
    ],
    [
      "Monthly Combined Charge KSh",
      record.monthlyCombinedUtilityChargeKsh ?? ""
    ],
    [
      "Water Rate Per Unit KSh",
      record.rateDefaults?.waterRatePerUnitKsh ?? ""
    ],
    [
      "Electricity Rate Per Unit KSh",
      record.rateDefaults?.electricityRatePerUnitKsh ?? ""
    ],
    ["Note", record.note || ""],
    ["Status", record.result?.status || ""],
    ["Posted Count", record.result?.postedCount ?? ""],
    ["Requested Count", record.result?.requestedCount ?? ""],
    ["Completed At", record.result?.completedAt || ""]
  ].map((row) => row.map(csvCell).join(","));

  lines.push("");
  lines.push(
    [
      "House",
      "Household Members",
      "Has Active Resident",
      "Water Meter",
      "Water Previous",
      "Water Current",
      "Water Fixed KSh",
      "Electricity Meter",
      "Electricity Previous",
      "Electricity Current",
      "Electricity Fixed KSh"
    ]
      .map(csvCell)
      .join(",")
  );

  (Array.isArray(record.rows) ? record.rows : []).forEach((row) => {
    lines.push(
      [
        row.houseNumber || "",
        row.householdMembers ?? "",
        row.hasActiveResident ?? "",
        row.waterMeterNumber || "",
        row.waterPreviousReading ?? "",
        row.waterCurrentReading ?? "",
        row.waterFixedChargeKsh ?? "",
        row.electricityMeterNumber || "",
        row.electricityPreviousReading ?? "",
        row.electricityCurrentReading ?? "",
        row.electricityFixedChargeKsh ?? ""
      ]
        .map(csvCell)
        .join(",")
    );
  });

  if (Array.isArray(record.result?.failures) && record.result.failures.length > 0) {
    lines.push("");
    lines.push(csvCell("Failures"));
    record.result.failures.forEach((failure) => {
      lines.push(csvCell(failure));
    });
  }

  return lines.join("\n");
}

function downloadUtilityBulkAuditCsv(record) {
  const csv = buildUtilityBulkAuditCsv(record);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = [
    "jk-flats",
    String(record.buildingId || "").trim().toLowerCase(),
    String(record.billingMonth || "").trim(),
    "bulk-utility-audit.csv"
  ]
    .filter(Boolean)
    .join("-");
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
}

async function finalizeUtilityBulkAudit(buildingId, auditId, payload) {
  if (!buildingId || !auditId) {
    return;
  }

  await requestJson(
    `/api/landlord/buildings/${encodeURIComponent(buildingId)}/utility-bulk-audits/${encodeURIComponent(auditId)}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
}

function buildUtilitySheetBillRequests(
  buildingId,
  billingMonth,
  dueDateIso,
  note,
  combinedUtilityChargeKsh
) {
  if (!(utilitySheetBodyEl instanceof HTMLElement)) {
    return [];
  }

  const waterRatePerUnitKsh =
    toOptionalNumber(utilitySheetWaterRateEl?.value) ??
    getUtilityRateDefault("water", buildingId);
  const electricityRatePerUnitKsh =
    toOptionalNumber(utilitySheetElectricRateEl?.value) ??
    getUtilityRateDefault("electricity", buildingId);

  const requests = [];
  const trList = utilitySheetBodyEl.querySelectorAll("tr[data-house-number]");

  trList.forEach((tr) => {
    const houseNumber = normalizeHouse(tr.dataset.houseNumber);
    const hasActiveResident = tr.dataset.hasActiveResident === "true";
    const hasBothMeters = tr.dataset.hasBothMeters === "true";
    if (!houseNumber) {
      return;
    }

    const waterPreviousInput = tr.querySelector(
      'input[data-field="waterPreviousReading"]'
    );
    const waterCurrentInput = tr.querySelector(
      'input[data-field="waterCurrentReading"]'
    );
    const waterFixedInput = tr.querySelector(
      'input[data-field="waterFixedChargeKsh"]'
    );
    const electricityPreviousInput = tr.querySelector(
      'input[data-field="electricityPreviousReading"]'
    );
    const electricityCurrentInput = tr.querySelector(
      'input[data-field="electricityCurrentReading"]'
    );
    const electricityFixedInput = tr.querySelector(
      'input[data-field="electricityFixedChargeKsh"]'
    );

    const waterPreviousReading =
      waterPreviousInput instanceof HTMLInputElement
        ? toOptionalNumber(waterPreviousInput.value)
        : undefined;
    const waterCurrentReading =
      waterCurrentInput instanceof HTMLInputElement
        ? toOptionalNumber(waterCurrentInput.value)
        : undefined;
    const waterFixedChargeKsh =
      waterFixedInput instanceof HTMLInputElement
        ? toOptionalNumber(waterFixedInput.value) ?? 0
        : 0;
    const electricityPreviousReading =
      electricityPreviousInput instanceof HTMLInputElement
        ? toOptionalNumber(electricityPreviousInput.value)
        : undefined;
    const electricityCurrentReading =
      electricityCurrentInput instanceof HTMLInputElement
        ? toOptionalNumber(electricityCurrentInput.value)
        : undefined;
    const electricityFixedChargeKsh =
      electricityFixedInput instanceof HTMLInputElement
        ? toOptionalNumber(electricityFixedInput.value) ?? 0
        : 0;

    const hasRoomSpecificUtilityEntry =
      waterPreviousReading != null ||
      waterCurrentReading != null ||
      waterFixedChargeKsh > 0 ||
      electricityPreviousReading != null ||
      electricityCurrentReading != null ||
      electricityFixedChargeKsh > 0;

    if (
      hasActiveResident &&
      !hasRoomSpecificUtilityEntry &&
      Number(combinedUtilityChargeKsh ?? 0) > 0
    ) {
      requests.push({
        utilityType: "water",
        houseNumber,
        payload: {
          buildingId,
          billingMonth,
          fixedChargeKsh: Number(combinedUtilityChargeKsh),
          dueDate: dueDateIso,
          note: `Combined utility fee (water+electricity) for ${billingMonth}.${note ? ` ${note}` : ""}`
        }
      });
      return;
    }

    ["water", "electricity"].forEach((utilityType) => {
      const meterInput = tr.querySelector(
        `input[data-field="${utilityType}MeterNumber"]`
      );
      const previousInput = tr.querySelector(
        `input[data-field="${utilityType}PreviousReading"]`
      );
      const currentInput = tr.querySelector(
        `input[data-field="${utilityType}CurrentReading"]`
      );
      const fixedInput = tr.querySelector(
        `input[data-field="${utilityType}FixedChargeKsh"]`
      );

      if (
        !(meterInput instanceof HTMLInputElement) ||
        !(previousInput instanceof HTMLInputElement) ||
        !(currentInput instanceof HTMLInputElement) ||
        !(fixedInput instanceof HTMLInputElement)
      ) {
        return;
      }

      const previousReading = toOptionalNumber(previousInput.value);
      const currentReading = toOptionalNumber(currentInput.value);
      const ratePerUnitKsh =
        utilityType === "water" ? waterRatePerUnitKsh : electricityRatePerUnitKsh;
      const fixedChargeKsh = hasBothMeters ? 0 : toOptionalNumber(fixedInput.value);

      const hasMeteredFields = previousReading != null || currentReading != null;
      const hasFixedCharge = fixedChargeKsh != null && fixedChargeKsh > 0;
      if (!hasMeteredFields && !hasFixedCharge) {
        return;
      }

      if (currentReading != null && ratePerUnitKsh == null) {
        throw new Error(
          `${utilityType} for ${houseNumber} requires a building rate per unit.`
        );
      }

      if (previousReading != null && currentReading == null) {
        throw new Error(
          `${utilityType} for ${houseNumber} requires current reading when previous reading is provided.`
        );
      }

      if (
        previousReading != null &&
        currentReading != null &&
        currentReading < previousReading
      ) {
        throw new Error(
          `${utilityType} for ${houseNumber} has current reading lower than previous reading.`
        );
      }

      const resolvedRatePerUnitKsh =
        currentReading != null ? ratePerUnitKsh : undefined;

      const payload = {
        buildingId,
        billingMonth,
        meterNumber: meterInput.value.trim() || undefined,
        previousReading,
        currentReading,
        ratePerUnitKsh: resolvedRatePerUnitKsh,
        fixedChargeKsh,
        dueDate: dueDateIso,
        note
      };

      requests.push({
        utilityType,
        houseNumber,
        payload
      });
    });
  });

  return requests;
}

async function openUtilitySheetModal() {
  const buildingId = getSelectedUtilityBuildingId();
  if (!buildingId) {
    showError("Select a building first.");
    return;
  }

  state.selectedRegistryBuildingId = buildingId;
  if (registryBuildingSelectEl instanceof HTMLSelectElement) {
    registryBuildingSelectEl.value = buildingId;
  }

  clearError();
  closeUtilitySetupModal();
  showUtilitySheetModal();
  syncUtilitySheetBuildingOptions();
  if (utilitySheetBuildingSelectEl instanceof HTMLSelectElement) {
    utilitySheetBuildingSelectEl.value = buildingId;
  }
  if (
    utilitySheetBillingMonthEl instanceof HTMLInputElement &&
    !utilitySheetBillingMonthEl.value
  ) {
    utilitySheetBillingMonthEl.value = toMonthInputValue(new Date());
  }
  if (utilitySheetDueDateEl instanceof HTMLInputElement && !utilitySheetDueDateEl.value) {
    const due = new Date();
    due.setDate(due.getDate() + 7);
    due.setHours(23, 59, 0, 0);
    utilitySheetDueDateEl.value = toDateTimeLocalInputValue(due);
  }

  try {
    await Promise.all([
      loadRegistryRows(),
      loadMeters(),
      loadBills(),
      loadUtilitySheetBuildingConfiguration(),
      loadUtilitySheetMonthlyCombinedCharge()
    ]);
    renderUtilitySheetRows(state.registryRows);
  } catch (error) {
    handleLandlordError(error, "Failed to load bulk utility sheet.");
  }
}

async function openUtilitySetupModal() {
  setActiveLandlordView("tenants");
  showUtilitySetupModal();
  clearError();

  await Promise.all([
    loadRegistryRows(),
    loadMeters(),
    loadBills(),
    loadPayments(),
    loadUtilitySheetBuildingConfiguration(),
    loadUtilitySheetMonthlyCombinedCharge()
  ]);
}

function getSelectedUtilityBuildingId() {
  return String(
    registryBuildingSelectEl?.value || state.selectedRegistryBuildingId || ""
  ).trim();
}

function withBuildingQuery(url, buildingId, extra = "") {
  const query = new URLSearchParams(extra);
  if (buildingId) {
    query.set("buildingId", buildingId);
  }
  const serialized = query.toString();
  return serialized ? `${url}?${serialized}` : url;
}

function findConfiguredMeter(utilityType, buildingId, houseNumber) {
  return (
    state.meterByKey.get(utilityBuildingHouseLookupKey(utilityType, buildingId, houseNumber)) ??
    state.meterByKey.get(utilityBuildingHouseLookupKey(utilityType, "", houseNumber)) ??
    null
  );
}

function syncUtilityBillInputMode() {
  const utilityType = String(utilityBillTypeEl.value ?? "water");
  const buildingId = getSelectedUtilityBuildingId();
  const houseNumber = normalizeHouse(utilityBillHouseEl.value);
  const meter = findConfiguredMeter(utilityType, buildingId, houseNumber);

  const hasMeter = Boolean(meter?.meterNumber);
  utilityBillPreviousReadingEl.disabled = !hasMeter;
  utilityBillCurrentReadingEl.disabled = !hasMeter;
  utilityBillRateEl.disabled = !hasMeter;
  utilityBillCurrentReadingEl.required = hasMeter;
  utilityBillRateEl.required = hasMeter;
  utilityBillFixedEl.required = !hasMeter;

  if (!hasMeter) {
    utilityBillPreviousReadingEl.value = "";
    utilityBillCurrentReadingEl.value = "";
    utilityBillRateEl.value = "";
    utilityBillCurrentReadingEl.placeholder = "Not required for fixed charge";
    utilityBillRateEl.placeholder = "Not required for fixed charge";
    utilityBillFixedEl.min = "1";
    const defaultFixedCharge = getRoomUtilityFixedChargeDefault(
      utilityType,
      buildingId,
      houseNumber
    );
    utilityBillFixedEl.value = numberToInputString(defaultFixedCharge);
    if (utilityBillInputGuidanceEl) {
      const houseLabel = houseNumber || "this house";
      utilityBillInputGuidanceEl.textContent = `${houseLabel}: fixed charge.`;
    }
    return;
  }

  utilityBillCurrentReadingEl.placeholder = "e.g. 358.5";
  utilityBillRateEl.placeholder = "e.g. 35";
  utilityBillFixedEl.min = "0";
  if (!utilityBillRateEl.value) {
    const defaultRate = getUtilityRateDefault(utilityType, buildingId);
    if (defaultRate != null) {
      utilityBillRateEl.value = numberToInputString(defaultRate);
    }
  }
  if (utilityBillInputGuidanceEl) {
    utilityBillInputGuidanceEl.textContent = `Meter ${meter.meterNumber}: reading + rate.`;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin"
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const issueMessage = payload.issues?.[0]?.message;
    const err = new Error(
      issueMessage ?? payload.error ?? `Request failed (${response.status})`
    );
    err.status = response.status;
    err.payload = payload;
    err.data = payload.data;
    throw err;
  }

  return payload;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function supportsLandlordPush() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function renderLandlordPushControls() {
  if (!(landlordPushAlertsBtnEl instanceof HTMLButtonElement)) {
    return;
  }

  const owner = isOwnerAlertRole();
  const config = state.landlordPushConfig;
  const hasSubscription = Boolean(state.landlordPushSubscriptionEndpoint);
  const supported = supportsLandlordPush();
  const serverEnabled = Boolean(config?.enabled && config.publicKey);
  const permission = supported ? Notification.permission : "denied";

  landlordPushAlertsBtnEl.classList.toggle(
    "hidden",
    !owner || !supported || !serverEnabled || hasSubscription
  );
  landlordPushAlertsBtnEl.disabled =
    !owner || !supported || !serverEnabled || permission === "denied";
  landlordPushAlertsBtnEl.textContent =
    permission === "denied" ? "Alerts Blocked" : "Enable Alerts";
}

async function ensureLandlordServiceWorkerRegistration() {
  if (!supportsLandlordPush()) {
    return null;
  }

  if (!landlordSwRegistrationPromise) {
    landlordSwRegistrationPromise = navigator.serviceWorker
      .register(LANDLORD_SW_URL, { scope: "/" })
      .catch((error) => {
        landlordSwRegistrationPromise = null;
        console.error("Failed to register JK Flats service worker", error);
        return null;
      });
  }

  return landlordSwRegistrationPromise;
}

async function getLandlordPushSubscription() {
  const registration = await ensureLandlordServiceWorkerRegistration();
  if (!registration || !supportsLandlordPush()) {
    return null;
  }

  return registration.pushManager.getSubscription();
}

async function loadLandlordPushConfig() {
  if (!isOwnerAlertRole()) {
    state.landlordPushConfig = null;
    state.landlordPushSubscriptionEndpoint = "";
    renderLandlordPushControls();
    return null;
  }

  try {
    const payload = await requestJson("/api/landlord/push/config", {
      cache: "no-store"
    });
    state.landlordPushConfig = payload.data ?? null;
  } catch (error) {
    console.error("Failed to load owner alert push config", error);
    state.landlordPushConfig = { enabled: false, publicKey: null };
  }

  renderLandlordPushControls();
  return state.landlordPushConfig;
}

async function registerLandlordPushSubscription(subscription) {
  await requestJson("/api/landlord/push-subscriptions", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(subscription.toJSON())
  });
  state.landlordPushSubscriptionEndpoint = subscription.endpoint;
  renderLandlordPushControls();
}

async function syncLandlordPushState({ subscribeIfAllowed = false } = {}) {
  renderLandlordPushControls();

  if (!isOwnerAlertRole() || !supportsLandlordPush()) {
    state.landlordPushSubscriptionEndpoint = "";
    renderLandlordPushControls();
    return;
  }

  const config = state.landlordPushConfig ?? (await loadLandlordPushConfig());
  if (!config?.enabled || !config.publicKey) {
    renderLandlordPushControls();
    return;
  }

  const subscription = await getLandlordPushSubscription();
  state.landlordPushSubscriptionEndpoint = subscription?.endpoint ?? "";

  if (!subscription && subscribeIfAllowed && Notification.permission === "granted") {
    const registration = await ensureLandlordServiceWorkerRegistration();
    if (!registration) {
      return;
    }
    try {
      const created = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey)
      });
      await registerLandlordPushSubscription(created);
      state.landlordPushSubscriptionEndpoint = created.endpoint;
    } catch (error) {
      console.error("Failed to create owner alert push subscription", error);
    }
    renderLandlordPushControls();
    return;
  }

  if (subscription && Notification.permission === "granted") {
    try {
      await registerLandlordPushSubscription(subscription);
    } catch (error) {
      console.error("Failed to sync owner alert push subscription", error);
    }
  }

  renderLandlordPushControls();
}

async function enableLandlordPushAlerts() {
  clearError();

  if (!isOwnerAlertRole()) {
    showError("Owner alerts are only available for owner/staff accounts.");
    return;
  }
  if (!supportsLandlordPush()) {
    showError("This browser does not support owner browser alerts.");
    return;
  }

  const config = state.landlordPushConfig ?? (await loadLandlordPushConfig());
  if (!config?.enabled || !config.publicKey) {
    showError("Browser alerts are not configured on this server yet.");
    return;
  }

  let permission = Notification.permission;
  if (permission !== "granted") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    renderLandlordPushControls();
    setStatus("Owner browser alerts were not enabled.");
    return;
  }

  const registration = await ensureLandlordServiceWorkerRegistration();
  if (!registration) {
    showError("Unable to prepare this device for owner browser alerts.");
    return;
  }

  try {
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey)
      }));
    await registerLandlordPushSubscription(subscription);
    setStatus("Owner browser alerts enabled for this device.");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to enable owner browser alerts.";
    showError(message);
  } finally {
    renderLandlordPushControls();
  }
}

async function loadOwnerNotifications() {
  if (!isOwnerAlertRole()) {
    state.ownerNotifications = [];
    state.ownerNotificationsUnreadCount = 0;
    renderOwnerNotifications();
    return;
  }

  const payload = await requestJson("/api/landlord/notifications?limit=50", {
    cache: "no-store"
  });
  state.ownerNotifications = Array.isArray(payload.data?.notifications)
    ? payload.data.notifications
    : [];
  state.ownerNotificationsUnreadCount = Number.isFinite(
    Number(payload.data?.unreadCount)
  )
    ? Number(payload.data.unreadCount)
    : state.ownerNotifications.filter((item) => !item.read).length;
  renderOwnerNotifications();
}

async function markOwnerNotificationsRead() {
  if (!isOwnerAlertRole()) {
    return;
  }

  const unreadIds = state.ownerNotifications
    .filter((item) => !item.read)
    .map((item) => item.id)
    .filter(Boolean);
  if (unreadIds.length === 0) {
    renderOwnerNotifications();
    return;
  }

  const payload = await requestJson("/api/landlord/notifications/read", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ notificationIds: unreadIds })
  });
  state.ownerNotifications = Array.isArray(payload.data?.notifications)
    ? payload.data.notifications
    : state.ownerNotifications.map((item) => ({ ...item, read: true }));
  state.ownerNotificationsUnreadCount = Number.isFinite(
    Number(payload.data?.unreadCount)
  )
    ? Number(payload.data.unreadCount)
    : 0;
  renderOwnerNotifications();
}

function replaceUploadPreview(container, gallery, emptyText) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const previous = container.dataset.objectUrls ?? "";
  previous
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => URL.revokeObjectURL(item));
  container.dataset.objectUrls = "";
  container.replaceChildren();
  if (gallery) {
    container.append(gallery);
    return;
  }

  const empty = document.createElement("p");
  empty.className = "upload-preview-empty";
  empty.textContent = emptyText;
  container.append(empty);
}

function getBuildingPhotoUrls(buildingId) {
  const building = getBuildingRecord(buildingId);
  return Array.isArray(building?.media?.imageUrls)
    ? building.media.imageUrls.filter((item) => typeof item === "string" && item.trim())
    : [];
}

function createBuildingPhotoUploadRequest(buildingId) {
  return {
    url: "/api/media/upload",
    fields: {
      category: "building_profile",
      buildingId: buildingId || undefined
    },
    credentials: "same-origin"
  };
}

function syncBuildingPhotoPreview() {
  if (!(buildingPhotoFileEl instanceof HTMLInputElement)) {
    return;
  }

  try {
    const selectedFiles = validateImageFiles(buildingPhotoFileEl.files, {
      maxFiles: BUILDING_PHOTO_LIMIT,
      maxSizeMb: 10
    });

    if (selectedFiles.length > 0) {
      renderSelectedImagePreviews(buildingPhotoPreviewEl, selectedFiles, {
        emptyText: "No building photo selected."
      });
      return;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to preview selected photo.";
    showError(message);
    buildingPhotoFileEl.value = "";
  }

  const gallery = createUploadedImageGallery(
    getBuildingPhotoUrls(String(buildingPhotoBuildingSelectEl?.value ?? "").trim()).slice(0, 1),
    { linkLabel: "Open building photo" }
  );
  if (gallery) {
    gallery.classList.add("building-photo-preview");
  }
  replaceUploadPreview(buildingPhotoPreviewEl, gallery, "No building photo selected.");
}

function renderBuildingPhotoOptions() {
  if (!(buildingPhotoBuildingSelectEl instanceof HTMLSelectElement)) {
    return;
  }

  buildingPhotoBuildingSelectEl.replaceChildren();

  if (!Array.isArray(state.buildings) || state.buildings.length === 0) {
    buildingPhotoBuildingSelectEl.disabled = true;
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No buildings available";
    buildingPhotoBuildingSelectEl.append(option);
    replaceUploadPreview(
      buildingPhotoPreviewEl,
      null,
      "No building photo selected."
    );
    return;
  }

  buildingPhotoBuildingSelectEl.disabled = false;
  const selected = String(buildingPhotoBuildingSelectEl.value || "").trim();
  const nextSelected = state.buildings.some((item) => item.id === selected)
    ? selected
    : state.selectedRoomBuildingId && state.buildings.some((item) => item.id === state.selectedRoomBuildingId)
      ? state.selectedRoomBuildingId
      : state.buildings[0].id;

  state.buildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    option.selected = building.id === nextSelected;
    buildingPhotoBuildingSelectEl.append(option);
  });

  syncBuildingPhotoPreview();
}

function renderGlobalSearchBuildingOptions() {
  if (!(landlordGlobalSearchBuildingEl instanceof HTMLSelectElement)) {
    return;
  }

  landlordGlobalSearchBuildingEl.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All buildings";
  landlordGlobalSearchBuildingEl.append(allOption);

  (Array.isArray(state.buildings) ? state.buildings : []).forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    landlordGlobalSearchBuildingEl.append(option);
  });

  const preferredBuilding =
    state.selectedResidentsBuildingId && state.selectedResidentsBuildingId !== "all"
      ? state.selectedResidentsBuildingId
      : state.selectedRoomBuildingId && state.selectedRoomBuildingId !== "all"
        ? state.selectedRoomBuildingId
        : "all";
  landlordGlobalSearchBuildingEl.value = preferredBuilding;
}

function handleLandlordError(error, fallback) {
  if (error && error.status === 401) {
    redirectToLogin();
    return;
  }

  const message = error instanceof Error ? error.message : fallback;
  showError(message);
}

function isMissingRouteError(error) {
  return (
    Boolean(error) &&
    error.status === 404 &&
    String(error.message ?? "").trim() === "Request failed (404)"
  );
}

async function ensureSession() {
  try {
    const payload = await requestJson("/api/auth/landlord/session", { cache: "no-store" });
    const role = payload.data?.role ?? "tenant";
    if (
      role !== "landlord" &&
      role !== "admin" &&
      role !== "root_admin" &&
      role !== "caretaker"
    ) {
      throw new Error("This account does not have landlord access.");
    }

    state.role = role;
    landlordRoleEl.textContent = `role: ${formatRoleLabel(role)}`;
    applyRoleCapabilities();
    setStatus(`Signed in as ${formatRoleLabel(role)}.`);
    return true;
  } catch (error) {
    handleLandlordError(error, "Manager session is not available.");
    return false;
  }
}

function getFocusedBuildingSummary(buildingId) {
  const building = getBuildingRecord(buildingId);
  if (!building) {
    return null;
  }

  const units = Array.isArray(building.houseNumbers)
    ? building.houseNumbers.length
    : Number(building.units ?? 0);
  const residentRows = dedupeResidentDirectoryRows(state.residentDirectory).filter(
    (item) => normalizeLookupBuildingId(item.buildingId) === buildingId
  );
  const utilityBills = getActionableUtilityBills(state.bills).filter(
    (item) => normalizeLookupBuildingId(item.buildingId) === buildingId
  );
  let openBills = 0;
  const outstanding =
    residentRows.length > 0
      ? residentRows.reduce(
          (sum, item) => sum + getResidentOutstandingBalanceKsh(item),
          0
        )
      : utilityBills.reduce(
          (sum, item) => sum + utilityAmount(item.balanceKsh),
          0
        );

  utilityBills.forEach((item) => {
    const balanceKsh = utilityAmount(item.balanceKsh);
    if (balanceKsh > 0) {
      openBills += 1;
    }
  });

  return {
    building,
    units: Number.isFinite(units) ? Math.max(0, units) : 0,
    residentUsers: Math.max(0, Number(building.residentUsers ?? 0)),
    openBills,
    outstanding
  };
}

function renderLandlordFocusPanel() {
  if (
    !(landlordFocusBuildingSelectEl instanceof HTMLSelectElement) ||
    !(landlordFocusUnitsEl instanceof HTMLElement) ||
    !(landlordFocusResidentsEl instanceof HTMLElement) ||
    !(landlordFocusOpenBillsEl instanceof HTMLElement) ||
    !(landlordFocusOutstandingEl instanceof HTMLElement) ||
    !(landlordFocusNoteEl instanceof HTMLElement)
  ) {
    return;
  }

  landlordFocusBuildingSelectEl.replaceChildren();

  if (!Array.isArray(state.buildings) || state.buildings.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No buildings available";
    landlordFocusBuildingSelectEl.append(option);
    landlordFocusBuildingSelectEl.disabled = true;
    landlordFocusUnitsEl.textContent = "-";
    landlordFocusResidentsEl.textContent = "-";
    landlordFocusOpenBillsEl.textContent = "-";
    landlordFocusOutstandingEl.textContent = "-";
    landlordFocusNoteEl.textContent =
      "Create your first building to unlock room setup, residents, and utility workflows.";
    return;
  }

  const selectedBuildingId = getFocusedBuildingId() || state.buildings[0]?.id || "";
  const orderedBuildings = [...state.buildings].sort(compareBuildingRecords);
  landlordFocusBuildingSelectEl.disabled = false;

  orderedBuildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    if (building.id === selectedBuildingId) {
      option.selected = true;
    }
    landlordFocusBuildingSelectEl.append(option);
  });

  const summary = getFocusedBuildingSummary(selectedBuildingId);
  if (!summary) {
    landlordFocusUnitsEl.textContent = "-";
    landlordFocusResidentsEl.textContent = "-";
    landlordFocusOpenBillsEl.textContent = "-";
    landlordFocusOutstandingEl.textContent = "-";
    landlordFocusNoteEl.textContent = "Choose a building to keep the workspace aligned.";
    return;
  }

  landlordFocusUnitsEl.textContent = String(summary.units);
  landlordFocusResidentsEl.textContent = String(summary.residentUsers);
  landlordFocusOpenBillsEl.textContent = String(summary.openBills);
  landlordFocusOutstandingEl.textContent = formatCurrency(summary.outstanding);
  landlordFocusNoteEl.textContent = `${summary.building.name} • ${summary.building.county} • ${summary.building.address} • Updated ${formatDateTime(summary.building.updatedAt)}`;
}

function matchesBuildingManagementQuery(building, query) {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    building?.id,
    building?.name,
    building?.address,
    building?.county
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join(" ");
  return haystack.includes(normalizedQuery);
}

function renderBuildingManagementSummary(totalCount, visibleCount) {
  if (!(buildingManagementSummaryEl instanceof HTMLElement)) {
    return;
  }

  if (totalCount <= 0) {
    buildingManagementSummaryEl.textContent =
      "Create your first building, then focus it once and the main landlord tools will follow it.";
    return;
  }

  const query = String(state.buildingManagementQuery ?? "").trim();
  const focusedBuildingId = getFocusedBuildingId();
  const focusedBuildingName = getBuildingNameById(focusedBuildingId);
  const visibilityCopy = query
    ? `Showing ${visibleCount} of ${totalCount} buildings for "${query}".`
    : `Showing ${visibleCount} of ${totalCount} buildings.`;
  const focusCopy =
    focusedBuildingId && focusedBuildingName
      ? ` Current focus: ${focusedBuildingName} (${focusedBuildingId}).`
      : "";

  buildingManagementSummaryEl.textContent = `${visibilityCopy}${focusCopy}`;
}

function renderBuildings(rows) {
  buildingsBodyEl.replaceChildren();

  const allRows = Array.isArray(rows) ? rows : [];
  const filteredRows = [...allRows]
    .filter((item) => matchesBuildingManagementQuery(item, state.buildingManagementQuery))
    .sort(compareBuildingRecords);
  const focusedBuildingId = getFocusedBuildingId();

  renderBuildingManagementSummary(allRows.length, filteredRows.length);

  if (allRows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="8">No landlord buildings yet.</td>';
    buildingsBodyEl.append(row);
    return;
  }

  if (filteredRows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="8">No buildings match "${escapeHtml(
      state.buildingManagementQuery
    )}".</td>`;
    buildingsBodyEl.append(row);
    return;
  }

  filteredRows.forEach((item) => {
    const row = document.createElement("tr");
    const isFocused = item.id === focusedBuildingId;
    const houseCount = Array.isArray(item.houseNumbers)
      ? item.houseNumbers.length
      : Number(item.units ?? 0);
    const primaryPhoto = Array.isArray(item.media?.imageUrls)
      ? item.media.imageUrls.find((photo) => typeof photo === "string" && photo.trim())
      : "";
    const useBuildingButton = `
      <button
        type="button"
        data-action="switch-building"
        data-building-id="${escapeHtml(item.id)}"
        data-building-name="${escapeHtml(item.name)}"
        ${isFocused ? "disabled" : ""}
      >
        ${isFocused ? "Focused" : "Focus Building"}
      </button>
    `;
    const addRoomsButton = isCaretakerRole()
      ? ""
      : `
        <button
          type="button"
          data-action="open-room-drawer"
          data-building-id="${escapeHtml(item.id)}"
          data-building-name="${escapeHtml(item.name)}"
        >
          Add Rooms
        </button>
      `;
    const deleteBuildingButton = isCaretakerRole()
      ? ""
      : `
        <button
          type="button"
          class="btn-danger"
          data-action="delete-building"
          data-building-id="${escapeHtml(item.id)}"
          data-building-name="${escapeHtml(item.name)}"
        >
          Delete Building
        </button>
      `;
    row.className = `landlord-building-row${isFocused ? " is-focused-row" : ""}`;
    row.innerHTML = `
      <td>${item.id}</td>
      <td>${
        primaryPhoto
          ? `<a href="${escapeHtml(primaryPhoto)}" target="_blank" rel="noreferrer"><img class="building-table-thumb" src="${escapeHtml(primaryPhoto)}" alt="${escapeHtml(item.name)} front view" loading="lazy" /></a>`
          : '<span class="ticket-details muted">No photo</span>'
      }</td>
      <td>
        <div class="landlord-building-name">
          <strong>${item.name}</strong>
          ${isFocused ? '<span class="ticket-details muted">Current workspace focus</span>' : ""}
        </div>
      </td>
      <td>${item.address}</td>
      <td>${item.county}</td>
      <td>${houseCount}</td>
      <td>${formatDateTime(item.updatedAt)}</td>
      <td>
        <div class="action-row">
          ${useBuildingButton}
          ${addRoomsButton}
          ${deleteBuildingButton}
        </div>
      </td>
    `;
    buildingsBodyEl.append(row);
  });
}

function handleDeleteBuildingClick(target, buildingId, buildingName) {
  if (isCaretakerRole()) {
    showError("House manager accounts cannot delete buildings.");
    return;
  }

  const shouldProceed = window.confirm(
    `Delete ${buildingName || getBuildingDisplayNameById(buildingId)}?\nThis permanently removes the building, rooms, active tenancy links, and linked unit records.`
  );
  if (!shouldProceed) {
    return;
  }

  target.disabled = true;
  clearError();

  void (async () => {
    try {
      await requestJson(`/api/landlord/buildings/${encodeURIComponent(buildingId)}`, {
        method: "DELETE",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          confirmBuildingId: buildingId,
          confirmationText: "DELETE"
        })
      });

      setStatus(`Deleted building ${buildingName || getBuildingDisplayNameById(buildingId)}.`);
      await loadBuildings();

      const nextBuildingId = state.selectedRegistryBuildingId || state.buildings[0]?.id || "";
      if (nextBuildingId) {
        setPreferredBuildingSelection(nextBuildingId);
        await activateBuilding(nextBuildingId, { view: state.activeLandlordView });
      }
    } catch (error) {
      handleLandlordError(error, "Failed to delete building.");
    } finally {
      target.disabled = false;
    }
  })();
}

function setPreferredBuildingSelection(buildingId, options = {}) {
  const normalizedBuildingId = String(buildingId ?? "").trim();
  if (!normalizedBuildingId) {
    return;
  }

  state.selectedRoomBuildingId = normalizedBuildingId;
  state.selectedRegistryBuildingId = normalizedBuildingId;
  state.selectedCaretakerBuildingId = normalizedBuildingId;
  state.selectedTicketBuildingId = normalizedBuildingId;
  state.selectedOverviewRoomBuildingId = normalizedBuildingId;
  state.selectedWifiPackageBuildingId = normalizedBuildingId;
  state.selectedRentPaymentBuildingId = normalizedBuildingId;
  state.selectedRentSheetBuildingId = normalizedBuildingId;
  if (options.includeResidents !== false) {
    state.selectedResidentsBuildingId = normalizedBuildingId;
  }

  if (roomTargetBuildingEl instanceof HTMLSelectElement) {
    roomTargetBuildingEl.value = normalizedBuildingId;
  }
  if (registryBuildingSelectEl instanceof HTMLSelectElement) {
    registryBuildingSelectEl.value = normalizedBuildingId;
  }
  if (utilitySheetBuildingSelectEl instanceof HTMLSelectElement) {
    utilitySheetBuildingSelectEl.value = normalizedBuildingId;
  }
  if (caretakerBuildingSelectEl instanceof HTMLSelectElement) {
    caretakerBuildingSelectEl.value = normalizedBuildingId;
  }
  if (wifiPackageBuildingSelectEl instanceof HTMLSelectElement) {
    wifiPackageBuildingSelectEl.value = normalizedBuildingId;
  }
  if (rentPaymentBuildingSelectEl instanceof HTMLSelectElement) {
    rentPaymentBuildingSelectEl.value = normalizedBuildingId;
  }
  if (rentSheetBuildingSelectEl instanceof HTMLSelectElement) {
    rentSheetBuildingSelectEl.value = normalizedBuildingId;
  }
  if (landlordTicketBuildingSelectEl instanceof HTMLSelectElement) {
    landlordTicketBuildingSelectEl.value = normalizedBuildingId;
  }
  if (buildingPhotoBuildingSelectEl instanceof HTMLSelectElement) {
    buildingPhotoBuildingSelectEl.value = normalizedBuildingId;
  }
  if (overviewRoomBuildingSelectEl instanceof HTMLSelectElement) {
    overviewRoomBuildingSelectEl.value = normalizedBuildingId;
  }
  if (landlordGlobalSearchBuildingEl instanceof HTMLSelectElement) {
    landlordGlobalSearchBuildingEl.value = normalizedBuildingId;
  }
  if (
    options.includeResidents !== false &&
    residentsBuildingSelectEl instanceof HTMLSelectElement
  ) {
    residentsBuildingSelectEl.value = normalizedBuildingId;
  }

  syncBuildingPhotoPreview();
  renderLandlordFocusPanel();
  renderBuildings(state.buildings);
  updateLandlordBranding();
}

function renderRoomBuildingOptions() {
  if (!(roomTargetBuildingEl instanceof HTMLSelectElement)) {
    return;
  }

  roomTargetBuildingEl.replaceChildren();

  if (!Array.isArray(state.buildings) || state.buildings.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No buildings available";
    roomTargetBuildingEl.append(option);
    roomTargetBuildingEl.disabled = true;
    return;
  }

  roomTargetBuildingEl.disabled = false;
  const selected =
    state.selectedRoomBuildingId &&
    state.buildings.some((item) => item.id === state.selectedRoomBuildingId)
      ? state.selectedRoomBuildingId
      : state.buildings[0].id;
  state.selectedRoomBuildingId = selected;

  state.buildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    if (building.id === selected) {
      option.selected = true;
    }
    roomTargetBuildingEl.append(option);
  });
  renderBuildingRoomDrawerState();
}

function syncRentPaymentBuildingOptions() {
  if (!(rentPaymentBuildingSelectEl instanceof HTMLSelectElement)) {
    return;
  }

  rentPaymentBuildingSelectEl.replaceChildren();
  const rentEnabledBuildings = (Array.isArray(state.buildings) ? state.buildings : []).filter(
    (building) => getPaymentAccessRecord(building.id)?.rentEnabled !== false
  );

  if (rentEnabledBuildings.length === 0) {
    state.selectedRentPaymentBuildingId = "";
    rentPaymentBuildingSelectEl.disabled = true;
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No rent-enabled buildings";
    rentPaymentBuildingSelectEl.append(option);
    if (rentPaymentHelpEl instanceof HTMLElement) {
      rentPaymentHelpEl.textContent =
        "Rent payments are only available on buildings where rent collection is enabled.";
    }
    return;
  }

  const selected =
    state.selectedRentPaymentBuildingId &&
    rentEnabledBuildings.some((item) => item.id === state.selectedRentPaymentBuildingId)
      ? state.selectedRentPaymentBuildingId
      : state.selectedRegistryBuildingId || rentEnabledBuildings[0].id;

  state.selectedRentPaymentBuildingId = selected;
  rentPaymentBuildingSelectEl.disabled = false;

  rentEnabledBuildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    if (building.id === selected) {
      option.selected = true;
    }
    rentPaymentBuildingSelectEl.append(option);
  });

  if (rentPaymentHelpEl instanceof HTMLElement) {
    rentPaymentHelpEl.textContent =
      "Record a landlord-side rent payment only for buildings that still use rent billing.";
  }
}

function getRentEnabledBuildings() {
  return (Array.isArray(state.buildings) ? state.buildings : []).filter(
    (building) => getPaymentAccessRecord(building.id)?.rentEnabled !== false
  );
}

function defaultRentDueDateForBillingMonth(billingMonth) {
  const raw = String(billingMonth ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  const due = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, 5, 23, 59, 0, 0)
    : new Date();
  if (!match) {
    due.setDate(due.getDate() + 7);
    due.setHours(23, 59, 0, 0);
  }
  return due;
}

function syncRentSheetBuildingOptions() {
  if (!(rentSheetBuildingSelectEl instanceof HTMLSelectElement)) {
    return;
  }

  rentSheetBuildingSelectEl.replaceChildren();
  const rentEnabledBuildings = getRentEnabledBuildings();

  if (rentEnabledBuildings.length === 0) {
    state.selectedRentSheetBuildingId = "";
    rentSheetBuildingSelectEl.disabled = true;
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No rent-enabled buildings";
    rentSheetBuildingSelectEl.append(option);
    return;
  }

  const selected =
    state.selectedRentSheetBuildingId &&
    rentEnabledBuildings.some((item) => item.id === state.selectedRentSheetBuildingId)
      ? state.selectedRentSheetBuildingId
      : state.selectedRentPaymentBuildingId ||
        state.selectedRegistryBuildingId ||
        rentEnabledBuildings[0].id;

  state.selectedRentSheetBuildingId = selected;
  rentSheetBuildingSelectEl.disabled = false;

  rentEnabledBuildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    if (building.id === selected) {
      option.selected = true;
    }
    rentSheetBuildingSelectEl.append(option);
  });
}

function getSelectedRentSheetBuildingId() {
  return String(
    rentSheetBuildingSelectEl?.value || state.selectedRentSheetBuildingId || ""
  ).trim();
}

function renderRentSheetRows(rows) {
  if (!(rentSheetBodyEl instanceof HTMLElement)) {
    return;
  }

  rentSheetBodyEl.replaceChildren();
  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="9">No rooms found for this building.</td>';
    rentSheetBodyEl.append(row);
    return;
  }

  [...rows].sort((a, b) => compareHouseNumber(a.houseNumber, b.houseNumber)).forEach((item) => {
    const houseNumber = normalizeHouse(item.houseNumber);
    const monthlyRentKsh = Math.max(0, Math.round(Number(item.monthlyRentKsh ?? 0)));
    const balanceKsh = Math.max(0, Math.round(Number(item.balanceKsh ?? 0)));
    const currentMonthPaidKsh = Math.max(
      0,
      Math.round(Number(item.currentMonthPaidKsh ?? 0))
    );
    const arrearsKsh = Math.max(0, Math.round(Number(item.arrearsKsh ?? 0)));
    const residentLabel =
      String(item.residentName ?? "").trim() ||
      (item.hasActiveResident ? "Resident linked" : "Vacant");
    const residentPhone = String(item.residentPhone ?? "").trim();
    const statusLabel =
      String(item.paymentStatus ?? "").trim() ||
      String(item.verificationStatus ?? "").trim() ||
      (item.hasActiveResident ? "No rent profile" : "Vacant");

    const row = document.createElement("tr");
    row.dataset.houseNumber = houseNumber;
    row.innerHTML = `
      <td><strong>${escapeHtml(houseNumber)}</strong></td>
      <td>
        ${escapeHtml(residentLabel)}
        ${residentPhone ? `<br /><small>${escapeHtml(residentPhone)}</small>` : ""}
      </td>
      <td>${escapeHtml(statusLabel.replaceAll("_", " ").toUpperCase())}</td>
      <td>${formatCurrency(monthlyRentKsh)}</td>
      <td>
        <input
          class="registry-table-input utility-sheet-input"
          data-field="monthlyRentKsh"
          type="number"
          min="0"
          step="1"
          value="${escapeHtml(String(monthlyRentKsh))}"
          required
        />
      </td>
      <td>${formatCurrency(balanceKsh)}</td>
      <td>
        <input
          class="registry-table-input utility-sheet-input"
          data-field="balanceKsh"
          type="number"
          min="0"
          step="1"
          placeholder="Keep current"
        />
      </td>
      <td>${formatCurrency(currentMonthPaidKsh)}</td>
      <td>${formatCurrency(arrearsKsh)}</td>
    `;
    rentSheetBodyEl.append(row);
  });
}

function buildRentSheetPayload() {
  const billingMonth = toBillingMonth(rentSheetBillingMonthEl?.value);
  const dueDate = toIsoFromDateTimeLocal(rentSheetDueDateEl?.value);
  if (!billingMonth || !dueDate) {
    throw new Error("Rent sheet requires billing month and due date.");
  }

  const rows = [];
  const trList = rentSheetBodyEl?.querySelectorAll("tr[data-house-number]") ?? [];
  trList.forEach((tr) => {
    const houseNumber = normalizeHouse(tr.dataset.houseNumber);
    const rentInput = tr.querySelector('input[data-field="monthlyRentKsh"]');
    const balanceInput = tr.querySelector('input[data-field="balanceKsh"]');
    if (!(rentInput instanceof HTMLInputElement)) {
      return;
    }

    const monthlyRentKsh = toOptionalNumber(rentInput.value);
    if (monthlyRentKsh == null || monthlyRentKsh < 0) {
      throw new Error(`Monthly rent is required for ${houseNumber}.`);
    }

    const balanceKsh =
      balanceInput instanceof HTMLInputElement
        ? toOptionalNumber(balanceInput.value)
        : undefined;
    if (balanceKsh != null && balanceKsh < 0) {
      throw new Error(`Balance override for ${houseNumber} cannot be negative.`);
    }

    rows.push({
      houseNumber,
      monthlyRentKsh: Math.round(monthlyRentKsh),
      ...(balanceKsh == null ? {} : { balanceKsh: Math.round(balanceKsh) })
    });
  });

  if (rows.length === 0) {
    throw new Error("No rooms available in rent sheet.");
  }

  return {
    billingMonth,
    dueDate,
    note: String(rentSheetNoteEl?.value ?? "").trim() || undefined,
    rows
  };
}

async function loadRentSheetRows() {
  const buildingId = getSelectedRentSheetBuildingId();
  if (!buildingId) {
    state.rentSheetRows = [];
    renderRentSheetRows(state.rentSheetRows);
    return null;
  }

  const billingMonth = toBillingMonth(rentSheetBillingMonthEl?.value) || currentBillingMonth();
  const payload = await requestJson(
    `/api/landlord/buildings/${encodeURIComponent(buildingId)}/rent-bulk-sheet?billingMonth=${encodeURIComponent(billingMonth)}`
  );
  state.rentSheetRows = Array.isArray(payload?.data?.rows) ? payload.data.rows : [];
  state.selectedRentSheetBuildingId = buildingId;
  if (
    rentSheetBillingMonthEl instanceof HTMLInputElement &&
    payload?.data?.billingMonth
  ) {
    rentSheetBillingMonthEl.value = toMonthInputValue(payload.data.billingMonth);
  }
  renderRentSheetRows(state.rentSheetRows);
  return payload;
}

function showRentSheetModal() {
  rentSheetBackdropEl?.classList.remove("hidden");
  rentSheetModalEl?.classList.remove("hidden");
}

function closeRentSheetModal() {
  rentSheetBackdropEl?.classList.add("hidden");
  rentSheetModalEl?.classList.add("hidden");
}

async function openRentSheetModal() {
  if (isCaretakerRole()) {
    showError("House manager accounts cannot change rent charges.");
    return;
  }

  clearError();
  syncRentSheetBuildingOptions();
  const buildingId = getSelectedRentSheetBuildingId();
  if (!buildingId) {
    showError("No rent-enabled building is available.");
    return;
  }

  showRentSheetModal();
  setPreferredBuildingSelection(buildingId, { includeResidents: false });
  state.selectedRentSheetBuildingId = buildingId;
  syncRentSheetBuildingOptions();

  if (rentSheetBillingMonthEl instanceof HTMLInputElement && !rentSheetBillingMonthEl.value) {
    rentSheetBillingMonthEl.value = currentBillingMonth();
  }
  if (rentSheetDueDateEl instanceof HTMLInputElement && !rentSheetDueDateEl.value) {
    rentSheetDueDateEl.value = toDateTimeLocalInputValue(
      defaultRentDueDateForBillingMonth(rentSheetBillingMonthEl?.value)
    );
  }

  try {
    await loadRentSheetRows();
  } catch (error) {
    handleLandlordError(error, "Failed to load bulk rent sheet.");
  }
}

function renderRegistryBuildingOptions() {
  registryBuildingSelectEl.replaceChildren();

  if (!Array.isArray(state.buildings) || state.buildings.length === 0) {
    state.selectedRegistryBuildingId = "";
    setRegistryRows([]);
    registryBuildingSelectEl.disabled = true;
    registryLoadBtnEl.disabled = true;
    registrySaveBtnEl.disabled = true;

    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No buildings";
    registryBuildingSelectEl.append(option);
    renderRegistryRows([]);
    syncRentPaymentBuildingOptions();
    syncRentSheetBuildingOptions();
    syncUtilitySheetBuildingOptions();
    syncCaretakerBuildingOptions();
    syncLandlordTicketBuildingOptions();
    return;
  }

  const knownSelection =
    state.selectedRegistryBuildingId &&
    state.buildings.some((item) => item.id === state.selectedRegistryBuildingId)
      ? state.selectedRegistryBuildingId
      : state.buildings[0].id;

  state.selectedRegistryBuildingId = knownSelection;
  registryBuildingSelectEl.disabled = false;
  registryLoadBtnEl.disabled = false;
  registrySaveBtnEl.disabled = false;

  state.buildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    if (building.id === knownSelection) {
      option.selected = true;
    }
    registryBuildingSelectEl.append(option);
  });

  syncRentPaymentBuildingOptions();
  syncRentSheetBuildingOptions();
  syncUtilitySheetBuildingOptions();
  syncCaretakerBuildingOptions();
  syncLandlordTicketBuildingOptions();
}

function renderResidentsBuildingOptions() {
  if (!(residentsBuildingSelectEl instanceof HTMLSelectElement)) {
    return;
  }

  residentsBuildingSelectEl.replaceChildren();

  if (!Array.isArray(state.buildings) || state.buildings.length === 0) {
    state.selectedResidentsBuildingId = "";
    setResidentDirectory([]);
    residentsBuildingSelectEl.disabled = true;
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No buildings";
    residentsBuildingSelectEl.append(option);
    syncOverviewLookupBuildingOptions();
    renderResidentDirectory([]);
    return;
  }

  const validSelection =
    state.selectedResidentsBuildingId === "all" ||
    state.buildings.some((item) => item.id === state.selectedResidentsBuildingId);

  const selected = validSelection ? state.selectedResidentsBuildingId : "all";
  state.selectedResidentsBuildingId = selected;
  residentsBuildingSelectEl.disabled = false;

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All buildings";
  if (selected === "all") {
    allOption.selected = true;
  }
  residentsBuildingSelectEl.append(allOption);

  state.buildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    if (building.id === selected) {
      option.selected = true;
    }
    residentsBuildingSelectEl.append(option);
  });

  syncOverviewLookupBuildingOptions();
}

function syncOverviewLookupBuildingOptions() {
  if (!(overviewRoomBuildingSelectEl instanceof HTMLSelectElement)) {
    return;
  }

  overviewRoomBuildingSelectEl.replaceChildren();

  if (!Array.isArray(state.buildings) || state.buildings.length === 0) {
    state.selectedOverviewRoomBuildingId = "all";
    overviewRoomBuildingSelectEl.disabled = true;
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No buildings";
    overviewRoomBuildingSelectEl.append(option);
    return;
  }

  const validSelection =
    state.selectedOverviewRoomBuildingId === "all" ||
    state.buildings.some((item) => item.id === state.selectedOverviewRoomBuildingId);
  const selected = validSelection ? state.selectedOverviewRoomBuildingId : "all";
  state.selectedOverviewRoomBuildingId = selected;
  overviewRoomBuildingSelectEl.disabled = false;

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All buildings";
  if (selected === "all") {
    allOption.selected = true;
  }
  overviewRoomBuildingSelectEl.append(allOption);

  state.buildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    if (building.id === selected) {
      option.selected = true;
    }
    overviewRoomBuildingSelectEl.append(option);
  });
}

function syncCaretakerBuildingOptions() {
  if (!(caretakerBuildingSelectEl instanceof HTMLSelectElement)) {
    return;
  }

  caretakerBuildingSelectEl.replaceChildren();
  if (!Array.isArray(state.buildings) || state.buildings.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No buildings";
    caretakerBuildingSelectEl.append(option);
    caretakerBuildingSelectEl.disabled = true;
    state.selectedCaretakerBuildingId = "";
    state.caretakerRequests = [];
    renderCaretakerRequests([]);
    renderCaretakers([]);
    return;
  }

  caretakerBuildingSelectEl.disabled = false;
  const selected =
    state.selectedCaretakerBuildingId &&
    state.buildings.some((item) => item.id === state.selectedCaretakerBuildingId)
      ? state.selectedCaretakerBuildingId
      : state.selectedRegistryBuildingId || state.buildings[0].id;
  state.selectedCaretakerBuildingId = selected;

  state.buildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    if (building.id === selected) {
      option.selected = true;
    }
    caretakerBuildingSelectEl.append(option);
  });

  renderCaretakerRequests(state.caretakerRequests);
}

function setOwnerStaffData(record) {
  const payload = record && typeof record === "object" ? record : {};
  const users = Array.isArray(payload.users) ? payload.users : [];
  const limitValue = Number(payload.limit);
  const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 3;
  const remainingValue = Number(payload.remaining);

  state.ownerStaff = users;
  state.ownerStaffLimit = limit;
  state.ownerStaffRemaining = Number.isFinite(remainingValue)
    ? Math.max(0, remainingValue)
    : Math.max(0, limit - users.length);
}

function renderOwnerStaff() {
  const activeCount = Array.isArray(state.ownerStaff) ? state.ownerStaff.length : 0;
  const limit = Number(state.ownerStaffLimit || 3);
  const remaining = Math.max(0, Number(state.ownerStaffRemaining || 0));
  const caretaker = isCaretakerRole();

  if (ownerStaffSummaryEl instanceof HTMLElement) {
    const slotText = remaining === 1 ? "slot" : "slots";
    ownerStaffSummaryEl.textContent = `${activeCount} of ${limit} owner/staff accounts active. ${remaining} ${slotText} available.`;
  }

  if (ownerStaffSubmitBtnEl instanceof HTMLButtonElement) {
    ownerStaffSubmitBtnEl.disabled = caretaker || remaining <= 0;
  }

  if (!(ownerStaffBodyEl instanceof HTMLElement)) {
    return;
  }

  ownerStaffBodyEl.replaceChildren();
  if (!Array.isArray(state.ownerStaff) || state.ownerStaff.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6">No owner/staff accounts found.</td>';
    ownerStaffBodyEl.append(row);
    return;
  }

  state.ownerStaff.forEach((item) => {
    const row = document.createElement("tr");
    const passwordState = item.mustChangePassword ? "Temporary" : "Changed";
    row.innerHTML = `
      <td>${escapeHtml(item.fullName ?? "-")}</td>
      <td>${escapeHtml(item.phone ?? "-")}</td>
      <td>${escapeHtml(item.email ?? "-")}</td>
      <td>${escapeHtml(passwordState)}</td>
      <td>${formatDateTime(item.createdAt)}</td>
      <td>
        ${
          caretaker
            ? "-"
            : `<button type="button" class="btn-danger" data-action="disable-owner-staff" data-user-id="${escapeHtml(item.id)}">Disable</button>`
        }
      </td>
    `;
    ownerStaffBodyEl.append(row);
  });
}

function syncLandlordTicketBuildingOptions() {
  if (!(landlordTicketBuildingSelectEl instanceof HTMLSelectElement)) {
    return;
  }

  landlordTicketBuildingSelectEl.replaceChildren();
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All buildings";
  landlordTicketBuildingSelectEl.append(allOption);

  if (!Array.isArray(state.buildings) || state.buildings.length === 0) {
    landlordTicketBuildingSelectEl.disabled = true;
    state.selectedTicketBuildingId = "";
    renderLandlordTickets([]);
    return;
  }

  landlordTicketBuildingSelectEl.disabled = false;
  if (
    state.selectedTicketBuildingId &&
    !state.buildings.some((item) => item.id === state.selectedTicketBuildingId)
  ) {
    state.selectedTicketBuildingId = "";
  }
  state.buildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    if (building.id === state.selectedTicketBuildingId) {
      option.selected = true;
    }
    landlordTicketBuildingSelectEl.append(option);
  });
}

function renderCaretakers(rows) {
  if (!(caretakersBodyEl instanceof HTMLElement)) {
    return;
  }

  caretakersBodyEl.replaceChildren();
  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6">No house manager approved for this building.</td>';
    caretakersBodyEl.append(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    const user = item.user ?? {};
    row.innerHTML = `
      <td>${escapeHtml(user.fullName ?? "-")}</td>
      <td>${escapeHtml(user.phone ?? "-")}</td>
      <td>${escapeHtml(user.email ?? "-")}</td>
      <td>${escapeHtml(item.verificationHouseNumber ?? "-")}</td>
      <td>${formatDateTime(item.approvedAt)}</td>
      <td>
        ${
          isCaretakerRole()
            ? "-"
            : `<button type="button" class="btn-danger" data-action="revoke-caretaker" data-user-id="${escapeHtml(item.userId)}">Revoke</button>`
        }
      </td>
    `;
    caretakersBodyEl.append(row);
  });
}

function renderCaretakerRequests(rows) {
  if (!(caretakerRequestsBodyEl instanceof HTMLElement)) {
    return;
  }

  caretakerRequestsBodyEl.replaceChildren();
  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6">No pending house manager requests for this building.</td>';
    caretakerRequestsBodyEl.append(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    const user = item.user ?? {};
    row.innerHTML = `
      <td>${formatDateTime(item.requestedAt)}</td>
      <td>${escapeHtml(user.fullName ?? "-")}</td>
      <td>${escapeHtml(user.phone ?? "-")}</td>
      <td>${escapeHtml(item.houseNumber ?? "-")}</td>
      <td>${escapeHtml(item.status ?? "pending")}</td>
      <td>
        ${
          isCaretakerRole()
            ? "-"
            : `<div class="action-row">
                <button type="button" data-action="approve-caretaker-request" data-request-id="${escapeHtml(item.id)}">Approve</button>
                <button type="button" class="btn-danger" data-action="reject-caretaker-request" data-request-id="${escapeHtml(item.id)}">Reject</button>
              </div>`
        }
      </td>
    `;
    caretakerRequestsBodyEl.append(row);
  });
}

function createLandlordTicketStatusOptions(currentStatus) {
  const statuses = ["open", "triaged", "in_progress", "resolved"];
  return statuses
    .map(
      (status) =>
        `<option value="${status}" ${status === currentStatus ? "selected" : ""}>${status}</option>`
    )
    .join("");
}

function renderLandlordTickets(tickets) {
  if (!(landlordTicketsBodyEl instanceof HTMLElement)) {
    return;
  }

  landlordTicketsBodyEl.replaceChildren();
  if (!Array.isArray(tickets) || tickets.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="7">No resident issues found.</td>';
    landlordTicketsBodyEl.append(row);
    return;
  }

  tickets.forEach((ticket) => {
    const row = document.createElement("tr");
    const slaText = ticket.slaBreached
      ? `BREACHED (${ticket.slaHours}h)`
      : `${ticket.slaHours}h (${ticket.slaState})`;
    const detailsText = ticket.details
      ? `<div class="ticket-details">${escapeHtml(ticket.details)}</div>`
      : "";
    const replyText = ticket.resolutionNotes || ticket.adminNote;
    const replyLine = replyText
      ? `<div class="ticket-details muted">Last update: ${escapeHtml(replyText)}</div>`
      : "";
    row.innerHTML = `
      <td><strong>${escapeHtml(ticket.title)}</strong><br /><small>${escapeHtml(ticket.id.slice(0, 8))} • ${escapeHtml(ticket.type)}</small>${detailsText}${replyLine}</td>
      <td>${escapeHtml(ticket.houseNumber)}</td>
      <td>${escapeHtml(ticket.queue)}</td>
      <td>${escapeHtml(ticket.status)}</td>
      <td>${escapeHtml(slaText)}</td>
      <td>${formatDateTime(ticket.createdAt)}</td>
      <td>
        <div class="inline-fields compact-fields" style="grid-template-columns: 1fr 1fr;">
          <select data-action="status">${createLandlordTicketStatusOptions(ticket.status)}</select>
          <input data-action="note" type="text" maxlength="500" placeholder="Reply note (optional)" />
          <button data-action="save" type="button">Reply</button>
        </div>
      </td>
    `;

    const ticketCell = row.children[0];
    if (ticketCell instanceof HTMLTableCellElement) {
      const gallery = createUploadedImageGallery(ticket.evidenceAttachments, {
        linkLabel: "Open issue photo"
      });
      if (gallery) {
        gallery.classList.add("ticket-attachment-gallery");
        ticketCell.append(gallery);
      }
    }

    const statusSelect = row.querySelector('select[data-action="status"]');
    const noteInput = row.querySelector('input[data-action="note"]');
    const saveButton = row.querySelector('button[data-action="save"]');
    if (
      !(statusSelect instanceof HTMLSelectElement) ||
      !(noteInput instanceof HTMLInputElement) ||
      !(saveButton instanceof HTMLButtonElement)
    ) {
      landlordTicketsBodyEl.append(row);
      return;
    }

    saveButton.addEventListener("click", () => {
      const nextStatus = statusSelect.value;
      const note = noteInput.value.trim();
      saveButton.disabled = true;
      clearError();

      void (async () => {
        try {
          await requestJson(
            `/api/landlord/tickets/${encodeURIComponent(ticket.id)}/status`,
            {
              method: "PATCH",
              headers: {
                "content-type": "application/json"
              },
              body: JSON.stringify({
                status: nextStatus,
                adminNote: note || undefined,
                resolutionNotes: nextStatus === "resolved" ? note || undefined : undefined
              })
            }
          );

          setStatus(`Issue ${ticket.id.slice(0, 8)} updated to ${nextStatus}.`);
          await loadLandlordTickets();
        } catch (error) {
          handleLandlordError(error, "Failed to update resident issue status.");
        } finally {
          saveButton.disabled = false;
        }
      })();
    });

    landlordTicketsBodyEl.append(row);
  });
}

function renderExpenditures(rows) {
  if (!(expendituresBodyEl instanceof HTMLElement)) {
    return;
  }

  expendituresBodyEl.replaceChildren();
  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="10">No expenditure recorded for this building yet.</td>';
    expendituresBodyEl.append(row);
    return;
  }

  const canDelete = !isCaretakerRole();

  rows.forEach((item) => {
    const row = document.createElement("tr");
    const buildingLabel = getBuildingDisplayNameById(item.buildingId, "-");
    const actorLabel = item.createdByName
      ? `${item.createdByName} (${formatRoleLabel(item.createdByRole)})`
      : formatRoleLabel(item.createdByRole);
    row.innerHTML = `
      <td>${formatDateTime(item.createdAt)}</td>
      <td>${escapeHtml(buildingLabel)}</td>
      <td>${escapeHtml(item.houseNumber ?? "-")}</td>
      <td>${escapeHtml(formatExpenditureCategory(item.category))}</td>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(formatCurrency(item.amountKsh))}</td>
      <td>${escapeHtml(item.chargeableToResident ? "Yes" : "No")}</td>
      <td>${escapeHtml(actorLabel)}</td>
      <td>${escapeHtml(item.note ?? "-")}</td>
      <td>
        ${
          canDelete
            ? `<button type="button" class="btn-danger" data-action="delete-expenditure" data-expenditure-id="${escapeHtml(item.id)}" data-title="${escapeHtml(item.title)}">Delete</button>`
            : "-"
        }
      </td>
    `;
    expendituresBodyEl.append(row);
  });
}

function formatSettlementAction(action) {
  switch (String(action ?? "").trim()) {
    case "write_off":
      return "Written off loss";
    case "transfer_to_resident_debt":
      return "Resident debt";
    case "collect_before_move_out":
      return "Collect first";
    default:
      return String(action ?? "Recorded").replaceAll("_", " ") || "Recorded";
  }
}

function formatSettlementStatus(status) {
  switch (String(status ?? "").trim()) {
    case "written_off_loss":
      return "Loss recorded";
    case "resident_debt_open":
      return "Open debt";
    case "resident_debt_closed":
      return "Debt closed";
    default:
      return String(status ?? "recorded").replaceAll("_", " ") || "Recorded";
  }
}

function getSettlementOutcomeClass(action) {
  if (action === "write_off") {
    return "is-loss";
  }
  if (action === "transfer_to_resident_debt") {
    return "is-debt";
  }
  return "is-recorded";
}

function renderMoveOutSettlementReport(rows) {
  const reportRows = Array.isArray(rows) ? rows : [];
  const lossRows = reportRows.filter((item) => item?.action === "write_off");
  const debtRows = reportRows.filter(
    (item) => item?.action === "transfer_to_resident_debt"
  );
  const openDebtRows = debtRows.filter((item) => item?.status !== "resident_debt_closed");
  const closedDebtRows = debtRows.filter((item) => item?.status === "resident_debt_closed");
  const sumBy = (items, field) =>
    items.reduce((sum, item) => sum + Math.max(0, Number(item?.[field] ?? 0)), 0);
  const totalLossKsh = sumBy(lossRows, "amountKsh");
  const totalOpenDebtKsh = sumBy(openDebtRows, "amountKsh");
  const totalClosedDebtKsh = sumBy(closedDebtRows, "amountKsh");
  const totalRentKsh = sumBy(reportRows, "rentKsh");
  const totalUtilityKsh = sumBy(reportRows, "utilityKsh");
  const totalRoomChargeKsh = sumBy(reportRows, "roomChargesKsh");

  if (moveOutSettlementReportSummaryEl instanceof HTMLElement) {
    const cards = [
      {
        label: "Written Off Loss",
        value: formatCurrency(totalLossKsh),
        detail: `${lossRows.length} settlement${lossRows.length === 1 ? "" : "s"}`
      },
      {
        label: "Open Resident Debt",
        value: formatCurrency(totalOpenDebtKsh),
        detail: `${openDebtRows.length} account${openDebtRows.length === 1 ? "" : "s"}`
      },
      {
        label: "Collected Debt",
        value: formatCurrency(totalClosedDebtKsh),
        detail: `${closedDebtRows.length} account${closedDebtRows.length === 1 ? "" : "s"}`
      },
      {
        label: "Settled Accounts",
        value: String(reportRows.length),
        detail: `Rent ${formatCurrency(totalRentKsh)}`
      },
      {
        label: "Utilities + Charges",
        value: formatCurrency(totalUtilityKsh + totalRoomChargeKsh),
        detail: `Utilities ${formatCurrency(totalUtilityKsh)} | Charges ${formatCurrency(totalRoomChargeKsh)}`
      }
    ];

    moveOutSettlementReportSummaryEl.innerHTML = cards
      .map(
        (card) => `
          <div>
            <span>${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(card.value)}</strong>
            <small>${escapeHtml(card.detail)}</small>
          </div>
        `
      )
      .join("");
  }

  if (!(moveOutSettlementsBodyEl instanceof HTMLElement)) {
    return;
  }

  moveOutSettlementsBodyEl.replaceChildren();
  if (reportRows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="12">No move-out loss or resident debt has been recorded for this building.</td>';
    moveOutSettlementsBodyEl.append(row);
    return;
  }

  [...reportRows]
    .sort(
      (a, b) =>
        new Date(b?.createdAt ?? 0).getTime() -
        new Date(a?.createdAt ?? 0).getTime()
    )
    .forEach((item) => {
      const row = document.createElement("tr");
      const buildingLabel =
        item.buildingName || getBuildingDisplayNameById(item.buildingId, "-");
      const isEmptyRoomLoss = !item.residentUserId && item.action === "write_off";
      const residentName =
        item.residentName ||
        item.metadata?.resident?.fullName ||
        item.residentUserId ||
        (isEmptyRoomLoss ? "Empty room" : "-");
      const residentPhone = item.residentPhone || item.metadata?.resident?.phone || "";
      const actorLabel = item.createdBy?.name
        ? `${item.createdBy.name} (${formatRoleLabel(item.createdBy.role || "-")})`
        : formatRoleLabel(item.createdBy?.role || "-");
      const outcomeClass = getSettlementOutcomeClass(item.action);
      const canCollectDebt =
        !isCaretakerRole() &&
        item.action === "transfer_to_resident_debt" &&
        item.status === "resident_debt_open";
      const actionCell = canCollectDebt
        ? `<button type="button" class="ghost-btn" data-action="collect-resident-debt" data-settlement-id="${escapeHtml(
            item.id
          )}" data-resident-name="${escapeHtml(residentName)}" data-amount-ksh="${escapeHtml(
            String(Math.max(0, Number(item.amountKsh ?? 0)))
          )}">Record Collection</button>`
        : "-";

      row.innerHTML = `
        <td>${formatDateTime(item.createdAt)}</td>
        <td>${escapeHtml(buildingLabel)}</td>
        <td>${escapeHtml(item.houseNumber ?? "-")}</td>
        <td>
          <strong>${escapeHtml(residentName)}</strong>
          ${residentPhone ? `<br /><small>${escapeHtml(residentPhone)}</small>` : ""}
        </td>
        <td>
          <span class="settlement-outcome-pill ${escapeHtml(outcomeClass)}">${escapeHtml(
            formatSettlementAction(item.action)
          )}</span>
          <small class="settlement-status-text">${escapeHtml(
            formatSettlementStatus(item.status)
          )}</small>
        </td>
        <td>${escapeHtml(formatCurrency(item.amountKsh))}</td>
        <td>${escapeHtml(formatCurrency(item.rentKsh))}</td>
        <td>${escapeHtml(formatCurrency(item.utilityKsh))}</td>
        <td>${escapeHtml(formatCurrency(item.roomChargesKsh))}</td>
        <td>${escapeHtml(actorLabel || "-")}</td>
        <td>${escapeHtml(item.reason || "-")}</td>
        <td>${actionCell}</td>
      `;
      moveOutSettlementsBodyEl.append(row);
    });
}

function handleCollectResidentDebtClick(target, settlementId, residentName, amountKsh) {
  if (isCaretakerRole()) {
    showError("House manager accounts cannot close resident debt.");
    return;
  }

  if (!settlementId) {
    showError("Settlement details are missing. Refresh and try again.");
    return;
  }

  const amount = Math.max(0, Number(amountKsh ?? 0));
  const shouldProceed = window.confirm(
    `Record ${formatCurrency(amount)} collected from ${residentName || "this resident"}?`
  );
  if (!shouldProceed) {
    return;
  }

  target.disabled = true;
  clearError();

  void (async () => {
    try {
      const response = await requestJson(
        `/api/landlord/move-out-settlements/${encodeURIComponent(settlementId)}/collect`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            amountKsh: Math.round(amount)
          })
        }
      );

      const collected = Number(response?.data?.amountKsh ?? amount);
      setStatus(
        `${formatCurrency(collected)} resident debt marked as collected for ${
          response?.data?.residentName || residentName || "resident"
        }.`
      );
      await loadMoveOutSettlements();
    } catch (error) {
      handleLandlordError(error, "Failed to record resident debt collection.");
    } finally {
      target.disabled = false;
    }
  })();
}

function handleDeleteExpenditureClick(target, expenditureId, title) {
  if (isCaretakerRole()) {
    showError("House manager accounts cannot delete expenditure entries.");
    return;
  }

  if (!expenditureId) {
    showError("Expenditure details are missing. Refresh and try again.");
    return;
  }

  const shouldProceed = window.confirm(
    `Delete expenditure "${title || "Untitled expenditure"}"?`
  );
  if (!shouldProceed) {
    return;
  }

  target.disabled = true;
  clearError();

  void (async () => {
    try {
      await requestJson(
        `/api/landlord/expenditures/${encodeURIComponent(expenditureId)}`,
        {
          method: "DELETE"
        }
      );

      setStatus(`Deleted expenditure "${title || expenditureId}".`);
      await loadExpenditures();
    } catch (error) {
      handleLandlordError(error, "Failed to delete expenditure.");
    } finally {
      target.disabled = false;
    }
  })();
}

function getMoveOutSettlementAction() {
  const selected = moveOutSettlementFormEl?.querySelector(
    'input[name="moveOutSettlementAction"]:checked'
  );
  return selected instanceof HTMLInputElement
    ? selected.value
    : "write_off";
}

function setMoveOutSettlementLoading(loading) {
  const total = Number(state.moveOutSettlement?.summary?.totalOutstandingKsh ?? 0);
  [moveOutSettlementSubmitBtnEl, moveOutSettlementNoteEl].forEach((element) => {
    if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
      element.disabled = loading;
    }
  });

  document.querySelectorAll('input[name="moveOutSettlementAction"]').forEach((element) => {
    if (!(element instanceof HTMLInputElement)) {
      return;
    }

    element.disabled =
      loading ||
      (isCaretakerRole() && element.value === "write_off") ||
      (total <= 0 &&
        (element.value === "write_off" ||
          element.value === "transfer_to_resident_debt"));
  });
}

function updateMoveOutSettlementHelp() {
  const summary = state.moveOutSettlement?.summary;
  const total = Number(summary?.totalOutstandingKsh ?? 0);
  const action = getMoveOutSettlementAction();
  if (moveOutSettlementHelpEl instanceof HTMLElement) {
    if (action === "collect_before_move_out" && total > 0) {
      moveOutSettlementHelpEl.textContent =
        "Resident access will stay active so the landlord can collect first.";
    } else if (action === "transfer_to_resident_debt") {
      moveOutSettlementHelpEl.textContent =
        "The room will clear, and the balance will be kept against this resident.";
    } else if (action === "write_off") {
      moveOutSettlementHelpEl.textContent =
        "The room will clear, and the unpaid amount will be recorded as a landlord loss.";
    } else {
      moveOutSettlementHelpEl.textContent =
        "No balance is pending, so the resident can be cleared now.";
    }
  }

  if (moveOutSettlementSubmitBtnEl instanceof HTMLButtonElement) {
    moveOutSettlementSubmitBtnEl.textContent =
      action === "collect_before_move_out" && total > 0
        ? "Keep Active Until Paid"
        : "Confirm Settlement";
  }
}

function renderMoveOutSettlement(summary, context) {
  const total = Number(summary?.totalOutstandingKsh ?? 0);
  state.moveOutSettlement = {
    ...context,
    summary
  };

  if (moveOutSettlementFormEl instanceof HTMLFormElement) {
    moveOutSettlementFormEl.dataset.buildingId = context.buildingId;
    moveOutSettlementFormEl.dataset.userId = context.userId;
    moveOutSettlementFormEl.dataset.houseNumber = summary?.houseNumber || context.houseNumber;
    moveOutSettlementFormEl.dataset.residentName =
      summary?.resident?.fullName || context.residentName;
  }

  if (moveOutSettlementSummaryEl instanceof HTMLElement) {
    moveOutSettlementSummaryEl.textContent = `${summary?.resident?.fullName || context.residentName} • ${
      summary?.building?.name || getBuildingDisplayNameById(context.buildingId)
    } • House ${summary?.houseNumber || context.houseNumber}`;
  }

  if (moveOutSettlementTotalsEl instanceof HTMLElement) {
    const totals = [
      ["Rent", summary?.rentOutstandingKsh ?? 0],
      ["Utilities", summary?.utilityOutstandingKsh ?? 0],
      ["Room Charges", summary?.roomChargesOutstandingKsh ?? 0],
      ["Total Pending", total]
    ];
    moveOutSettlementTotalsEl.innerHTML = totals
      .map(
        ([label, amount]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(formatCurrency(amount))}</strong>
          </div>
        `
      )
      .join("");
  }

  const collectInput = moveOutSettlementFormEl?.querySelector(
    'input[name="moveOutSettlementAction"][value="collect_before_move_out"]'
  );
  const writeOffInput = moveOutSettlementFormEl?.querySelector(
    'input[name="moveOutSettlementAction"][value="write_off"]'
  );
  const transferInput = moveOutSettlementFormEl?.querySelector(
    'input[name="moveOutSettlementAction"][value="transfer_to_resident_debt"]'
  );

  if (collectInput instanceof HTMLInputElement) {
    collectInput.checked = total <= 0;
  }
  if (writeOffInput instanceof HTMLInputElement) {
    writeOffInput.checked = total > 0 && !isCaretakerRole();
    writeOffInput.disabled = total <= 0 || isCaretakerRole();
  }
  if (transferInput instanceof HTMLInputElement) {
    transferInput.checked = total > 0 && isCaretakerRole();
    transferInput.disabled = total <= 0;
  }

  updateMoveOutSettlementHelp();
}

async function openMoveOutSettlement(target, context) {
  clearError();
  state.moveOutSettlement = {
    ...context,
    summary: null
  };

  if (moveOutSettlementSummaryEl instanceof HTMLElement) {
    moveOutSettlementSummaryEl.textContent = "Loading settlement...";
  }
  if (moveOutSettlementTotalsEl instanceof HTMLElement) {
    moveOutSettlementTotalsEl.innerHTML = "";
  }
  if (moveOutSettlementNoteEl instanceof HTMLInputElement) {
    moveOutSettlementNoteEl.value = "";
  }

  showMoveOutSettlementModal();
  setMoveOutSettlementLoading(true);
  if (target instanceof HTMLButtonElement) {
    target.disabled = true;
  }

  try {
    const response = await requestJson(
      `/api/landlord/buildings/${encodeURIComponent(context.buildingId)}/users/${encodeURIComponent(
        context.userId
      )}/move-out-settlement`
    );
    renderMoveOutSettlement(response?.data ?? {}, context);
  } catch (error) {
    closeMoveOutSettlementModal();
    handleLandlordError(error, "Unable to load move-out settlement.");
  } finally {
    setMoveOutSettlementLoading(false);
    if (target instanceof HTMLButtonElement) {
      target.disabled = false;
    }
  }
}

function renderRegistryRows(rows) {
  registryBodyEl.replaceChildren();
  renderRegistryChargeSummary(rows);

  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="13">No houses found for this building.</td>';
    registryBodyEl.append(row);
    return;
  }

  syncRegistryReadingMonthInput();
  const buildingId = getSelectedUtilityBuildingId();
  const billingMonth = getSelectedRegistryReadingMonth();
  rows.forEach((item) => {
    const houseNumber = normalizeHouse(item.houseNumber);
    const waterReadingBill = getUtilityBillForMonth(
      "water",
      buildingId,
      houseNumber,
      billingMonth
    );
    const electricityReadingBill = getUtilityBillForMonth(
      "electricity",
      buildingId,
      houseNumber,
      billingMonth
    );
    const hasBothMeters =
      hasUsableMeterNumber(item.waterMeterNumber) &&
      hasUsableMeterNumber(item.electricityMeterNumber);
    const waterMeterNumber = normalizeUtilityMeterNumber(item.waterMeterNumber);
    const electricityMeterNumber = normalizeUtilityMeterNumber(
      item.electricityMeterNumber
    );
    const row = document.createElement("tr");
    row.dataset.houseNumber = houseNumber;
    row.dataset.hasBothMeters = hasBothMeters ? "true" : "false";
    row.innerHTML = `
      <td><strong>${escapeHtml(houseNumber)}</strong></td>
      <td>${escapeHtml(item.residentName ?? "-")}</td>
      <td>${escapeHtml(item.residentPhone ?? "-")}</td>
      <td>
        <input
          type="number"
          class="registry-table-input registry-members-input"
          data-field="householdMembers"
          min="0"
          max="20"
          step="1"
          value="${Number(item.householdMembers ?? 0)}"
        />
      </td>
      <td>
        <input
          type="text"
          class="registry-table-input"
          data-field="waterMeterNumber"
          maxlength="80"
          placeholder="WTR-0001"
          value="${escapeHtml(waterMeterNumber)}"
        />
      </td>
      <td>
        <input
          type="text"
          class="registry-table-input"
          data-field="electricityMeterNumber"
          maxlength="80"
          placeholder="ELEC-0001"
          value="${escapeHtml(electricityMeterNumber)}"
        />
      </td>
      <td>${formatRegistryReadingMarkup(waterReadingBill, billingMonth)}</td>
      <td>${formatRegistryReadingMarkup(electricityReadingBill, billingMonth)}</td>
      <td>
        <input
          type="number"
          class="registry-table-input"
          data-field="waterFixedChargeKsh"
          min="0"
          step="0.01"
          value="${escapeHtml(numberToInputString(item.waterFixedChargeKsh ?? 0))}"
        />
      </td>
      <td>
        <input
          type="number"
          class="registry-table-input"
          data-field="electricityFixedChargeKsh"
          min="0"
          step="0.01"
          value="${escapeHtml(numberToInputString(item.electricityFixedChargeKsh ?? 0))}"
        />
      </td>
      <td>
        <input
          type="number"
          class="registry-table-input"
          data-field="combinedUtilityChargeKsh"
          min="0"
          step="0.01"
          title="Ignored for rooms that have both water and electricity meters."
          value="${escapeHtml(numberToInputString(item.combinedUtilityChargeKsh ?? 0))}"
        />
      </td>
      <td>${formatRegistryChargeSetupMarkup(item, buildingId, billingMonth)}</td>
      <td>
        <div class="resident-row-actions">
          ${
            item.residentUserId
              ? `<button
                  type="button"
                  class="btn-danger"
                  data-action="remove-resident"
                  data-building-id="${escapeHtml(state.selectedRegistryBuildingId)}"
                  data-house-number="${escapeHtml(houseNumber)}"
                  data-user-id="${escapeHtml(item.residentUserId)}"
                  data-resident-name="${escapeHtml(item.residentName ?? "Resident")}"
                >
                  Clear Resident
                </button>`
              : ""
          }
          ${
            !isCaretakerRole() && !item.residentUserId
              ? `<button
                  type="button"
                  class="btn-danger"
                  data-action="remove-room"
                  data-building-id="${escapeHtml(state.selectedRegistryBuildingId)}"
                  data-house-number="${escapeHtml(houseNumber)}"
                >
                  Remove Room
                </button>`
              : ""
          }
        </div>
      </td>
    `;

    registryBodyEl.append(row);
  });
}

function buildRegistrySavePayload() {
  const rows = [];
  const trList = registryBodyEl.querySelectorAll("tr[data-house-number]");

  trList.forEach((tr) => {
    const houseNumber = normalizeHouse(tr.dataset.houseNumber);
    const membersInput = tr.querySelector('input[data-field="householdMembers"]');
    const waterInput = tr.querySelector('input[data-field="waterMeterNumber"]');
    const electricityInput = tr.querySelector(
      'input[data-field="electricityMeterNumber"]'
    );
    const waterFixedInput = tr.querySelector(
      'input[data-field="waterFixedChargeKsh"]'
    );
    const electricityFixedInput = tr.querySelector(
      'input[data-field="electricityFixedChargeKsh"]'
    );
    const combinedUtilityInput = tr.querySelector(
      'input[data-field="combinedUtilityChargeKsh"]'
    );

    if (
      !(membersInput instanceof HTMLInputElement) ||
      !(waterInput instanceof HTMLInputElement) ||
      !(electricityInput instanceof HTMLInputElement) ||
      !(waterFixedInput instanceof HTMLInputElement) ||
      !(electricityFixedInput instanceof HTMLInputElement) ||
      !(combinedUtilityInput instanceof HTMLInputElement)
    ) {
      return;
    }

    const members = Number(membersInput.value);
    if (!Number.isInteger(members) || members < 0 || members > 20) {
      throw new Error(
        `Members for ${houseNumber} must be a whole number between 0 and 20.`
      );
    }

    const waterMeterNumber = waterInput.value.trim();
    const electricityMeterNumber = electricityInput.value.trim();
    const waterFixedChargeKsh = toOptionalNumber(waterFixedInput.value) ?? 0;
    const electricityFixedChargeKsh =
      toOptionalNumber(electricityFixedInput.value) ?? 0;
    const combinedUtilityChargeKsh =
      toOptionalNumber(combinedUtilityInput.value) ?? 0;
    if (waterFixedChargeKsh < 0 || waterFixedChargeKsh > 200000) {
      throw new Error(
        `Water fixed charge for ${houseNumber} must be between 0 and 200,000.`
      );
    }
    if (electricityFixedChargeKsh < 0 || electricityFixedChargeKsh > 200000) {
      throw new Error(
        `Electric fixed charge for ${houseNumber} must be between 0 and 200,000.`
      );
    }
    if (combinedUtilityChargeKsh < 0 || combinedUtilityChargeKsh > 200000) {
      throw new Error(
        `Room utility amount for ${houseNumber} must be between 0 and 200,000.`
      );
    }

    rows.push({
      houseNumber,
      householdMembers: members,
      waterMeterNumber: normalizeUtilityMeterNumber(waterMeterNumber) || undefined,
      electricityMeterNumber:
        normalizeUtilityMeterNumber(electricityMeterNumber) || undefined,
      waterFixedChargeKsh,
      electricityFixedChargeKsh,
      combinedUtilityChargeKsh
    });
  });

  return rows;
}

function renderApplications(rows) {
  applicationsBodyEl.replaceChildren();

  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="10">No tenant applications found.</td>';
    applicationsBodyEl.append(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    const canReview = item.status === "pending";
    const identitySummary = summarizeResidentIdentity(item);
    const occupationSummary = summarizeResidentOccupation(item);
    row.innerHTML = `
      <td>${formatDateTime(item.createdAt)}</td>
      <td>${item.building?.name ?? item.building?.id ?? "-"}</td>
      <td>${item.houseNumber}</td>
      <td>${item.tenant?.fullName ?? "-"}</td>
      <td>${item.tenant?.email ?? "-"}<br />${item.tenant?.phone ?? "-"}</td>
      <td>${escapeHtml(identitySummary)}</td>
      <td>${escapeHtml(occupationSummary.title)}${
        occupationSummary.details
          ? `<br /><small>${escapeHtml(occupationSummary.details)}</small>`
          : ""
      }</td>
      <td>${item.status}</td>
      <td>${item.note ?? "-"}</td>
      <td>
        ${
          canReview
            ? `<div class="decision-actions">
                <button type="button" data-action="approve" data-id="${item.id}">Approve</button>
                <button type="button" data-action="reject" data-id="${item.id}" class="btn-danger">Reject</button>
              </div>`
            : "-"
        }
      </td>
    `;
    applicationsBodyEl.append(row);
  });
}

function renderRentStatus(rows) {
  rentStatusBodyEl.replaceChildren();

  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="10">No rent status data available.</td>';
    rentStatusBodyEl.append(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    const buildingLabel = getBuildingDisplayNameById(item.buildingId, "-");
    const currentDueKsh = Number(item.currentMonthOutstandingKsh ?? item.balanceKsh ?? 0);
    const totalOutstandingKsh = Number(item.balanceKsh ?? currentDueKsh ?? 0);
    const quickPaymentAmountKsh = Math.max(0, totalOutstandingKsh || currentDueKsh);
    const billingMonth = monthKeyFromValue(item.dueDate) || currentBillingMonth();
    const canRecordPayment = quickPaymentAmountKsh > 0;
    row.innerHTML = `
      <td>${escapeHtml(buildingLabel)}</td>
      <td>${item.houseNumber}</td>
      <td>${item.paymentStatus}</td>
      <td>${formatCurrency(item.monthlyRentKsh)}</td>
      <td>${formatCurrency(item.currentMonthPaidKsh ?? item.paidAmountKsh ?? 0)}</td>
      <td>${formatCurrency(currentDueKsh)}</td>
      <td>${formatCurrency(item.arrearsKsh ?? 0)}</td>
      <td>${formatDateTime(item.dueDate)}</td>
      <td>${item.latestPaymentReference ?? "-"}</td>
      <td>
        ${
          canRecordPayment
            ? `<button
                type="button"
                data-action="prefill-rent-payment"
                data-building-id="${escapeHtml(item.buildingId)}"
                data-house-number="${escapeHtml(item.houseNumber)}"
                data-billing-month="${escapeHtml(billingMonth)}"
                data-amount-ksh="${escapeHtml(quickPaymentAmountKsh)}"
              >
                Record Payment
              </button>`
            : "-"
        }
      </td>
    `;
    rentStatusBodyEl.append(row);
  });
}

function renderOverviewCollections(rows) {
  if (!(overviewCollectionsBodyEl instanceof HTMLElement)) {
    return;
  }

  overviewCollectionsBodyEl.replaceChildren();

  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="9">No rent collection records found yet.</td>';
    overviewCollectionsBodyEl.append(row);
    return;
  }

  const rankedRows = [...rows].sort((a, b) => {
    const balanceDelta = Number(b.balanceKsh ?? 0) - Number(a.balanceKsh ?? 0);
    if (balanceDelta !== 0) {
      return balanceDelta;
    }

    return String(a.houseNumber ?? "").localeCompare(String(b.houseNumber ?? ""));
  });

  rankedRows.forEach((item) => {
    const row = document.createElement("tr");
    const buildingLabel = getBuildingDisplayNameById(item.buildingId, "-");
    const latestPayment = Number(item.latestPaymentAmountKsh ?? 0) > 0
      ? `${formatCurrency(item.latestPaymentAmountKsh)} • ${formatDateTime(item.latestPaymentAt)}`
      : "-";
    row.innerHTML = `
      <td>${escapeHtml(buildingLabel)}</td>
      <td>${escapeHtml(item.houseNumber)}</td>
      <td>${escapeHtml(item.paymentStatus ?? "-")}</td>
      <td>${escapeHtml(formatCurrency(item.monthlyRentKsh))}</td>
      <td>${escapeHtml(formatCurrency(item.currentMonthPaidKsh ?? item.paidAmountKsh ?? 0))}</td>
      <td>${escapeHtml(formatCurrency(item.currentMonthOutstandingKsh ?? item.balanceKsh))}</td>
      <td>${escapeHtml(formatCurrency(item.balanceKsh))}</td>
      <td>${escapeHtml(latestPayment)}</td>
      <td>${escapeHtml(item.latestPaymentReference ?? "-")}</td>
    `;
    overviewCollectionsBodyEl.append(row);
  });
}

function renderResidentDirectory(rows) {
  const allRows = Array.isArray(rows) ? rows : [];
  renderResidentsOverview(allRows);
  const filteredRows = getVisibleResidentDirectoryRows(allRows);
  updateResidentsSearchSummary(allRows.length, filteredRows.length);
  renderUtilityRoomSummary(state.bills);

  if (!(residentsBodyEl instanceof HTMLElement)) {
    return;
  }

  residentsBodyEl.replaceChildren();

  if (allRows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="12">No rooms found for this selection.</td>';
    residentsBodyEl.append(row);
    return;
  }

  if (filteredRows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="12">No rooms matched "${escapeHtml(
      state.residentSearchQuery
    )}".</td>`;
    residentsBodyEl.append(row);
    return;
  }

  filteredRows.forEach((resident) => {
    const row = document.createElement("tr");
    const hasResident =
      resident.hasActiveResident || resident.residentUserId || resident.residentName;
    const utilitySummary = getResidentUtilityRoomSummary(resident);
    const billingStatus = hasResident ? getResidentBillingStatusLabel(resident) : "-";
    const outstandingBalanceKsh = getResidentOperationalOutstandingKsh(
      resident,
      utilitySummary
    );
    const outstandingBalance = hasResident ? formatCurrency(outstandingBalanceKsh) : "-";
    const nextDueDate = getResidentNextDueDate(resident);
    const dueDate = hasResident && nextDueDate ? formatDateTime(nextDueDate) : "-";
    const buildingLabel = resident.buildingName ?? resident.buildingId ?? "-";
    const occupancy = hasResident
      ? isResidentPendingVerification(resident)
        ? "Pending review"
        : "Active"
      : "Vacant";
    const residentName = hasResident
      ? `${resident.residentName ?? "Resident"}${
          isResidentPendingVerification(resident) ? " (Unverified)" : ""
        }`
      : "Vacant";
    const residentPhone = hasResident ? resident.residentPhone ?? "-" : "-";
    const identitySummary = hasResident ? summarizeResidentIdentity(resident) : "-";
    const occupationSummary = hasResident
      ? summarizeResidentOccupation(resident)
      : { title: "-", details: "" };
    const emergencySummary = hasResident ? summarizeEmergencyContact(resident) : "-";
    row.innerHTML = `
      <td>${escapeHtml(buildingLabel)}</td>
      <td>${escapeHtml(resident.houseNumber)}</td>
      <td>${escapeHtml(occupancy)}</td>
      <td>${escapeHtml(residentName)}</td>
      <td>${escapeHtml(residentPhone)}</td>
      <td>${escapeHtml(identitySummary)}</td>
      <td>${escapeHtml(occupationSummary.title)}${
        occupationSummary.details
          ? `<br /><small>${escapeHtml(occupationSummary.details)}</small>`
          : ""
      }</td>
      <td>${escapeHtml(emergencySummary)}</td>
      <td>${escapeHtml(billingStatus)}</td>
      <td>${escapeHtml(outstandingBalance)}</td>
      <td>${escapeHtml(dueDate)}</td>
      <td>
        <div class="resident-row-actions">
          <button
            type="button"
            data-action="open-resident-drawer"
            data-building-id="${escapeHtml(resident.buildingId)}"
            data-house-number="${escapeHtml(resident.houseNumber)}"
          >
            View
          </button>
          <button
            type="button"
            data-action="open-room-account"
            data-building-id="${escapeHtml(resident.buildingId)}"
            data-house-number="${escapeHtml(resident.houseNumber)}"
          >
            Account
          </button>
        </div>
      </td>
    `;

    residentsBodyEl.append(row);
  });
}

function renderResidentDrawer(resident) {
  if (!(residentDrawerBodyEl instanceof HTMLElement)) {
    return;
  }

  if (!resident) {
    residentDrawerBodyEl.textContent = "Resident not found.";
    return;
  }

  const hasResident =
    resident.hasActiveResident || resident.residentUserId || resident.residentName;
  const rentEnabled = isResidentRentEnabled(resident);
  const billingStatus = hasResident ? getResidentBillingStatusLabel(resident) : "-";
  const outstandingBalanceKsh = getResidentOutstandingBalanceKsh(resident);
  const totalOutstanding =
    hasResident ? formatCurrency(outstandingBalanceKsh) : "-";
  const nextDueDate = getResidentNextDueDate(resident);
  const nextDue =
    hasResident && nextDueDate ? formatDateTime(nextDueDate) : "-";
  const latestReceipt = hasResident ? resident.latestRentPaymentReference ?? "-" : "-";
  const latestPaidAt =
    hasResident && resident.latestRentPaymentAt
      ? formatDateTime(resident.latestRentPaymentAt)
      : "-";
  const waterMeter = normalizeUtilityMeterNumber(resident.waterMeterNumber) || "Missing";
  const electricityMeter =
    normalizeUtilityMeterNumber(resident.electricityMeterNumber) || "Missing";
  const members = Number(resident.householdMembers ?? 0);
  const buildingLabel = resident.buildingName ?? resident.buildingId ?? "-";
  const residentName = hasResident ? resident.residentName ?? "Resident" : "Vacant";
  const residentPhone = hasResident ? resident.residentPhone ?? "-" : "-";
  const occupancyLabel = hasResident
    ? isResidentPendingVerification(resident)
      ? "Pending review"
      : "Active"
    : "Vacant";
  const roomIssues = Array.isArray(state.tickets)
    ? state.tickets.filter(
        (ticket) =>
          ticket.buildingId === resident.buildingId &&
          normalizeHouse(ticket.houseNumber) === normalizeHouse(resident.houseNumber)
      )
    : [];
  const roomIssuesSummary =
    roomIssues.length === 0
      ? '<p class="status-text">No room issues recorded for this room.</p>'
      : `<div class="stack-list">${roomIssues
          .slice(0, 4)
          .map(
            (ticket) => `
              <article class="package-card">
                <p class="status-text">${escapeHtml(ticket.queue)} • ${escapeHtml(
                  ticket.status
                )} • ${formatDateTime(ticket.createdAt)}</p>
                <h4>${escapeHtml(ticket.title)}</h4>
                <p class="status-text">${escapeHtml(ticket.details || "No extra details recorded.")}</p>
              </article>
            `
          )
          .join("")}</div>`
          + (roomIssues.length > 4
            ? `<p class="status-text">Showing 4 of ${roomIssues.length} issue(s) for this room.</p>`
            : "");
  const roomUtilityBills = getResidentUtilityBills(resident);
  const roomUtilityPayments = getResidentUtilityPayments(resident);
  const roomExpenditures = getResidentRoomExpenditures(resident);
  const overappliedUtilityBills = getResidentOverappliedUtilityBills(roomUtilityBills);
  const roomUtilityPaidKsh = roomUtilityPayments.reduce(
    (sum, item) => sum + Number(item?.amountKsh ?? 0),
    0
  );
  const roomExpenditureTotalKsh = roomExpenditures.reduce(
    (sum, item) => sum + Number(item?.amountKsh ?? 0),
    0
  );
  const latestLedgerBillingMonth = roomUtilityBills
    .map((item) => toBillingMonth(item?.billingMonth))
    .filter(Boolean)
    .sort()
    .at(-1);
  const latestLedgerBillingLabel = latestLedgerBillingMonth
    ? formatBillingMonth(latestLedgerBillingMonth)
    : "No posted utility bills";
  const roomLedgerSummary = [
    `${roomUtilityBills.length} bill${roomUtilityBills.length === 1 ? "" : "s"}`,
    `${roomUtilityPayments.length} payment${roomUtilityPayments.length === 1 ? "" : "s"}`,
    `${roomExpenditures.length} charge${roomExpenditures.length === 1 ? "" : "s"}`
  ].join(" • ");
  const roomLedgerFlags = [];
  if (overappliedUtilityBills.length > 0) {
    roomLedgerFlags.push(
      `${overappliedUtilityBills.length} utility bill${
        overappliedUtilityBills.length === 1 ? "" : "s"
      } ${overappliedUtilityBills.length === 1 ? "has" : "have"} payments above the posted charge. Review allocation history.`
    );
  }
  if (roomExpenditureTotalKsh > 0) {
    roomLedgerFlags.push(
      `Room-specific charges total ${formatCurrency(
        roomExpenditureTotalKsh
      )} and should count toward the resident outstanding balance.`
    );
  }
  const agreementPayload =
    sameResidentKey(state.selectedResident, resident) && state.selectedResidentAgreement
      ? state.selectedResidentAgreement
      : null;
  const agreement =
    agreementPayload?.agreement ??
    (resident.identityNumber ||
    resident.occupationStatus ||
    resident.occupationLabel ||
    resident.organizationName ||
    resident.emergencyContactName
      ? {
          identityType: resident.identityType,
          identityNumber: resident.identityNumber,
          occupationStatus: resident.occupationStatus,
          occupationLabel: resident.occupationLabel,
          organizationName: resident.organizationName,
          organizationLocation: resident.organizationLocation,
          emergencyContactName: resident.emergencyContactName,
          emergencyContactPhone: resident.emergencyContactPhone,
          updatedAt: resident.agreementUpdatedAt
        }
      : null);
  const agreementResident = agreementPayload?.resident ?? null;
  const agreementError =
    sameResidentKey(state.selectedResident, resident) && state.selectedResidentAgreementError
      ? state.selectedResidentAgreementError
      : "";
  const agreementStatusText = state.residentAgreementLoading
    ? "Loading tenant agreement..."
    : agreement?.updatedAt
      ? `Agreement last updated ${formatDateTime(agreement.updatedAt)}.`
      : hasResident
        ? "No tenant agreement saved yet for this active resident."
        : "Assign an active resident before capturing agreement details.";
  const canEditAgreement = hasResident && !isCaretakerRole();
  const disabledAttr = canEditAgreement ? "" : "disabled";
  const identitySummary = agreement?.identityNumber
    ? `${formatAgreementIdentityType(agreement.identityType)} • ${agreement.identityNumber}`
    : "Not recorded";
  const workSchoolSummary = agreement?.organizationName
    ? `${agreement.organizationName}${
        agreement.organizationLocation ? ` • ${agreement.organizationLocation}` : ""
      }`
    : "Not recorded";
  const leaseSummary =
    agreement?.leaseStartDate || agreement?.leaseEndDate
      ? `${agreement?.leaseStartDate ? formatDateOnly(agreement.leaseStartDate) : "open"} -> ${
          agreement?.leaseEndDate ? formatDateOnly(agreement.leaseEndDate) : "ongoing"
        }`
      : "Not recorded";
  const monthlyRentKsh = getResidentMonthlyRentKsh(resident, agreement);
  const currentRentDueKsh = getResidentCurrentRentDueKsh(resident, agreement);
  const rentArrearsKsh = getResidentRentArrearsKsh(resident, agreement);
  const utilityBalanceKsh = getResidentUtilityBalanceKsh(resident);
  const currentUtilityDueKsh = getResidentCurrentUtilityDueKsh(resident);
  const utilityArrearsKsh = getResidentUtilityArrearsKsh(resident);
  const expenseBalanceKsh = getResidentExpenseBalanceKsh(resident);
  const currentMonthRentPaidKsh = getResidentCurrentMonthRentPaidKsh(resident, agreement);
  const monthlyRent =
    hasResident && monthlyRentKsh > 0 ? formatCurrency(monthlyRentKsh) : "-";
  const currentRentDue =
    hasResident && (rentEnabled || currentRentDueKsh > 0)
      ? formatCurrency(currentRentDueKsh)
      : "-";
  const rentArrears =
    hasResident && (rentEnabled || rentArrearsKsh > 0)
      ? formatCurrency(rentArrearsKsh)
      : "-";
  const currentUtilityDue = hasResident ? formatCurrency(currentUtilityDueKsh) : "-";
  const utilityArrears = hasResident ? formatCurrency(utilityArrearsKsh) : "-";
  const utilityBalance = hasResident ? formatCurrency(utilityBalanceKsh) : "-";
  const expenseBalance = hasResident ? formatCurrency(expenseBalanceKsh) : "-";
  const totalRentPaidKsh = getResidentTotalRentPaidKsh(resident);
  const currentMonthRentPaid = hasResident && rentEnabled
    ? formatCurrency(currentMonthRentPaidKsh)
    : "-";
  const totalRentPaid = hasResident && rentEnabled
    ? formatCurrency(totalRentPaidKsh)
    : "-";
  const billingMode = rentEnabled ? "Rent + utilities" : "Utilities only";
  const compactDrawer =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 680px)").matches;
  const roomProfileOpenAttr = compactDrawer ? "" : "open";
  const roomIssuesOpenAttr = compactDrawer ? "" : "open";
  const roomLedgerOpenAttr = compactDrawer ? "" : "open";
  const rentPaymentsOpenAttr = compactDrawer ? "" : "open";
  const rentProfileOpenAttr = compactDrawer ? "" : "open";
  const agreementOpenAttr = compactDrawer ? "" : "open";
  const canRecordCashPayment = hasResident && rentEnabled;
  const canEditRentProfile =
    rentEnabled &&
    !isCaretakerRole() &&
    canDisplayResidentBilling(resident) &&
    Number.isFinite(monthlyRentKsh) &&
    monthlyRentKsh > 0;
  const residentPaymentMonth = toMonthInputValue(resident.rentDueDate) || currentBillingMonth();
  const rentDueDateInputValue = resident.rentDueDate
    ? toDateTimeLocalInputValue(new Date(resident.rentDueDate))
    : "";
  const rentOverdueStartsAt = getResidentOverdueStartDate(resident);
  const rentOverdueStartInputValue = rentOverdueStartsAt
    ? toDateTimeLocalInputValue(new Date(rentOverdueStartsAt))
    : "";
  const rentGraceDays = Math.max(0, Number(resident.rentGraceDays ?? 0));
  const overdueStartSummary = rentOverdueStartsAt ? formatDateTime(rentOverdueStartsAt) : "-";

  residentDrawerBodyEl.innerHTML = `
    <div class="resident-summary">
      <p class="status-text">${escapeHtml(buildingLabel)} • House ${escapeHtml(
        resident.houseNumber
      )}</p>
      <h3>${escapeHtml(residentName)}</h3>
      <p class="status-text">Phone ${escapeHtml(residentPhone)}</p>
      <div class="resident-row-actions resident-drawer-actions">
        <button
          type="button"
          data-action="open-room-account"
          data-building-id="${escapeHtml(resident.buildingId)}"
          data-house-number="${escapeHtml(resident.houseNumber)}"
        >
          Open Full Room Account
        </button>
      </div>
    </div>
    <div class="resident-grid resident-grid-primary">
      <div><span>Occupancy</span><strong>${escapeHtml(occupancyLabel)}</strong></div>
      <div><span>Household Members</span><strong>${members}</strong></div>
      <div><span>Billing Mode</span><strong>${escapeHtml(billingMode)}</strong></div>
      ${
        rentEnabled
          ? `<div class="resident-grid-card-highlight"><span>Monthly Rent</span><strong>${escapeHtml(
              monthlyRent
            )}</strong></div>
      <div class="resident-grid-card-highlight"><span>Current Rent Due</span><strong>${escapeHtml(
        currentRentDue
      )}</strong></div>
      <div class="resident-grid-card-highlight"><span>Rent Arrears</span><strong>${escapeHtml(
        rentArrears
      )}</strong></div>
      <div><span>Utility Balance</span><strong>${escapeHtml(utilityBalance)}</strong></div>`
          : `<div class="resident-grid-card-highlight"><span>Current Utility Due</span><strong>${escapeHtml(
              currentUtilityDue
            )}</strong></div>
      <div class="resident-grid-card-highlight"><span>Utility Arrears</span><strong>${escapeHtml(
        utilityArrears
      )}</strong></div>
      <div><span>Utility Balance</span><strong>${escapeHtml(utilityBalance)}</strong></div>`
      }
      <div><span>Charge Overdue</span><strong>${escapeHtml(expenseBalance)}</strong></div>
      <div><span>Outstanding</span><strong>${escapeHtml(totalOutstanding)}</strong></div>
      <div><span>Billing Status</span><strong>${escapeHtml(billingStatus)}</strong></div>
      <div><span>Next Due</span><strong>${escapeHtml(nextDue)}</strong></div>
    </div>
    <details class="resident-drawer-panel" ${roomProfileOpenAttr}>
      <summary>
        <span>Room Profile</span>
        <small>meters, billing context, identity</small>
      </summary>
      <div class="resident-drawer-panel-body">
        <div class="resident-grid resident-grid-secondary">
          ${
            rentEnabled
              ? `<div><span>Latest Receipt</span><strong>${escapeHtml(latestReceipt)}</strong></div>
          <div><span>Latest Payment</span><strong>${escapeHtml(latestPaidAt)}</strong></div>
          <div><span>This Month Paid</span><strong>${escapeHtml(currentMonthRentPaid)}</strong></div>
          <div><span>All-Time Paid</span><strong>${escapeHtml(totalRentPaid)}</strong></div>`
              : `<div><span>Current Utility Due</span><strong>${escapeHtml(currentUtilityDue)}</strong></div>
          <div><span>Utility Arrears</span><strong>${escapeHtml(utilityArrears)}</strong></div>
          <div><span>Charge Overdue</span><strong>${escapeHtml(expenseBalance)}</strong></div>`
          }
          <div><span>Water Meter</span><strong>${escapeHtml(waterMeter)}</strong></div>
          <div><span>Electric Meter</span><strong>${escapeHtml(electricityMeter)}</strong></div>
          <div><span>ID / Passport</span><strong>${escapeHtml(identitySummary)}</strong></div>
          <div><span>Occupation</span><strong>${escapeHtml(
            agreement?.occupationLabel ||
              formatAgreementOccupationStatus(agreement?.occupationStatus)
          )}</strong></div>
          <div><span>Work / School</span><strong>${escapeHtml(workSchoolSummary)}</strong></div>
          <div><span>Emergency Contact</span><strong>${escapeHtml(
            agreement?.emergencyContactName
              ? `${agreement.emergencyContactName}${
                  agreement?.emergencyContactPhone ? ` • ${agreement.emergencyContactPhone}` : ""
                }`
              : "Not recorded"
          )}</strong></div>
        </div>
      </div>
    </details>
    <details class="resident-drawer-panel" ${roomIssuesOpenAttr}>
      <summary>
        <span>Room Issues</span>
        <small>${roomIssues.length} total</small>
      </summary>
      <div class="resident-drawer-panel-body">
        ${roomIssuesSummary}
      </div>
    </details>
    <details class="resident-drawer-panel" ${roomLedgerOpenAttr}>
      <summary>
        <span>Room Ledger</span>
        <small>${escapeHtml(roomLedgerSummary)}</small>
      </summary>
      <div class="resident-drawer-panel-body">
        <p class="status-text resident-agreement-note">
          One place for room utility bills, utility payments, and room-specific charges.
        </p>
        <div class="resident-agreement-overview resident-ledger-overview">
          <div><span>Utility Outstanding</span><strong>${escapeHtml(utilityBalance)}</strong></div>
          <div><span>Utility Paid</span><strong>${escapeHtml(
            formatCurrency(roomUtilityPaidKsh)
          )}</strong></div>
          <div><span>Room Charges</span><strong>${escapeHtml(
            formatCurrency(roomExpenditureTotalKsh)
          )}</strong></div>
          <div><span>Latest Bill Month</span><strong>${escapeHtml(
            latestLedgerBillingLabel
          )}</strong></div>
        </div>
        ${
          roomLedgerFlags.length > 0
            ? `<div class="resident-ledger-flags">${roomLedgerFlags
                .map(
                  (message) =>
                    `<p class="status-text resident-ledger-flag">${escapeHtml(message)}</p>`
                )
                .join("")}</div>`
            : ""
        }
        <div class="resident-ledger-columns">
          <section class="resident-ledger-section">
            <div class="resident-ledger-head">
              <h4>Utility Bills</h4>
              <small>${roomUtilityBills.length} item(s)</small>
            </div>
            ${
              roomUtilityBills.length > 0
                ? `<div class="stack-list">${roomUtilityBills
                    .slice(0, 8)
                    .map((bill) => {
                      const billAmountKsh = Number(bill?.amountKsh ?? 0);
                      const billBalanceKsh = Number(bill?.balanceKsh ?? 0);
                      const paidAmountKsh = Array.isArray(bill?.payments)
                        ? bill.payments.reduce(
                            (sum, payment) => sum + Number(payment?.amountKsh ?? 0),
                            0
                          )
                        : 0;
                      const dueLabel = bill?.dueDate ? formatDateOnly(bill.dueDate) : "-";
                      const billStatus = String(bill?.status ?? "open").trim() || "open";
                      return `
                        <article class="package-card resident-ledger-card">
                          <p class="status-text">${escapeHtml(
                            utilityTypeLabel(bill?.utilityType)
                          )} • ${escapeHtml(formatBillingMonth(bill?.billingMonth))} • Due ${escapeHtml(
                            dueLabel
                          )}</p>
                          <h4>${escapeHtml(formatCurrency(billBalanceKsh))} open of ${escapeHtml(
                            formatCurrency(billAmountKsh)
                          )}</h4>
                          <p class="status-text">Status ${escapeHtml(
                            billStatus
                          )} • Paid ${escapeHtml(formatCurrency(paidAmountKsh))}</p>
                          ${
                            bill?.note
                              ? `<p class="status-text">${escapeHtml(bill.note)}</p>`
                              : ""
                          }
                        </article>
                      `;
                    })
                    .join("")}</div>
                  ${
                    roomUtilityBills.length > 8
                      ? `<p class="status-text">Showing 8 of ${roomUtilityBills.length} utility bill entries.</p>`
                      : ""
                  }`
                : '<p class="status-text">No utility bills loaded for this room yet.</p>'
            }
          </section>
          <section class="resident-ledger-section">
            <div class="resident-ledger-head">
              <h4>Utility Payments</h4>
              <small>${roomUtilityPayments.length} item(s)</small>
            </div>
            ${
              roomUtilityPayments.length > 0
                ? `<div class="stack-list">${roomUtilityPayments
                    .slice(0, 8)
                    .map(
                      (payment) => `
                        <article class="package-card resident-ledger-card">
                          <p class="status-text">${escapeHtml(
                            formatPaymentProvider(payment?.provider)
                          )} • ${escapeHtml(
                        payment?.paidAt ? formatDateTime(payment.paidAt) : "-"
                      )}</p>
                          <h4>${escapeHtml(
                            formatCurrency(Number(payment?.amountKsh ?? 0))
                          )}</h4>
                          <p class="status-text">${escapeHtml(
                            utilityTypeLabel(payment?.utilityType)
                          )} • ${escapeHtml(
                        formatUtilityPaymentCoverage(payment, payment?.billingMonth) || "-"
                      )}</p>
                          <p class="status-text">${escapeHtml(
                            payment?.providerReference || payment?.note || "No reference recorded."
                          )}</p>
                        </article>
                      `
                    )
                    .join("")}</div>
                  ${
                    roomUtilityPayments.length > 8
                      ? `<p class="status-text">Showing 8 of ${roomUtilityPayments.length} utility payment entries.</p>`
                      : ""
                  }`
                : '<p class="status-text">No utility payments recorded for this room yet.</p>'
            }
          </section>
          <section class="resident-ledger-section">
            <div class="resident-ledger-head">
              <h4>Room Charges</h4>
              <small>${roomExpenditures.length} item(s)</small>
            </div>
            ${
              roomExpenditures.length > 0
                ? `<div class="stack-list">${roomExpenditures
                    .slice(0, 8)
                    .map(
                      (item) => `
                        <article class="package-card resident-ledger-card">
                          <p class="status-text">${escapeHtml(
                            formatExpenditureCategory(item?.category)
                          )} • ${escapeHtml(
                        item?.createdAt ? formatDateTime(item.createdAt) : "-"
                      )}</p>
                          <h4>${escapeHtml(
                            formatCurrency(Number(item?.amountKsh ?? 0))
                          )}</h4>
                          <p class="status-text">${escapeHtml(item?.title || "Room charge")}</p>
                          ${
                            item?.note
                              ? `<p class="status-text">${escapeHtml(item.note)}</p>`
                              : ""
                          }
                        </article>
                      `
                    )
                    .join("")}</div>
                  ${
                    roomExpenditures.length > 8
                      ? `<p class="status-text">Showing 8 of ${roomExpenditures.length} room-charge entries.</p>`
                      : ""
                  }`
                : '<p class="status-text">No room-specific charges posted for this room.</p>'
            }
          </section>
        </div>
      </div>
    </details>
    ${
      rentEnabled
        ? `<details class="resident-drawer-panel" ${rentPaymentsOpenAttr}>
      <summary>
        <span>Cash Rent Payment</span>
        <small>${
          canRecordCashPayment
            ? "Posts to this room immediately"
            : hasResident
              ? "Read only"
              : "No active resident"
        }</small>
      </summary>
      <div class="resident-drawer-panel-body">
        <div class="resident-grid resident-grid-secondary">
          <div><span>Current Rent Due</span><strong>${escapeHtml(currentRentDue)}</strong></div>
          <div><span>Rent Arrears</span><strong>${escapeHtml(rentArrears)}</strong></div>
          <div><span>Total Rent Paid</span><strong>${escapeHtml(totalRentPaid)}</strong></div>
          <div><span>Latest Receipt</span><strong>${escapeHtml(latestReceipt)}</strong></div>
        </div>
        ${
          canRecordCashPayment
            ? `<p class="status-text resident-agreement-note">
                Record a landlord-side cash collection for this resident. The room balance,
                arrears, and total paid update after save.
              </p>
              <form id="resident-rent-payment-form" class="resident-agreement-form">
                <div class="inline-fields compact-fields resident-agreement-grid">
                  <label>
                    Amount Paid (KSh)
                    <input name="amountKsh" type="number" min="1" step="1" required />
                  </label>
                  <label>
                    Payment Month
                    <input
                      name="billingMonth"
                      type="month"
                      value="${escapeHtml(residentPaymentMonth)}"
                      required
                    />
                  </label>
                  <label>
                    Paid At (optional)
                    <input name="paidAt" type="datetime-local" />
                  </label>
                </div>
                <label>
                  Receipt / Note (optional)
                  <input
                    name="providerReference"
                    type="text"
                    maxlength="120"
                    placeholder="Optional for cash"
                  />
                </label>
                <div class="action-row">
                  <button type="submit">Record Cash Payment</button>
                </div>
              </form>`
            : `<p class="status-text">
                ${
                  hasResident
                    ? "Only manager and root-level accounts can record rent payments here."
                    : "Assign an active resident before recording a rent payment."
                }
              </p>`
        }
      </div>
    </details>`
        : ""
    }
    ${
      rentEnabled
        ? `<details class="resident-drawer-panel" ${rentProfileOpenAttr}>
      <summary>
        <span>Rent Overdue Settings</span>
        <small>${canEditRentProfile ? "Manager can edit" : "Read only"}</small>
      </summary>
      <div class="resident-drawer-panel-body">
        <div class="resident-grid resident-grid-secondary">
          <div><span>Current Due Date</span><strong>${escapeHtml(
            resident.rentDueDate ? formatDateTime(resident.rentDueDate) : "-"
          )}</strong></div>
          <div><span>Overdue Starts</span><strong>${escapeHtml(overdueStartSummary)}</strong></div>
          <div><span>Grace Days</span><strong>${escapeHtml(String(rentGraceDays))}</strong></div>
          <div><span>Current Balance</span><strong>${escapeHtml(
            formatCurrency(Number(resident.rentBalanceKsh ?? 0))
          )}</strong></div>
        </div>
        ${
          canEditRentProfile
            ? `<p class="status-text resident-agreement-note">
                Set the room due date and when this balance should flip to overdue. Leave
                overdue start blank to begin overdue on the due date itself.
              </p>
              <form id="resident-rent-profile-form" class="resident-agreement-form">
                <div class="inline-fields compact-fields resident-agreement-grid">
                  <label>
                    Due Date
                    <input
                      name="dueDate"
                      type="datetime-local"
                      value="${escapeHtml(rentDueDateInputValue)}"
                      required
                    />
                  </label>
                  <label>
                    Overdue Starts
                    <input
                      name="overdueStartsAt"
                      type="datetime-local"
                      value="${escapeHtml(rentOverdueStartInputValue)}"
                    />
                  </label>
                </div>
                <div class="action-row">
                  <button type="submit">Save Rent Overdue Settings</button>
                </div>
              </form>`
            : `<p class="status-text">
                ${
                  isCaretakerRole()
                    ? "House manager accounts cannot update rent overdue settings."
                    : !canDisplayResidentBilling(resident)
                      ? "Billing is hidden until resident verification is complete."
                    : "Set monthly rent first before adjusting overdue settings."
                }
              </p>`
        }
      </div>
    </details>`
        : ""
    }
    <details class="resident-drawer-panel resident-agreement-card" ${agreementOpenAttr}>
      <summary>
        <span>Tenant Agreement</span>
        <small>${
          canEditAgreement ? "Manager can edit" : hasResident ? "Read only" : "No active resident"
        }</small>
      </summary>
      <div class="resident-drawer-panel-body">
        <p class="status-text">${escapeHtml(agreementStatusText)}</p>
      <div class="resident-agreement-overview">
        <div><span>ID</span><strong>${escapeHtml(identitySummary)}</strong></div>
        <div><span>Occupation</span><strong>${escapeHtml(
          formatAgreementOccupationStatus(agreement?.occupationStatus)
        )}</strong></div>
        <div><span>Work / School</span><strong>${escapeHtml(workSchoolSummary)}</strong></div>
        <div><span>Lease</span><strong>${escapeHtml(leaseSummary)}</strong></div>
      </div>
      ${
        agreementResident
          ? `<p class="status-text resident-agreement-note">Active resident on this agreement: ${escapeHtml(
              agreementResident.fullName ?? residentName
            )} • ${escapeHtml(agreementResident.phone ?? residentPhone)}</p>`
          : ""
      }
      ${
        agreementError
          ? `<p class="status-text resident-agreement-error">${escapeHtml(agreementError)}</p>`
          : ""
      }
      <p class="status-text resident-agreement-note">
        Capture ID, work or school information, sponsor contacts for students, emergency contact,
        and core lease terms in one place.
      </p>
      <form id="resident-agreement-form" class="resident-agreement-form">
        <div class="inline-fields compact-fields resident-agreement-grid">
          <label>
            ID Type
            <select name="identityType" ${disabledAttr}>
              <option value="">Select</option>
              <option value="national_id" ${
                agreement?.identityType === "national_id" ? "selected" : ""
              }>National ID</option>
              <option value="passport" ${
                agreement?.identityType === "passport" ? "selected" : ""
              }>Passport</option>
              <option value="alien_id" ${
                agreement?.identityType === "alien_id" ? "selected" : ""
              }>Alien ID</option>
              <option value="other" ${agreement?.identityType === "other" ? "selected" : ""}>Other</option>
            </select>
          </label>
          <label>
            ID Number
            <input
              name="identityNumber"
              type="text"
              maxlength="80"
              placeholder="ID / passport number"
              value="${escapeHtml(agreement?.identityNumber ?? "")}"
              ${disabledAttr}
            />
          </label>
          <label>
            Occupation Status
            <select name="occupationStatus" ${disabledAttr}>
              <option value="">Select</option>
              <option value="employed" ${
                agreement?.occupationStatus === "employed" ? "selected" : ""
              }>Employed</option>
              <option value="self_employed" ${
                agreement?.occupationStatus === "self_employed" ? "selected" : ""
              }>Self-employed</option>
              <option value="student" ${
                agreement?.occupationStatus === "student" ? "selected" : ""
              }>Student</option>
              <option value="sponsored" ${
                agreement?.occupationStatus === "sponsored" ? "selected" : ""
              }>Sponsored</option>
              <option value="unemployed" ${
                agreement?.occupationStatus === "unemployed" ? "selected" : ""
              }>Unemployed</option>
              <option value="other" ${
                agreement?.occupationStatus === "other" ? "selected" : ""
              }>Other</option>
            </select>
          </label>
          <label>
            Role / Course / Trade
            <input
              name="occupationLabel"
              type="text"
              maxlength="120"
              placeholder="Teacher, Nursing, Online business"
              value="${escapeHtml(agreement?.occupationLabel ?? "")}"
              ${disabledAttr}
            />
          </label>
        </div>
        <div class="inline-fields compact-fields resident-agreement-grid">
          <label>
            Employer / Business / School
            <input
              name="organizationName"
              type="text"
              maxlength="160"
              placeholder="ABC School or Riverside Ltd"
              value="${escapeHtml(agreement?.organizationName ?? "")}"
              ${disabledAttr}
            />
          </label>
          <label>
            Place of Work / School
            <input
              name="organizationLocation"
              type="text"
              maxlength="160"
              placeholder="Westlands, Nairobi"
              value="${escapeHtml(agreement?.organizationLocation ?? "")}"
              ${disabledAttr}
            />
          </label>
          <label>
            Student / Admission No.
            <input
              name="studentRegistrationNumber"
              type="text"
              maxlength="80"
              placeholder="ADM-2026-0042"
              value="${escapeHtml(agreement?.studentRegistrationNumber ?? "")}"
              ${disabledAttr}
            />
          </label>
        </div>
        <div class="inline-fields compact-fields resident-agreement-grid">
          <label>
            Sponsor / Guardian Name
            <input
              name="sponsorName"
              type="text"
              maxlength="120"
              placeholder="Parent or sponsor name"
              value="${escapeHtml(agreement?.sponsorName ?? "")}"
              ${disabledAttr}
            />
          </label>
          <label>
            Sponsor / Guardian Phone
            <input
              name="sponsorPhone"
              type="tel"
              inputmode="tel"
              maxlength="20"
              placeholder="07XXXXXXXX"
              value="${escapeHtml(agreement?.sponsorPhone ?? "")}"
              ${disabledAttr}
            />
          </label>
          <label>
            Emergency Contact Name
            <input
              name="emergencyContactName"
              type="text"
              maxlength="120"
              placeholder="Next of kin"
              value="${escapeHtml(agreement?.emergencyContactName ?? "")}"
              ${disabledAttr}
            />
          </label>
          <label>
            Emergency Contact Phone
            <input
              name="emergencyContactPhone"
              type="tel"
              inputmode="tel"
              maxlength="20"
              placeholder="07XXXXXXXX"
              value="${escapeHtml(agreement?.emergencyContactPhone ?? "")}"
              ${disabledAttr}
            />
          </label>
        </div>
        <div class="inline-fields compact-fields resident-agreement-grid">
          <label>
            Lease Start
            <input
              name="leaseStartDate"
              type="date"
              value="${escapeHtml(toDateInputValue(agreement?.leaseStartDate))}"
              ${disabledAttr}
            />
          </label>
          <label>
            Lease End
            <input
              name="leaseEndDate"
              type="date"
              value="${escapeHtml(toDateInputValue(agreement?.leaseEndDate))}"
              ${disabledAttr}
            />
          </label>
          <label>
            Monthly Rent (KSh)
            <input
              name="monthlyRentKsh"
              type="number"
              min="0"
              step="1"
              value="${escapeHtml(numberToInputString(agreement?.monthlyRentKsh))}"
              ${disabledAttr}
            />
          </label>
          <label>
            Deposit (KSh)
            <input
              name="depositKsh"
              type="number"
              min="0"
              step="1"
              value="${escapeHtml(numberToInputString(agreement?.depositKsh))}"
              ${disabledAttr}
            />
          </label>
          <label>
            Due Day
            <input
              name="paymentDueDay"
              type="number"
              min="1"
              max="31"
              step="1"
              placeholder="5"
              value="${escapeHtml(numberToInputString(agreement?.paymentDueDay))}"
              ${disabledAttr}
            />
          </label>
        </div>
        <label>
          Special Terms
          <textarea
            name="specialTerms"
            rows="4"
            maxlength="1200"
            placeholder="Quiet hours, visitor rules, move-out notice period, utility arrangements."
            ${disabledAttr}
          >${escapeHtml(agreement?.specialTerms ?? "")}</textarea>
        </label>
        ${
          canEditAgreement
            ? `<div class="action-row">
                <button type="submit">Save Agreement</button>
              </div>`
            : ""
        }
      </form>
      </div>
    </details>
  `;
}

function renderPaymentAccess(rows) {
  paymentAccessBodyEl.replaceChildren();

  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6">No buildings available for payment access settings.</td>';
    paymentAccessBodyEl.append(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    const safeBuildingName = getBuildingDisplayNameById(
      item.buildingId,
      item.buildingName ?? "Building"
    );
    const canEdit = !isCaretakerRole();
    row.innerHTML = `
      <td><strong>${escapeHtml(safeBuildingName)}</strong></td>
      <td><label><input type="checkbox" data-setting="rentEnabled" ${item.rentEnabled ? "checked" : ""} ${canEdit ? "" : "disabled"} /> Enabled</label></td>
      <td><label><input type="checkbox" data-setting="waterEnabled" ${item.waterEnabled ? "checked" : ""} ${canEdit ? "" : "disabled"} /> Enabled</label></td>
      <td><label><input type="checkbox" data-setting="electricityEnabled" ${item.electricityEnabled ? "checked" : ""} ${canEdit ? "" : "disabled"} /> Enabled</label></td>
      <td>${formatDateTime(item.updatedAt)}${item.updatedByRole ? `<br /><small>${item.updatedByRole}</small>` : ""}</td>
      <td><button type="button" data-action="save-payment-access" data-building-id="${item.buildingId}" ${canEdit ? "" : "disabled"}>Save</button></td>
    `;
    paymentAccessBodyEl.append(row);
  });
}

function renderPaymentProfiles() {
  if (!(paymentProfilesBodyEl instanceof HTMLElement)) {
    return;
  }

  paymentProfilesBodyEl.replaceChildren();

  const profiles = Array.isArray(state.paymentProfiles) ? state.paymentProfiles : [];
  const assignments = Array.isArray(state.buildingPaymentProfiles)
    ? state.buildingPaymentProfiles
    : [];
  const canEdit = !isCaretakerRole();

  if (paymentProfilesSummaryEl instanceof HTMLElement) {
    const configuredCount = profiles.filter((profile) => profile.isConfigured).length;
    paymentProfilesSummaryEl.textContent = `${profiles.length} payment profile${
      profiles.length === 1 ? "" : "s"
    } available. ${configuredCount} configured for STK.`;
  }

  if (assignments.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="7">No buildings available for payment routing settings.</td>';
    paymentProfilesBodyEl.append(row);
    return;
  }

  const profileOptions = profiles
    .map((profile) => {
      const status = profile.isConfigured ? "ready" : "not configured";
      return `<option value="${escapeHtml(profile.id)}">${escapeHtml(
        `${profile.name} (${status})`
      )}</option>`;
    })
    .join("");

  assignments.forEach((item) => {
    const row = document.createElement("tr");
    const safeBuildingName = getBuildingDisplayNameById(
      item.buildingId,
      item.buildingName ?? "Building"
    );
    const selectedProfileId = String(item.effectiveProfileId || item.profileId || "default");
    const profile = item.profile;
    const accountReference = String(item.accountReference || "");
    row.innerHTML = `
      <td><strong>${escapeHtml(safeBuildingName)}</strong></td>
      <td>
        <select data-setting="paymentProfileId" ${canEdit ? "" : "disabled"}>
          ${profileOptions}
        </select>
      </td>
      <td>${profile ? escapeHtml(profile.shortCode || "-") : "<span class=\"danger-text\">Missing</span>"}</td>
      <td>${profile ? escapeHtml(profile.partyB || "-") : "-"}</td>
      <td><input data-setting="paymentAccountReference" type="text" maxlength="40" value="${escapeHtml(accountReference)}" placeholder="Optional account" ${canEdit ? "" : "disabled"} /></td>
      <td>${formatDateTime(item.updatedAt)}${item.updatedByRole ? `<br /><small>${escapeHtml(item.updatedByRole)}</small>` : ""}</td>
      <td><button type="button" data-action="save-payment-profile" data-building-id="${escapeHtml(item.buildingId)}" ${canEdit ? "" : "disabled"}>Save</button></td>
    `;

    const select = row.querySelector('select[data-setting="paymentProfileId"]');
    if (select instanceof HTMLSelectElement) {
      select.value = selectedProfileId;
    }
    paymentProfilesBodyEl.append(row);
  });
}

function renderPaymentInstructions() {
  if (!(paymentInstructionsBodyEl instanceof HTMLElement)) {
    return;
  }

  paymentInstructionsBodyEl.replaceChildren();

  const rows = Array.isArray(state.buildingPaymentInstructions)
    ? state.buildingPaymentInstructions
    : [];
  const canEdit = !isCaretakerRole();

  if (paymentInstructionsSummaryEl instanceof HTMLElement) {
    const configuredCount = rows.filter((item) => {
      const method = String(item.primaryMethod || "mpesa");
      const effective = item.effective || {};
      if (method === "mpesa") {
        return Boolean(effective.mpesaBusinessNumber || item.mpesaBusinessNumber);
      }
      if (method === "bank") {
        return Boolean(effective.bankAccountNumber || item.bankAccountNumber);
      }
      if (method === "cash") {
        return Boolean(effective.cashLocation || item.cashLocation);
      }
      return Boolean(effective.instructions || item.instructions);
    }).length;
    paymentInstructionsSummaryEl.textContent = `${configuredCount} of ${
      rows.length
    } building${rows.length === 1 ? "" : "s"} have visible payment details.`;
  }

  if (rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="7">No buildings available for payment instructions.</td>';
    paymentInstructionsBodyEl.append(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    const effective = item.effective || {};
    const safeBuildingName = getBuildingDisplayNameById(
      item.buildingId,
      item.buildingName ?? "Building"
    );
    row.innerHTML = `
      <td><strong>${escapeHtml(safeBuildingName)}</strong></td>
      <td>
        <select data-setting="primaryMethod" ${canEdit ? "" : "disabled"}>
          <option value="mpesa">M-PESA</option>
          <option value="bank">Bank</option>
          <option value="cash">Cash</option>
          <option value="manual">Manual</option>
        </select>
      </td>
      <td>
        <div class="payment-instruction-fields">
          <input data-setting="mpesaBusinessNumber" type="text" maxlength="40" value="${escapeHtml(
            item.mpesaBusinessNumber || ""
          )}" placeholder="${escapeHtml(
            effective.mpesaBusinessNumber || "Paybill or Till"
          )}" ${canEdit ? "" : "disabled"} />
          <input data-setting="mpesaAccountReference" type="text" maxlength="80" value="${escapeHtml(
            item.mpesaAccountReference || ""
          )}" placeholder="${escapeHtml(
            effective.mpesaAccountReference || "Account reference"
          )}" ${canEdit ? "" : "disabled"} />
          <input data-setting="mpesaAccountName" type="text" maxlength="120" value="${escapeHtml(
            item.mpesaAccountName || ""
          )}" placeholder="${escapeHtml(
            effective.mpesaAccountName || "Account name"
          )}" ${canEdit ? "" : "disabled"} />
        </div>
      </td>
      <td>
        <div class="payment-instruction-fields">
          <input data-setting="bankName" type="text" maxlength="120" value="${escapeHtml(
            item.bankName || ""
          )}" placeholder="Bank name" ${canEdit ? "" : "disabled"} />
          <input data-setting="bankAccountName" type="text" maxlength="120" value="${escapeHtml(
            item.bankAccountName || ""
          )}" placeholder="Account name" ${canEdit ? "" : "disabled"} />
          <input data-setting="bankAccountNumber" type="text" maxlength="80" value="${escapeHtml(
            item.bankAccountNumber || ""
          )}" placeholder="Account number" ${canEdit ? "" : "disabled"} />
          <input data-setting="bankBranch" type="text" maxlength="120" value="${escapeHtml(
            item.bankBranch || ""
          )}" placeholder="Branch" ${canEdit ? "" : "disabled"} />
          <input data-setting="bankSwiftCode" type="text" maxlength="40" value="${escapeHtml(
            item.bankSwiftCode || ""
          )}" placeholder="SWIFT or bank code" ${canEdit ? "" : "disabled"} />
        </div>
      </td>
      <td>
        <div class="payment-instruction-fields">
          <input data-setting="cashLocation" type="text" maxlength="160" value="${escapeHtml(
            item.cashLocation || ""
          )}" placeholder="Office or contact" ${canEdit ? "" : "disabled"} />
          <textarea data-setting="instructions" maxlength="800" placeholder="Resident payment notes" ${canEdit ? "" : "disabled"}>${escapeHtml(
            item.instructions || ""
          )}</textarea>
          <textarea data-setting="proofInstructions" maxlength="800" placeholder="Receipt or proof notes" ${canEdit ? "" : "disabled"}>${escapeHtml(
            item.proofInstructions || ""
          )}</textarea>
        </div>
      </td>
      <td>${formatDateTime(item.updatedAt)}${item.updatedByRole ? `<br /><small>${escapeHtml(item.updatedByRole)}</small>` : ""}</td>
      <td><button type="button" data-action="save-payment-instructions" data-building-id="${escapeHtml(item.buildingId)}" ${canEdit ? "" : "disabled"}>Save</button></td>
    `;

    const methodSelect = row.querySelector('select[data-setting="primaryMethod"]');
    if (methodSelect instanceof HTMLSelectElement) {
      methodSelect.value = String(item.primaryMethod || "mpesa");
    }

    paymentInstructionsBodyEl.append(row);
  });
}

function isWifiEnabledForBuilding(building) {
  return (
    Boolean(building?.wifiEnabled) &&
    String(building?.wifiAccessMode ?? "").trim().toLowerCase() !== "disabled"
  );
}

function syncWifiPackageSectionVisibility(rows = []) {
  if (!(overviewWifiPackagesSectionEl instanceof HTMLElement)) {
    return;
  }

  const hasVisibleWifiBuilding = Array.isArray(rows) && rows.some(isWifiEnabledForBuilding);
  overviewWifiPackagesSectionEl.classList.toggle("hidden", !hasVisibleWifiBuilding);
}

function renderWifiPackageBuildingOptions(rows) {
  if (!(wifiPackageBuildingSelectEl instanceof HTMLSelectElement)) {
    return;
  }

  const visibleRows = Array.isArray(rows) ? rows.filter(isWifiEnabledForBuilding) : [];
  syncWifiPackageSectionVisibility(visibleRows);
  wifiPackageBuildingSelectEl.replaceChildren();

  if (visibleRows.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Wi-Fi disabled";
    wifiPackageBuildingSelectEl.append(option);
    wifiPackageBuildingSelectEl.disabled = true;
    state.selectedWifiPackageBuildingId = "";
    state.wifiPackages = [];
    state.wifiPackagesUnavailableReason = "Wi-Fi is hidden because no building has it enabled.";
    renderWifiPackages([]);
    return;
  }

  wifiPackageBuildingSelectEl.disabled = false;

  visibleRows.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    wifiPackageBuildingSelectEl.append(option);
  });

  const selectedBuildingId =
    state.selectedWifiPackageBuildingId &&
    visibleRows.some((item) => item.id === state.selectedWifiPackageBuildingId)
      ? state.selectedWifiPackageBuildingId
      : visibleRows[0]?.id ?? "";

  state.selectedWifiPackageBuildingId = selectedBuildingId;
  wifiPackageBuildingSelectEl.value = selectedBuildingId;
}

function createWifiPackageUpdatePayload(form) {
  const formData = new FormData(form);

  return {
    name: String(formData.get("name") ?? "").trim(),
    profile: String(formData.get("profile") ?? "").trim(),
    hours: Number(formData.get("hours")),
    priceKsh: Number(formData.get("priceKsh")),
    enabled: formData.get("enabled") === "on",
    acknowledgeImpact: true
  };
}

function renderWifiPackages(rows) {
  if (!(wifiPackageListEl instanceof HTMLElement)) {
    return;
  }

  wifiPackageListEl.replaceChildren();

  if (state.wifiPackagesUnavailableReason) {
    wifiPackageListEl.textContent = state.wifiPackagesUnavailableReason;
    return;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    wifiPackageListEl.textContent = "No Wi-Fi packages available for this building.";
    return;
  }

  rows.forEach((item) => {
    const form = document.createElement("form");
    form.className = "package-card";
    form.innerHTML = `
      <h3>${escapeHtml(item.id)}</h3>
      <label>
        Name
        <input name="name" type="text" required value="${escapeHtml(item.name)}" />
      </label>
      <label>
        Profile
        <input name="profile" type="text" required value="${escapeHtml(item.profile)}" />
      </label>
      <label>
        <input name="enabled" type="checkbox" ${item.enabled ? "checked" : ""} />
        Enabled for checkout
      </label>
      <div class="inline-fields">
        <label>
          Hours
          <input name="hours" type="number" min="1" max="72" required value="${Number(item.hours)}" />
        </label>
        <label>
          Price (KSh)
          <input name="priceKsh" type="number" min="1" max="10000" required value="${Number(item.priceKsh)}" />
        </label>
      </div>
      <div class="action-row">
        <button type="submit" ${isCaretakerRole() ? "disabled" : ""}>Save</button>
      </div>
    `;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      clearError();

      if (isCaretakerRole()) {
        showError("House manager accounts cannot change Wi-Fi packages.");
        return;
      }

      const buildingId = state.selectedWifiPackageBuildingId;
      if (!buildingId) {
        showError("Select a building first.");
        return;
      }

      const submitButton = form.querySelector("button[type='submit']");
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
      }

      const payload = createWifiPackageUpdatePayload(form);
      void (async () => {
        try {
          await requestJson(
            `/api/landlord/buildings/${encodeURIComponent(buildingId)}/wifi/packages/${encodeURIComponent(item.id)}`,
            {
              method: "PATCH",
              headers: {
                "content-type": "application/json"
              },
              body: JSON.stringify(payload)
            }
          );

          setStatus(`Wi-Fi package ${item.id} updated for ${buildingId}.`);
          await loadLandlordWifiPackages();
        } catch (error) {
          handleLandlordError(error, "Failed to update Wi-Fi package.");
        } finally {
          if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = false;
          }
        }
      })();
    });

    wifiPackageListEl.append(form);
  });
}

function renderMeters(rows) {
  metersBodyEl.replaceChildren();

  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="4">No utility meters configured.</td>';
    metersBodyEl.append(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.utilityType}</td>
      <td>${item.houseNumber}</td>
      <td>${item.meterNumber}</td>
      <td>${formatDateTime(item.updatedAt)}</td>
    `;
    metersBodyEl.append(row);
  });
}

function renderUtilityBills(rows) {
  utilityBillsBodyEl.replaceChildren();
  const visibleRows = getVisibleUtilityBills(rows);

  if (visibleRows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="9">No utility bills posted.</td>';
    utilityBillsBodyEl.append(row);
    return;
  }

  visibleRows.forEach((item) => {
    const row = document.createElement("tr");
    const displayStatus = getUtilityDisplayStatus(item);
    row.innerHTML = `
      <td>${item.utilityType}</td>
      <td>${item.houseNumber}</td>
      <td>${item.billingMonth}</td>
      <td>${item.meterNumber}</td>
      <td>${Number(item.unitsConsumed ?? 0).toLocaleString("en-US")}</td>
      <td>${formatCurrency(item.amountKsh)}</td>
      <td>${formatCurrency(item.balanceKsh)}</td>
      <td>${formatDateTime(item.dueDate)}</td>
      <td>${renderUtilityStatus(displayStatus)}</td>
    `;
    utilityBillsBodyEl.append(row);
  });
}

function renderUtilityRoomSummary(rows) {
  if (utilityRoomSummaryBodyEls.length === 0) {
    return;
  }

  const allSummaryRows = summarizeUtilityRooms(rows);
  const summaryRows = allSummaryRows.filter(matchesUtilitySummaryTenantFilters);
  state.utilityRoomSummaryByKey = new Map();
  allSummaryRows.forEach((item) => {
    const key = buildingHouseLookupKey(item.buildingId, item.houseNumber);
    if (key) {
      state.utilityRoomSummaryByKey.set(key, item);
    }
  });

  utilityRoomSummaryBodyEls.forEach((bodyEl) => {
    if (!(bodyEl instanceof HTMLElement)) {
      return;
    }

    bodyEl.replaceChildren();

    if (summaryRows.length === 0) {
      const row = document.createElement("tr");
      const emptyText =
        allSummaryRows.length === 0
          ? "No utility bill history found."
          : "No utility rooms match current filters.";
      row.innerHTML = `<td colspan="10">${escapeHtml(emptyText)}</td>`;
      bodyEl.append(row);
      return;
    }

    summaryRows.forEach((item) => {
      const accountBuildingId =
        item.buildingId ||
        getSelectedUtilityBuildingId() ||
        state.selectedResidentsBuildingId ||
        state.selectedRegistryBuildingId ||
        "";
      const row = document.createElement("tr");
      row.className = "account-drilldown-row";
      row.dataset.action = "open-room-account-row";
      row.dataset.buildingId = accountBuildingId;
      row.dataset.houseNumber = item.houseNumber;
      row.tabIndex = 0;
      row.setAttribute("role", "link");
      row.setAttribute("title", `Open room account ${item.houseNumber}`);
      row.innerHTML = `
        <td>${escapeHtml(item.houseNumber)}</td>
        <td>${item.overdueMonths.length > 0 ? escapeHtml(item.overdueMonths.join(", ")) : "-"}</td>
        <td>${formatCurrency(item.overdueBalanceKsh)}</td>
        <td>${item.payableMonths.length > 0 ? escapeHtml(item.payableMonths.join(", ")) : "-"}</td>
        <td>${formatCurrency(item.payableBalanceKsh)}</td>
        <td>${item.awaitingMonths.length > 0 ? escapeHtml(item.awaitingMonths.join(", ")) : "-"}</td>
        <td>${formatCurrency(item.totalOpenBalanceKsh)}</td>
        <td>${renderUtilityStatusAction(item)}</td>
        <td><div class="utility-breakdown">${escapeHtml(item.breakdown || "-")}</div></td>
        <td>${renderUtilityRoomSummaryActions(item, accountBuildingId)}</td>
      `;
      bodyEl.append(row);
    });
  });
}

function renderUtilityPayments(rows) {
  utilityPaymentsBodyEl.replaceChildren();

  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="8">No utility payments found.</td>';
    utilityPaymentsBodyEl.append(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.utilityType}</td>
      <td>${item.houseNumber}</td>
      <td>${formatBillingMonth(item.billingMonth)}</td>
      <td>${formatBillingMonth(item.paidAt)}</td>
      <td>${item.provider}</td>
      <td>${item.providerReference ?? "-"}</td>
      <td>${formatCurrency(item.amountKsh)}</td>
      <td>${formatDateTime(item.paidAt)}</td>
    `;
    utilityPaymentsBodyEl.append(row);
  });
}

function renderUtilityRoomSummaryActions(item, accountBuildingId) {
  const houseNumber = normalizeHouse(item?.houseNumber);
  const resident =
    findResidentDirectoryEntry(accountBuildingId, houseNumber) ??
    getIndexedRoom(state.registryRoomByKey, accountBuildingId, houseNumber) ??
    {};
  const residentUserId = String(resident?.residentUserId ?? "").trim();
  const hasResident = Boolean(
    residentUserId ||
      resident?.hasActiveResident ||
      String(resident?.residentName ?? "").trim()
  );
  const residentName = String(resident?.residentName ?? "Resident").trim() || "Resident";
  const openBalanceKsh = Math.max(0, Number(item?.totalOpenBalanceKsh ?? 0));

  return `
    <div class="resident-row-actions utility-room-actions">
      <button
        type="button"
        data-action="open-room-account"
        data-building-id="${escapeHtml(accountBuildingId)}"
        data-house-number="${escapeHtml(houseNumber)}"
      >
        Account
      </button>
      ${
        hasResident
          ? `<button
              type="button"
              class="btn-danger"
              data-action="remove-resident"
              data-building-id="${escapeHtml(accountBuildingId)}"
              data-house-number="${escapeHtml(houseNumber)}"
              data-user-id="${escapeHtml(residentUserId)}"
              data-resident-name="${escapeHtml(residentName)}"
              ${residentUserId ? "" : "disabled"}
            >
              Clear Resident
            </button>`
          : ""
      }
      ${
        !isCaretakerRole() && !hasResident && openBalanceKsh > 0
          ? `<button
              type="button"
              class="btn-danger"
              data-action="write-off-room-balance"
              data-building-id="${escapeHtml(accountBuildingId)}"
              data-house-number="${escapeHtml(houseNumber)}"
              data-amount-ksh="${escapeHtml(openBalanceKsh)}"
            >
              Clear Balance
            </button>`
          : ""
      }
      ${
        !isCaretakerRole() && !hasResident && openBalanceKsh <= 0
          ? `<button
              type="button"
              class="btn-danger"
              data-action="remove-room"
              data-building-id="${escapeHtml(accountBuildingId)}"
              data-house-number="${escapeHtml(houseNumber)}"
            >
              Remove Room
            </button>`
          : ""
      }
    </div>
  `;
}

function renderMetrics() {
  const metricBuildingId = getFocusedBuildingId();
  const actionableBills = getActionableUtilityBills(state.bills).filter(
    (item) =>
      !metricBuildingId || normalizeLookupBuildingId(item.buildingId) === metricBuildingId
  );
  const meters = state.meters.filter(
    (item) =>
      !metricBuildingId || normalizeLookupBuildingId(item.buildingId) === metricBuildingId
  ).length;
  const residentRows = dedupeResidentDirectoryRows(state.residentDirectory).filter(
    (item) =>
      !metricBuildingId || normalizeLookupBuildingId(item.buildingId) === metricBuildingId
  );
  const residentUsers = metricBuildingId
    ? Number(getBuildingRecord(metricBuildingId)?.residentUsers ?? 0)
    : Number(state.residentUsersCount ?? 0);
  const bills = actionableBills.length;
  const currentMonthKey = currentBillingMonth();
  let unpaid = 0;
  let overdue = 0;

  actionableBills.forEach((item) => {
    const balanceKsh = utilityAmount(item.balanceKsh);
    if (balanceKsh > 0) {
      unpaid += 1;
    }
    if (String(item.status) === "overdue") {
      overdue += 1;
    }
  });

  const rentCollectedThisMonth = residentRows.reduce(
    (sum, item) => sum + getResidentCurrentMonthRentPaidKsh(item),
    0
  );
  const utilityCollectedThisMonth = (Array.isArray(state.payments) ? state.payments : [])
    .filter(
      (item) =>
        (!metricBuildingId || normalizeLookupBuildingId(item.buildingId) === metricBuildingId) &&
        monthKeyFromValue(item.paidAt || item.billingMonth) === currentMonthKey
    )
    .reduce((sum, item) => sum + Math.max(0, Number(item.amountKsh ?? 0)), 0);
  const paidTotal = rentCollectedThisMonth + utilityCollectedThisMonth;
  const outstanding =
    residentRows.length > 0
      ? residentRows.reduce(
          (sum, item) => sum + getResidentOutstandingBalanceKsh(item),
          0
        )
      : actionableBills.reduce((sum, item) => sum + utilityAmount(item.balanceKsh), 0);

  metricMetersEl.textContent = String(meters);
  metricUsersEl.textContent = String(residentUsers);
  metricBillsEl.textContent = String(bills);
  metricUnpaidEl.textContent = String(unpaid);
  metricOverdueEl.textContent = String(overdue);
  metricPaymentsEl.textContent = formatCurrency(paidTotal);
  metricBalanceEl.textContent = formatCurrency(outstanding);
  renderLandlordFocusPanel();
}

function createUtilityBillPayload() {
  const buildingId = getSelectedUtilityBuildingId();
  const previousReading = toOptionalNumber(utilityBillPreviousReadingEl.value);
  const currentReading = toOptionalNumber(utilityBillCurrentReadingEl.value);
  const utilityType = String(utilityBillTypeEl.value ?? "water");
  let ratePerUnitKsh = toOptionalNumber(utilityBillRateEl.value);
  if (ratePerUnitKsh == null && currentReading != null) {
    ratePerUnitKsh = getUtilityRateDefault(utilityType, buildingId);
  }
  const fixedChargeKsh = toOptionalNumber(utilityBillFixedEl.value);

  return {
    buildingId,
    utilityType,
    houseNumber: normalizeHouse(utilityBillHouseEl.value),
    payload: {
      buildingId,
      billingMonth: toBillingMonth(utilityBillMonthEl.value),
      previousReading,
      currentReading,
      ratePerUnitKsh,
      fixedChargeKsh,
      dueDate: toIsoFromDateTimeLocal(utilityBillDueDateEl.value),
      note: utilityBillNoteEl.value.trim() || undefined
    }
  };
}

function createUtilityPaymentPayload() {
  const buildingId = getSelectedUtilityBuildingId();

  return {
    buildingId,
    utilityType: String(utilityPaymentTypeEl?.value ?? "water"),
    houseNumber: normalizeHouse(utilityPaymentHouseEl?.value),
    payload: {
      billingMonth: toBillingMonth(utilityPaymentMonthEl?.value) || undefined,
      amountKsh: Number(utilityPaymentAmountEl?.value),
      provider: String(utilityPaymentProviderEl?.value ?? "cash"),
      providerReference: String(utilityPaymentReferenceEl?.value ?? "").trim() || undefined,
      paidAt: toIsoFromDateTimeLocal(utilityPaymentPaidAtEl?.value) || undefined,
      note: String(utilityPaymentNoteEl?.value ?? "").trim() || undefined
    }
  };
}

function openOverviewUtilityPaymentModal(action) {
  const buildingId = String(action?.buildingId ?? "").trim();
  const houseNumber = normalizeHouse(action?.houseNumber);
  const utilityType = String(action?.utilityType ?? "").trim();
  const billingMonth = String(action?.billingMonth ?? "").trim();
  const amountKsh = Number(action?.amountKsh ?? 0);
  const statusLabel = String(action?.statusLabel ?? "Actionable").trim() || "Actionable";

  if (!buildingId || !houseNumber || !utilityType || !billingMonth || !Number.isFinite(amountKsh)) {
    showError("Overview payment shortcut is missing bill details. Refresh and try again.");
    return;
  }

  const buildingLabel = getBuildingDisplayNameById(buildingId);

  if (overviewUtilityPaymentFormEl instanceof HTMLFormElement) {
    overviewUtilityPaymentFormEl.dataset.buildingId = buildingId;
    overviewUtilityPaymentFormEl.dataset.houseNumber = houseNumber;
    overviewUtilityPaymentFormEl.dataset.utilityType = utilityType;
    overviewUtilityPaymentFormEl.dataset.statusLabel = statusLabel;
  }
  if (overviewUtilityPaymentBuildingEl instanceof HTMLInputElement) {
    overviewUtilityPaymentBuildingEl.value = buildingLabel;
  }
  if (overviewUtilityPaymentHouseEl instanceof HTMLInputElement) {
    overviewUtilityPaymentHouseEl.value = houseNumber;
  }
  if (overviewUtilityPaymentTypeLabelEl instanceof HTMLInputElement) {
    overviewUtilityPaymentTypeLabelEl.value = utilityTypeLabel(utilityType);
  }
  if (overviewUtilityPaymentMonthEl instanceof HTMLInputElement) {
    overviewUtilityPaymentMonthEl.value = billingMonth;
  }
  if (overviewUtilityPaymentAmountEl instanceof HTMLInputElement) {
    overviewUtilityPaymentAmountEl.value = String(Math.round(amountKsh));
  }
  if (overviewUtilityPaymentPaidAtEl instanceof HTMLInputElement) {
    overviewUtilityPaymentPaidAtEl.value = "";
  }
  if (overviewUtilityPaymentReferenceEl instanceof HTMLInputElement) {
    overviewUtilityPaymentReferenceEl.value = "";
  }
  if (overviewUtilityPaymentSummaryEl instanceof HTMLElement) {
    overviewUtilityPaymentSummaryEl.textContent =
      `${statusLabel} ${utilityTypeLabel(utilityType).toLowerCase()} bill for house ${houseNumber}.`;
  }
  if (overviewUtilityPaymentHelpEl instanceof HTMLElement) {
    overviewUtilityPaymentHelpEl.textContent =
      `Record the cash payment here for ${billingMonth}. If the amount is larger than this bill, the remainder will keep applying to the next open month for this room.`;
  }

  showOverviewUtilityPaymentModal();
  if (overviewUtilityPaymentAmountEl instanceof HTMLInputElement) {
    overviewUtilityPaymentAmountEl.focus();
    overviewUtilityPaymentAmountEl.select();
  }
}

function createRentPaymentPayload() {
  const buildingId = String(
    rentPaymentBuildingSelectEl?.value || state.selectedRentPaymentBuildingId || ""
  ).trim();

  return {
    buildingId,
    houseNumber: normalizeHouse(rentPaymentHouseEl?.value),
    payload: {
      buildingId,
      billingMonth: toBillingMonth(rentPaymentMonthEl?.value) || undefined,
      amountKsh: Number(rentPaymentAmountEl?.value),
      provider: String(rentPaymentProviderEl?.value ?? "cash"),
      providerReference: String(rentPaymentReferenceEl?.value ?? "").trim(),
      paidAt: toIsoFromDateTimeLocal(rentPaymentPaidAtEl?.value) || undefined
    }
  };
}

function prefillRentPaymentFromStatus(action) {
  const buildingId = String(action?.buildingId ?? "").trim();
  const houseNumber = normalizeHouse(action?.houseNumber);
  const billingMonth = String(action?.billingMonth ?? "").trim();
  const amountKsh = Math.max(0, Number(action?.amountKsh ?? 0));

  if (!buildingId || !houseNumber || !Number.isFinite(amountKsh) || amountKsh <= 0) {
    showError("Rent payment shortcut is missing room or balance details. Refresh and try again.");
    return;
  }

  state.selectedRentPaymentBuildingId = buildingId;
  if (rentPaymentBuildingSelectEl instanceof HTMLSelectElement) {
    syncRentPaymentBuildingOptions();
    rentPaymentBuildingSelectEl.value = buildingId;
  }
  if (rentPaymentHouseEl instanceof HTMLInputElement) {
    rentPaymentHouseEl.value = houseNumber;
  }
  if (rentPaymentMonthEl instanceof HTMLInputElement) {
    rentPaymentMonthEl.value = billingMonth;
  }
  if (rentPaymentAmountEl instanceof HTMLInputElement) {
    rentPaymentAmountEl.value = String(Math.round(amountKsh));
  }
  if (rentPaymentProviderEl instanceof HTMLSelectElement) {
    rentPaymentProviderEl.value = "cash";
  }
  if (rentPaymentPaidAtEl instanceof HTMLInputElement) {
    rentPaymentPaidAtEl.value = "";
  }
  if (rentPaymentReferenceEl instanceof HTMLInputElement) {
    rentPaymentReferenceEl.value = "";
  }
  if (rentPaymentDetailsEl instanceof HTMLDetailsElement) {
    rentPaymentDetailsEl.open = true;
  }
  if (rentPaymentHelpEl instanceof HTMLElement) {
    const buildingLabel = getBuildingDisplayNameById(buildingId);
    rentPaymentHelpEl.textContent = `${formatCurrency(amountKsh)} for ${buildingLabel} ${houseNumber}.`;
  }

  clearError();
  setActiveLandlordView("tenants");
  scrollToLandlordSection("overview-rent-status-section");
  window.requestAnimationFrame(() => {
    if (rentPaymentAmountEl instanceof HTMLInputElement) {
      rentPaymentAmountEl.focus();
      rentPaymentAmountEl.select();
    }
  });
}

async function loadBuildings() {
  const payload = await requestJson("/api/landlord/buildings");
  setBuildings(payload.data ?? []);
  state.residentUsersCount = state.buildings.reduce(
    (sum, item) => sum + Number(item.residentUsers ?? 0),
    0
  );
  renderBuildings(state.buildings);
  renderRoomBuildingOptions();
  renderBuildingPhotoOptions();
  renderWifiPackageBuildingOptions(state.buildings);
  renderGlobalSearchBuildingOptions();
  renderRegistryBuildingOptions();
  renderResidentsBuildingOptions();
  renderMetrics();
  updateLandlordBranding();
}

async function loadApplications() {
  const status = String(applicationStatusFilterEl.value || "pending");
  const payload = await requestJson(
    `/api/landlord/tenant-applications?status=${encodeURIComponent(status)}`
  );
  state.applications = payload.data ?? [];
  if (status === "pending") {
    state.pendingApplicationsCount = state.applications.length;
    updateApplicationsIndicator();
  }
  renderApplications(state.applications);
}

async function refreshPendingApplicationsIndicator() {
  const payload = await requestJson("/api/landlord/tenant-applications?status=pending");
  const pendingRows = Array.isArray(payload.data) ? payload.data : [];
  const previousCount = Number(state.pendingApplicationsCount ?? 0);

  state.pendingApplicationsCount = pendingRows.length;
  updateApplicationsIndicator();

  if (previousCount > 0 && pendingRows.length > previousCount) {
    const newItems = pendingRows.length - previousCount;
    setStatus(
      `${newItems} new tenant application${newItems === 1 ? "" : "s"} waiting for review.`
    );
  }

  if (String(applicationStatusFilterEl.value || "pending") === "pending") {
    state.applications = pendingRows;
    renderApplications(state.applications);
  }
}

async function loadRentStatus() {
  const payload = await requestJson("/api/landlord/rent-collection-status?limit=1200");
  state.rentStatus = payload.data ?? [];
  renderRentStatus(state.rentStatus);
  renderOverviewCollections(state.rentStatus);
}

async function loadResidents() {
  if (!(residentsBuildingSelectEl instanceof HTMLSelectElement)) {
    return;
  }

  const selection = String(
    residentsBuildingSelectEl.value || state.selectedResidentsBuildingId || ""
  ).trim();

  if (!selection && Array.isArray(state.buildings) && state.buildings.length > 0) {
    state.selectedResidentsBuildingId = "all";
  } else {
    state.selectedResidentsBuildingId = selection;
  }

  const buildingIds =
    state.selectedResidentsBuildingId === "all"
      ? state.buildings.map((item) => item.id)
      : state.selectedResidentsBuildingId
        ? [state.selectedResidentsBuildingId]
        : [];

  if (buildingIds.length === 0) {
    setResidentDirectory([]);
    renderResidentDirectory([]);
    return;
  }

  const query = new URLSearchParams();
  if (buildingIds.length === 1) {
    query.set("buildingId", buildingIds[0]);
  }

  const payload = await requestJson(
    `/api/landlord/resident-directory${query.size > 0 ? `?${query.toString()}` : ""}`
  );
  const residents = Array.isArray(payload.data) ? payload.data : [];
  setResidentDirectory(dedupeResidentDirectoryRows(residents));
  renderResidentDirectory(state.residentDirectory);
}

async function loadPaymentAccess() {
  const payload = await requestJson("/api/landlord/payment-access-controls");
  setPaymentAccess(payload.data ?? []);
  renderPaymentAccess(state.paymentAccess);
  syncRentPaymentBuildingOptions();
  syncRentSheetBuildingOptions();
}

async function loadPaymentProfiles() {
  const payload = await requestJson("/api/landlord/payment-profiles");
  setPaymentProfiles(payload.data ?? {});
  renderPaymentProfiles();
}

async function loadPaymentInstructions() {
  const payload = await requestJson("/api/landlord/payment-instructions");
  setPaymentInstructions(payload.data ?? []);
  renderPaymentInstructions();
}

async function loadLandlordWifiPackages() {
  const buildingId =
    String(
      wifiPackageBuildingSelectEl?.value || state.selectedWifiPackageBuildingId || ""
    ).trim();

  state.selectedWifiPackageBuildingId = buildingId;
  state.wifiPackagesUnavailableReason = "";
  if (!buildingId) {
    state.wifiPackages = [];
    state.wifiPackagesUnavailableReason = "Wi-Fi is hidden because no building has it enabled.";
    renderWifiPackages([]);
    return;
  }

  try {
    const payload = await requestJson(
      `/api/landlord/buildings/${encodeURIComponent(buildingId)}/wifi/packages`
    );
    state.wifiPackages = Array.isArray(payload.data) ? payload.data : [];
    renderWifiPackages(state.wifiPackages);
  } catch (error) {
    if (isMissingRouteError(error)) {
      state.wifiPackages = [];
      state.wifiPackagesUnavailableReason =
        "Wi-Fi package controls are unavailable on this server.";
      renderWifiPackages([]);
      return;
    }

    throw error;
  }
}

async function loadCaretakers() {
  const buildingId =
    state.selectedCaretakerBuildingId ||
    state.selectedRegistryBuildingId ||
    state.buildings[0]?.id ||
    "";

  state.selectedCaretakerBuildingId = buildingId;
  if (!buildingId) {
    state.caretakers = [];
    renderCaretakers(state.caretakers);
    return;
  }

  const payload = await requestJson(
    `/api/landlord/buildings/${encodeURIComponent(buildingId)}/caretakers`
  );
  state.caretakers = payload.data ?? [];
  renderCaretakers(state.caretakers);
}

async function loadOwnerStaff() {
  if (isCaretakerRole()) {
    setOwnerStaffData({ users: [], limit: state.ownerStaffLimit, remaining: 0 });
    renderOwnerStaff();
    return;
  }

  const payload = await requestJson("/api/landlord/staff");
  setOwnerStaffData(payload.data);
  renderOwnerStaff();
}

async function loadCaretakerAccessRequests() {
  const buildingId =
    state.selectedCaretakerBuildingId ||
    state.selectedRegistryBuildingId ||
    state.buildings[0]?.id ||
    "";

  state.selectedCaretakerBuildingId = buildingId;
  if (!buildingId) {
    state.caretakerRequests = [];
    renderCaretakerRequests(state.caretakerRequests);
    return;
  }

  const payload = await requestJson(
    `/api/landlord/caretaker-access-requests?status=pending&buildingId=${encodeURIComponent(buildingId)}`
  );
  state.caretakerRequests = Array.isArray(payload.data) ? payload.data : [];
  renderCaretakerRequests(state.caretakerRequests);
}

async function loadLandlordTickets() {
  const params = new URLSearchParams();
  const status = String(landlordTicketFilterStatusEl?.value || "").trim();
  const queue = String(landlordTicketFilterQueueEl?.value || "").trim();
  const buildingId = String(landlordTicketBuildingSelectEl?.value || "").trim();
  state.selectedTicketBuildingId = buildingId;

  if (status) {
    params.set("status", status);
  }
  if (queue) {
    params.set("queue", queue);
  }
  if (buildingId) {
    params.set("buildingId", buildingId);
  }
  params.set("limit", "300");

  const payload = await requestJson(`/api/landlord/tickets?${params.toString()}`);
  state.tickets = payload.data ?? [];
  renderLandlordTickets(state.tickets);
}

async function loadRegistryRows() {
  const buildingId = String(
    registryBuildingSelectEl.value || state.selectedRegistryBuildingId || ""
  ).trim();

  state.selectedRegistryBuildingId = buildingId;
  if (!buildingId) {
    setRegistryRows([]);
    setRegistryReadingBills([]);
    setUtilityPricingState(null, null, "");
    state.registryMonthlyCombinedCharge = null;
    syncUtilitySheetRateDefaults();
    syncUtilitySheetBuildingFixedDefaults();
    syncUtilitySheetBuildingCombinedCharge();
    renderRegistryRows(state.registryRows);
    renderUtilitySheetRows(state.registryRows);
    return;
  }

  const payload = await requestJson(
    `/api/landlord/buildings/${encodeURIComponent(buildingId)}/utility-registry`
  );
  setRegistryRows(payload.data ?? []);
  setUtilityPricingState(
    payload.buildingConfiguration ?? null,
    payload.rateDefaults ?? { buildingId },
    buildingId
  );
  await loadRegistryMonthlyCombinedCharge();
  syncUtilitySheetRateDefaults();
  syncUtilitySheetBuildingFixedDefaults();
  syncUtilitySheetBuildingCombinedCharge();
  syncUtilityBillInputMode();
  renderRegistryRows(state.registryRows);
  if (
    utilitySheetModalEl instanceof HTMLElement &&
    !utilitySheetModalEl.classList.contains("hidden")
  ) {
    renderUtilitySheetRows(state.registryRows);
  }
}

async function loadMeters() {
  const buildingId = getSelectedUtilityBuildingId();
  const payload = await requestJson(
    withBuildingQuery("/api/landlord/utilities/meters", buildingId)
  );
  setMeters(payload.data ?? []);
  renderMeters(state.meters);
  if (
    utilitySheetModalEl instanceof HTMLElement &&
    !utilitySheetModalEl.classList.contains("hidden")
  ) {
    renderUtilitySheetRows(state.registryRows);
  }
  syncUtilityBillInputMode();
  renderMetrics();
}

async function loadBills() {
  const buildingId = getUtilityLedgerBuildingId();
  const payload = await requestJson(
    withBuildingQuery("/api/landlord/utilities/bills", buildingId, "limit=600")
  );
  setBills(payload.data ?? []);
  syncRegistryReadingMonthInput();
  renderUtilityRoomSummary(state.bills);
  renderUtilityBills(state.bills);
  renderRegistryRows(state.registryRows);
  if (
    utilitySheetModalEl instanceof HTMLElement &&
    !utilitySheetModalEl.classList.contains("hidden")
  ) {
    renderUtilitySheetRows(state.registryRows);
  }
  renderMetrics();
}

async function loadRegistryReadingBills() {
  const buildingId = getSelectedUtilityBuildingId();
  syncRegistryReadingMonthInput();
  const billingMonth = getSelectedRegistryReadingMonth();

  if (!buildingId || !billingMonth) {
    setRegistryReadingBills([]);
    renderRegistryRows(state.registryRows);
    return;
  }

  const payload = await requestJson(
    withBuildingQuery(
      "/api/landlord/utilities/bills",
      buildingId,
      new URLSearchParams({
        billingMonth,
        limit: "600"
      }).toString()
    )
  );
  setRegistryReadingBills(payload.data ?? []);
  renderRegistryRows(state.registryRows);
}

async function loadPayments() {
  const buildingId = getSelectedUtilityBuildingId();
  const payload = await requestJson(
    withBuildingQuery("/api/landlord/utilities/payments", buildingId, "limit=600")
  );
  state.payments = payload.data ?? [];
  renderUtilityPayments(state.payments);
  renderMetrics();
}

async function loadExpenditures() {
  const buildingId = getSelectedUtilityBuildingId();
  const payload = await requestJson(
    withBuildingQuery("/api/landlord/expenditures", buildingId)
  );
  state.expenditures = payload.data ?? [];
  renderExpenditures(state.expenditures);
}

async function loadMoveOutSettlements() {
  const buildingId = getSelectedUtilityBuildingId();
  try {
    const payload = await requestJson(
      withBuildingQuery("/api/landlord/move-out-settlements", buildingId, "limit=500")
    );
    state.moveOutSettlements = payload.data ?? [];
    renderMoveOutSettlementReport(state.moveOutSettlements);
  } catch (error) {
    if (isMissingRouteError(error)) {
      state.moveOutSettlements = [];
      renderMoveOutSettlementReport(state.moveOutSettlements);
      return;
    }
    throw error;
  }
}

async function activateBuilding(buildingId, options = {}) {
  const normalizedBuildingId = String(buildingId ?? "").trim();
  if (!normalizedBuildingId) {
    return;
  }

  setPreferredBuildingSelection(normalizedBuildingId, {
    includeResidents: options.includeResidents
  });

  if (options.view) {
    setActiveLandlordView(options.view);
  }

  await Promise.all([
    loadRegistryRows(),
    loadMeters(),
    loadBills(),
    loadPayments(),
    loadExpenditures(),
    loadMoveOutSettlements(),
    loadCaretakerAccessRequests(),
    loadCaretakers(),
    loadLandlordTickets(),
    loadResidents()
  ]);
}

function applyLandlordStartupData(startup) {
  const selection = startup?.selection ?? {};
  setBuildings(startup?.buildings ?? []);
  setPaymentAccess(startup?.paymentAccess ?? []);
  setPaymentProfiles({
    profiles: startup?.paymentProfiles ?? [],
    assignments: startup?.buildingPaymentProfiles ?? []
  });
  setPaymentInstructions(startup?.buildingPaymentInstructions ?? []);
  const deepLinkBuildingId = getRoomsDeepLinkBuildingId();
  const hasDeepLinkBuilding = state.buildings.some(
    (item) => item.id === deepLinkBuildingId
  );

  state.selectedRoomBuildingId = String(
    (hasDeepLinkBuilding ? deepLinkBuildingId : selection.roomBuildingId) ||
      state.buildings[0]?.id ||
      ""
  ).trim();
  state.selectedRegistryBuildingId = String(
    (hasDeepLinkBuilding ? deepLinkBuildingId : selection.registryBuildingId) ||
      state.buildings[0]?.id ||
      ""
  ).trim();
  state.selectedCaretakerBuildingId = String(
    selection.caretakerBuildingId || state.selectedRegistryBuildingId || ""
  ).trim();
  state.selectedResidentsBuildingId = state.buildings.length
    ? String(hasDeepLinkBuilding ? deepLinkBuildingId : selection.residentsBuildingId || "all").trim() || "all"
    : "";
  state.selectedOverviewRoomBuildingId =
    String(hasDeepLinkBuilding ? deepLinkBuildingId : selection.overviewRoomBuildingId || "all").trim() || "all";
  state.selectedTicketBuildingId = String(selection.ticketBuildingId || "").trim();
  state.selectedWifiPackageBuildingId = String(
    selection.wifiPackageBuildingId || ""
  ).trim();
  state.selectedRentPaymentBuildingId = String(
    selection.rentPaymentBuildingId || ""
  ).trim();

  state.residentUsersCount = state.buildings.reduce(
    (sum, item) => sum + Number(item.residentUsers ?? 0),
    0
  );
  state.applications = Array.isArray(startup?.applications) ? startup.applications : [];
  state.pendingApplicationsCount = Number.isFinite(Number(startup?.pendingApplicationsCount))
    ? Number(startup.pendingApplicationsCount)
    : String(applicationStatusFilterEl?.value || "pending") === "pending"
      ? state.applications.length
      : 0;
  state.rentStatus = Array.isArray(startup?.rentStatus) ? startup.rentStatus : [];
  setRegistryRows(Array.isArray(startup?.registryRows) ? startup.registryRows : []);
  setUtilityPricingState(
    startup?.utilityBuildingConfiguration ?? null,
    startup?.utilityRateDefaults ?? null,
    state.selectedRegistryBuildingId
  );
  state.utilitySheetMonthlyCombinedCharge = null;
  state.caretakerRequests = Array.isArray(startup?.caretakerRequests)
    ? startup.caretakerRequests
    : [];
  state.caretakers = Array.isArray(startup?.caretakers) ? startup.caretakers : [];
  setOwnerStaffData(startup?.ownerStaff);
  state.ownerNotifications = Array.isArray(startup?.ownerNotifications?.notifications)
    ? startup.ownerNotifications.notifications
    : [];
  state.ownerNotificationsUnreadCount = Number.isFinite(
    Number(startup?.ownerNotifications?.unreadCount)
  )
    ? Number(startup.ownerNotifications.unreadCount)
    : state.ownerNotifications.filter((item) => !item.read).length;
  state.tickets = Array.isArray(startup?.tickets) ? startup.tickets : [];
  setResidentDirectory(
    dedupeResidentDirectoryRows(
      Array.isArray(startup?.residentDirectory) ? startup.residentDirectory : []
    )
  );
  setMeters(Array.isArray(startup?.meters) ? startup.meters : []);
  setBills(Array.isArray(startup?.bills) ? startup.bills : []);
  state.payments = Array.isArray(startup?.payments) ? startup.payments : [];
  state.expenditures = Array.isArray(startup?.expenditures) ? startup.expenditures : [];
  state.moveOutSettlements = Array.isArray(startup?.moveOutSettlements)
    ? startup.moveOutSettlements
    : [];
  state.wifiPackages = Array.isArray(startup?.wifiPackages) ? startup.wifiPackages : [];
  state.wifiPackagesUnavailableReason =
    typeof startup?.wifiPackagesUnavailableReason === "string"
      ? startup.wifiPackagesUnavailableReason
      : "";

  renderBuildings(state.buildings);
  renderRoomBuildingOptions();
  renderBuildingPhotoOptions();
  renderWifiPackageBuildingOptions(state.buildings);
  renderGlobalSearchBuildingOptions();
  renderRegistryBuildingOptions();
  renderResidentsBuildingOptions();
  renderPaymentAccess(state.paymentAccess);
  renderPaymentProfiles();
  renderPaymentInstructions();
  renderApplications(state.applications);
  updateApplicationsIndicator();
  renderRentStatus(state.rentStatus);
  renderOverviewCollections(state.rentStatus);
  syncUtilitySheetRateDefaults();
  syncUtilitySheetBuildingFixedDefaults();
  syncUtilitySheetBuildingCombinedCharge();
  syncUtilityBillInputMode();
  renderRegistryRows(state.registryRows);
  renderResidentDirectory(state.residentDirectory);
  renderWifiPackages(state.wifiPackages);
  renderOwnerStaff();
  renderOwnerNotifications();
  renderCaretakerRequests(state.caretakerRequests);
  renderCaretakers(state.caretakers);
  renderLandlordTickets(state.tickets);
  renderMeters(state.meters);
  renderUtilityRoomSummary(state.bills);
  renderUtilityBills(state.bills);
  renderUtilityPayments(state.payments);
  renderExpenditures(state.expenditures);
  renderMoveOutSettlementReport(state.moveOutSettlements);
  renderMetrics();
  updateLandlordBranding();

  if (
    utilitySheetModalEl instanceof HTMLElement &&
    !utilitySheetModalEl.classList.contains("hidden")
  ) {
    renderUtilitySheetRows(state.registryRows);
  }
}

async function loadDataLegacy() {
  clearError();

  try {
    await loadBuildings();
    await Promise.all([
      loadApplications(),
      loadRentStatus(),
      loadPaymentAccess(),
      loadPaymentProfiles(),
      loadPaymentInstructions(),
      loadLandlordWifiPackages(),
      loadOwnerStaff(),
      loadCaretakerAccessRequests(),
      loadCaretakers(),
      loadLandlordTickets(),
      loadMeters(),
      loadBills(),
      loadPayments(),
      loadExpenditures(),
      loadMoveOutSettlements()
    ]);
    await loadRegistryRows();
    await loadResidents();
    setStatus(`Signed in as ${formatRoleLabel(state.role)}. Data refreshed.`);
  } catch (error) {
    handleLandlordError(error, "Unable to load manager data.");
    setStatus("Manager data load failed.");
  }
}

async function loadData() {
  clearError();

  try {
    const payload = await requestJson("/api/landlord/startup");
    applyLandlordStartupData(payload.data ?? {});
    setStatus(`Signed in as ${formatRoleLabel(state.role)}. Data refreshed.`);
  } catch (error) {
    if (isMissingRouteError(error)) {
      await loadDataLegacy();
      return;
    }

    handleLandlordError(error, "Unable to load manager data.");
    setStatus("Manager data load failed.");
  }
}

async function signOut() {
  try {
    await requestJson("/api/auth/logout", {
      method: "POST"
    });
  } catch (_error) {
    // continue logout redirect
  }

  redirectToLogin();
}

landlordNavButtons.forEach((button) => {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  button.addEventListener("click", () => {
    const targetView =
      button.dataset.landlordView || button.dataset.landlordFocusTargetView;
    setActiveLandlordView(targetView);
    const sectionTarget = String(
      button.dataset.landlordSectionTarget ||
        button.dataset.landlordFocusTargetSection ||
        ""
    ).trim();
    if (sectionTarget) {
      scrollToLandlordSection(sectionTarget);
    }
  });
});

metricCardButtons.forEach((button) => {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  button.addEventListener("click", () => {
    openMetricTarget(String(button.dataset.metricTarget || ""));
  });
});

openCreateBuildingDrawerButtons.forEach((button) => {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  button.addEventListener("click", () => {
    openCreateBuildingDrawer();
  });
});

closeCreateBuildingDrawerBtnEl?.addEventListener("click", () => {
  closeCreateBuildingDrawer();
});

closeBuildingDrawerBtnEl?.addEventListener("click", () => {
  closeBuildingDrawer();
});

buildingDrawerBackdropEl?.addEventListener("click", () => {
  closeCreateBuildingDrawer();
  closeBuildingDrawer();
});

closeResidentDrawerBtnEl?.addEventListener("click", () => {
  closeResidentDrawer();
});

residentDrawerBackdropEl?.addEventListener("click", () => {
  closeResidentDrawer();
});

openUtilitySetupBtnEl?.addEventListener("click", () => {
  void openUtilitySetupModal().catch((error) => {
    handleLandlordError(error, "Unable to open utility setup.");
  });
});

closeUtilitySetupBtnEl?.addEventListener("click", () => {
  closeUtilitySetupModal();
});

utilitySetupBackdropEl?.addEventListener("click", () => {
  closeUtilitySetupModal();
});

openUtilitySheetBtnEl?.addEventListener("click", () => {
  void openUtilitySheetModal();
});

openRentSheetBtnEl?.addEventListener("click", () => {
  void openRentSheetModal();
});

closeUtilitySheetBtnEl?.addEventListener("click", () => {
  closeUtilitySheetModal();
});

closeRentSheetBtnEl?.addEventListener("click", () => {
  closeRentSheetModal();
});

utilitySheetBackdropEl?.addEventListener("click", () => {
  closeUtilitySheetModal();
});

rentSheetBackdropEl?.addEventListener("click", () => {
  closeRentSheetModal();
});

utilitySheetReloadBtnEl?.addEventListener("click", () => {
  void openUtilitySheetModal();
});

rentSheetReloadBtnEl?.addEventListener("click", () => {
  void loadRentSheetRows().catch((error) => {
    handleLandlordError(error, "Failed to reload rent sheet.");
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCreateBuildingDrawer();
    closeBuildingDrawer();
    closeUtilitySetupModal();
    closeUtilitySheetModal();
    closeRentSheetModal();
    closeResidentDrawer();
  }
});

generateHouseNumbersBtnEl?.addEventListener("click", () => {
  try {
    const generated = buildGeneratedHouseNumbers();
    buildingHouseNumbersEl.value = generated.join(", ");
    renderGeneratedHousePreview(generated);
    renderBuildingRoomDrawerState();
    clearError();
  } catch (error) {
    handleLandlordError(error, "Unable to generate room numbers.");
  }
});

buildingHouseNumbersEl?.addEventListener("input", () => {
  try {
    renderGeneratedHousePreview(parseHouseNumbers(buildingHouseNumbersEl.value));
  } catch (_error) {
    renderGeneratedHousePreview([]);
  }
  renderBuildingRoomDrawerState();
});

roomTargetBuildingEl?.addEventListener("change", () => {
  state.selectedRoomBuildingId = String(roomTargetBuildingEl.value || "").trim();
  renderBuildingRoomDrawerState();
  updateLandlordBranding();
});

ownerStaffFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  if (isCaretakerRole()) {
    showError("House manager accounts cannot manage owner/staff access.");
    return;
  }

  const fullName = String(ownerStaffNameEl?.value || "").trim();
  const email = String(ownerStaffEmailEl?.value || "").trim();
  const phoneNumber = String(ownerStaffPhoneEl?.value || "").trim();
  const temporaryPassword = String(ownerStaffPasswordEl?.value || "");
  const note = String(ownerStaffNoteEl?.value || "").trim() || undefined;
  if (!fullName || !email || !phoneNumber || !temporaryPassword) {
    showError("Owner/staff access requires name, email, phone, and password.");
    return;
  }

  if (ownerStaffSubmitBtnEl instanceof HTMLButtonElement) {
    ownerStaffSubmitBtnEl.disabled = true;
  }

  void (async () => {
    try {
      const payload = await requestJson("/api/landlord/staff", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          fullName,
          email,
          phoneNumber,
          temporaryPassword,
          note
        })
      });

      if (ownerStaffNameEl instanceof HTMLInputElement) {
        ownerStaffNameEl.value = "";
      }
      if (ownerStaffEmailEl instanceof HTMLInputElement) {
        ownerStaffEmailEl.value = "";
      }
      if (ownerStaffPhoneEl instanceof HTMLInputElement) {
        ownerStaffPhoneEl.value = "";
      }
      if (ownerStaffPasswordEl instanceof HTMLInputElement) {
        ownerStaffPasswordEl.value = "";
      }
      if (ownerStaffNoteEl instanceof HTMLInputElement) {
        ownerStaffNoteEl.value = "";
      }

      setOwnerStaffData(payload.data?.ownerStaff ?? payload.data);
      renderOwnerStaff();
      setStatus("Owner/staff account added.");
    } catch (error) {
      handleLandlordError(error, "Failed to add owner/staff account.");
    } finally {
      renderOwnerStaff();
    }
  })();
});

ownerStaffBodyEl?.addEventListener("click", (event) => {
  const target = event.target;
  const button =
    target instanceof HTMLElement
      ? target.closest("[data-action='disable-owner-staff']")
      : null;
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const userId = String(button.dataset.userId || "").trim();
  if (!userId) {
    return;
  }

  const shouldProceed = window.confirm("Disable this owner/staff account?");
  if (!shouldProceed) {
    return;
  }

  button.disabled = true;
  clearError();

  void (async () => {
    try {
      const payload = await requestJson(
        `/api/landlord/staff/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            confirmUserId: userId,
            confirmationText: "DISABLE"
          })
        }
      );

      setOwnerStaffData(payload.data?.ownerStaff ?? payload.data);
      renderOwnerStaff();
      setStatus("Owner/staff account disabled.");
    } catch (error) {
      handleLandlordError(error, "Failed to disable owner/staff account.");
    } finally {
      button.disabled = false;
    }
  })();
});

caretakerBuildingSelectEl?.addEventListener("change", () => {
  state.selectedCaretakerBuildingId = String(caretakerBuildingSelectEl.value || "").trim();
  updateLandlordBranding();
  void Promise.all([loadCaretakers(), loadCaretakerAccessRequests()]).catch((error) => {
    handleLandlordError(error, "Unable to load house managers.");
  });
});

caretakerFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  if (isCaretakerRole()) {
    showError("House manager accounts cannot approve house managers.");
    return;
  }

  const buildingId = String(caretakerBuildingSelectEl?.value || "").trim();
  const identifier = String(caretakerIdentifierEl?.value || "").trim();
  const houseNumber = normalizeHouse(caretakerHouseNumberEl?.value || "");
  const note = String(caretakerNoteEl?.value || "").trim() || undefined;
  if (!buildingId || !identifier || !houseNumber) {
    showError("House manager approval requires building, phone/email, and house.");
    return;
  }

  const submitButton = caretakerFormEl.querySelector("button[type='submit']");
  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true;
  }

  void (async () => {
    try {
      await requestJson(
        `/api/landlord/buildings/${encodeURIComponent(buildingId)}/caretakers`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            identifier,
            houseNumber,
            note
          })
        }
      );

      if (caretakerIdentifierEl instanceof HTMLInputElement) {
        caretakerIdentifierEl.value = "";
      }
      if (caretakerHouseNumberEl instanceof HTMLInputElement) {
        caretakerHouseNumberEl.value = "";
      }
      if (caretakerNoteEl instanceof HTMLInputElement) {
        caretakerNoteEl.value = "";
      }

      setStatus(`House manager approved for ${buildingId}.`);
      await Promise.all([loadCaretakers(), loadCaretakerAccessRequests()]);
    } catch (error) {
      handleLandlordError(error, "Failed to approve house manager.");
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  })();
});

caretakersBodyEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.action !== "revoke-caretaker") {
    return;
  }

  const buildingId = String(caretakerBuildingSelectEl?.value || "").trim();
  const userId = String(target.dataset.userId || "").trim();
  if (!buildingId || !userId) {
    return;
  }

  const shouldProceed = window.confirm("Revoke house manager access for this building?");
  if (!shouldProceed) {
    return;
  }

  target.disabled = true;
  clearError();

  void (async () => {
    try {
      await requestJson(
        `/api/landlord/buildings/${encodeURIComponent(buildingId)}/caretakers/${encodeURIComponent(userId)}`,
        {
          method: "DELETE"
        }
      );

      setStatus(`House manager access revoked for ${buildingId}.`);
      await loadCaretakers();
    } catch (error) {
      handleLandlordError(error, "Failed to revoke house manager.");
    } finally {
      target.disabled = false;
    }
  })();
});

caretakerRequestsBodyEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const requestId = String(target.dataset.requestId || "").trim();
  const action = String(target.dataset.action || "").trim();
  if (
    !requestId ||
    (action !== "approve-caretaker-request" && action !== "reject-caretaker-request")
  ) {
    return;
  }

  const approved = action === "approve-caretaker-request";
  const shouldProceed = window.confirm(
    approved
      ? "Approve this house manager request for the selected building?"
      : "Reject this house manager request?"
  );
  if (!shouldProceed) {
    return;
  }

  target.disabled = true;
  clearError();

  void (async () => {
    try {
      await requestJson(
        `/api/landlord/caretaker-access-requests/${encodeURIComponent(requestId)}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            action: approved ? "approve" : "reject"
          })
        }
      );

      setStatus(
        approved
          ? "House manager request approved."
          : "House manager request rejected."
      );
      await Promise.all([loadCaretakerAccessRequests(), loadCaretakers()]);
    } catch (error) {
      handleLandlordError(error, "Failed to review house manager request.");
    } finally {
      target.disabled = false;
    }
  })();
});

paymentAccessBodyEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (isCaretakerRole()) {
    showError("House manager accounts cannot change payment access controls.");
    return;
  }

  if (target.dataset.action !== "save-payment-access") {
    return;
  }

  const buildingId = target.dataset.buildingId;
  if (!buildingId) {
    return;
  }

  const row = target.closest("tr");
  if (!row) {
    return;
  }

  const rentInput = row.querySelector('input[data-setting="rentEnabled"]');
  const waterInput = row.querySelector('input[data-setting="waterEnabled"]');
  const electricityInput = row.querySelector(
    'input[data-setting="electricityEnabled"]'
  );
  if (
    !(rentInput instanceof HTMLInputElement) ||
    !(waterInput instanceof HTMLInputElement) ||
    !(electricityInput instanceof HTMLInputElement)
  ) {
    return;
  }

  const current = getPaymentAccessRecord(buildingId);
  if (!current) {
    showError("Current payment access settings not found. Refresh and retry.");
    return;
  }

  const nextValue = {
    rentEnabled: Boolean(rentInput.checked),
    waterEnabled: Boolean(waterInput.checked),
    electricityEnabled: Boolean(electricityInput.checked)
  };

  const changes = [];
  if (nextValue.rentEnabled !== Boolean(current.rentEnabled)) {
    changes.push(
      `Rent payments will be ${nextValue.rentEnabled ? "enabled" : "disabled"}`
    );
  }
  if (nextValue.waterEnabled !== Boolean(current.waterEnabled)) {
    changes.push(
      `Water payments will be ${nextValue.waterEnabled ? "enabled" : "disabled"}`
    );
  }
  if (nextValue.electricityEnabled !== Boolean(current.electricityEnabled)) {
    changes.push(
      `Electricity payments will be ${nextValue.electricityEnabled ? "enabled" : "disabled"}`
    );
  }

  if (changes.length === 0) {
    setStatus("No payment access changes detected.");
    return;
  }

  const buildingLabel = current.buildingName ?? buildingId;
  const confirmation = window.confirm(
    [
      `Apply payment access changes for ${buildingLabel}?`,
      "",
      "Effects:",
      ...changes.map((item) => `- ${item}`),
      "- Residents in this building will see disabled payment sections greyed out and locked immediately."
    ].join("\n")
  );

  if (!confirmation) {
    return;
  }

  const noteRaw = window.prompt(
    "Optional note for this change (visible in audit details). Leave blank to skip."
  );
  const note =
    noteRaw == null || String(noteRaw).trim().length === 0
      ? undefined
      : String(noteRaw).trim();

  target.disabled = true;
  clearError();

  void (async () => {
    try {
      await requestJson(
        `/api/landlord/payment-access-controls/${encodeURIComponent(buildingId)}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            ...nextValue,
            acknowledgeImpact: true,
            note
          })
        }
      );

      setStatus(`Payment access updated for ${buildingLabel}.`);
      await loadPaymentAccess();
    } catch (error) {
      handleLandlordError(error, "Failed to update payment access.");
    } finally {
      target.disabled = false;
    }
  })();
});

paymentProfilesBodyEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (isCaretakerRole()) {
    showError("House manager accounts cannot change payment routing.");
    return;
  }

  if (target.dataset.action !== "save-payment-profile") {
    return;
  }

  const buildingId = target.dataset.buildingId;
  if (!buildingId) {
    return;
  }

  const row = target.closest("tr");
  if (!row) {
    return;
  }

  const profileSelect = row.querySelector('select[data-setting="paymentProfileId"]');
  const accountInput = row.querySelector('input[data-setting="paymentAccountReference"]');
  if (
    !(profileSelect instanceof HTMLSelectElement) ||
    !(accountInput instanceof HTMLInputElement)
  ) {
    return;
  }

  const profileId = String(profileSelect.value || "default").trim();
  const accountReference = String(accountInput.value || "").trim() || undefined;
  const profile = state.paymentProfiles.find((item) => item.id === profileId);
  const assignment = state.buildingPaymentProfileByBuildingId.get(
    normalizeLookupBuildingId(buildingId)
  );
  const buildingLabel = assignment?.buildingName || getBuildingDisplayNameById(buildingId);

  if (!profile) {
    showError("Selected payment profile was not found. Refresh and retry.");
    return;
  }

  if (!profile.isConfigured) {
    const missing = Array.isArray(profile.missing) ? profile.missing.join(", ") : "secrets";
    const confirmation = window.confirm(
      `${profile.name} is not fully configured (${missing}). Save this routing anyway? Residents will not be able to initialize STK until backend env is updated.`
    );
    if (!confirmation) {
      return;
    }
  }

  const confirmation = window.confirm(
    [
      `Route rent STK payments for ${buildingLabel} through ${profile.name}?`,
      "",
      `Shortcode: ${profile.shortCode || "-"}`,
      `Party B: ${profile.partyB || "-"}`,
      `Account reference: ${accountReference || profile.accountReferencePrefix || "room number"}`
    ].join("\n")
  );
  if (!confirmation) {
    return;
  }

  const noteRaw = window.prompt(
    "Optional note for this routing change. Leave blank to skip."
  );
  const note =
    noteRaw == null || String(noteRaw).trim().length === 0
      ? undefined
      : String(noteRaw).trim();

  target.disabled = true;
  clearError();

  void (async () => {
    try {
      await requestJson(
        `/api/landlord/payment-profiles/${encodeURIComponent(buildingId)}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            profileId,
            accountReference,
            note
          })
        }
      );

      setStatus(`Payment routing updated for ${buildingLabel}.`);
      await loadPaymentProfiles();
    } catch (error) {
      handleLandlordError(error, "Failed to update payment routing.");
    } finally {
      target.disabled = false;
    }
  })();
});

paymentInstructionsBodyEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (isCaretakerRole()) {
    showError("House manager accounts cannot change payment instructions.");
    return;
  }

  if (target.dataset.action !== "save-payment-instructions") {
    return;
  }

  const buildingId = target.dataset.buildingId;
  if (!buildingId) {
    return;
  }

  const row = target.closest("tr");
  if (!row) {
    return;
  }

  const valueFor = (setting) => {
    const field = row.querySelector(`[data-setting="${setting}"]`);
    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement
    ) {
      const normalized = String(field.value || "").trim();
      return normalized || undefined;
    }
    return undefined;
  };

  const primaryMethod = valueFor("primaryMethod") || "mpesa";
  const current = state.buildingPaymentInstructionByBuildingId.get(
    normalizeLookupBuildingId(buildingId)
  );
  const buildingLabel = current?.buildingName || getBuildingDisplayNameById(buildingId);

  const confirmation = window.confirm(
    [
      `Update payment instructions for ${buildingLabel}?`,
      "",
      `Primary method: ${primaryMethod.toUpperCase()}`,
      "Residents in this building will see these details in their payment workspace."
    ].join("\n")
  );
  if (!confirmation) {
    return;
  }

  target.disabled = true;
  clearError();

  void (async () => {
    try {
      await requestJson(
        `/api/landlord/payment-instructions/${encodeURIComponent(buildingId)}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            primaryMethod,
            mpesaBusinessNumber: valueFor("mpesaBusinessNumber"),
            mpesaAccountReference: valueFor("mpesaAccountReference"),
            mpesaAccountName: valueFor("mpesaAccountName"),
            bankName: valueFor("bankName"),
            bankAccountName: valueFor("bankAccountName"),
            bankAccountNumber: valueFor("bankAccountNumber"),
            bankBranch: valueFor("bankBranch"),
            bankSwiftCode: valueFor("bankSwiftCode"),
            cashLocation: valueFor("cashLocation"),
            instructions: valueFor("instructions"),
            proofInstructions: valueFor("proofInstructions")
          })
        }
      );

      setStatus(`Payment instructions updated for ${buildingLabel}.`);
      await loadPaymentInstructions();
    } catch (error) {
      handleLandlordError(error, "Failed to update payment instructions.");
    } finally {
      target.disabled = false;
    }
  })();
});

buildingFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const buildingId = String(roomTargetBuildingEl?.value ?? "").trim();
  if (!buildingId) {
    showError("Select a building first.");
    return;
  }

  let houseNumbers;
  try {
    houseNumbers = parseHouseNumbers(buildingHouseNumbersEl.value);
  } catch (error) {
    showError(error instanceof Error ? error.message : "Invalid room range.");
    return;
  }
  if (houseNumbers.length === 0) {
    try {
      houseNumbers = buildGeneratedHouseNumbers();
      buildingHouseNumbersEl.value = houseNumbers.join(", ");
      renderGeneratedHousePreview(houseNumbers);
    } catch (_error) {
      // keep validation message below
    }
  }

  if (houseNumbers.length === 0) {
    showError("Provide at least one room/house number (e.g. A-1, A-2).");
    return;
  }

  const submitButton = buildingFormEl.querySelector("button[type='submit']");
  submitButton.disabled = true;

  void (async () => {
    try {
      const payload = await requestJson(
        `/api/landlord/buildings/${encodeURIComponent(buildingId)}/houses`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ houseNumbers })
        }
      );

      buildingHouseNumbersEl.value = "";
      renderGeneratedHousePreview([]);

      const addedCount = Number(payload?.data?.addedCount ?? houseNumbers.length);
      setStatus(
        addedCount > 0
          ? `Added ${addedCount} room(s) to building ${buildingId}.`
          : `No new rooms added to building ${buildingId}.`
      );
      await Promise.all([loadBuildings(), loadApplications()]);
      await loadRegistryRows();
      renderBuildingRoomDrawerState();
    } catch (error) {
      handleLandlordError(error, "Failed to add rooms to building.");
    } finally {
      submitButton.disabled = false;
    }
  })();
});

createBuildingFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const name = String(createBuildingNameEl?.value ?? "").trim();
  const county = String(createBuildingCountyEl?.value ?? "").trim();
  const address = String(createBuildingAddressEl?.value ?? "").trim();
  let houseNumbers;
  try {
    houseNumbers = parseHouseNumbers(createBuildingHouseNumbersEl?.value ?? "");
  } catch (error) {
    showError(error instanceof Error ? error.message : "Invalid room range.");
    return;
  }

  if (!name || !county || !address) {
    showError("Building name, county, and address are required.");
    return;
  }

  if (houseNumbers.length === 0) {
    showError("Provide at least one room/house number for the new building.");
    return;
  }

  const submitButton = createBuildingFormEl.querySelector("button[type='submit']");
  submitButton.disabled = true;

  void (async () => {
    try {
      let imageUrls = [];
      if (createBuildingPhotoEl instanceof HTMLInputElement) {
        const selectedFiles = validateImageFiles(createBuildingPhotoEl.files, {
          maxFiles: BUILDING_PHOTO_LIMIT,
          maxSizeMb: 10
        });
        if (selectedFiles.length > 0) {
          setStatus("Uploading building photo...");
          imageUrls = await uploadImageFiles(selectedFiles, {
            createUploadRequest: () => createBuildingPhotoUploadRequest()
          });
        }
      }

      const payload = await requestJson("/api/buildings", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name,
          county,
          address,
          houseNumbers,
          media: {
            imageUrls,
            videoUrls: []
          }
        })
      });

      const building = payload?.data ?? null;
      const createdBuildingId = String(building?.id ?? "").trim();
      const buildingLabel = String(building?.name ?? name).trim() || name;

      if (createBuildingNameEl instanceof HTMLInputElement) {
        createBuildingNameEl.value = "";
      }
      if (createBuildingCountyEl instanceof HTMLInputElement) {
        createBuildingCountyEl.value = "";
      }
      if (createBuildingAddressEl instanceof HTMLInputElement) {
        createBuildingAddressEl.value = "";
      }
      if (createBuildingHouseNumbersEl instanceof HTMLTextAreaElement) {
        createBuildingHouseNumbersEl.value = "";
      }
      if (createBuildingPhotoEl instanceof HTMLInputElement) {
        createBuildingPhotoEl.value = "";
      }

      if (createdBuildingId) {
        setPreferredBuildingSelection(createdBuildingId);
        if (buildingPhotoBuildingSelectEl instanceof HTMLSelectElement) {
          buildingPhotoBuildingSelectEl.value = createdBuildingId;
        }
      }

      await loadBuildings();
      if (createdBuildingId) {
        await activateBuilding(createdBuildingId, { view: "buildings" });
      }
      closeCreateBuildingDrawer();
      setStatus(`Created building ${buildingLabel}.`);
    } catch (error) {
      handleLandlordError(error, "Failed to create building.");
    } finally {
      submitButton.disabled = false;
    }
  })();
});

buildingPhotoFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const buildingId = String(buildingPhotoBuildingSelectEl?.value ?? "").trim();
  if (!buildingId) {
    showError("Select a building before saving a photo.");
    return;
  }

  if (!(buildingPhotoFileEl instanceof HTMLInputElement)) {
    showError("Building photo input is unavailable.");
    return;
  }

  void (async () => {
    const submitButton = buildingPhotoFormEl.querySelector("button[type='submit']");
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    try {
      const selectedFiles = validateImageFiles(buildingPhotoFileEl.files, {
        maxFiles: BUILDING_PHOTO_LIMIT,
        maxSizeMb: 10
      });
      if (selectedFiles.length === 0) {
        showError("Choose one front-facing building photo first.");
        return;
      }

      setStatus("Uploading building photo...");
      const imageUrls = await uploadImageFiles(selectedFiles, {
        createUploadRequest: () => createBuildingPhotoUploadRequest(buildingId)
      });

      await requestJson(`/api/landlord/buildings/${encodeURIComponent(buildingId)}/media`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          imageUrls
        })
      });

      buildingPhotoFileEl.value = "";
      setStatus("Building profile photo updated.");
      await loadBuildings();
    } catch (error) {
      handleLandlordError(error, "Failed to update building photo.");
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  })();
});

buildingPhotoBuildingSelectEl?.addEventListener("change", () => {
  syncBuildingPhotoPreview();
});

buildingPhotoFileEl?.addEventListener("change", () => {
  syncBuildingPhotoPreview();
});

buildingsBodyEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const buildingId = String(target.dataset.buildingId || "").trim();
  if (!buildingId) {
    return;
  }

  if (target.dataset.action === "open-room-drawer") {
    openBuildingDrawer(buildingId);
    return;
  }

  if (target.dataset.action === "delete-building") {
    const buildingName = String(
      target.dataset.buildingName || getBuildingDisplayNameById(buildingId)
    ).trim();
    handleDeleteBuildingClick(target, buildingId, buildingName);
    return;
  }

  if (target.dataset.action !== "switch-building") {
    return;
  }

  target.disabled = true;
  clearError();

  void activateBuilding(buildingId)
    .then(() => {
      const buildingName = String(
        target.dataset.buildingName || getBuildingDisplayNameById(buildingId)
      ).trim();
      setStatus(`Focused on ${buildingName}. The main landlord tools now follow this building.`);
    })
    .catch((error) => {
      handleLandlordError(error, "Failed to switch building.");
    })
    .finally(() => {
      target.disabled = false;
    });
});

function handleRemoveRoomClick(target, buildingId, houseNumber) {
  if (isCaretakerRole()) {
    showError("House manager accounts cannot remove rooms.");
    return;
  }

  const shouldProceed = window.confirm(
    `Remove room ${houseNumber} from building ${buildingId}?\nThis cannot be undone if the room has no tenancy history.`
  );
  if (!shouldProceed) {
    return;
  }

  target.disabled = true;
  clearError();

  void (async () => {
    try {
      await requestJson(
        `/api/landlord/buildings/${encodeURIComponent(buildingId)}/houses/${encodeURIComponent(houseNumber)}/remove`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            confirmationText: "REMOVE",
            confirmHouseNumber: houseNumber
          })
        }
      );

      setStatus(`Removed room ${houseNumber} from ${buildingId}.`);
      await Promise.all([
        loadBuildings(),
        loadRegistryRows(),
        loadResidents(),
        loadBills(),
        loadPayments(),
        loadRentStatus()
      ]);
    } catch (error) {
      handleLandlordError(error, "Failed to remove room.");
    } finally {
      target.disabled = false;
    }
  })();
}

function handleWriteOffRoomBalanceClick(target, buildingId, houseNumber, amountKsh) {
  if (isCaretakerRole()) {
    showError("House manager accounts cannot clear room balances.");
    return;
  }

  const amountLabel = formatCurrency(Math.max(0, Number(amountKsh ?? 0)));
  const shouldProceed = window.confirm(
    `Clear the open balance for room ${houseNumber} in ${buildingId}?\n${amountLabel} will be recorded as landlord loss and the room will stay available.`
  );
  if (!shouldProceed) {
    return;
  }

  target.disabled = true;
  clearError();

  void (async () => {
    try {
      const response = await requestJson(
        `/api/landlord/buildings/${encodeURIComponent(buildingId)}/houses/${encodeURIComponent(houseNumber)}/write-off-balances`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            reason: "Empty room balance cleared from housing UI"
          })
        }
      );
      const settled = Number(response?.data?.settlement?.totalSettledKsh ?? amountKsh ?? 0);
      setStatus(
        `Cleared room ${houseNumber}. ${formatCurrency(settled)} recorded as landlord loss.`
      );
      await Promise.all([
        loadBills(),
        loadPayments(),
        loadRentStatus(),
        loadRegistryRows(),
        loadResidents(),
        loadMoveOutSettlements()
      ]);
    } catch (error) {
      handleLandlordError(error, "Failed to clear room balance.");
    } finally {
      target.disabled = false;
    }
  })();
}

function handleRemoveResidentClick(
  target,
  buildingId,
  userId,
  houseNumber,
  residentName
) {
  if (!userId) {
    showError("Resident details are missing. Refresh and try again.");
    return;
  }

  void openMoveOutSettlement(target, {
    buildingId,
    userId,
    houseNumber,
    residentName
  });
}

async function submitMoveOutSettlement(event) {
  event.preventDefault();
  const summary = state.moveOutSettlement?.summary;
  if (!summary) {
    showError("Move-out settlement is still loading.");
    return;
  }

  const action = getMoveOutSettlementAction();
  const total = Number(summary.totalOutstandingKsh ?? 0);
  const buildingId = String(moveOutSettlementFormEl?.dataset.buildingId ?? "").trim();
  const userId = String(moveOutSettlementFormEl?.dataset.userId ?? "").trim();
  const houseNumber = normalizeHouse(moveOutSettlementFormEl?.dataset.houseNumber);
  const residentName =
    String(moveOutSettlementFormEl?.dataset.residentName ?? "").trim() || "Resident";
  const note = String(moveOutSettlementNoteEl?.value ?? "").trim() || undefined;

  if (!buildingId || !userId) {
    showError("Move-out settlement details are missing. Refresh and try again.");
    return;
  }

  if (action === "collect_before_move_out" && total > 0) {
    closeMoveOutSettlementModal();
    setStatus(
      `${residentName} remains active in house ${houseNumber}. Collect ${formatCurrency(
        total
      )} before clearing the resident.`
    );
    return;
  }

  setMoveOutSettlementLoading(true);
  clearError();

  try {
    const response = await requestJson(
      `/api/landlord/buildings/${encodeURIComponent(buildingId)}/users/${encodeURIComponent(
        userId
      )}/remove`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          confirmUserId: userId,
          confirmationText: "REMOVE",
          note,
          settlementAction: action,
          settlementReason: note,
          confirmedOutstandingKsh: Math.max(0, Math.round(total))
        })
      }
    );

    const settled = Number(response?.data?.settlement?.result?.totalSettledKsh ?? 0);
    if (action === "transfer_to_resident_debt" && settled > 0) {
      setStatus(
        `Removed ${residentName} from house ${houseNumber}. ${formatCurrency(
          settled
        )} transferred to resident debt.`
      );
    } else if (action === "write_off" && settled > 0) {
      setStatus(
        `Removed ${residentName} from house ${houseNumber}. ${formatCurrency(
          settled
        )} written off.`
      );
    } else {
      setStatus(`Removed ${residentName} from house ${houseNumber}.`);
    }

    closeMoveOutSettlementModal();
    await Promise.all([
      loadApplications(),
      loadBuildings(),
      loadBills(),
      loadPayments(),
      loadRentStatus(),
      loadExpenditures(),
      loadMoveOutSettlements()
    ]);
    await loadRegistryRows();
    await loadResidents();
  } catch (error) {
    if (error?.status === 409 && error?.data) {
      renderMoveOutSettlement(error.data, {
        buildingId,
        userId,
        houseNumber,
        residentName
      });
    }
    handleLandlordError(error, "Failed to settle move-out.");
  } finally {
    setMoveOutSettlementLoading(false);
  }
}

registryBodyEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const action = target.dataset.action;
  if (!action) {
    return;
  }

  if (action === "remove-resident") {
    const buildingId = String(target.dataset.buildingId || "").trim();
    const userId = String(target.dataset.userId || "").trim();
    const houseNumber = String(target.dataset.houseNumber || "").trim();
    const residentName = String(target.dataset.residentName || "Resident").trim();
    if (!buildingId || !userId) {
      return;
    }

    handleRemoveResidentClick(
      target,
      buildingId,
      userId,
      houseNumber,
      residentName
    );
    return;
  }

  if (action === "remove-room") {
    const buildingId = String(target.dataset.buildingId || "").trim();
    const houseNumber = String(target.dataset.houseNumber || "").trim();
    if (!buildingId || !houseNumber) {
      return;
    }

    handleRemoveRoomClick(target, buildingId, houseNumber);
  }

  if (action === "write-off-room-balance") {
    const buildingId = String(target.dataset.buildingId || "").trim();
    const houseNumber = String(target.dataset.houseNumber || "").trim();
    if (!buildingId || !houseNumber) {
      return;
    }

    handleWriteOffRoomBalanceClick(
      target,
      buildingId,
      houseNumber,
      Number(target.dataset.amountKsh ?? 0)
    );
  }
});

residentsBodyEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const action = target.dataset.action;
  if (!action) {
    return;
  }

  const buildingId = String(target.dataset.buildingId || "").trim();
  const houseNumber = String(target.dataset.houseNumber || "").trim();
  if (!buildingId || !houseNumber) {
    showError("Resident details missing. Refresh and retry.");
    return;
  }

  if (action === "remove-resident") {
    const userId = String(target.dataset.userId || "").trim();
    const residentName = String(target.dataset.residentName || "Resident").trim();
    handleRemoveResidentClick(
      target,
      buildingId,
      userId,
      houseNumber,
      residentName
    );
    return;
  }

  if (action === "remove-room") {
    handleRemoveRoomClick(target, buildingId, houseNumber);
    return;
  }

  if (action === "write-off-room-balance") {
    handleWriteOffRoomBalanceClick(
      target,
      buildingId,
      houseNumber,
      Number(target.dataset.amountKsh ?? 0)
    );
    return;
  }

  if (action === "open-room-account") {
    openRoomAccountPage(buildingId, houseNumber);
    return;
  }

  if (action !== "open-resident-drawer") {
    return;
  }

  void openResidentDirectoryEntry(buildingId, houseNumber);
});

residentDrawerBodyEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (String(target.dataset.action || "").trim() !== "open-room-account") {
    return;
  }

  const buildingId = String(target.dataset.buildingId || "").trim();
  const houseNumber = String(target.dataset.houseNumber || "").trim();
  openRoomAccountPage(buildingId, houseNumber);
});

residentDrawerBodyEl?.addEventListener("submit", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLFormElement)) {
    return;
  }

  event.preventDefault();
  if (target.id === "resident-agreement-form") {
    void saveResidentAgreement(target);
    return;
  }

  if (target.id === "resident-rent-profile-form") {
    void saveResidentRentProfile(target);
    return;
  }

  if (target.id === "resident-rent-payment-form") {
    void saveResidentRentPayment(target);
  }
});

applicationsBodyEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const action = target.dataset.action;
  const applicationId = target.dataset.id;
  if (!action || !applicationId) {
    return;
  }

  const label = action === "approve" ? "Approve" : "Reject";
  const shouldProceed = window.confirm(`${label} this tenant application?`);
  if (!shouldProceed) {
    return;
  }

  target.disabled = true;
  clearError();

  void (async () => {
    try {
      await requestJson(
        `/api/landlord/tenant-applications/${encodeURIComponent(applicationId)}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ action })
        }
      );

      setStatus(`Application ${label.toLowerCase()}d.`);
      await Promise.all([loadApplications(), loadBuildings()]);
    } catch (error) {
      handleLandlordError(error, `Failed to ${action} application.`);
    } finally {
      target.disabled = false;
    }
  })();
});

utilityMeterFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const buildingId = getSelectedUtilityBuildingId();
  const utilityType = String(utilityMeterTypeEl.value ?? "water");
  const houseNumber = normalizeHouse(utilityMeterHouseEl.value);
  const meterNumber = utilityMeterNumberEl.value.trim();

  if (!buildingId) {
    showError("Select a building first.");
    return;
  }

  if (!houseNumber || !meterNumber) {
    showError("Utility meter requires type, house, and meter number.");
    return;
  }

  const submitButton = utilityMeterFormEl.querySelector("button[type='submit']");
  submitButton.disabled = true;

  void (async () => {
    try {
      await requestJson(
        withBuildingQuery(
          `/api/landlord/utilities/${encodeURIComponent(utilityType)}/${encodeURIComponent(houseNumber)}/meter`,
          buildingId
        ),
        {
          method: "PUT",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ buildingId, meterNumber })
        }
      );

      setStatus(`Meter saved for ${utilityType} (${houseNumber}) in ${buildingId}.`);
      await Promise.all([loadMeters(), loadRegistryRows()]);
    } catch (error) {
      handleLandlordError(error, "Failed to save utility meter.");
    } finally {
      submitButton.disabled = false;
    }
  })();
});

utilityBillTypeEl.addEventListener("change", () => {
  syncUtilityBillInputMode();
});

utilityBillHouseEl.addEventListener("input", () => {
  syncUtilityBillInputMode();
});

utilitySheetBuildingSelectEl?.addEventListener("change", () => {
  const buildingId = String(utilitySheetBuildingSelectEl.value || "").trim();
  if (!buildingId) {
    return;
  }

  setPreferredBuildingSelection(buildingId);

  void Promise.all([
    loadRegistryRows(),
    loadMeters(),
    loadBills(),
    loadRegistryReadingBills(),
    loadPayments(),
    loadExpenditures(),
    loadMoveOutSettlements(),
    loadUtilitySheetBuildingConfiguration(),
    loadUtilitySheetMonthlyCombinedCharge()
  ]).catch((error) => {
    handleLandlordError(error, "Failed to load selected building in utility sheet.");
  });
});

utilitySheetBillingMonthEl?.addEventListener("change", () => {
  void loadUtilitySheetMonthlyCombinedCharge().catch((error) => {
    handleLandlordError(error, "Failed to load monthly combined utility charge.");
  });
});

rentSheetBuildingSelectEl?.addEventListener("change", () => {
  const buildingId = String(rentSheetBuildingSelectEl.value || "").trim();
  if (!buildingId) {
    return;
  }

  state.selectedRentSheetBuildingId = buildingId;
  setPreferredBuildingSelection(buildingId, { includeResidents: false });
  syncRentSheetBuildingOptions();

  void loadRentSheetRows().catch((error) => {
    handleLandlordError(error, "Failed to load selected building in rent sheet.");
  });
});

rentSheetBillingMonthEl?.addEventListener("change", () => {
  if (rentSheetDueDateEl instanceof HTMLInputElement) {
    rentSheetDueDateEl.value = toDateTimeLocalInputValue(
      defaultRentDueDateForBillingMonth(rentSheetBillingMonthEl.value)
    );
  }

  void loadRentSheetRows().catch((error) => {
    handleLandlordError(error, "Failed to load selected rent month.");
  });
});

registryReadingMonthEl?.addEventListener("change", () => {
  state.registryReadingMonth = toBillingMonth(registryReadingMonthEl.value);
  void Promise.all([loadRegistryReadingBills(), loadRegistryMonthlyCombinedCharge()])
    .then(() => {
      renderRegistryRows(state.registryRows);
    })
    .catch((error) => {
      handleLandlordError(error, "Failed to load monthly utility readings.");
    });
});

registryBuildingSelectEl.addEventListener("change", () => {
  setPreferredBuildingSelection(String(registryBuildingSelectEl.value || ""));
  void Promise.all([
    loadRegistryRows(),
    loadMeters(),
    loadBills(),
    loadRegistryReadingBills(),
    loadPayments(),
    loadExpenditures(),
    loadMoveOutSettlements(),
    loadCaretakerAccessRequests(),
    loadCaretakers(),
    loadResidents(),
    loadLandlordTickets()
  ]).catch(
    (error) => {
    handleLandlordError(error, "Failed to load building utility registry.");
    }
  );
});

registryLoadBtnEl.addEventListener("click", () => {
  void Promise.all([
    loadRegistryRows(),
    loadMeters(),
    loadBills(),
    loadRegistryReadingBills(),
    loadPayments(),
    loadExpenditures(),
    loadMoveOutSettlements(),
    loadCaretakerAccessRequests(),
    loadCaretakers()
  ]).catch(
    (error) => {
    handleLandlordError(error, "Failed to load building utility registry.");
    }
  );
});

registrySaveBtnEl.addEventListener("click", () => {
  clearError();

  const buildingId = String(
    registryBuildingSelectEl.value || state.selectedRegistryBuildingId || ""
  ).trim();
  if (!buildingId) {
    showError("Select a building first.");
    return;
  }

  let rows;
  try {
    rows = buildRegistrySavePayload();
  } catch (error) {
    handleLandlordError(error, "Invalid registry values.");
    return;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    showError("No registry rows available to save.");
    return;
  }

  registrySaveBtnEl.disabled = true;

  void (async () => {
    try {
      await requestJson(
        `/api/landlord/buildings/${encodeURIComponent(buildingId)}/utility-registry`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ rows })
        }
      );

      setStatus(`Saved utility registry for ${buildingId}.`);
      await Promise.all([loadRegistryRows(), loadMeters(), loadBills(), loadResidents()]);
    } catch (error) {
      handleLandlordError(error, "Failed to save utility registry.");
    } finally {
      registrySaveBtnEl.disabled = false;
    }
  })();
});

utilitySheetFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const buildingId = String(
    utilitySheetBuildingSelectEl?.value || state.selectedRegistryBuildingId || ""
  ).trim();
  if (!buildingId) {
    showError("Select a building first.");
    return;
  }

  const billingMonth = toBillingMonth(utilitySheetBillingMonthEl?.value);
  const dueDate = toIsoFromDateTimeLocal(utilitySheetDueDateEl?.value);
  if (!billingMonth || !dueDate) {
    showError("Bulk utility sheet requires billing month and due date.");
    return;
  }

  let registryRows;
  let auditRows;
  let billRequests;
  let auditId = "";
  let postedCount = 0;
  const failures = [];
  const combinedUtilityChargeKsh = toOptionalNumber(utilitySheetCombinedChargeEl?.value);
  const buildingDefaultWaterFixedChargeKsh = toOptionalNumber(
    utilitySheetWaterFixedDefaultEl?.value
  );
  const buildingDefaultElectricityFixedChargeKsh = toOptionalNumber(
    utilitySheetElectricFixedDefaultEl?.value
  );
  const buildingDefaultCombinedUtilityChargeKsh = toOptionalNumber(
    utilitySheetBuildingCombinedChargeEl?.value
  );
  const normalizedBuildingDefaultWaterFixedChargeKsh =
    buildingDefaultWaterFixedChargeKsh == null
      ? null
      : Math.max(0, buildingDefaultWaterFixedChargeKsh);
  const normalizedBuildingDefaultElectricityFixedChargeKsh =
    buildingDefaultElectricityFixedChargeKsh == null
      ? null
      : Math.max(0, buildingDefaultElectricityFixedChargeKsh);
  const normalizedBuildingDefaultCombinedUtilityChargeKsh =
    buildingDefaultCombinedUtilityChargeKsh == null
      ? null
      : Math.max(0, Math.round(buildingDefaultCombinedUtilityChargeKsh));
  const normalizedWaterRatePerUnitKsh =
    toOptionalNumber(utilitySheetWaterRateEl?.value) == null
      ? null
      : Math.max(0, Number(toOptionalNumber(utilitySheetWaterRateEl?.value)));
  const normalizedElectricityRatePerUnitKsh =
    toOptionalNumber(utilitySheetElectricRateEl?.value) == null
      ? null
      : Math.max(0, Number(toOptionalNumber(utilitySheetElectricRateEl?.value)));
  const currentBuildingDefaultWaterFixedChargeKsh =
    state.utilitySheetBuildingConfiguration?.defaultWaterFixedChargeKsh == null
      ? null
      : Math.max(0, Number(state.utilitySheetBuildingConfiguration.defaultWaterFixedChargeKsh));
  const currentBuildingDefaultElectricityFixedChargeKsh =
    state.utilitySheetBuildingConfiguration?.defaultElectricityFixedChargeKsh == null
      ? null
      : Math.max(
          0,
          Number(state.utilitySheetBuildingConfiguration.defaultElectricityFixedChargeKsh)
        );
  const currentWaterRatePerUnitKsh =
    state.utilitySheetBuildingConfiguration?.defaultWaterRatePerUnitKsh == null
      ? null
      : Math.max(0, Number(state.utilitySheetBuildingConfiguration.defaultWaterRatePerUnitKsh));
  const currentElectricityRatePerUnitKsh =
    state.utilitySheetBuildingConfiguration?.defaultElectricityRatePerUnitKsh == null
      ? null
      : Math.max(
          0,
          Number(state.utilitySheetBuildingConfiguration.defaultElectricityRatePerUnitKsh)
        );
  const currentBuildingDefaultCombinedUtilityChargeKsh =
    state.utilitySheetBuildingConfiguration?.defaultCombinedUtilityChargeKsh == null
      ? null
      : Math.max(
          0,
          Math.round(state.utilitySheetBuildingConfiguration.defaultCombinedUtilityChargeKsh)
        );
  const normalizedMonthlyCombinedUtilityChargeKsh =
    combinedUtilityChargeKsh == null ? null : Math.max(0, Math.round(combinedUtilityChargeKsh));
  const rateDefaults = {
    waterRatePerUnitKsh: normalizedWaterRatePerUnitKsh ?? undefined,
    electricityRatePerUnitKsh: normalizedElectricityRatePerUnitKsh ?? undefined
  };
  const bulkNote = utilitySheetNoteEl?.value.trim() || undefined;
  const selectedBuilding = getBuildingRecord(buildingId);
  try {
    auditRows = buildUtilitySheetAuditRows();
    registryRows = buildUtilitySheetRegistryPayload();
    billRequests = buildUtilitySheetBillRequests(
      buildingId,
      billingMonth,
      dueDate,
      bulkNote,
      combinedUtilityChargeKsh
    );
  } catch (error) {
    handleLandlordError(error, "Invalid values in utility sheet.");
    return;
  }

  if (!Array.isArray(registryRows) || registryRows.length === 0) {
    showError("No houses available in utility sheet.");
    return;
  }

  if (!Array.isArray(auditRows) || auditRows.length === 0) {
    showError("No utility sheet snapshot available to audit.");
    return;
  }

  if (utilitySheetSubmitBtnEl instanceof HTMLButtonElement) {
    utilitySheetSubmitBtnEl.disabled = true;
  }

  void (async () => {
    try {
      const auditPayload = await requestJson(
        `/api/landlord/buildings/${encodeURIComponent(buildingId)}/utility-bulk-audits`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            billingMonth,
            dueDate,
            note: bulkNote,
            defaultWaterFixedChargeKsh:
              normalizedBuildingDefaultWaterFixedChargeKsh,
            defaultElectricityFixedChargeKsh:
              normalizedBuildingDefaultElectricityFixedChargeKsh,
            defaultCombinedUtilityChargeKsh:
              normalizedBuildingDefaultCombinedUtilityChargeKsh,
            monthlyCombinedUtilityChargeKsh: normalizedMonthlyCombinedUtilityChargeKsh,
            rateDefaults,
            rows: auditRows
          })
        }
      );
      auditId = String(auditPayload?.data?.id ?? "").trim();
      if (!auditId) {
        throw new Error("Bulk utility audit could not be created.");
      }
      try {
        downloadUtilityBulkAuditCsv(
          auditPayload?.data ?? {
            id: auditId,
            createdAt: new Date().toISOString(),
            buildingId,
            buildingName: getBuildingDisplayName(selectedBuilding),
            billingMonth,
            dueDate,
            note: bulkNote,
            defaultWaterFixedChargeKsh:
              normalizedBuildingDefaultWaterFixedChargeKsh,
            defaultElectricityFixedChargeKsh:
              normalizedBuildingDefaultElectricityFixedChargeKsh,
            defaultCombinedUtilityChargeKsh:
              normalizedBuildingDefaultCombinedUtilityChargeKsh,
            monthlyCombinedUtilityChargeKsh: normalizedMonthlyCombinedUtilityChargeKsh,
            rateDefaults,
            rows: auditRows,
            result: {
              status: "pending",
              postedCount: 0,
              requestedCount: billRequests.length,
              failures: []
            }
          }
        );
      } catch (downloadError) {
        console.error("Failed to download utility bulk audit CSV", downloadError);
      }

      if (
        !utilityPricingNumbersEqual(
          normalizedWaterRatePerUnitKsh,
          currentWaterRatePerUnitKsh
        ) ||
        !utilityPricingNumbersEqual(
          normalizedElectricityRatePerUnitKsh,
          currentElectricityRatePerUnitKsh
        ) ||
        !utilityPricingNumbersEqual(
          normalizedBuildingDefaultWaterFixedChargeKsh,
          currentBuildingDefaultWaterFixedChargeKsh
        ) ||
        !utilityPricingNumbersEqual(
          normalizedBuildingDefaultElectricityFixedChargeKsh,
          currentBuildingDefaultElectricityFixedChargeKsh
        ) ||
        normalizedBuildingDefaultCombinedUtilityChargeKsh !==
          currentBuildingDefaultCombinedUtilityChargeKsh
      ) {
        const configurationPayload = await requestJson(
          `/api/landlord/buildings/${encodeURIComponent(buildingId)}/configuration`,
          {
            method: "PATCH",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              defaultWaterRatePerUnitKsh: normalizedWaterRatePerUnitKsh,
              defaultElectricityRatePerUnitKsh:
                normalizedElectricityRatePerUnitKsh,
              defaultWaterFixedChargeKsh:
                normalizedBuildingDefaultWaterFixedChargeKsh,
              defaultElectricityFixedChargeKsh:
                normalizedBuildingDefaultElectricityFixedChargeKsh,
              defaultCombinedUtilityChargeKsh:
                normalizedBuildingDefaultCombinedUtilityChargeKsh,
              acknowledgeImpact: true
            })
          }
        );
        setUtilityPricingState(configurationPayload.data ?? null, null, buildingId);
        syncUtilitySheetRateDefaults();
        syncUtilitySheetBuildingFixedDefaults();
        syncUtilitySheetBuildingCombinedCharge();
      }

      if (combinedUtilityChargeKsh != null && combinedUtilityChargeKsh > 0) {
        await requestJson(
          `/api/landlord/buildings/${encodeURIComponent(buildingId)}/monthly-combined-utility-charge`,
          {
            method: "PUT",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              billingMonth,
              amountKsh: Math.round(combinedUtilityChargeKsh),
              acknowledgeImpact: true
            })
          }
        );
      }

      await requestJson(
        `/api/landlord/buildings/${encodeURIComponent(buildingId)}/utility-registry`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ rows: registryRows })
        }
      );

      for (const billRequest of billRequests) {
        try {
          await requestJson(
            withBuildingQuery(
              `/api/landlord/utilities/${encodeURIComponent(billRequest.utilityType)}/${encodeURIComponent(billRequest.houseNumber)}/bills`,
              buildingId
            ),
            {
              method: "POST",
              headers: {
                "content-type": "application/json"
              },
              body: JSON.stringify(billRequest.payload)
            }
          );
          postedCount += 1;
        } catch (error) {
          failures.push(
            `${billRequest.utilityType} ${billRequest.houseNumber}: ${error instanceof Error ? error.message : "failed"}`
          );
        }
      }

      await Promise.all([
        loadRegistryRows(),
        loadMeters(),
        loadBills(),
        loadPayments(),
        loadResidents(),
        loadUtilitySheetBuildingConfiguration(),
        loadUtilitySheetMonthlyCombinedCharge()
      ]);
      try {
        await finalizeUtilityBulkAudit(buildingId, auditId, {
          status: failures.length > 0 ? "partial_failed" : "completed",
          postedCount,
          requestedCount: billRequests.length,
          failures,
          completedAt: new Date().toISOString()
        });
      } catch (auditFinalizeError) {
        console.error("Failed to finalize utility bulk audit", auditFinalizeError);
      }
      if (failures.length > 0) {
        const preview = failures.slice(0, 3).join(" | ");
        showError(
          `Saved meter sheet. Posted ${postedCount}/${billRequests.length} bills. Failed: ${preview}${failures.length > 3 ? " ..." : ""}`
        );
        setStatus(
          `Bulk save completed for ${buildingId} with ${failures.length} bill error(s).`
        );
      } else {
        setStatus(
          `Saved bulk utility sheet for ${buildingId}. Posted ${postedCount} bill(s).`
        );
        closeUtilitySheetModal();
      }
    } catch (error) {
      if (auditId) {
        try {
          const errorMessage = error instanceof Error ? error.message : "failed";
          await finalizeUtilityBulkAudit(buildingId, auditId, {
            status: "failed",
            postedCount,
            requestedCount: Array.isArray(billRequests) ? billRequests.length : 0,
            failures: [...failures, errorMessage],
            completedAt: new Date().toISOString()
          });
        } catch (auditFinalizeError) {
          console.error("Failed to finalize utility bulk audit", auditFinalizeError);
        }
      }
      handleLandlordError(error, "Failed to save bulk utility sheet.");
    } finally {
      if (utilitySheetSubmitBtnEl instanceof HTMLButtonElement) {
        utilitySheetSubmitBtnEl.disabled = false;
      }
    }
  })();
});

utilityBillFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const utility = createUtilityBillPayload();
  if (
    !utility.buildingId ||
    !utility.houseNumber ||
    !utility.payload.billingMonth ||
    !utility.payload.dueDate
  ) {
    showError("Utility bill requires house, month, and due date.");
    return;
  }

  const configuredMeter = findConfiguredMeter(
    utility.utilityType,
    utility.buildingId,
    utility.houseNumber
  );
  if (configuredMeter) {
    if (
      utility.payload.currentReading == null ||
      utility.payload.ratePerUnitKsh == null
    ) {
      showError(
        `House ${utility.houseNumber} has meter ${configuredMeter.meterNumber}. Enter current reading and rate per unit.`
      );
      return;
    }
  } else if (Number(utility.payload.fixedChargeKsh ?? 0) <= 0) {
    showError(
      `House ${utility.houseNumber} has no ${utility.utilityType} meter. Enter a fixed charge greater than zero.`
    );
    return;
  }

  const submitButton = utilityBillFormEl.querySelector("button[type='submit']");
  submitButton.disabled = true;

  void (async () => {
    try {
      await requestJson(
        withBuildingQuery(
          `/api/landlord/utilities/${encodeURIComponent(utility.utilityType)}/${encodeURIComponent(utility.houseNumber)}/bills`,
          utility.buildingId
        ),
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(utility.payload)
        }
      );

      setStatus(
        `${utility.utilityType} bill posted for ${utility.houseNumber} (${utility.payload.billingMonth}) in ${utility.buildingId}.`
      );
      await Promise.all([loadBills(), loadPayments()]);
    } catch (error) {
      handleLandlordError(error, "Failed to post utility bill.");
    } finally {
      submitButton.disabled = false;
    }
  })();
});

utilityPaymentFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const utility = createUtilityPaymentPayload();
  if (
    !utility.buildingId ||
    !utility.houseNumber ||
    !Number.isFinite(utility.payload.amountKsh)
  ) {
    showError("Utility payment requires building, house, and amount.");
    return;
  }

  if (utility.payload.amountKsh <= 0) {
    showError("Utility payment amount must be greater than zero.");
    return;
  }

  const submitButton = utilityPaymentFormEl.querySelector("button[type='submit']");
  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true;
  }

  void (async () => {
    try {
      const response = await requestJson(
        withBuildingQuery(
          `/api/landlord/utilities/${encodeURIComponent(utility.utilityType)}/${encodeURIComponent(utility.houseNumber)}/payments`,
          utility.buildingId
        ),
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(utility.payload)
        }
      );
      const coverage = formatUtilityPaymentCoverage(
        response?.data,
        utility.payload.billingMonth
      );

      setStatus(
        `${utility.utilityType} payment recorded for ${utility.houseNumber}${
          coverage ? ` covering ${coverage}` : ""
        }.`
      );
      if (utilityPaymentReferenceEl instanceof HTMLInputElement) {
        utilityPaymentReferenceEl.value = "";
      }
      if (utilityPaymentNoteEl instanceof HTMLInputElement) {
        utilityPaymentNoteEl.value = "";
      }
      await Promise.all([loadBills(), loadPayments(), loadResidents()]);
    } catch (error) {
      handleLandlordError(error, "Failed to record utility payment.");
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  })();
});

utilityRoomSummaryBodyEls.forEach((bodyEl) => {
  bodyEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest("button[data-action]");
    if (button instanceof HTMLButtonElement) {
      const action = String(button.dataset.action ?? "").trim();
      const buildingId = String(button.dataset.buildingId || "").trim();
      const houseNumber = String(button.dataset.houseNumber || "").trim();

      if (action === "open-overview-utility-payment") {
        openOverviewUtilityPaymentModal({
          buildingId,
          houseNumber,
          utilityType: button.dataset.utilityType,
          billingMonth: button.dataset.billingMonth,
          amountKsh: Number(button.dataset.amountKsh ?? 0),
          statusLabel: button.dataset.statusLabel
        });
        return;
      }

      if (action === "open-room-account") {
        openRoomAccountPage(buildingId, houseNumber);
        return;
      }

      if (action === "remove-resident") {
        const userId = String(button.dataset.userId || "").trim();
        const residentName = String(button.dataset.residentName || "Resident").trim();
        handleRemoveResidentClick(button, buildingId, userId, houseNumber, residentName);
        return;
      }

      if (action === "remove-room") {
        handleRemoveRoomClick(button, buildingId, houseNumber);
        return;
      }

      if (action === "write-off-room-balance") {
        handleWriteOffRoomBalanceClick(
          button,
          buildingId,
          houseNumber,
          Number(button.dataset.amountKsh ?? 0)
        );
        return;
      }

      return;
    }

    const row = target.closest("[data-action='open-room-account-row']");
    if (!(row instanceof HTMLElement)) {
      return;
    }

    openRoomAccountPage(row.dataset.buildingId, row.dataset.houseNumber);
  });

  bodyEl?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest("button[data-action]")) {
      return;
    }

    const row = target.closest("[data-action='open-room-account-row']");
    if (!(row instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    openRoomAccountPage(row.dataset.buildingId, row.dataset.houseNumber);
  });
});

closeOverviewUtilityPaymentBtnEl?.addEventListener("click", () => {
  closeOverviewUtilityPaymentModal();
});

overviewUtilityPaymentBackdropEl?.addEventListener("click", () => {
  closeOverviewUtilityPaymentModal();
});

overviewUtilityPaymentFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const buildingId = String(overviewUtilityPaymentFormEl.dataset.buildingId ?? "").trim();
  const houseNumber = normalizeHouse(overviewUtilityPaymentFormEl.dataset.houseNumber);
  const utilityType = String(overviewUtilityPaymentFormEl.dataset.utilityType ?? "").trim();
  const statusLabel =
    String(overviewUtilityPaymentFormEl.dataset.statusLabel ?? "Actionable").trim() ||
    "Actionable";
  const billingMonth = toBillingMonth(overviewUtilityPaymentMonthEl?.value);
  const amountKsh = Number(overviewUtilityPaymentAmountEl?.value);
  const providerReference = String(overviewUtilityPaymentReferenceEl?.value ?? "").trim();
  const paidAt = toIsoFromDateTimeLocal(overviewUtilityPaymentPaidAtEl?.value) || undefined;

  if (!buildingId || !houseNumber || !utilityType || !billingMonth || !Number.isFinite(amountKsh)) {
    showError("Quick payment requires building, house, utility, month, and amount.");
    return;
  }

  if (amountKsh <= 0) {
    showError("Payment amount must be greater than zero.");
    return;
  }

  if (overviewUtilityPaymentSubmitBtnEl instanceof HTMLButtonElement) {
    overviewUtilityPaymentSubmitBtnEl.disabled = true;
  }

  void (async () => {
    try {
      const response = await requestJson(
        withBuildingQuery(
          `/api/landlord/utilities/${encodeURIComponent(utilityType)}/${encodeURIComponent(houseNumber)}/payments`,
          buildingId
        ),
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            buildingId,
            billingMonth,
            amountKsh,
            provider: "cash",
            providerReference: providerReference || undefined,
            paidAt,
            note: `${statusLabel} bill recorded from overview quick payment.`
          })
        }
      );
      const coverage = formatUtilityPaymentCoverage(response?.data, billingMonth);

      closeOverviewUtilityPaymentModal();
      setStatus(
        `${utilityTypeLabel(utilityType)} payment recorded for ${houseNumber}${
          coverage ? ` covering ${coverage}` : ""
        }.`
      );
      await Promise.all([loadBills(), loadPayments(), loadResidents()]);
    } catch (error) {
      handleLandlordError(error, "Failed to record overview utility payment.");
    } finally {
      if (overviewUtilityPaymentSubmitBtnEl instanceof HTMLButtonElement) {
        overviewUtilityPaymentSubmitBtnEl.disabled = false;
      }
    }
  })();
});

rentPaymentBuildingSelectEl?.addEventListener("change", () => {
  state.selectedRentPaymentBuildingId = String(rentPaymentBuildingSelectEl.value || "").trim();
  updateLandlordBranding();
});

rentSheetFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  if (isCaretakerRole()) {
    showError("House manager accounts cannot change rent charges.");
    return;
  }

  const buildingId = getSelectedRentSheetBuildingId();
  if (!buildingId) {
    showError("Select a rent-enabled building first.");
    return;
  }

  let payload;
  try {
    payload = buildRentSheetPayload();
  } catch (error) {
    handleLandlordError(error, "Invalid values in rent sheet.");
    return;
  }

  if (rentSheetSubmitBtnEl instanceof HTMLButtonElement) {
    rentSheetSubmitBtnEl.disabled = true;
  }

  void (async () => {
    try {
      const response = await requestJson(
        `/api/landlord/buildings/${encodeURIComponent(buildingId)}/rent-bulk-sheet`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      state.selectedRentSheetBuildingId = buildingId;
      state.rentSheetRows = Array.isArray(response?.data?.rows) ? response.data.rows : [];
      renderRentSheetRows(state.rentSheetRows);
      await Promise.all([loadRentStatus(), loadResidents()]);
      setStatus(
        `Saved rent sheet for ${getBuildingDisplayNameById(buildingId, buildingId)} (${payload.billingMonth}).`
      );
      closeRentSheetModal();
    } catch (error) {
      handleLandlordError(error, "Failed to save rent sheet.");
    } finally {
      if (rentSheetSubmitBtnEl instanceof HTMLButtonElement) {
        rentSheetSubmitBtnEl.disabled = false;
      }
    }
  })();
});

rentPaymentFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const rentPayment = createRentPaymentPayload();
  const requiresReference = String(rentPayment.payload.provider ?? "cash") !== "cash";
  if (
    !rentPayment.buildingId ||
    !rentPayment.houseNumber ||
    !Number.isFinite(rentPayment.payload.amountKsh) ||
    (requiresReference && !rentPayment.payload.providerReference)
  ) {
    showError(
      requiresReference
        ? "Rent payment requires building, house, amount, and reference."
        : "Rent payment requires building, house, and amount."
    );
    return;
  }

  const submitButton = rentPaymentFormEl.querySelector("button[type='submit']");
  submitButton.disabled = true;

  void (async () => {
    try {
      await requestJson(
        withBuildingQuery(
          `/api/landlord/rent/${encodeURIComponent(rentPayment.houseNumber)}/payments`,
          rentPayment.buildingId
        ),
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(rentPayment.payload)
        }
      );

      rentPaymentFormEl.reset();
      rentPaymentProviderEl.value = "cash";
      state.selectedRentPaymentBuildingId = rentPayment.buildingId;
      syncRentPaymentBuildingOptions();
      setStatus(
        `Rent payment posted for ${rentPayment.houseNumber} in ${rentPayment.buildingId}.`
      );
      await Promise.all([loadRentStatus(), loadResidents()]);
      syncSelectedResidentAfterRefresh(rentPayment.buildingId, rentPayment.houseNumber);
    } catch (error) {
      handleLandlordError(error, "Failed to record rent payment.");
    } finally {
      submitButton.disabled = false;
    }
  })();
});

refreshBuildingsBtnEl.addEventListener("click", () => {
  void (async () => {
    await loadBuildings();
    await Promise.all([
      loadRegistryRows(),
      loadCaretakerAccessRequests(),
      loadCaretakers(),
      loadLandlordTickets()
    ]);
  })().catch((error) => {
    handleLandlordError(error, "Unable to refresh buildings.");
  });
});

buildingManagementSearchEl?.addEventListener("input", () => {
  state.buildingManagementQuery = String(buildingManagementSearchEl.value || "").trim();
  renderBuildings(state.buildings);
});

landlordFocusBuildingSelectEl?.addEventListener("change", () => {
  const buildingId = String(landlordFocusBuildingSelectEl.value || "").trim();
  if (!buildingId) {
    return;
  }

  clearError();
  void activateBuilding(buildingId)
    .then(() => {
      const buildingName = getBuildingDisplayNameById(buildingId);
      setStatus(`Focused on ${buildingName}.`);
    })
    .catch((error) => {
      handleLandlordError(error, "Failed to switch current building.");
    });
});

landlordFocusTargetButtons.forEach((button) => {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  button.addEventListener("click", () => {
    setActiveLandlordView(String(button.dataset.landlordFocusTargetView || "overview"));
    const sectionId = String(button.dataset.landlordFocusTargetSection || "").trim();
    if (sectionId) {
      scrollToLandlordSection(sectionId);
    }
  });
});

refreshApplicationsBtnEl.addEventListener("click", () => {
  void loadApplications().catch((error) => {
    handleLandlordError(error, "Unable to refresh applications.");
  });
});

applicationStatusFilterEl.addEventListener("change", () => {
  void loadApplications().catch((error) => {
    handleLandlordError(error, "Unable to refresh applications.");
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    return;
  }

  void refreshPendingApplicationsIndicator().catch((error) => {
    handleLandlordError(error, "Unable to refresh applications.");
  });
});

refreshRentStatusBtnEl.addEventListener("click", () => {
  void loadRentStatus().catch((error) => {
    handleLandlordError(error, "Unable to refresh rent status.");
  });
});

rentStatusBodyEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const actionButton = target.closest("[data-action='prefill-rent-payment']");
  if (!(actionButton instanceof HTMLElement)) {
    return;
  }

  prefillRentPaymentFromStatus({
    buildingId: actionButton.dataset.buildingId,
    houseNumber: actionButton.dataset.houseNumber,
    billingMonth: actionButton.dataset.billingMonth,
    amountKsh: actionButton.dataset.amountKsh
  });
});

refreshOwnerStaffBtnEl?.addEventListener("click", () => {
  void loadOwnerStaff().catch((error) => {
    handleLandlordError(error, "Unable to refresh owner/staff access.");
  });
});

refreshCaretakersBtnEl?.addEventListener("click", () => {
  void Promise.all([loadCaretakers(), loadCaretakerAccessRequests()]).catch((error) => {
    handleLandlordError(error, "Unable to refresh house managers.");
  });
});

const refreshLandlordTickets = () => {
  void loadLandlordTickets().catch((error) => {
    handleLandlordError(error, "Unable to refresh resident issues.");
  });
};

landlordTicketFilterStatusEl?.addEventListener("change", refreshLandlordTickets);
landlordTicketFilterQueueEl?.addEventListener("change", refreshLandlordTickets);
landlordTicketBuildingSelectEl?.addEventListener("change", refreshLandlordTickets);
refreshLandlordTicketsBtnEl?.addEventListener("click", refreshLandlordTickets);

residentsBuildingSelectEl?.addEventListener("change", () => {
  state.selectedResidentsBuildingId = String(residentsBuildingSelectEl.value || "");
  state.selectedOverviewRoomBuildingId = state.selectedResidentsBuildingId || "all";
  if (overviewRoomBuildingSelectEl instanceof HTMLSelectElement) {
    overviewRoomBuildingSelectEl.value = state.selectedOverviewRoomBuildingId;
  }
  if (landlordGlobalSearchBuildingEl instanceof HTMLSelectElement) {
    landlordGlobalSearchBuildingEl.value = state.selectedResidentsBuildingId || "all";
  }
  state.selectedTicketBuildingId = state.selectedResidentsBuildingId;
  if (landlordTicketBuildingSelectEl instanceof HTMLSelectElement) {
    landlordTicketBuildingSelectEl.value = state.selectedResidentsBuildingId;
  }
  updateLandlordBranding();
  void Promise.all([loadResidents(), loadLandlordTickets(), loadBills()]).catch((error) => {
    handleLandlordError(error, "Unable to load residents.");
  });
});

residentsSearchInputEl?.addEventListener("input", () => {
  state.residentSearchQuery = String(residentsSearchInputEl.value || "").trim();
  if (overviewRoomSearchInputEl instanceof HTMLInputElement) {
    overviewRoomSearchInputEl.value = state.residentSearchQuery;
  }
  if (landlordGlobalSearchInputEl instanceof HTMLInputElement) {
    landlordGlobalSearchInputEl.value = state.residentSearchQuery;
  }
  renderResidentDirectory(state.residentDirectory);
});

residentsSearchInputEl?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  openResidentSearchMatch();
});

residentsStatusFilterEl?.addEventListener("change", () => {
  state.residentStatusFilter = String(residentsStatusFilterEl.value || "all");
  renderResidentDirectory(state.residentDirectory);
});

residentsOverviewEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const card = target.closest("[data-resident-filter]");
  if (!(card instanceof HTMLElement)) {
    return;
  }

  const filter = String(card.dataset.residentFilter || "all").trim() || "all";
  state.residentStatusFilter = filter;
  if (residentsStatusFilterEl instanceof HTMLSelectElement) {
    residentsStatusFilterEl.value = filter;
  }
  renderResidentDirectory(state.residentDirectory);
});

residentsOpenMatchBtnEl?.addEventListener("click", () => {
  openResidentSearchMatch();
});

overviewRoomBuildingSelectEl?.addEventListener("change", () => {
  state.selectedOverviewRoomBuildingId = String(
    overviewRoomBuildingSelectEl.value || "all"
  ).trim() || "all";
  state.selectedResidentsBuildingId = state.selectedOverviewRoomBuildingId;
  if (residentsBuildingSelectEl instanceof HTMLSelectElement) {
    residentsBuildingSelectEl.value = state.selectedOverviewRoomBuildingId;
  }
  if (landlordGlobalSearchBuildingEl instanceof HTMLSelectElement) {
    landlordGlobalSearchBuildingEl.value = state.selectedOverviewRoomBuildingId;
  }
  updateLandlordBranding();
});

overviewRoomSearchInputEl?.addEventListener("input", () => {
  const value = String(overviewRoomSearchInputEl.value || "").trim();
  state.residentSearchQuery = value;
  if (residentsSearchInputEl instanceof HTMLInputElement) {
    residentsSearchInputEl.value = value;
  }
  if (landlordGlobalSearchInputEl instanceof HTMLInputElement) {
    landlordGlobalSearchInputEl.value = value;
  }
});

overviewRoomSearchInputEl?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  void openResidentLookup(
    overviewRoomSearchInputEl.value,
    state.selectedOverviewRoomBuildingId
  ).catch((error) => {
    handleLandlordError(error, "Unable to open room lookup.");
  });
});

overviewOpenRoomBtnEl?.addEventListener("click", () => {
  void openResidentLookup(
    overviewRoomSearchInputEl?.value,
    state.selectedOverviewRoomBuildingId
  ).catch((error) => {
    handleLandlordError(error, "Unable to open room lookup.");
  });
});

landlordGlobalSearchFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  const buildingId =
    landlordGlobalSearchBuildingEl instanceof HTMLSelectElement
      ? landlordGlobalSearchBuildingEl.value
      : state.selectedOverviewRoomBuildingId;
  void openResidentLookup(
    landlordGlobalSearchInputEl instanceof HTMLInputElement
      ? landlordGlobalSearchInputEl.value
      : "",
    buildingId
  ).catch((error) => {
    handleLandlordError(error, "Unable to open room lookup.");
  });
});

landlordGlobalSearchInputEl?.addEventListener("input", () => {
  const value = String(landlordGlobalSearchInputEl.value || "").trim();
  state.residentSearchQuery = value;
  if (residentsSearchInputEl instanceof HTMLInputElement) {
    residentsSearchInputEl.value = value;
  }
  if (overviewRoomSearchInputEl instanceof HTMLInputElement) {
    overviewRoomSearchInputEl.value = value;
  }
  renderResidentDirectory(state.residentDirectory);
});

landlordGlobalSearchBuildingEl?.addEventListener("change", () => {
  const buildingId = String(landlordGlobalSearchBuildingEl.value || "all").trim() || "all";
  state.selectedResidentsBuildingId = buildingId;
  state.selectedOverviewRoomBuildingId = buildingId;
  if (residentsBuildingSelectEl instanceof HTMLSelectElement) {
    residentsBuildingSelectEl.value = buildingId;
  }
  if (overviewRoomBuildingSelectEl instanceof HTMLSelectElement) {
    overviewRoomBuildingSelectEl.value = buildingId;
  }
  updateLandlordBranding();
});

refreshResidentsBtnEl?.addEventListener("click", () => {
  void loadResidents().catch((error) => {
    handleLandlordError(error, "Unable to refresh residents.");
  });
});

refreshPaymentAccessBtnEl.addEventListener("click", () => {
  void loadPaymentAccess().catch((error) => {
    handleLandlordError(error, "Unable to refresh payment access settings.");
  });
});

refreshPaymentProfilesBtnEl?.addEventListener("click", () => {
  void loadPaymentProfiles().catch((error) => {
    handleLandlordError(error, "Unable to refresh payment routing settings.");
  });
});

refreshPaymentInstructionsBtnEl?.addEventListener("click", () => {
  void loadPaymentInstructions().catch((error) => {
    handleLandlordError(error, "Unable to refresh payment instructions.");
  });
});

refreshWifiPackagesBtnEl?.addEventListener("click", () => {
  void loadLandlordWifiPackages().catch((error) => {
    handleLandlordError(error, "Unable to refresh Wi-Fi packages.");
  });
});

wifiPackageBuildingSelectEl?.addEventListener("change", () => {
  state.selectedWifiPackageBuildingId = String(wifiPackageBuildingSelectEl.value || "").trim();
  updateLandlordBranding();
  void loadLandlordWifiPackages().catch((error) => {
    handleLandlordError(error, "Unable to refresh Wi-Fi packages.");
  });
});

refreshMetersBtnEl.addEventListener("click", () => {
  void (async () => {
    await loadMeters();
    await loadRegistryRows();
  })().catch((error) => {
    handleLandlordError(error, "Unable to refresh meters.");
  });
});

refreshBillsBtnEl.addEventListener("click", () => {
  void loadBills().catch((error) => {
    handleLandlordError(error, "Unable to refresh bills.");
  });
});

refreshPaymentsBtnEl.addEventListener("click", () => {
  void loadPayments().catch((error) => {
    handleLandlordError(error, "Unable to refresh payments.");
  });
});

refreshOverviewDashboardBtnEl?.addEventListener("click", () => {
  void Promise.all([loadRentStatus(), loadBills()]).catch((error) => {
    handleLandlordError(error, "Unable to refresh overview dashboard.");
  });
});

refreshExpendituresBtnEl?.addEventListener("click", () => {
  void loadExpenditures().catch((error) => {
    handleLandlordError(error, "Unable to refresh expenditure log.");
  });
});

refreshMoveOutSettlementsBtnEl?.addEventListener("click", () => {
  void loadMoveOutSettlements().catch((error) => {
    handleLandlordError(error, "Unable to refresh move-out settlement report.");
  });
});

moveOutSettlementsBodyEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.action !== "collect-resident-debt") {
    return;
  }

  handleCollectResidentDebtClick(
    target,
    String(target.dataset.settlementId || "").trim(),
    String(target.dataset.residentName || "Resident").trim(),
    Number(target.dataset.amountKsh ?? 0)
  );
});

expendituresBodyEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.action !== "delete-expenditure") {
    return;
  }

  handleDeleteExpenditureClick(
    target,
    String(target.dataset.expenditureId || "").trim(),
    String(target.dataset.title || "").trim()
  );
});

expenditureFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const buildingId = getSelectedUtilityBuildingId();
  const houseNumber = normalizeHouse(expenditureHouseNumberEl?.value || "");
  const category = String(expenditureCategoryEl?.value || "maintenance").trim();
  const title = String(expenditureTitleEl?.value || "").trim();
  const amountKsh = Number(expenditureAmountEl?.value ?? Number.NaN);
  const note = String(expenditureNoteEl?.value || "").trim() || undefined;
  const chargeableToResident =
    expenditureChargeableEl instanceof HTMLInputElement
      ? expenditureChargeableEl.checked
      : false;

  if (!buildingId) {
    showError("Select a building first.");
    return;
  }

  if (!title) {
    showError("Expenditure title is required.");
    return;
  }

  if (!Number.isFinite(amountKsh) || amountKsh <= 0) {
    showError("Enter a valid expenditure amount.");
    return;
  }

  if (expenditureSubmitBtnEl instanceof HTMLButtonElement) {
    expenditureSubmitBtnEl.disabled = true;
  }

  void (async () => {
    try {
      await requestJson("/api/landlord/expenditures", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          buildingId,
          houseNumber: houseNumber || undefined,
          category,
          title,
          amountKsh,
          chargeableToResident,
          note
        })
      });

      if (expenditureHouseNumberEl instanceof HTMLInputElement) {
        expenditureHouseNumberEl.value = "";
      }
      if (expenditureAmountEl instanceof HTMLInputElement) {
        expenditureAmountEl.value = "";
      }
      if (expenditureTitleEl instanceof HTMLInputElement) {
        expenditureTitleEl.value = "";
      }
      if (expenditureNoteEl instanceof HTMLTextAreaElement) {
        expenditureNoteEl.value = "";
      }
      if (expenditureChargeableEl instanceof HTMLInputElement) {
        expenditureChargeableEl.checked = false;
      }

      setStatus(`Expenditure recorded for ${buildingId}.`);
      await loadExpenditures();
    } catch (error) {
      handleLandlordError(error, "Failed to record expenditure.");
    } finally {
      if (expenditureSubmitBtnEl instanceof HTMLButtonElement) {
        expenditureSubmitBtnEl.disabled = false;
      }
    }
  })();
});

closeMoveOutSettlementBtnEl?.addEventListener("click", () => {
  closeMoveOutSettlementModal();
});

moveOutSettlementBackdropEl?.addEventListener("click", () => {
  closeMoveOutSettlementModal();
});

moveOutSettlementFormEl?.addEventListener("change", (event) => {
  if (
    event.target instanceof HTMLInputElement &&
    event.target.name === "moveOutSettlementAction"
  ) {
    updateMoveOutSettlementHelp();
  }
});

moveOutSettlementFormEl?.addEventListener("submit", (event) => {
  void submitMoveOutSettlement(event);
});

landlordNotificationsBtnEl?.addEventListener("click", () => {
  state.ownerNotificationsOpen = !state.ownerNotificationsOpen;
  renderOwnerNotifications();
  if (state.ownerNotificationsOpen) {
    void loadOwnerNotifications().catch((error) => {
      handleLandlordError(error, "Unable to refresh owner alerts.");
    });
  }
});

landlordNotificationsRefreshBtnEl?.addEventListener("click", () => {
  void loadOwnerNotifications().catch((error) => {
    handleLandlordError(error, "Unable to refresh owner alerts.");
  });
});

landlordNotificationsReadBtnEl?.addEventListener("click", () => {
  void markOwnerNotificationsRead().catch((error) => {
    handleLandlordError(error, "Unable to mark owner alerts as read.");
  });
});

landlordPushAlertsBtnEl?.addEventListener("click", () => {
  void enableLandlordPushAlerts();
});

refreshAllBtnEl.addEventListener("click", () => {
  void loadData();
});

landlordLogoutBtnEl.addEventListener("click", () => {
  void signOut();
});

void (async () => {
  const ok = await ensureSession();
  if (!ok) {
    return;
  }

  const now = new Date();
  utilityBillMonthEl.value = toMonthInputValue(now);
  if (registryReadingMonthEl instanceof HTMLInputElement) {
    registryReadingMonthEl.value = toMonthInputValue(previousBillingMonth(now));
    state.registryReadingMonth = toBillingMonth(registryReadingMonthEl.value);
  }
  if (utilitySheetBillingMonthEl instanceof HTMLInputElement) {
    utilitySheetBillingMonthEl.value = toMonthInputValue(now);
  }
  if (utilitySheetDueDateEl instanceof HTMLInputElement) {
    const due = new Date(now);
    due.setDate(due.getDate() + 7);
    due.setHours(23, 59, 0, 0);
    utilitySheetDueDateEl.value = toDateTimeLocalInputValue(due);
  }
  setActiveLandlordView(state.activeLandlordView);
  try {
    renderGeneratedHousePreview(buildGeneratedHouseNumbers());
  } catch (_error) {
    renderGeneratedHousePreview([]);
  }
  syncUtilityBillInputMode();
  await loadData();
  void syncLandlordPushState({ subscribeIfAllowed: true });
  window.setInterval(() => {
    void refreshPendingApplicationsIndicator().catch(() => {
      // Ignore transient polling failures while the landlord keeps working.
    });
  }, APPLICATION_REFRESH_INTERVAL_MS);
})();
