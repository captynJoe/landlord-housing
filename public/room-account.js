import {
  applyDocumentBranding,
  getLandlordPortalTitle,
  getLandlordShellBrand
} from "./portal-branding.js";
import { notifyError, notifyStatus } from "./notifications.js";

const roomAccountTagEl = document.getElementById("room-account-tag");
const roomAccountTitleEl = document.getElementById("room-account-title");
const roomAccountSubtitleEl = document.getElementById("room-account-subtitle");
const roomAccountStatusEl = document.getElementById("room-account-status");
const roomAccountErrorEl = document.getElementById("room-account-error");
const roomAccountRefreshBtnEl = document.getElementById("room-account-refresh-btn");
const roomAccountLogoutBtnEl = document.getElementById("room-account-logout-btn");

const metricOccupancyEl = document.getElementById("room-metric-occupancy");
const metricBillingModeEl = document.getElementById("room-metric-billing-mode");
const metricOutstandingEl = document.getElementById("room-metric-outstanding");
const metricProjectedEl = document.getElementById("room-metric-projected");
const metricCurrentUtilityEl = document.getElementById("room-metric-current-utility");
const metricChargesEl = document.getElementById("room-metric-charges");
const metricPaidEl = document.getElementById("room-metric-paid");
const metricNextDueEl = document.getElementById("room-metric-next-due");

const roomChargeSourceEl = document.getElementById("room-charge-source");
const roomVisibleThroughEl = document.getElementById("room-visible-through");
const roomChargeCustomEl = document.getElementById("room-charge-custom");
const roomChargeMonthEl = document.getElementById("room-charge-month");
const roomChargeBuildingDefaultEl = document.getElementById("room-charge-building-default");
const roomChargeFixedEl = document.getElementById("room-charge-fixed");
const roomChargeNoteEl = document.getElementById("room-charge-note");
const roomProfileGridEl = document.getElementById("room-profile-grid");
const roomAnomaliesEl = document.getElementById("room-anomalies");
const roomBillsBodyEl = document.getElementById("room-bills-body");
const roomRentPaymentsBodyEl = document.getElementById("room-rent-payments-body");
const roomPaymentsBodyEl = document.getElementById("room-payments-body");
const roomChargesBodyEl = document.getElementById("room-charges-body");
const roomIssuesEl = document.getElementById("room-issues");
const roomAuditEventsEl = document.getElementById("room-audit-events");
const roomBillingHoldFormEl = document.getElementById("room-billing-hold-form");
const roomBillingHoldScopeEl = document.getElementById("room-billing-hold-scope");
const roomBillingHoldUtilityWrapEl = document.getElementById("room-billing-hold-utility-wrap");
const roomBillingHoldUtilityEl = document.getElementById("room-billing-hold-utility");
const roomBillingHoldStartEl = document.getElementById("room-billing-hold-start");
const roomBillingHoldEndEl = document.getElementById("room-billing-hold-end");
const roomBillingHoldReasonEl = document.getElementById("room-billing-hold-reason");
const roomBillingHoldSubmitEl = document.getElementById("room-billing-hold-submit");
const roomBillingHoldsEl = document.getElementById("room-billing-holds");

const state = {
  buildingId: "",
  houseNumber: "",
  role: "-",
  loading: false,
  data: null
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requestJson(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: "same-origin"
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const issueMessage = payload.issues?.[0]?.message;
      const error = new Error(
        issueMessage ?? payload.error ?? `Request failed (${response.status})`
      );
      error.status = response.status;
      throw error;
    }
    return payload;
  });
}

function isGenericRouteNotFound(error) {
  return (
    error?.status === 404 &&
    /request failed \(404\)|api route not found|cannot (post|delete)/i.test(
      String(error?.message ?? "")
    )
  );
}

function redirectToLogin() {
  window.location.href = "/landlord/login";
}

function normalizeHouse(value) {
  return String(value ?? "").trim().toUpperCase();
}

function formatRoleLabel(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "landlord";
  }

  return normalized.replaceAll("_", " ");
}

function formatCurrency(value) {
  return `KSh ${Number(value ?? 0).toLocaleString("en-US")}`;
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

function toBillingMonth(value) {
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

function utilityTypeLabel(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "water") {
    return "Water";
  }
  if (normalized === "electricity") {
    return "Electricity";
  }
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Utility";
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

function formatAuditActionLabel(value) {
  switch (String(value ?? "").trim()) {
    case "rent.payment.recorded":
      return "Rent payment recorded";
    case "rent.payment.unrecorded":
      return "Rent payment unrecorded";
    case "utility.payment.recorded":
      return "Utility payment recorded";
    case "utility.payment.unrecorded":
      return "Utility payment unrecorded";
    case "resident.removed":
      return "Resident removed";
    case "resident.balance.writeoff":
      return "Balance written off";
    case "resident.debt.transferred":
      return "Debt transferred";
    case "room.removed":
      return "Room removed";
    case "billing.hold.created":
      return "Billing hold added";
    case "billing.hold.canceled":
      return "Billing hold resumed";
    default:
      return String(value ?? "").replaceAll(".", " ") || "Account activity";
  }
}

function formatAuditActor(actor) {
  const name = String(actor?.name ?? "").trim();
  const role = String(actor?.role ?? "").trim();
  if (name && role) {
    return `${name} • ${formatRoleLabel(role)}`;
  }
  return name || formatRoleLabel(role) || "System";
}

function formatExpenditureCategory(value) {
  switch (String(value ?? "").trim()) {
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

function currentBillingMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftBillingMonth(value, offset) {
  const normalized = toBillingMonth(value);
  if (!normalized) {
    return "";
  }

  const [yearRaw, monthRaw] = normalized.split("-");
  const shifted = new Date(Date.UTC(Number(yearRaw), Number(monthRaw) - 1 + offset, 1));
  if (Number.isNaN(shifted.getTime())) {
    return "";
  }

  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
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

function formatUtilityPaymentCoverage(payment) {
  const coveredMonths = Array.isArray(payment?.allocations)
    ? [...new Set(
        payment.allocations
          .map((item) =>
            String(item?.bill?.billingMonth ?? item?.event?.billingMonth ?? "").trim()
          )
          .filter(Boolean)
      )]
    : [];

  if (coveredMonths.length > 0) {
    return coveredMonths.map((item) => formatBillingMonth(item)).join(", ");
  }

  const fallback = String(payment?.billingMonth ?? "").trim();
  return fallback ? formatBillingMonth(fallback) : "-";
}

function canUnrecordPayments() {
  return String(state.role ?? "").trim() !== "caretaker";
}

function renderUnrecordPaymentButton(action, payment, extraAttributes = {}) {
  const paymentId = String(payment?.id ?? "").trim();
  const provider = String(payment?.provider ?? "").trim().toLowerCase();
  const source = String(payment?.source ?? "").trim().toLowerCase();
  if (!canUnrecordPayments() || !paymentId || (provider !== "cash" && source !== "manual")) {
    return "-";
  }

  const extra = Object.entries(extraAttributes)
    .map(([key, value]) => `data-${key}="${escapeHtml(value)}"`)
    .join(" ");

  return `
    <button
      type="button"
      class="btn-danger payment-unrecord-btn"
      data-action="${escapeHtml(action)}"
      data-payment-id="${escapeHtml(paymentId)}"
      data-amount="${escapeHtml(formatCurrency(payment?.amountKsh ?? 0))}"
      ${extra}
    >
      Unrecord
    </button>
  `;
}

function setStatus(message) {
  if (roomAccountStatusEl instanceof HTMLElement) {
    roomAccountStatusEl.textContent = message;
  }
  notifyStatus(message);
}

function showError(message) {
  if (!(roomAccountErrorEl instanceof HTMLElement)) {
    return;
  }

  if (!message) {
    roomAccountErrorEl.textContent = "";
    roomAccountErrorEl.classList.add("hidden");
    return;
  }

  roomAccountErrorEl.textContent = message;
  roomAccountErrorEl.classList.remove("hidden");
  notifyError(message);
}

function setLoading(loading) {
  state.loading = loading;
  if (roomAccountRefreshBtnEl instanceof HTMLButtonElement) {
    roomAccountRefreshBtnEl.disabled = loading;
  }
  if (roomAccountLogoutBtnEl instanceof HTMLButtonElement) {
    roomAccountLogoutBtnEl.disabled = loading;
  }
}

function parseRoomRoute() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length < 4 || segments[0] !== "landlord" || segments[1] !== "rooms") {
    throw new Error("Invalid room account route.");
  }

  return {
    buildingId: decodeURIComponent(segments[2] ?? "").trim(),
    houseNumber: normalizeHouse(decodeURIComponent(segments[3] ?? ""))
  };
}

function describeChargeSource(source, utilityBillingMode) {
  switch (String(source ?? "").trim()) {
    case "disabled":
      return {
        label: "Utility billing disabled",
        detail: "This building is not posting recurring utility charges right now."
      };
    case "metered":
      return {
        label: "Metered room",
        detail: "Both meters are present, so combined-charge defaults do not apply here."
      };
    case "room_custom_combined":
      return {
        label: "Room custom amount",
        detail: "This room overrides the building-level combined utility charge."
      };
    case "monthly_override_combined":
      return {
        label: "Month override",
        detail: "This room is following the selected month override because no room custom amount is set."
      };
    case "building_default_combined":
      return {
        label: "Building default",
        detail: "This room is following the building default combined charge."
      };
    case "fixed_charge":
      return {
        label: "Fixed-charge fallback",
        detail: "This room is using fixed water and electricity charges instead of a combined amount."
      };
    default:
      return {
        label:
          String(utilityBillingMode ?? "").trim() === "combined_charge"
            ? "Needs combined-charge setup"
            : "Needs charge setup",
        detail: "Add meters, fixed charges, or a custom combined amount before relying on recurring billing."
      };
  }
}

function getOccupancyLabel(room) {
  const hasResident = Boolean(room?.hasActiveResident || room?.residentUserId || room?.residentName);
  if (!hasResident) {
    return "Vacant";
  }
  if (String(room?.verificationStatus ?? "").trim() === "pending_review") {
    return "Pending review";
  }
  return "Occupied";
}

function getBillingModeLabel(room, payload) {
  const activeHolds = Array.isArray(payload?.billingHolds)
    ? payload.billingHolds.filter((item) => item?.active)
    : [];
  if (activeHolds.some((item) => item?.scope === "all")) {
    return "Billing paused";
  }
  if (activeHolds.some((item) => item?.scope === "utilities")) {
    return "Utilities paused";
  }
  if (activeHolds.some((item) => item?.scope === "rent")) {
    return "Rent paused";
  }

  const hasRent =
    Number(room?.monthlyRentKsh ?? 0) > 0 ||
    Number(payload?.summary?.currentMonthRentPaidKsh ?? 0) > 0 ||
    Number(payload?.summary?.currentMonthRentOutstandingKsh ?? 0) > 0 ||
    Number(payload?.summary?.totalRentPaidKsh ?? 0) > 0;
  const utilityMode = String(payload?.utilityBillingMode ?? "").trim() || "metered";

  if (!hasRent) {
    return utilityMode === "disabled" ? "Utilities disabled" : "Utilities only";
  }

  return utilityMode === "disabled" ? "Rent only" : "Rent + utilities";
}

function getNextDueLabel(payload) {
  const utilityDates = Array.isArray(payload?.utilityBills)
    ? payload.utilityBills
        .filter((item) => Number(item?.balanceKsh ?? 0) > 0 && item?.dueDate)
        .map((item) => new Date(item.dueDate))
        .filter((item) => !Number.isNaN(item.getTime()))
    : [];
  const rentDueDate = payload?.room?.rentDueDate ? new Date(payload.room.rentDueDate) : null;
  const includeRentDue =
    rentDueDate &&
    !Number.isNaN(rentDueDate.getTime()) &&
    Number(payload?.summary?.currentMonthRentOutstandingKsh ?? 0) > 0;
  const dueCandidates = includeRentDue ? [...utilityDates, rentDueDate] : utilityDates;
  if (dueCandidates.length === 0) {
    return "-";
  }

  dueCandidates.sort((left, right) => left.getTime() - right.getTime());
  return formatDateTime(dueCandidates[0]);
}

function getThisMonthCollectedKsh(payload) {
  const currentMonthKey = currentBillingMonth();
  const utilityCollected = Array.isArray(payload?.utilityPayments)
    ? payload.utilityPayments
        .filter((item) => monthKeyFromValue(item?.paidAt || item?.billingMonth) === currentMonthKey)
        .reduce((sum, item) => sum + Math.max(0, Number(item?.amountKsh ?? 0)), 0)
    : 0;

  return Math.max(0, Number(payload?.summary?.currentMonthRentPaidKsh ?? 0)) + utilityCollected;
}

function renderMetrics(payload) {
  const room = payload?.room ?? {};
  const summary = payload?.summary ?? {};

  if (metricOccupancyEl instanceof HTMLElement) {
    metricOccupancyEl.textContent = getOccupancyLabel(room);
  }
  if (metricBillingModeEl instanceof HTMLElement) {
    metricBillingModeEl.textContent = getBillingModeLabel(room, payload);
  }
  if (metricOutstandingEl instanceof HTMLElement) {
    metricOutstandingEl.textContent = formatCurrency(summary.displayedOutstandingKsh ?? 0);
  }
  if (metricProjectedEl instanceof HTMLElement) {
    metricProjectedEl.textContent = formatCurrency(summary.projectedOutstandingKsh ?? 0);
  }
  if (metricCurrentUtilityEl instanceof HTMLElement) {
    metricCurrentUtilityEl.textContent = formatCurrency(summary.currentUtilityDueKsh ?? 0);
  }
  if (metricChargesEl instanceof HTMLElement) {
    metricChargesEl.textContent = formatCurrency(summary.expenseChargesKsh ?? 0);
  }
  if (metricPaidEl instanceof HTMLElement) {
    metricPaidEl.textContent = formatCurrency(getThisMonthCollectedKsh(payload));
  }
  if (metricNextDueEl instanceof HTMLElement) {
    metricNextDueEl.textContent = getNextDueLabel(payload);
  }
}

function renderChargeSetup(payload) {
  const setup = payload?.chargeSetup ?? {};
  const anomalies = payload?.anomalies ?? {};
  const description = describeChargeSource(setup.source, payload?.utilityBillingMode);
  const missingMonths = Array.isArray(anomalies.possibleMissingBillingMonths)
    ? anomalies.possibleMissingBillingMonths
    : [];
  const heldMonths = Array.isArray(anomalies.heldRecurringBillingMonths)
    ? anomalies.heldRecurringBillingMonths
    : [];
  const fixedParts = [];
  if (Number(setup.resolvedWaterFixedChargeKsh ?? 0) > 0) {
    fixedParts.push(`Water ${formatCurrency(setup.resolvedWaterFixedChargeKsh)}`);
  }
  if (Number(setup.resolvedElectricityFixedChargeKsh ?? 0) > 0) {
    fixedParts.push(`Electric ${formatCurrency(setup.resolvedElectricityFixedChargeKsh)}`);
  }

  if (roomChargeSourceEl instanceof HTMLElement) {
    roomChargeSourceEl.textContent = description.label;
  }
  if (roomVisibleThroughEl instanceof HTMLElement) {
    roomVisibleThroughEl.textContent = formatBillingMonth(anomalies.visibleThroughBillingMonth);
  }
  if (roomChargeCustomEl instanceof HTMLElement) {
    roomChargeCustomEl.textContent =
      Number(setup.roomCombinedChargeKsh ?? 0) > 0
        ? formatCurrency(setup.roomCombinedChargeKsh)
        : "-";
  }
  if (roomChargeMonthEl instanceof HTMLElement) {
    roomChargeMonthEl.textContent =
      Number(setup.monthlyCombinedChargeKsh ?? 0) > 0
        ? formatCurrency(setup.monthlyCombinedChargeKsh)
        : "-";
  }
  if (roomChargeBuildingDefaultEl instanceof HTMLElement) {
    roomChargeBuildingDefaultEl.textContent =
      Number(setup.buildingDefaultCombinedChargeKsh ?? 0) > 0
        ? formatCurrency(setup.buildingDefaultCombinedChargeKsh)
        : "-";
  }
  if (roomChargeFixedEl instanceof HTMLElement) {
    roomChargeFixedEl.textContent = fixedParts.length > 0 ? fixedParts.join(" • ") : "-";
  }
  if (roomChargeNoteEl instanceof HTMLElement) {
    roomChargeNoteEl.textContent =
      missingMonths.length > 0
        ? `${description.detail} Missing recurring month${missingMonths.length === 1 ? "" : "s"}: ${missingMonths
            .map((item) => formatBillingMonth(item))
            .join(", ")}.`
        : heldMonths.length > 0
          ? `${description.detail} Held month${heldMonths.length === 1 ? "" : "s"}: ${heldMonths
              .map((item) => formatBillingMonth(item))
              .join(", ")}.`
        : description.detail;
  }
}

function canManageBillingHolds() {
  return String(state.role ?? "").trim() !== "caretaker";
}

function formatBillingHoldScope(value, utilityType) {
  const scope = String(value ?? "").trim();
  const utility = String(utilityType ?? "").trim();
  if (scope === "rent") {
    return "Rent";
  }
  if (scope === "all") {
    return "Rent + Utilities";
  }
  if (utility) {
    return utilityTypeLabel(utility);
  }
  return "Utilities";
}

function formatBillingHoldRange(hold) {
  const start = formatBillingMonth(hold?.startMonth);
  const end = formatBillingMonth(hold?.endMonth);
  return start === end ? start : `${start} to ${end}`;
}

function renderBillingHolds(payload) {
  if (!(roomBillingHoldsEl instanceof HTMLElement)) {
    return;
  }

  const holds = Array.isArray(payload?.billingHolds) ? payload.billingHolds : [];
  const sorted = [...holds].sort((left, right) => {
    if (Boolean(left?.active) !== Boolean(right?.active)) {
      return left?.active ? -1 : 1;
    }
    return String(right?.createdAt ?? "").localeCompare(String(left?.createdAt ?? ""));
  });

  if (roomBillingHoldFormEl instanceof HTMLElement) {
    roomBillingHoldFormEl.classList.toggle("hidden", !canManageBillingHolds());
  }

  if (sorted.length === 0) {
    roomBillingHoldsEl.innerHTML =
      '<p class="status-text">No billing holds recorded for this room.</p>';
    return;
  }

  roomBillingHoldsEl.innerHTML = sorted
    .map((hold) => {
      const active = Boolean(hold?.active);
      const scopeLabel = formatBillingHoldScope(hold?.scope, hold?.utilityType);
      return `
        <article class="package-card room-billing-hold-card ${active ? "is-active" : "is-canceled"}">
          <div>
            <p class="status-text">${escapeHtml(active ? "Active" : "Ended")} • ${escapeHtml(
              formatBillingHoldRange(hold)
            )}</p>
            <h4>${escapeHtml(scopeLabel)}</h4>
            <p class="status-text">${escapeHtml(hold?.reason || hold?.cancelReason || "No reason recorded.")}</p>
          </div>
          ${
            active && canManageBillingHolds()
              ? `<button type="button" class="ghost-btn" data-action="cancel-billing-hold" data-hold-id="${escapeHtml(
                  hold?.id
                )}" data-hold-label="${escapeHtml(scopeLabel)}">Resume</button>`
              : ""
          }
        </article>
      `;
    })
    .join("");
}

function renderProfile(payload) {
  if (!(roomProfileGridEl instanceof HTMLElement)) {
    return;
  }

  const room = payload?.room ?? {};
  const summary = payload?.summary ?? {};
  const building = payload?.building ?? {};
  const profileRows = [
    ["House", normalizeHouse(room.houseNumber || state.houseNumber)],
    ["Resident", room.residentName || "Vacant"],
    ["Phone", room.residentPhone || "-"],
    [
      "Verification",
      String(room?.verificationStatus ?? "").trim() === "pending_review"
        ? "Pending review"
        : room.residentName
          ? "Verified / active"
          : "-"
    ],
    ["Monthly Rent", Number(room.monthlyRentKsh ?? 0) > 0 ? formatCurrency(room.monthlyRentKsh) : "-"],
    ["Current Rent Due", formatCurrency(summary.currentMonthRentOutstandingKsh ?? 0)],
    ["Rent Outstanding", formatCurrency(summary.rentOutstandingKsh ?? 0)],
    ["Utility Arrears", formatCurrency(summary.utilityArrearsKsh ?? 0)],
    ["Water Meter", room.waterMeterNumber || "Missing"],
    ["Electric Meter", room.electricityMeterNumber || "Missing"],
    ["Registered In Building", building.houseRegistered ? "Yes" : "No"],
    ["Visible To Current Account", building.visibleToLandlord ? "Yes" : "No"]
  ];

  roomProfileGridEl.innerHTML = profileRows
    .map(
      ([label, value]) => `
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `
    )
    .join("");
}

function renderAnomalies(payload) {
  if (!(roomAnomaliesEl instanceof HTMLElement)) {
    return;
  }

  const anomalies = [];
  const room = payload?.room ?? {};
  const summary = payload?.summary ?? {};
  const chargeSetup = payload?.chargeSetup ?? {};
  const anomalyData = payload?.anomalies ?? {};
  const missingMonths = Array.isArray(anomalyData?.possibleMissingBillingMonths)
    ? anomalyData.possibleMissingBillingMonths
    : [];
  const overappliedBills = Array.isArray(anomalyData?.overappliedBills)
    ? anomalyData.overappliedBills
    : [];

  if (missingMonths.length > 0) {
    anomalies.push(
      `Recurring billing looks incomplete through ${formatBillingMonth(
        anomalyData.visibleThroughBillingMonth
      )}. Missing ${missingMonths.map((item) => formatBillingMonth(item)).join(", ")}. Estimated backfill ${formatCurrency(
        anomalyData.estimatedRecurringBackfillKsh ?? 0
      )}.`
    );
  }

  overappliedBills.forEach((item) => {
    anomalies.push(
      `${utilityTypeLabel(item.utilityType)} ${formatBillingMonth(
        item.billingMonth
      )} has ${formatCurrency(item.paidKsh)} paid against ${formatCurrency(
        item.amountKsh
      )}. Review duplicate or misallocated payments.`
    );
  });

  if (payload?.building?.houseRegistered === false || anomalyData?.overstatedOrphanedRoom) {
    anomalies.push(
      "This room has utility or charge activity but is not in the building house list. Confirm whether it should be archived or registered."
    );
  }

  if (payload?.building?.visibleToLandlord === false) {
    anomalies.push(
      "This room is not normally visible to the current landlord scope. Access is limited to direct route review."
    );
  }

  if (String(room?.verificationStatus ?? "").trim() === "pending_review") {
    anomalies.push(
      "Resident verification is still pending review. Resident-facing billing may stay hidden until approval is complete."
    );
  }

  if (String(chargeSetup?.source ?? "").trim() === "unconfigured") {
    anomalies.push(
      "This room still needs a reliable utility charge rule. Add meters, a room custom amount, or a building default before future months post."
    );
  }

  if (
    Number(summary.expenseChargesKsh ?? 0) > 0 &&
    Number(summary.displayedOutstandingKsh ?? 0) < Number(summary.projectedOutstandingKsh ?? 0)
  ) {
    anomalies.push(
      `Room charges are already part of the visible outstanding. Projected outstanding also includes missing recurring utility months.`
    );
  }

  roomAnomaliesEl.innerHTML =
    anomalies.length > 0
      ? anomalies
          .map((message) => `<p class="status-text resident-ledger-flag">${escapeHtml(message)}</p>`)
          .join("")
      : '<p class="status-text resident-ledger-flag">No room anomalies detected right now.</p>';
}

function renderUtilityBills(payload) {
  if (!(roomBillsBodyEl instanceof HTMLElement)) {
    return;
  }

  const rows = Array.isArray(payload?.utilityBills) ? payload.utilityBills : [];
  roomBillsBodyEl.replaceChildren();

  if (rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="7">No utility bills recorded for this room.</td>';
    roomBillsBodyEl.append(row);
    return;
  }

  rows.forEach((item) => {
    const paidKsh = Array.isArray(item?.payments)
      ? item.payments.reduce((sum, payment) => sum + Number(payment?.amountKsh ?? 0), 0)
      : 0;
    const noteParts = [];
    if (item?.note) {
      noteParts.push(String(item.note).trim());
    }
    if (paidKsh > 0) {
      noteParts.push(`Paid ${formatCurrency(paidKsh)}`);
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(utilityTypeLabel(item?.utilityType))}</td>
      <td>${escapeHtml(formatBillingMonth(item?.billingMonth))}</td>
      <td>${escapeHtml(formatCurrency(item?.amountKsh ?? 0))}</td>
      <td>${escapeHtml(formatCurrency(item?.balanceKsh ?? 0))}</td>
      <td>${escapeHtml(formatDateTime(item?.dueDate))}</td>
      <td>${escapeHtml(String(item?.status ?? "open").trim() || "open")}</td>
      <td>${escapeHtml(noteParts.join(" • ") || "-")}</td>
    `;
    roomBillsBodyEl.append(row);
  });
}

function renderRentPayments(payload) {
  if (!(roomRentPaymentsBodyEl instanceof HTMLElement)) {
    return;
  }

  const rows = Array.isArray(payload?.rentPayments) ? payload.rentPayments : [];
  roomRentPaymentsBodyEl.replaceChildren();

  if (rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6">No rent payments recorded for this room.</td>';
    roomRentPaymentsBodyEl.append(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(formatBillingMonth(item?.billingMonth))}</td>
      <td>${escapeHtml(formatPaymentProvider(item?.provider))}</td>
      <td>${escapeHtml(item?.providerReference || "-")}</td>
      <td>${escapeHtml(formatCurrency(item?.amountKsh ?? 0))}</td>
      <td>${escapeHtml(formatDateTime(item?.paidAt || item?.createdAt))}</td>
      <td>${renderUnrecordPaymentButton("unrecord-rent-payment", item)}</td>
    `;
    roomRentPaymentsBodyEl.append(row);
  });
}

function renderUtilityPayments(payload) {
  if (!(roomPaymentsBodyEl instanceof HTMLElement)) {
    return;
  }

  const rows = Array.isArray(payload?.utilityPayments) ? payload.utilityPayments : [];
  roomPaymentsBodyEl.replaceChildren();

  if (rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="7">No utility payments recorded for this room.</td>';
    roomPaymentsBodyEl.append(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(utilityTypeLabel(item?.utilityType))}</td>
      <td>${escapeHtml(formatUtilityPaymentCoverage(item))}</td>
      <td>${escapeHtml(formatPaymentProvider(item?.provider))}</td>
      <td>${escapeHtml(item?.providerReference || item?.note || "-")}</td>
      <td>${escapeHtml(formatCurrency(item?.amountKsh ?? 0))}</td>
      <td>${escapeHtml(formatDateTime(item?.paidAt || item?.createdAt))}</td>
      <td>${renderUnrecordPaymentButton("unrecord-utility-payment", item, {
        "utility-type": String(item?.utilityType ?? "")
      })}</td>
    `;
    roomPaymentsBodyEl.append(row);
  });
}

function renderRoomCharges(payload) {
  if (!(roomChargesBodyEl instanceof HTMLElement)) {
    return;
  }

  const rows = Array.isArray(payload?.expenditures) ? payload.expenditures : [];
  roomChargesBodyEl.replaceChildren();

  if (rows.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6">No room-specific charges posted yet.</td>';
    roomChargesBodyEl.append(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(formatDateTime(item?.createdAt))}</td>
      <td>${escapeHtml(formatExpenditureCategory(item?.category))}</td>
      <td>${escapeHtml(item?.title || "Room charge")}</td>
      <td>${escapeHtml(formatCurrency(item?.amountKsh ?? 0))}</td>
      <td>${escapeHtml(item?.chargeableToResident ? "Yes" : "No")}</td>
      <td>${escapeHtml(item?.note || "-")}</td>
    `;
    roomChargesBodyEl.append(row);
  });
}

function renderRoomAuditEvents(payload) {
  if (!(roomAuditEventsEl instanceof HTMLElement)) {
    return;
  }

  const events = Array.isArray(payload?.auditEvents) ? payload.auditEvents : [];
  if (events.length === 0) {
    roomAuditEventsEl.innerHTML =
      '<p class="status-text">No account audit events recorded for this room.</p>';
    return;
  }

  roomAuditEventsEl.innerHTML = events
    .map(
      (event) => `
        <article class="package-card room-account-audit-card">
          <p class="status-text">${escapeHtml(formatDateTime(event.createdAt))} • ${escapeHtml(
            formatAuditActor(event.actor)
          )}</p>
          <h4>${escapeHtml(formatAuditActionLabel(event.action))}</h4>
          <p class="status-text">${escapeHtml(event.summary || "Account activity recorded.")}</p>
        </article>
      `
    )
    .join("");
}

function renderRoomIssues(payload) {
  if (!(roomIssuesEl instanceof HTMLElement)) {
    return;
  }

  const tickets = Array.isArray(payload?.tickets) ? payload.tickets : [];
  if (tickets.length === 0) {
    roomIssuesEl.innerHTML = '<p class="status-text">No room issues recorded for this room.</p>';
    return;
  }

  roomIssuesEl.innerHTML = tickets
    .map(
      (ticket) => `
        <article class="package-card room-account-issue-card">
          <p class="status-text">${escapeHtml(ticket.queue || "support")} • ${escapeHtml(
            ticket.status || "open"
          )} • ${escapeHtml(formatDateTime(ticket.createdAt))}</p>
          <h4>${escapeHtml(ticket.title || "Room issue")}</h4>
          <p class="status-text">${escapeHtml(ticket.details || "No extra details recorded.")}</p>
        </article>
      `
    )
    .join("");
}

function renderRoomAccount(payload) {
  const building = payload?.building ?? {};
  const room = payload?.room ?? {};
  const buildingName = building.name || "Selected building";
  const shellBrand = getLandlordShellBrand(buildingName);
  const portalTitle = getLandlordPortalTitle(buildingName);
  const residentName = room.residentName || "Vacant room";
  const subtitleParts = [
    `${buildingName} • House ${normalizeHouse(room.houseNumber || state.houseNumber)}`
  ];

  if (room.residentPhone) {
    subtitleParts.push(room.residentPhone);
  }
  if (building.county || building.address) {
    subtitleParts.push([building.county, building.address].filter(Boolean).join(" • "));
  }

  applyDocumentBranding(`${portalTitle} • Room ${normalizeHouse(room.houseNumber || state.houseNumber)}`, shellBrand);

  if (roomAccountTagEl instanceof HTMLElement) {
    roomAccountTagEl.textContent = shellBrand;
  }
  if (roomAccountTitleEl instanceof HTMLElement) {
    roomAccountTitleEl.textContent = `${buildingName} • Room ${normalizeHouse(
      room.houseNumber || state.houseNumber
    )}`;
  }
  if (roomAccountSubtitleEl instanceof HTMLElement) {
    roomAccountSubtitleEl.textContent = `${residentName} • ${subtitleParts.join(" • ")}`;
  }

  renderMetrics(payload);
  renderChargeSetup(payload);
  renderProfile(payload);
  renderBillingHolds(payload);
  renderAnomalies(payload);
  renderUtilityBills(payload);
  renderRentPayments(payload);
  renderUtilityPayments(payload);
  renderRoomCharges(payload);
  renderRoomAuditEvents(payload);
  renderRoomIssues(payload);
}

function syncBillingHoldUtilityVisibility() {
  const scope = String(roomBillingHoldScopeEl?.value ?? "utilities");
  const isUtilities = scope === "utilities";
  if (roomBillingHoldUtilityWrapEl instanceof HTMLElement) {
    roomBillingHoldUtilityWrapEl.classList.toggle("hidden", !isUtilities);
  }
  if (!isUtilities && roomBillingHoldUtilityEl instanceof HTMLSelectElement) {
    roomBillingHoldUtilityEl.value = "";
  }
}

function setDefaultBillingHoldMonths() {
  const current = currentBillingMonth();
  if (roomBillingHoldStartEl instanceof HTMLInputElement && !roomBillingHoldStartEl.value) {
    roomBillingHoldStartEl.value = current;
  }
  if (roomBillingHoldEndEl instanceof HTMLInputElement && !roomBillingHoldEndEl.value) {
    roomBillingHoldEndEl.value = current;
  }
}

function setBillingHoldFormEnabled(enabled) {
  [
    roomBillingHoldScopeEl,
    roomBillingHoldUtilityEl,
    roomBillingHoldStartEl,
    roomBillingHoldEndEl,
    roomBillingHoldReasonEl,
    roomBillingHoldSubmitEl
  ].forEach((element) => {
    if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLButtonElement) {
      element.disabled = !enabled;
    }
  });
}

async function createBillingHold(event) {
  event.preventDefault();
  if (state.loading || !canManageBillingHolds()) {
    return;
  }

  const scope = String(roomBillingHoldScopeEl?.value ?? "utilities");
  const utilityType = String(roomBillingHoldUtilityEl?.value ?? "").trim();
  const startMonth = toBillingMonth(roomBillingHoldStartEl?.value) || currentBillingMonth();
  const endMonth = toBillingMonth(roomBillingHoldEndEl?.value) || startMonth;
  const reason = String(roomBillingHoldReasonEl?.value ?? "").trim();

  if (endMonth < startMonth) {
    showError("Billing hold end month must be the same as or after the start month.");
    return;
  }

  setLoading(true);
  setBillingHoldFormEnabled(false);
  showError("");
  setStatus("Saving billing hold...");

  try {
    await requestJson(
      `/api/landlord/buildings/${encodeURIComponent(state.buildingId)}/rooms/${encodeURIComponent(
        state.houseNumber
      )}/billing-holds`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          scope,
          utilityType: scope === "utilities" && utilityType ? utilityType : undefined,
          startMonth,
          endMonth,
          reason: reason || undefined
        })
      }
    );
    if (roomBillingHoldReasonEl instanceof HTMLInputElement) {
      roomBillingHoldReasonEl.value = "";
    }
    await loadRoomAccount();
    setStatus("Billing hold saved.");
  } catch (error) {
    if (error?.status === 401) {
      redirectToLogin();
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to save billing hold.";
    showError(message);
    setStatus("Billing hold save failed.");
  } finally {
    setBillingHoldFormEnabled(true);
    syncBillingHoldUtilityVisibility();
    setLoading(false);
  }
}

async function cancelBillingHold(button) {
  const holdId = String(button?.dataset?.holdId ?? "").trim();
  if (!holdId || state.loading || !canManageBillingHolds()) {
    return;
  }

  const label = String(button?.dataset?.holdLabel ?? "").trim() || "this billing hold";
  if (!window.confirm(`Resume billing for ${label}? Future automatic charges can post again.`)) {
    return;
  }

  const url = `/api/landlord/buildings/${encodeURIComponent(
    state.buildingId
  )}/rooms/${encodeURIComponent(state.houseNumber)}/billing-holds/${encodeURIComponent(
    holdId
  )}/cancel`;

  setLoading(true);
  showError("");
  button.disabled = true;
  setStatus("Resuming billing...");

  try {
    await requestJson(url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });
    await loadRoomAccount();
    setStatus("Billing resumed.");
  } catch (error) {
    if (error?.status === 401) {
      redirectToLogin();
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to resume billing.";
    showError(message);
    setStatus("Billing resume failed.");
  } finally {
    button.disabled = false;
    setLoading(false);
  }
}

async function ensureSession() {
  const payload = await requestJson("/api/auth/landlord/session");
  state.role = payload?.data?.role || "landlord";
  setStatus(`Signed in as ${formatRoleLabel(state.role)}. Loading room account...`);
}

async function loadRoomAccount() {
  setLoading(true);
  showError("");

  try {
    const payload = await requestJson(
      `/api/landlord/buildings/${encodeURIComponent(state.buildingId)}/rooms/${encodeURIComponent(
        state.houseNumber
      )}/ledger`
    );
    state.role = payload?.role || state.role;
    state.data = payload?.data ?? null;
    renderRoomAccount(state.data);
    setStatus(
      `Signed in as ${formatRoleLabel(state.role)}. Room account refreshed ${formatDateTime(
        new Date().toISOString()
      )}.`
    );
  } catch (error) {
    if (error?.status === 401) {
      redirectToLogin();
      return;
    }

    const message =
      error instanceof Error ? error.message : "Unable to load the room account.";
    showError(message);
    setStatus("Room account load failed.");
  } finally {
    setLoading(false);
  }
}

async function unrecordPayment(button) {
  const action = button?.dataset?.action;
  const paymentId = String(button?.dataset?.paymentId ?? "").trim();
  const amount = String(button?.dataset?.amount ?? "").trim() || "this payment";
  if (!paymentId || (action !== "unrecord-rent-payment" && action !== "unrecord-utility-payment")) {
    return;
  }

  const paymentLabel = action === "unrecord-rent-payment" ? "rent" : "utility";
  const confirmed = window.confirm(
    `Unrecord ${amount} ${paymentLabel} payment? The room balance will reopen by that amount.`
  );
  if (!confirmed) {
    return;
  }

  const utilityType = String(button?.dataset?.utilityType ?? "").trim();
  if (action === "unrecord-utility-payment" && !utilityType) {
    showError("Utility type is missing for this payment.");
    return;
  }

  const roomPath = encodeURIComponent(state.houseNumber);
  const paymentPath = encodeURIComponent(paymentId);
  const buildingQuery = `buildingId=${encodeURIComponent(state.buildingId)}`;
  const postUrl =
    action === "unrecord-rent-payment"
      ? `/api/landlord/rent/${roomPath}/payments/${paymentPath}/unrecord`
      : `/api/landlord/utilities/${encodeURIComponent(
          utilityType
        )}/${roomPath}/payments/${paymentPath}/unrecord`;
  const deleteUrl =
    action === "unrecord-rent-payment"
      ? `/api/landlord/rent/${roomPath}/payments/${paymentPath}?${buildingQuery}`
      : `/api/landlord/utilities/${encodeURIComponent(
          utilityType
        )}/${roomPath}/payments/${paymentPath}?${buildingQuery}`;

  setLoading(true);
  showError("");
  button.disabled = true;
  setStatus(`Unrecording ${paymentLabel} payment...`);

  try {
    try {
      await requestJson(postUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          buildingId: state.buildingId
        })
      });
    } catch (error) {
      if (!isGenericRouteNotFound(error)) {
        throw error;
      }

      await requestJson(deleteUrl, {
        method: "DELETE"
      });
    }
    await loadRoomAccount();
    setStatus(`${paymentLabel.charAt(0).toUpperCase() + paymentLabel.slice(1)} payment unrecorded.`);
  } catch (error) {
    if (error?.status === 401) {
      redirectToLogin();
      return;
    }

    const message =
      error instanceof Error ? error.message : "Unable to unrecord this payment.";
    showError(message);
    setStatus("Payment unrecord failed.");
  } finally {
    button.disabled = false;
    setLoading(false);
  }
}

function handlePaymentActionClick(event) {
  if (state.loading || !(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest("button[data-action]");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  void unrecordPayment(button);
}

function handleBillingHoldClick(event) {
  if (state.loading || !(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest("button[data-action='cancel-billing-hold']");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  void cancelBillingHold(button);
}

async function signOut() {
  setLoading(true);
  try {
    await requestJson("/api/auth/logout", {
      method: "POST"
    });
  } catch (_error) {
    // fall through to redirect
  }
  redirectToLogin();
}

async function init() {
  try {
    const route = parseRoomRoute();
    state.buildingId = route.buildingId;
    state.houseNumber = route.houseNumber;
    await ensureSession();
    await loadRoomAccount();
  } catch (error) {
    if (error?.status === 401) {
      redirectToLogin();
      return;
    }

    const message =
      error instanceof Error ? error.message : "Unable to open this room account.";
    showError(message);
    setStatus("Room account unavailable.");
  }
}

roomAccountRefreshBtnEl?.addEventListener("click", () => {
  if (state.loading) {
    return;
  }
  void loadRoomAccount();
});

roomAccountLogoutBtnEl?.addEventListener("click", () => {
  if (state.loading) {
    return;
  }
  void signOut();
});

roomRentPaymentsBodyEl?.addEventListener("click", handlePaymentActionClick);
roomPaymentsBodyEl?.addEventListener("click", handlePaymentActionClick);
roomBillingHoldScopeEl?.addEventListener("change", syncBillingHoldUtilityVisibility);
roomBillingHoldFormEl?.addEventListener("submit", createBillingHold);
roomBillingHoldsEl?.addEventListener("click", handleBillingHoldClick);

setDefaultBillingHoldMonths();
syncBillingHoldUtilityVisibility();

void init();
