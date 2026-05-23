import { initPasswordVisibilityToggles } from "./password-visibility.js";
import {
  createUploadedImageGallery,
  renderSelectedImagePreviews,
  uploadImageFiles,
  validateImageFiles
} from "./media-upload.js";
import {
  applyDocumentBranding,
  getResidentPortalTitle,
  getResidentShellBrand
} from "./portal-branding.js?v=20260521b";

const RESIDENT_TOKEN_KEY = "estatedesk_resident_session_token";
const RESIDENT_SESSION_TOKEN_KEY = "estatedesk_resident_session_token_session";
const RESIDENT_REMEMBER_DEVICE_KEY = "estatedesk_resident_remember_device";
const RESIDENT_SW_URL = "/resident-sw.js?v=20260523a";

let deferredInstallPrompt = null;
let residentSwRegistrationPromise = null;

const apiStatusEl = document.getElementById("api-status");
const authStateEl = document.getElementById("auth-state");
const feedbackBoxEl = document.getElementById("feedback-box");
const userMenuToggleEl = document.getElementById("user-menu-toggle");
const userMenuPanelEl = document.getElementById("user-menu-panel");
const residentBrandEl = document.getElementById("resident-brand");
const residentHeroTitleEl = document.getElementById("resident-hero-title");

const residentAuthPanelEl = document.getElementById("resident-auth-panel");
const residentSessionPanelEl = document.getElementById("resident-session-panel");
const residentSessionSummaryEl = document.getElementById("resident-session-summary");
const residentPasswordChangePanelEl = document.getElementById(
  "resident-password-change-panel"
);
const residentPasswordChangeFormEl = document.getElementById(
  "resident-password-change-form"
);
const residentPasswordNewEl = document.getElementById("resident-password-new");
const residentPasswordConfirmEl = document.getElementById("resident-password-confirm");
const residentPasswordChangeBtnEl = document.getElementById(
  "resident-password-change-btn"
);
const residentLayoutEl = document.getElementById("resident-layout");
const residentLogoutBtnEl = document.getElementById("resident-logout-btn");
const residentNavButtons = [...document.querySelectorAll("[data-resident-view]")];
const residentViewPanels = [...document.querySelectorAll("[data-resident-view-panel]")];
const overviewBuildingEl = document.getElementById("overview-building");
const overviewHouseNumberEl = document.getElementById("overview-house-number");
const overviewSessionExpiryEl = document.getElementById("overview-session-expiry");
const openSupportViewBtnEl = document.getElementById("open-support-view-btn");
const openPaymentsViewBtnEl = document.getElementById("open-payments-view-btn");
const openNoticesViewBtnEl = document.getElementById("open-notices-view-btn");

const residentAuthFormEl = document.getElementById("resident-auth-form");
const authBuildingIdEl = document.getElementById("auth-building-id");
const authHouseNumberEl = document.getElementById("auth-house-number");
const authPhoneNumberEl = document.getElementById("auth-phone-number");
const authPasswordEl = document.getElementById("auth-password");
const residentRememberDeviceEl = document.getElementById("resident-remember-device");
const signupIdentityTypeEl = document.getElementById("signup-identity-type");
const signupIdentityNumberEl = document.getElementById("signup-identity-number");
const signupOccupationStatusEl = document.getElementById("signup-occupation-status");
const signupOccupationLabelEl = document.getElementById("signup-occupation-label");
const residentSignupBtnEl = document.getElementById("resident-signup-btn");
const residentLoginBtnEl = document.getElementById("resident-login-btn");
const residentForgotBtnEl = document.getElementById("resident-forgot-btn");
const residentAuthFeedbackEl = document.getElementById("resident-auth-feedback");

const refreshAllBtnEl = document.getElementById("refresh-all-btn");
const reportFormEl = document.getElementById("report-form");
const boundBuildingEl = document.getElementById("bound-building");
const boundHouseNumberEl = document.getElementById("bound-house-number");
const reportTypeEl = document.getElementById("report-type");
const reportTitleEl = document.getElementById("report-title");
const reportDetailsEl = document.getElementById("report-details");
const reportAttachmentsEl = document.getElementById("report-attachments");
const reportAttachmentPreviewEl = document.getElementById("report-attachment-preview");
const theftWorkflowFieldsEl = document.getElementById("theft-workflow-fields");
const reportStolenItemEl = document.getElementById("report-stolen-item");
const reportIncidentLocationEl = document.getElementById("report-incident-location");
const reportIncidentStartEl = document.getElementById("report-incident-start");
const reportIncidentEndEl = document.getElementById("report-incident-end");
const reportCaseReferenceEl = document.getElementById("report-case-reference");
const submitBtnEl = document.getElementById("submit-btn");

const reportsListEl = document.getElementById("reports-list");
const reportsCountEl = document.getElementById("reports-count");
const notificationListEl = document.getElementById("notification-list");
const notificationCountEl = document.getElementById("notification-count");
const installAppStatusEl = document.getElementById("install-app-status");
const pushStatusTextEl = document.getElementById("push-status-text");
const smsStatusTextEl = document.getElementById("sms-status-text");
const installAppBtnEl = document.getElementById("install-app-btn");
const pushEnableBtnEl = document.getElementById("push-enable-btn");
const pushDisableBtnEl = document.getElementById("push-disable-btn");
const smsEnableBtnEl = document.getElementById("sms-enable-btn");
const smsDisableBtnEl = document.getElementById("sms-disable-btn");
const smsRentToggleEl = document.getElementById("sms-rent-toggle");
const smsUtilityToggleEl = document.getElementById("sms-utility-toggle");
const rentDueEl = document.getElementById("rent-due");

const paymentsSummaryActionEl = document.getElementById("payments-summary-action");
const paymentsTotalOutstandingEl = document.getElementById("payments-total-outstanding");
const paymentsRentOutstandingEl = document.getElementById("payments-rent-outstanding");
const paymentsUtilityOutstandingEl = document.getElementById("payments-utility-outstanding");
const paymentsMonthPaidEl = document.getElementById("payments-month-paid");
const paymentShortcutButtons = [...document.querySelectorAll("[data-payment-shortcut]")];
const paymentInstructionsCardEl = document.getElementById("payment-instructions-card");
const paymentInstructionsTitleEl = document.getElementById("payment-instructions-title");
const paymentInstructionsMethodEl = document.getElementById("payment-instructions-method");
const paymentInstructionsListEl = document.getElementById("payment-instructions-list");
const paymentInstructionsNoteEl = document.getElementById("payment-instructions-note");
const utilityBillsSummaryEl = document.getElementById("utility-bills-summary");
const utilityBillsListEl = document.getElementById("utility-bills-list");
const rentPaymentClusterEl = document.querySelector(".payment-cluster-rent");
const rentPaymentSectionEl = document.getElementById("rent-payment-section");
const rentPaymentStateEl = document.getElementById("rent-payment-state");
const rentPaymentFormEl = document.getElementById("rent-payment-form");
const rentPaymentMonthEl = document.getElementById("rent-payment-month");
const rentPaymentAmountEl = document.getElementById("rent-payment-amount");
const rentPaymentRemainingEl = document.getElementById("rent-payment-remaining");
const rentPaymentMethodEl = document.getElementById("rent-payment-method");
const rentPaymentPhoneEl = document.getElementById("rent-payment-phone");
const rentPaymentBtnEl = document.getElementById("rent-payment-btn");
const rentPaymentsCountEl = document.getElementById("rent-payments-count");
const rentPaymentsListEl = document.getElementById("rent-payments-list");
const utilityPaymentSectionEl = document.getElementById("utility-payment-section");
const utilityPaymentStateEl = document.getElementById("utility-payment-state");
const utilityPaymentFormEl = document.getElementById("utility-payment-form");
const utilityPaymentTypeEl = document.getElementById("utility-payment-type");
const utilityPaymentMonthEl = document.getElementById("utility-payment-month");
const utilityPaymentAmountEl = document.getElementById("utility-payment-amount");
const utilityPaymentRemainingEl = document.getElementById("utility-payment-remaining");
const utilityPaymentProviderEl = document.getElementById("utility-payment-provider");
const utilityPaymentPhoneEl = document.getElementById("utility-payment-phone");
const utilityPaymentReferenceEl = document.getElementById("utility-payment-reference");
const utilityPaymentBalanceEl = document.getElementById("utility-payment-balance");
const utilityPaymentBtnEl = document.getElementById("utility-payment-btn");
const utilityPaymentsCountEl = document.getElementById("utility-payments-count");
const utilityPaymentsListEl = document.getElementById("utility-payments-list");
const mpesaStatusModalEl = document.getElementById("mpesa-status-modal");
const mpesaStatusBackdropEl = document.getElementById("mpesa-status-backdrop");
const mpesaStatusTitleEl = document.getElementById("mpesa-status-title");
const mpesaStatusBadgeEl = document.getElementById("mpesa-status-badge");
const mpesaStatusCopyEl = document.getElementById("mpesa-status-copy");
const mpesaStatusMetaEl = document.getElementById("mpesa-status-meta");
const mpesaStatusNoteEl = document.getElementById("mpesa-status-note");
const mpesaStatusCloseEl = document.getElementById("mpesa-status-close");
const mpesaStatusCheckBtnEl = document.getElementById("mpesa-status-check-btn");
const mpesaStatusRetryBtnEl = document.getElementById("mpesa-status-retry-btn");
const mpesaStatusCloseBtnEl = document.getElementById("mpesa-status-close-btn");
const paymentReceiptModalEl = document.getElementById("payment-receipt-modal");
const paymentReceiptBackdropEl = document.getElementById("payment-receipt-backdrop");
const paymentReceiptCardEl = document.getElementById("payment-receipt-card");
const paymentReceiptCloseEl = document.getElementById("payment-receipt-close");
const paymentReceiptSaveBtnEl = document.getElementById("payment-receipt-save-btn");
const paymentReceiptDismissBtnEl = document.getElementById("payment-receipt-dismiss-btn");

const reportItemTemplate = document.getElementById("report-item-template");
const notificationItemTemplate = document.getElementById("notification-item-template");

const DEFAULT_PAYMENT_ACCESS = Object.freeze({
  rentEnabled: true,
  waterEnabled: true,
  electricityEnabled: true
});
const DEFAULT_SMS_PREFERENCES = Object.freeze({
  smsEnabled: true,
  rentEnabled: true,
  utilityEnabled: true,
  supportEnabled: false
});
const VALID_RESIDENT_VIEWS = new Set(["overview", "support", "payments", "notices"]);
const REPORT_ATTACHMENT_LIMIT = 4;

function readStoredResidentToken() {
  const rememberedToken = localStorage.getItem(RESIDENT_TOKEN_KEY) ?? "";
  if (rememberedToken) {
    return {
      token: rememberedToken,
      rememberDevice: true
    };
  }

  const sessionToken = sessionStorage.getItem(RESIDENT_SESSION_TOKEN_KEY) ?? "";
  return {
    token: sessionToken,
    rememberDevice: false
  };
}

function readStoredRememberDevicePreference() {
  return localStorage.getItem(RESIDENT_REMEMBER_DEVICE_KEY) === "true";
}

const INITIAL_RESIDENT_STORAGE = readStoredResidentToken();

const state = {
  buildings: [],
  residentSession: null,
  rentDue: null,
  reports: [],
  notifications: [],
  pushConfig: null,
  pushSubscriptionEndpoint: "",
  smsConfig: null,
  utilityBills: [],
  utilityMeters: [],
  utilityLatestReadings: [],
  rentPayments: [],
  utilityPayments: [],
  paymentAccess: { ...DEFAULT_PAYMENT_ACCESS },
  paymentInstructions: null,
  residentToken: INITIAL_RESIDENT_STORAGE.token,
  rememberResidentDevice:
    INITIAL_RESIDENT_STORAGE.token !== ""
      ? INITIAL_RESIDENT_STORAGE.rememberDevice
      : readStoredRememberDevicePreference(),
  rentPaymentPollTimer: null,
  rentPaymentPollAttempts: 0,
  rentCheckoutRequestId: null,
  rentPaymentBaseline: null,
  rentSelectedBillingMonth: null,
  utilityPaymentPollTimer: null,
  utilityPaymentPollAttempts: 0,
  utilityCheckoutRequestId: null,
  utilityCheckoutType: null,
  utilityPaymentBaseline: null,
  activeMpesaFlow: null,
  mpesaStatusModalDismissed: false,
  activeReceipt: null,
  activeResidentView: "payments",
  utilitySelectedBillMonthByType: {
    water: null,
    electricity: null
  },
  pwaInstalled: false
};

const RENT_PAYMENT_POLL_INTERVAL_MS = 5000;
const RENT_PAYMENT_POLL_MAX_ATTEMPTS = 24;
const PAYMENT_SYNC_INTERVAL_MS = 2500;
const PAYMENT_SYNC_MAX_ATTEMPTS = 6;
const BUILDINGS_FETCH_MAX_ATTEMPTS = 3;
const BUILDINGS_FETCH_RETRY_DELAYS_MS = [250, 750];

const REQUIRED_DOM_BINDINGS = Object.freeze([
  ["api-status", apiStatusEl],
  ["auth-state", authStateEl],
  ["feedback-box", feedbackBoxEl],
  ["user-menu-toggle", userMenuToggleEl],
  ["user-menu-panel", userMenuPanelEl],
  ["resident-auth-panel", residentAuthPanelEl],
  ["resident-session-panel", residentSessionPanelEl],
  ["resident-session-summary", residentSessionSummaryEl],
  ["resident-password-change-panel", residentPasswordChangePanelEl],
  ["resident-password-change-form", residentPasswordChangeFormEl],
  ["resident-password-new", residentPasswordNewEl],
  ["resident-password-confirm", residentPasswordConfirmEl],
  ["resident-password-change-btn", residentPasswordChangeBtnEl],
  ["resident-layout", residentLayoutEl],
  ["resident-logout-btn", residentLogoutBtnEl],
  ["overview-building", overviewBuildingEl],
  ["overview-house-number", overviewHouseNumberEl],
  ["overview-session-expiry", overviewSessionExpiryEl],
  ["resident-auth-form", residentAuthFormEl],
  ["auth-building-id", authBuildingIdEl],
  ["auth-house-number", authHouseNumberEl],
  ["auth-phone-number", authPhoneNumberEl],
  ["auth-password", authPasswordEl],
  ["signup-identity-type", signupIdentityTypeEl],
  ["signup-identity-number", signupIdentityNumberEl],
  ["signup-occupation-status", signupOccupationStatusEl],
  ["signup-occupation-label", signupOccupationLabelEl],
  ["resident-signup-btn", residentSignupBtnEl],
  ["resident-login-btn", residentLoginBtnEl],
  ["resident-forgot-btn", residentForgotBtnEl],
  ["resident-auth-feedback", residentAuthFeedbackEl],
  ["refresh-all-btn", refreshAllBtnEl],
  ["report-form", reportFormEl],
  ["bound-building", boundBuildingEl],
  ["bound-house-number", boundHouseNumberEl],
  ["report-type", reportTypeEl],
  ["report-title", reportTitleEl],
  ["report-details", reportDetailsEl],
  ["theft-workflow-fields", theftWorkflowFieldsEl],
  ["report-stolen-item", reportStolenItemEl],
  ["report-incident-location", reportIncidentLocationEl],
  ["report-incident-start", reportIncidentStartEl],
  ["report-incident-end", reportIncidentEndEl],
  ["report-case-reference", reportCaseReferenceEl],
  ["submit-btn", submitBtnEl],
  ["reports-list", reportsListEl],
  ["reports-count", reportsCountEl],
  ["notification-list", notificationListEl],
  ["notification-count", notificationCountEl],
  ["install-app-status", installAppStatusEl],
  ["push-status-text", pushStatusTextEl],
  ["sms-status-text", smsStatusTextEl],
  ["install-app-btn", installAppBtnEl],
  ["push-enable-btn", pushEnableBtnEl],
  ["push-disable-btn", pushDisableBtnEl],
  ["sms-enable-btn", smsEnableBtnEl],
  ["sms-disable-btn", smsDisableBtnEl],
  ["sms-rent-toggle", smsRentToggleEl],
  ["sms-utility-toggle", smsUtilityToggleEl],
  ["rent-due", rentDueEl],
  ["payments-summary-action", paymentsSummaryActionEl],
  ["payments-total-outstanding", paymentsTotalOutstandingEl],
  ["payments-rent-outstanding", paymentsRentOutstandingEl],
  ["payments-utility-outstanding", paymentsUtilityOutstandingEl],
  ["payments-month-paid", paymentsMonthPaidEl],
  ["payment-instructions-card", paymentInstructionsCardEl],
  ["payment-instructions-title", paymentInstructionsTitleEl],
  ["payment-instructions-method", paymentInstructionsMethodEl],
  ["payment-instructions-list", paymentInstructionsListEl],
  ["payment-instructions-note", paymentInstructionsNoteEl],
  ["utility-bills-summary", utilityBillsSummaryEl],
  ["utility-bills-list", utilityBillsListEl],
  ["rent-payment-section", rentPaymentSectionEl],
  ["rent-payment-state", rentPaymentStateEl],
  ["rent-payment-form", rentPaymentFormEl],
  ["rent-payment-month", rentPaymentMonthEl],
  ["rent-payment-amount", rentPaymentAmountEl],
  ["rent-payment-remaining", rentPaymentRemainingEl],
  ["rent-payment-method", rentPaymentMethodEl],
  ["rent-payment-phone", rentPaymentPhoneEl],
  ["rent-payment-btn", rentPaymentBtnEl],
  ["rent-payments-count", rentPaymentsCountEl],
  ["rent-payments-list", rentPaymentsListEl],
  ["utility-payment-section", utilityPaymentSectionEl],
  ["utility-payment-state", utilityPaymentStateEl],
  ["utility-payment-form", utilityPaymentFormEl],
  ["utility-payment-type", utilityPaymentTypeEl],
  ["utility-payment-month", utilityPaymentMonthEl],
  ["utility-payment-amount", utilityPaymentAmountEl],
  ["utility-payment-remaining", utilityPaymentRemainingEl],
  ["utility-payment-provider", utilityPaymentProviderEl],
  ["utility-payment-phone", utilityPaymentPhoneEl],
  ["utility-payment-reference", utilityPaymentReferenceEl],
  ["utility-payment-balance", utilityPaymentBalanceEl],
  ["utility-payment-btn", utilityPaymentBtnEl],
  ["utility-payments-count", utilityPaymentsCountEl],
  ["utility-payments-list", utilityPaymentsListEl],
  ["mpesa-status-modal", mpesaStatusModalEl],
  ["mpesa-status-backdrop", mpesaStatusBackdropEl],
  ["mpesa-status-title", mpesaStatusTitleEl],
  ["mpesa-status-badge", mpesaStatusBadgeEl],
  ["mpesa-status-copy", mpesaStatusCopyEl],
  ["mpesa-status-meta", mpesaStatusMetaEl],
  ["mpesa-status-note", mpesaStatusNoteEl],
  ["mpesa-status-close", mpesaStatusCloseEl],
  ["mpesa-status-check-btn", mpesaStatusCheckBtnEl],
  ["mpesa-status-retry-btn", mpesaStatusRetryBtnEl],
  ["mpesa-status-close-btn", mpesaStatusCloseBtnEl],
  ["payment-receipt-modal", paymentReceiptModalEl],
  ["payment-receipt-backdrop", paymentReceiptBackdropEl],
  ["payment-receipt-card", paymentReceiptCardEl],
  ["payment-receipt-close", paymentReceiptCloseEl],
  ["payment-receipt-save-btn", paymentReceiptSaveBtnEl],
  ["payment-receipt-dismiss-btn", paymentReceiptDismissBtnEl],
  ["report-item-template", reportItemTemplate],
  ["notification-item-template", notificationItemTemplate]
]);

function normalizeHouseNumber(value) {
  return value.trim().toUpperCase();
}

function supportsResidentPwa() {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

function supportsResidentPush() {
  return (
    supportsResidentPwa() &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function isStandaloneApp() {
  return Boolean(
    window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
  );
}

function urlBase64ToUint8Array(value) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4 || 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(padded);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatCurrency(value) {
  return `KSh ${Number(value ?? 0).toLocaleString("en-US")}`;
}

function toIsoFromDateTimeLocal(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function utilityLabel(utilityType) {
  return utilityType === "water" ? "Water" : "Electricity";
}

function formatReadingValue(value) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function normalizeUtilityMeterDisplay(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "NO-METER" || normalized === "METER-UNSET") {
    return "";
  }

  return normalized;
}

function appendLatestUtilityReadingCards(container, latestReadings = [], meters = []) {
  if (!(container instanceof HTMLElement)) {
    return 0;
  }

  const latestReadingByType = new Map();
  if (Array.isArray(latestReadings)) {
    latestReadings.forEach((item) => {
      if (!item?.utilityType || latestReadingByType.has(item.utilityType)) {
        return;
      }

      latestReadingByType.set(item.utilityType, item);
    });
  }

  const latestMeterByType = new Map();
  if (Array.isArray(meters)) {
    meters.forEach((item) => {
      if (!item?.utilityType || latestMeterByType.has(item.utilityType)) {
        return;
      }

      latestMeterByType.set(item.utilityType, item);
    });
  }

  let appendedCount = 0;

  ["water", "electricity"].forEach((utilityType) => {
    const reading = latestReadingByType.get(utilityType) ?? null;
    const meter = latestMeterByType.get(utilityType) ?? null;
    if (!reading && !meter) {
      return;
    }

    appendedCount += 1;
    const meterNumber =
      normalizeUtilityMeterDisplay(reading?.meterNumber) ||
      normalizeUtilityMeterDisplay(meter?.meterNumber);

    const card = document.createElement("article");
    card.className = "stack-item utility-bill-card utility-reading-card";

    const top = document.createElement("div");
    top.className = "stack-top";

    const title = document.createElement("strong");
    title.className = "item-title";
    title.textContent = utilityLabel(utilityType);

    const chip = document.createElement("span");
    chip.className = "item-chip chip-clear";
    chip.textContent = reading ? "Last recording" : "Meter on file";

    top.append(title, chip);

    const details = document.createElement("p");
    details.className = "item-details";
    details.textContent = reading
      ? `${meterNumber ? `Meter ${meterNumber} • ` : ""}Reading ${formatReadingValue(
          reading.previousReading
        )} -> ${formatReadingValue(reading.currentReading)} for ${reading.billingMonth}.`
      : `${
          meterNumber ? `Meter ${meterNumber} is on file. ` : ""
        }Waiting for the first recorded reading.`;

    const meta = document.createElement("dl");
    meta.className = "utility-bill-meta";
    meta.innerHTML = reading
      ? `
        <div>
          <dt>Recorded</dt>
          <dd>${formatDateTime(reading.recordedAt)}</dd>
        </div>
        <div>
          <dt>Usage</dt>
          <dd>${formatReadingValue(reading.unitsConsumed)} units</dd>
        </div>
        <div>
          <dt>Meter</dt>
          <dd>${escapeHtml(meterNumber || "Pending")}</dd>
        </div>
      `
      : `
        <div>
          <dt>Status</dt>
          <dd>No reading posted yet</dd>
        </div>
        <div>
          <dt>Meter</dt>
          <dd>${escapeHtml(meterNumber || "Pending")}</dd>
        </div>
        <div>
          <dt>Last update</dt>
          <dd>${formatDateTime(meter?.updatedAt)}</dd>
        </div>
      `;

    card.append(top, details, meta);
    container.append(card);
  });

  return appendedCount;
}

function normalizeBillingMonthInput(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed.slice(0, 7) : undefined;
}

function shiftBillingMonth(billingMonth, months) {
  const normalized = normalizeBillingMonthInput(billingMonth);
  if (!normalized) {
    return undefined;
  }

  const [yearText, monthText] = normalized.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) {
    return normalized;
  }

  const shifted = new Date(Date.UTC(year, monthIndex + months, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getCurrentBillingMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function compareBillingMonths(left, right) {
  const normalizedLeft = normalizeBillingMonthInput(left);
  const normalizedRight = normalizeBillingMonthInput(right);
  if (!normalizedLeft && !normalizedRight) {
    return 0;
  }
  if (!normalizedLeft) {
    return -1;
  }
  if (!normalizedRight) {
    return 1;
  }
  return normalizedLeft.localeCompare(normalizedRight);
}

function listBillingMonthsBetween(startMonth, endMonth) {
  const normalizedStart = normalizeBillingMonthInput(startMonth);
  const normalizedEnd = normalizeBillingMonthInput(endMonth);
  if (!normalizedStart || !normalizedEnd) {
    return [];
  }

  if (compareBillingMonths(normalizedStart, normalizedEnd) > 0) {
    return [normalizedStart];
  }

  const months = [];
  let cursor = normalizedStart;

  while (cursor && compareBillingMonths(cursor, normalizedEnd) <= 0) {
    months.push(cursor);
    cursor = shiftBillingMonth(cursor, 1);
  }

  return months;
}

function toPositiveNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function formatAmountValue(value) {
  const numeric = Math.round(toPositiveNumber(value));
  return numeric > 0 ? String(numeric) : "";
}

function computeSuggestedStarterAmount(balance) {
  const total = Math.ceil(toPositiveNumber(balance));
  if (!total) {
    return 0;
  }

  if (total <= 300) {
    return total;
  }

  if (total <= 800) {
    return Math.min(total, 200);
  }

  if (total <= 2000) {
    return Math.min(total, 500);
  }

  return Math.min(total, 1000);
}

function computeQuickPayAmount(balance, mode) {
  const total = toPositiveNumber(balance);
  if (!total) {
    return 0;
  }

  if (mode === "half") {
    return Math.ceil(total / 2);
  }

  if (mode === "weekly") {
    return Math.ceil(total / 4);
  }

  if (mode === "finish") {
    return Math.ceil(total);
  }

  return Math.ceil(total);
}

function setPaymentAmountValue(inputEl, balance, amount) {
  if (!(inputEl instanceof HTMLInputElement)) {
    return;
  }

  const total = Math.ceil(toPositiveNumber(balance));
  const requestedAmount = Math.ceil(toPositiveNumber(amount));
  const nextAmount =
    total > 0 ? Math.min(total, requestedAmount || total) : requestedAmount;
  inputEl.value = formatAmountValue(nextAmount);
  inputEl.focus();
  syncPaymentMessaging();
}

function applyQuickPayAmount(inputEl, balance, mode) {
  const amount = computeQuickPayAmount(balance, mode);
  setPaymentAmountValue(inputEl, balance, amount);
}

function captureRentPaymentBaseline() {
  state.rentPaymentBaseline = {
    balanceKsh: getRentOutstandingBalance(),
    paymentsCount: Array.isArray(state.rentPayments) ? state.rentPayments.length : 0
  };
}

function captureUtilityPaymentBaseline(utilityType) {
  state.utilityPaymentBaseline = {
    utilityType,
    balanceKsh: getUtilityOutstandingBalance(utilityType),
    paymentsCount: Array.isArray(state.utilityPayments)
      ? state.utilityPayments.length
      : 0
  };
}

function hasRentReceiptArrived(baseline) {
  if (!baseline) {
    return true;
  }

  const currentBalance = getRentOutstandingBalance();
  const currentPayments = Array.isArray(state.rentPayments) ? state.rentPayments.length : 0;

  return currentBalance < baseline.balanceKsh || currentPayments > baseline.paymentsCount;
}

function hasUtilityReceiptArrived(baseline) {
  if (!baseline) {
    return true;
  }

  const currentBalance = getUtilityOutstandingBalance(baseline.utilityType);
  const currentPayments = Array.isArray(state.utilityPayments)
    ? state.utilityPayments.length
    : 0;

  return currentBalance < baseline.balanceKsh || currentPayments > baseline.paymentsCount;
}

async function pollForRentReceipt() {
  const baseline = state.rentPaymentBaseline;

  for (let attempt = 0; attempt < PAYMENT_SYNC_MAX_ATTEMPTS; attempt += 1) {
    await loadTenantData();
    if (hasRentReceiptArrived(baseline)) {
      state.rentPaymentBaseline = null;
      return true;
    }
    await sleep(PAYMENT_SYNC_INTERVAL_MS);
  }

  state.rentPaymentBaseline = null;
  return false;
}

async function pollForUtilityReceipt() {
  const baseline = state.utilityPaymentBaseline;

  for (let attempt = 0; attempt < PAYMENT_SYNC_MAX_ATTEMPTS; attempt += 1) {
    await loadTenantData();
    if (hasUtilityReceiptArrived(baseline)) {
      state.utilityPaymentBaseline = null;
      return true;
    }
    await sleep(PAYMENT_SYNC_INTERVAL_MS);
  }

  state.utilityPaymentBaseline = null;
  return false;
}

function findOutstandingUtilityBill(utilityType, billingMonth) {
  const targetMonth = normalizeBillingMonthInput(billingMonth);
  const bills = Array.isArray(state.utilityBills) ? state.utilityBills : [];
  const filtered = bills
    .filter((item) => item.utilityType === utilityType)
    .sort((a, b) => a.billingMonth.localeCompare(b.billingMonth));

  if (targetMonth) {
    return filtered.find((item) => item.billingMonth === targetMonth);
  }

  return filtered.find((item) => Number(item.balanceKsh) > 0) ?? filtered[0];
}

function listOutstandingUtilityBills(utilityType) {
  const bills = Array.isArray(state.utilityBills) ? state.utilityBills : [];
  return bills
    .filter(
      (item) => item.utilityType === utilityType && Number(item.balanceKsh) > 0
    )
    .sort((a, b) => a.billingMonth.localeCompare(b.billingMonth));
}

function getTotalOutstandingUtilityBalanceForType(utilityType) {
  return listOutstandingUtilityBills(utilityType).reduce(
    (sum, bill) => sum + toPositiveNumber(bill.balanceKsh),
    0
  );
}

function getSelectedUtilityBillMonth(utilityType) {
  return normalizeBillingMonthInput(
    state.utilitySelectedBillMonthByType?.[utilityType] ?? ""
  );
}

function setSelectedUtilityBillMonth(utilityType, billingMonth) {
  if (utilityType !== "water" && utilityType !== "electricity") {
    return;
  }

  state.utilitySelectedBillMonthByType[utilityType] =
    normalizeBillingMonthInput(billingMonth) ?? null;
}

function resolveRentReferenceBillingMonth() {
  const dueMonth = normalizeBillingMonthInput(state.rentDue?.dueDate);
  if (dueMonth) {
    return dueMonth;
  }

  const updatedMonth = normalizeBillingMonthInput(state.rentDue?.updatedAt);
  if (updatedMonth) {
    return updatedMonth;
  }

  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function listSelectableRentBillingMonths() {
  if (!state.rentDue) {
    return [];
  }

  const referenceMonth = resolveRentReferenceBillingMonth();
  if (!referenceMonth) {
    return [];
  }

  const currentMonth = getCurrentBillingMonth();
  const balance = getRentOutstandingBalance();
  const monthlyRent = toPositiveNumber(state.rentDue.monthlyRentKsh);
  const estimatedOpenMonthCount =
    balance > 0 && monthlyRent > 0 ? Math.max(1, Math.ceil(balance / monthlyRent)) : 0;
  const estimatedLastOpenMonth =
    estimatedOpenMonthCount > 0
      ? shiftBillingMonth(referenceMonth, estimatedOpenMonthCount - 1)
      : referenceMonth;
  const rangeEnd =
    compareBillingMonths(currentMonth, estimatedLastOpenMonth) > 0
      ? currentMonth
      : estimatedLastOpenMonth;

  return listBillingMonthsBetween(referenceMonth, rangeEnd);
}

function getSelectedRentBillingMonth() {
  return normalizeBillingMonthInput(state.rentSelectedBillingMonth ?? "");
}

function setSelectedRentBillingMonth(billingMonth) {
  state.rentSelectedBillingMonth = normalizeBillingMonthInput(billingMonth) ?? null;
}

function getActiveRentBillingMonth() {
  return (
    getSelectedRentBillingMonth() ??
    listSelectableRentBillingMonths()[0] ??
    resolveRentReferenceBillingMonth()
  );
}

function formatRentBillingMonthOptionLabel(billingMonth, index, total) {
  const currentMonth = getCurrentBillingMonth();
  const monthComparison = compareBillingMonths(billingMonth, currentMonth);

  if (total <= 1) {
    if (monthComparison < 0) {
      return `${billingMonth} • open arrears`;
    }
    if (monthComparison > 0) {
      return `${billingMonth} • upcoming cycle`;
    }
    return `${billingMonth} • current cycle`;
  }

  if (index === 0) {
    return `${billingMonth} • oldest arrears`;
  }

  if (monthComparison > 0) {
    return `${billingMonth} • upcoming cycle`;
  }

  if (monthComparison === 0) {
    return `${billingMonth} • current cycle`;
  }

  if (index === total - 1) {
    return `${billingMonth} • latest open`;
  }

  return `${billingMonth} • arrears`;
}

function syncRentBillingMonthOptions() {
  if (!(rentPaymentMonthEl instanceof HTMLSelectElement)) {
    return;
  }

  const billingMonths = listSelectableRentBillingMonths();
  const currentSelectedMonth = getSelectedRentBillingMonth();
  const fallbackMonth = state.rentDue ? resolveRentReferenceBillingMonth() : null;
  const options = billingMonths.length > 0 ? billingMonths : fallbackMonth ? [fallbackMonth] : [];
  const nextSelectedMonth =
    options.find((billingMonth) => billingMonth === currentSelectedMonth) ??
    billingMonths[0] ??
    fallbackMonth ??
    null;

  setSelectedRentBillingMonth(nextSelectedMonth);
  rentPaymentMonthEl.replaceChildren();

  if (options.length === 0) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Rent month unavailable";
    rentPaymentMonthEl.append(emptyOption);
    rentPaymentMonthEl.value = "";
    rentPaymentMonthEl.disabled = true;
    return;
  }

  options.forEach((billingMonth, index) => {
    const option = document.createElement("option");
    option.value = billingMonth;
    option.textContent = formatRentBillingMonthOptionLabel(
      billingMonth,
      index,
      options.length
    );
    rentPaymentMonthEl.append(option);
  });

  rentPaymentMonthEl.value = nextSelectedMonth ?? options[0];
  rentPaymentMonthEl.disabled =
    (rentPaymentSectionEl?.classList.contains("is-disabled") ?? false) || !state.rentDue;
}

function isRentPaymentEnabled() {
  return Boolean(state.paymentAccess?.rentEnabled);
}

function isUtilityPaymentEnabled(utilityType) {
  const key = utilityType === "electricity" ? "electricityEnabled" : "waterEnabled";
  return Boolean(state.paymentAccess?.[key]);
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

function currentMonthKey() {
  return monthKeyFromValue(new Date().toISOString());
}

function getRentOutstandingBalance() {
  return toPositiveNumber(state.rentDue?.balanceKsh);
}

function getExpenseOutstandingBalance() {
  return toPositiveNumber(state.rentDue?.expenseBalanceKsh ?? state.rentDue?.expenseArrearsKsh);
}

function getTotalUtilityOutstandingBalance() {
  return Array.isArray(state.utilityBills)
    ? state.utilityBills.reduce((sum, bill) => sum + toPositiveNumber(bill.balanceKsh), 0)
    : 0;
}

function getTotalOutstandingBalance() {
  return (
    getRentOutstandingBalance() +
    getTotalUtilityOutstandingBalance() +
    getExpenseOutstandingBalance()
  );
}

function getPaidThisMonthTotal() {
  const monthKey = currentMonthKey();
  const rentPaid = (Array.isArray(state.rentPayments) ? state.rentPayments : [])
    .filter((item) => monthKeyFromValue(item.paidAt || item.billingMonth) === monthKey)
    .reduce((sum, item) => sum + toPositiveNumber(item.amountKsh), 0);
  const utilityPaid = (Array.isArray(state.utilityPayments) ? state.utilityPayments : [])
    .filter((item) => monthKeyFromValue(item.paidAt || item.billingMonth) === monthKey)
    .reduce((sum, item) => sum + toPositiveNumber(item.amountKsh), 0);
  return rentPaid + utilityPaid;
}

function getUtilityOutstandingBalance(utilityType) {
  return getTotalOutstandingUtilityBalanceForType(utilityType);
}

function resolveShortcutUtilityType(preferredType) {
  const explicitType =
    preferredType === "electricity" || preferredType === "water" ? preferredType : "";
  if (explicitType && getUtilityOutstandingBalance(explicitType) > 0) {
    return explicitType;
  }

  const balances = [
    ["water", getUtilityOutstandingBalance("water")],
    ["electricity", getUtilityOutstandingBalance("electricity")]
  ];
  const firstOpen = balances.find(([, balance]) => balance > 0);
  return firstOpen ? firstOpen[0] : "water";
}

function syncPaymentShortcutButtons() {
  const billingEnabled = !state.residentSession || canResidentAccessBilling();
  const rentOutstanding = getRentOutstandingBalance();
  const utilityOutstanding = getTotalUtilityOutstandingBalance();
  const totalOutstanding = getTotalOutstandingBalance();
  const suggestedStarter = computeSuggestedStarterAmount(totalOutstanding);

  paymentShortcutButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const shortcut = String(button.dataset.paymentShortcut || "").trim();
    if (shortcut === "utility-full") {
      button.disabled = !billingEnabled || utilityOutstanding <= 0;
      button.textContent =
        utilityOutstanding > 0
          ? `Use utility ${formatCurrency(utilityOutstanding)}`
          : "Utility cleared";
      return;
    }

    if (shortcut === "rent-full") {
      button.disabled = !billingEnabled || rentOutstanding <= 0;
      button.textContent =
        rentOutstanding > 0 ? `Use rent ${formatCurrency(rentOutstanding)}` : "Rent cleared";
      return;
    }

    if (shortcut === "suggested-start") {
      button.disabled = !billingEnabled || totalOutstanding <= 0;
      button.textContent =
        totalOutstanding > 0
          ? `Suggested ${formatCurrency(suggestedStarter)}`
          : "Nothing due now";
    }
  });
}

function computeRemainingBalance(balance, amount) {
  return Math.max(0, Math.ceil(toPositiveNumber(balance)) - Math.ceil(toPositiveNumber(amount)));
}

function updatePaymentsSummaryCard() {
  if (state.residentSession && !canResidentAccessBilling()) {
    paymentsTotalOutstandingEl.textContent = formatCurrency(0);
    paymentsRentOutstandingEl.textContent = formatCurrency(0);
    paymentsUtilityOutstandingEl.textContent = formatCurrency(0);
    paymentsMonthPaidEl.textContent = formatCurrency(0);
    paymentsSummaryActionEl.textContent = getPendingReviewBillingMessage();
    syncPaymentShortcutButtons();
    return;
  }

  const rentOutstanding = getRentOutstandingBalance();
  const utilityOutstanding = getTotalUtilityOutstandingBalance();
  const totalOutstanding = getTotalOutstandingBalance();
  const paidThisMonth = getPaidThisMonthTotal();

  paymentsTotalOutstandingEl.textContent = formatCurrency(totalOutstanding);
  paymentsRentOutstandingEl.textContent = formatCurrency(rentOutstanding);
  paymentsUtilityOutstandingEl.textContent = formatCurrency(utilityOutstanding);
  paymentsMonthPaidEl.textContent = formatCurrency(paidThisMonth);

  if (totalOutstanding <= 0) {
    paymentsSummaryActionEl.textContent =
      "All balances are clear right now. If a new bill is posted, you can still pay it in small steps.";
    syncPaymentShortcutButtons();
    return;
  }

  const suggestedStarter = computeSuggestedStarterAmount(totalOutstanding);
  if (suggestedStarter >= totalOutstanding) {
    paymentsSummaryActionEl.textContent =
      "Your current balance is manageable. You can clear it now or still enter a smaller custom amount.";
    return;
  }

  paymentsSummaryActionEl.textContent = `You do not need to pay ${formatCurrency(
    totalOutstanding
  )} at once. A good start today is ${formatCurrency(
    suggestedStarter
  )}, and the remainder stays on your account.`;
  syncPaymentShortcutButtons();
}

function updateRentPaymentGuidance() {
  if (state.residentSession && !canResidentAccessBilling()) {
    rentPaymentRemainingEl.textContent = getPendingReviewBillingMessage();
    return;
  }

  if (!state.rentDue) {
    rentPaymentRemainingEl.textContent =
      "Rent payment will appear here once your room is configured for billing.";
    return;
  }

  const balance = getRentOutstandingBalance();
  const selectedMonth = getActiveRentBillingMonth();
  const monthCopy = selectedMonth ? ` Receipt month: ${selectedMonth}.` : "";
  const enteredAmount = toPositiveNumber(rentPaymentAmountEl.value);

  if (balance <= 0) {
    rentPaymentRemainingEl.textContent = `Your rent balance is clear right now.${monthCopy}`;
    return;
  }

  if (enteredAmount <= 0) {
    const suggestedStarter = computeSuggestedStarterAmount(balance);
    rentPaymentRemainingEl.textContent = `Rent balance open: ${formatCurrency(
      balance
    )}. Suggested start today: ${formatCurrency(
      suggestedStarter
    )}. Enter any amount to preview what remains.${monthCopy}`;
    return;
  }

  if (enteredAmount >= balance) {
    rentPaymentRemainingEl.textContent = `This payment clears the full rent balance of ${formatCurrency(
      balance
    )}.${monthCopy}`;
    return;
  }

  const remaining = computeRemainingBalance(balance, enteredAmount);
  rentPaymentRemainingEl.textContent = `After paying ${formatCurrency(
    enteredAmount
  )}, you will still have ${formatCurrency(remaining)} remaining on rent.`;
  if (monthCopy) {
    rentPaymentRemainingEl.textContent += monthCopy;
  }
}

function updateUtilityPaymentGuidance() {
  if (state.residentSession && !canResidentAccessBilling()) {
    utilityPaymentRemainingEl.textContent = getPendingReviewBillingMessage();
    return;
  }

  const utilityType = String(utilityPaymentTypeEl.value ?? "water");
  const outstandingBills = listOutstandingUtilityBills(utilityType);
  const bill = findOutstandingUtilityBill(
    utilityType,
    getSelectedUtilityBillMonth(utilityType)
  );

  if (!bill || toPositiveNumber(bill.balanceKsh) <= 0) {
    utilityPaymentRemainingEl.textContent = `No ${utilityLabel(
      utilityType
    ).toLowerCase()} balance is open right now.`;
    return;
  }

  const balance = toPositiveNumber(bill.balanceKsh);
  const totalOutstanding = getTotalOutstandingUtilityBalanceForType(utilityType);
  const billCount = outstandingBills.length;
  const enteredAmount = toPositiveNumber(utilityPaymentAmountEl.value);

  if (enteredAmount <= 0) {
    const suggestedStarter = computeSuggestedStarterAmount(totalOutstanding || balance);
    utilityPaymentRemainingEl.textContent =
      billCount > 1
        ? `${utilityLabel(utilityType)} payments start with ${
            bill.billingMonth
          } and can cover ${formatCurrency(totalOutstanding)} across ${billCount} open bills. Suggested start today: ${formatCurrency(
            suggestedStarter
          )}.`
        : `${utilityLabel(utilityType)} ${bill.billingMonth} is open for ${formatCurrency(
            balance
          )}. Suggested start today: ${formatCurrency(
            suggestedStarter
          )}. Enter any amount to preview what remains.`;
    return;
  }

  if (enteredAmount >= totalOutstanding) {
    utilityPaymentRemainingEl.textContent =
      billCount > 1
        ? `This payment clears the full ${utilityLabel(utilityType).toLowerCase()} balance of ${formatCurrency(
            totalOutstanding
          )} across ${billCount} bills.`
        : `This payment clears the full ${utilityLabel(utilityType).toLowerCase()} balance for ${bill.billingMonth}.`;
    return;
  }

  if (enteredAmount >= balance) {
    const carryForward = Math.max(0, enteredAmount - balance);
    utilityPaymentRemainingEl.textContent =
      carryForward > 0
        ? `This clears ${bill.billingMonth} and carries ${formatCurrency(
            carryForward
          )} into the next open ${utilityLabel(utilityType).toLowerCase()} bill.`
        : `This payment clears the full ${utilityLabel(utilityType).toLowerCase()} balance for ${bill.billingMonth}.`;
    return;
  }

  const remaining = computeRemainingBalance(balance, enteredAmount);
  utilityPaymentRemainingEl.textContent = `After paying ${formatCurrency(
    enteredAmount
  )}, you will still have ${formatCurrency(remaining)} remaining on this ${
    bill.billingMonth
  } ${utilityLabel(utilityType).toLowerCase()} bill.`;
}

function syncPaymentMessaging() {
  updatePaymentsSummaryCard();
  updateRentPaymentGuidance();
  updateUtilityPaymentGuidance();
}

function focusResidentPaymentSection(section, input) {
  setActiveResidentView("payments");
  window.requestAnimationFrame(() => {
    if (section instanceof HTMLElement) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (input instanceof HTMLInputElement) {
      input.focus({ preventScroll: true });
      input.select();
    }
  });
}

function applyResidentPaymentShortcut(shortcut) {
  if (state.residentSession && !canResidentAccessBilling()) {
    showFeedback(getPendingReviewBillingMessage());
    setActiveResidentView("payments", { scroll: true });
    return;
  }

  if (shortcut === "utility-full") {
    const utilityType = resolveShortcutUtilityType(utilityPaymentTypeEl?.value);
    const totalOutstanding = getUtilityOutstandingBalance(utilityType);
    if (totalOutstanding <= 0) {
      showFeedback(
        `No ${utilityLabel(utilityType).toLowerCase()} balance is open right now.`,
        "info"
      );
      return;
    }

    utilityPaymentTypeEl.value = utilityType;
    setSelectedUtilityBillMonth(utilityType, null);
    applyPaymentAccessUi();
    syncUtilityPaymentFormFromBalances();
    utilityPaymentAmountEl.value = formatAmountValue(totalOutstanding);
    updateUtilityPaymentGuidance();
    focusResidentPaymentSection(utilityPaymentSectionEl, utilityPaymentAmountEl);
    return;
  }

  if (shortcut === "rent-full") {
    const rentOutstanding = getRentOutstandingBalance();
    if (rentOutstanding <= 0) {
      showFeedback("No rent balance is open right now.", "info");
      return;
    }

    rentPaymentAmountEl.value = formatAmountValue(rentOutstanding);
    updateRentPaymentGuidance();
    focusResidentPaymentSection(rentPaymentSectionEl, rentPaymentAmountEl);
    return;
  }

  const rentOutstanding = getRentOutstandingBalance();
  const waterOutstanding = getUtilityOutstandingBalance("water");
  const electricityOutstanding = getUtilityOutstandingBalance("electricity");
  const largestUtilityType =
    electricityOutstanding > waterOutstanding ? "electricity" : "water";
  const utilityOutstanding = Math.max(waterOutstanding, electricityOutstanding);

  if (utilityOutstanding >= rentOutstanding && utilityOutstanding > 0) {
    utilityPaymentTypeEl.value = largestUtilityType;
    setSelectedUtilityBillMonth(largestUtilityType, null);
    applyPaymentAccessUi();
    syncUtilityPaymentFormFromBalances();
    utilityPaymentAmountEl.value = formatAmountValue(
      computeSuggestedStarterAmount(utilityOutstanding)
    );
    updateUtilityPaymentGuidance();
    focusResidentPaymentSection(utilityPaymentSectionEl, utilityPaymentAmountEl);
    return;
  }

  if (rentOutstanding > 0) {
    rentPaymentAmountEl.value = formatAmountValue(computeSuggestedStarterAmount(rentOutstanding));
    updateRentPaymentGuidance();
    focusResidentPaymentSection(rentPaymentSectionEl, rentPaymentAmountEl);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function appendPaymentInstructionDetail(label, value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || !(paymentInstructionsListEl instanceof HTMLElement)) {
    return false;
  }

  const item = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = normalized;
  item.append(term, description);
  paymentInstructionsListEl.append(item);
  return true;
}

function renderPaymentInstructions() {
  if (
    !(paymentInstructionsCardEl instanceof HTMLElement) ||
    !(paymentInstructionsListEl instanceof HTMLElement)
  ) {
    return;
  }

  const instructions = state.paymentInstructions;
  paymentInstructionsListEl.replaceChildren();

  if (!instructions) {
    paymentInstructionsTitleEl.textContent = "Payment instructions";
    paymentInstructionsMethodEl.textContent = "-";
    paymentInstructionsNoteEl.textContent =
      "Payment instructions will appear after your building details load.";
    return;
  }

  const method = String(instructions.primaryMethod || "mpesa");
  const effective = instructions.effective || {};
  paymentInstructionsTitleEl.textContent = instructions.buildingName
    ? `${instructions.buildingName} payment details`
    : "Payment instructions";
  paymentInstructionsMethodEl.textContent = instructions.methodLabel || method.toUpperCase();

  let hasDetail = false;
  if (method === "bank") {
    hasDetail =
      appendPaymentInstructionDetail("Bank", effective.bankName || instructions.bankName) ||
      hasDetail;
    hasDetail =
      appendPaymentInstructionDetail(
        "Account Name",
        effective.bankAccountName || instructions.bankAccountName
      ) || hasDetail;
    hasDetail =
      appendPaymentInstructionDetail(
        "Account Number",
        effective.bankAccountNumber || instructions.bankAccountNumber
      ) || hasDetail;
    hasDetail =
      appendPaymentInstructionDetail("Branch", effective.bankBranch || instructions.bankBranch) ||
      hasDetail;
    hasDetail =
      appendPaymentInstructionDetail(
        "SWIFT",
        effective.bankSwiftCode || instructions.bankSwiftCode
      ) || hasDetail;
  } else if (method === "cash") {
    hasDetail =
      appendPaymentInstructionDetail(
        "Cash Point",
        effective.cashLocation || instructions.cashLocation
      ) || hasDetail;
  } else if (method === "manual") {
    hasDetail =
      appendPaymentInstructionDetail(
        "Manual Payment",
        effective.instructions || instructions.instructions
      ) || hasDetail;
  } else {
    hasDetail =
      appendPaymentInstructionDetail(
        "M-PESA Number",
        effective.mpesaBusinessNumber || instructions.mpesaBusinessNumber
      ) || hasDetail;
    hasDetail =
      appendPaymentInstructionDetail(
        "Account Reference",
        effective.mpesaAccountReference || instructions.mpesaAccountReference
      ) || hasDetail;
    hasDetail =
      appendPaymentInstructionDetail(
        "Account Name",
        effective.mpesaAccountName || instructions.mpesaAccountName
      ) || hasDetail;
  }

  const notes = [
    method !== "manual" ? effective.instructions || instructions.instructions : "",
    effective.proofInstructions || instructions.proofInstructions
  ].filter(Boolean);
  paymentInstructionsNoteEl.textContent = notes.join(" ");

  if (!hasDetail) {
    appendPaymentInstructionDetail(
      "Status",
      "Payment details are not set yet. Contact management before sending rent."
    );
  }
}

function getPublicBuildingLabel(building, fallback = "Assigned building") {
  const name = String(building?.name ?? "").trim();
  return name || fallback;
}

function getResidentBuildingLabel() {
  const session = state.residentSession;
  if (!session) {
    return "-";
  }

  const building = state.buildings.find((item) => item.id === session.buildingId);
  return getPublicBuildingLabel(building);
}

function getSelectedResidentBuildingName() {
  const selectedBuildingId =
    authBuildingIdEl instanceof HTMLSelectElement
      ? String(authBuildingIdEl.value || "").trim()
      : "";
  return (
    state.buildings.find((item) => item.id === selectedBuildingId)?.name ?? ""
  );
}

function updateResidentBranding() {
  const sessionBuildingName = state.residentSession
    ? state.buildings.find((item) => item.id === state.residentSession.buildingId)?.name ?? ""
    : "";
  const buildingName = sessionBuildingName || getSelectedResidentBuildingName();
  const shellBrand = getResidentShellBrand(buildingName);
  const pageTitle = getResidentPortalTitle(buildingName);

  if (residentBrandEl instanceof HTMLElement) {
    residentBrandEl.textContent = shellBrand;
  }
  if (residentHeroTitleEl instanceof HTMLElement) {
    residentHeroTitleEl.textContent = pageTitle;
  }

  applyDocumentBranding(pageTitle, shellBrand);
}

function syncRememberDeviceToggle() {
  if (!(residentRememberDeviceEl instanceof HTMLInputElement)) {
    return;
  }

  residentRememberDeviceEl.checked = Boolean(state.rememberResidentDevice);
}

function getRememberDeviceSelection() {
  if (residentRememberDeviceEl instanceof HTMLInputElement) {
    return residentRememberDeviceEl.checked;
  }

  return Boolean(state.rememberResidentDevice);
}

function syncModalBodyState() {
  const hasOpenModal =
    !mpesaStatusModalEl.classList.contains("hidden") ||
    !paymentReceiptModalEl.classList.contains("hidden");
  document.body.classList.toggle("modal-open", hasOpenModal);
}

function setModalOpen(modalEl, isOpen) {
  modalEl.classList.toggle("hidden", !isOpen);
  syncModalBodyState();
}

function isFinalMpesaFlowStage(stage) {
  return ["success", "failed", "error", "unknown"].includes(String(stage ?? ""));
}

function pauseActiveMpesaFlow(flow) {
  if (!flow) {
    return;
  }

  if (flow.scope === "utility") {
    stopUtilityPaymentPolling();
    state.utilityPaymentPollAttempts = 0;
    utilityPaymentBtnEl.disabled = false;
    syncUtilityPaymentProviderUi();
    return;
  }

  stopRentPaymentPolling();
  state.rentPaymentPollAttempts = 0;
  rentPaymentBtnEl.disabled = false;
  syncRentPaymentButtonUi();
}

function closeMpesaStatusModal({ clearFlow = false } = {}) {
  const flow = state.activeMpesaFlow;
  const shouldClearFlow = clearFlow || isFinalMpesaFlowStage(flow?.stage);
  setModalOpen(mpesaStatusModalEl, false);

  if (shouldClearFlow) {
    state.activeMpesaFlow = null;
    state.mpesaStatusModalDismissed = false;
  } else if (flow) {
    state.mpesaStatusModalDismissed = true;
    pauseActiveMpesaFlow(flow);
  }

  syncRentPaymentButtonUi();
  syncUtilityPaymentProviderUi();
}

function closePaymentReceiptModal() {
  state.activeReceipt = null;
  setModalOpen(paymentReceiptModalEl, false);
}

function describeMpesaTarget(flow) {
  if (!flow) {
    return "payment";
  }

  if (flow.scope === "utility") {
    return `${utilityLabel(flow.utilityType)} utility payment`;
  }

  return "rent payment";
}

function renderMetaGrid(containerEl, rows) {
  containerEl.innerHTML = rows
    .filter((row) => row.value !== undefined && row.value !== null && String(row.value).trim())
    .map(
      (row) =>
        `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(String(row.value))}</dd></div>`
    )
    .join("");
}

function renderMpesaStatusModal() {
  const flow = state.activeMpesaFlow;
  if (!flow) {
    return;
  }

  const badgeStyles = {
    prompt: ["chip-mpesa", "Waiting for PIN"],
    checking: ["chip-due_soon", "Checking"],
    pending: ["chip-warning", "Awaiting approval"],
    success: ["chip-success", "Paid"],
    failed: ["chip-overdue", "Failed"],
    error: ["chip-warning", "Could not verify"],
    unknown: ["chip-warning", "Review ledger"]
  };
  const [badgeClass, badgeText] = badgeStyles[flow.stage] ?? badgeStyles.prompt;

  mpesaStatusTitleEl.textContent = flow.title ?? "Confirm payment on your phone";
  mpesaStatusBadgeEl.className = `item-chip ${badgeClass}`;
  mpesaStatusBadgeEl.textContent = flow.badge ?? badgeText;
  mpesaStatusCopyEl.textContent =
    flow.copy ??
    `An M-PESA prompt has been sent. Enter your PIN on your phone to finish this ${describeMpesaTarget(
      flow
    )}.`;
  mpesaStatusNoteEl.textContent = flow.note ?? "";

  renderMetaGrid(mpesaStatusMetaEl, [
    { label: "Payment", value: flow.scope === "utility" ? utilityLabel(flow.utilityType) : "Rent" },
    { label: "Amount", value: formatCurrency(flow.amountKsh) },
    { label: "Bill Month", value: flow.billingMonth ?? "Current ledger" },
    { label: "Phone", value: flow.phoneMask ?? "Resident phone" },
    { label: "Checkout ID", value: flow.checkoutRequestId },
    { label: "Receipt", value: flow.receiptReference ?? "" }
  ]);

  const canCheckStatus = ["prompt", "checking", "pending", "error"].includes(flow.stage);
  const canRetry = ["failed", "unknown", "error", "pending"].includes(flow.stage);

  mpesaStatusCheckBtnEl.classList.toggle("hidden", !canCheckStatus);
  mpesaStatusCheckBtnEl.disabled = flow.stage === "checking";
  mpesaStatusCheckBtnEl.textContent = flow.stage === "checking" ? "Checking..." : "Check status";

  mpesaStatusRetryBtnEl.classList.toggle("hidden", !canRetry);
  mpesaStatusRetryBtnEl.textContent =
    flow.stage === "pending" ? "Start new payment" : "Edit payment";

  setModalOpen(mpesaStatusModalEl, true);
}

function openMpesaStatusModal(flowUpdate = null, { force = false } = {}) {
  if (flowUpdate) {
    state.activeMpesaFlow = {
      ...(state.activeMpesaFlow ?? {}),
      ...flowUpdate
    };
  }

  const flow = state.activeMpesaFlow;
  if (!flow) {
    return;
  }

  const shouldForceOpen = force || isFinalMpesaFlowStage(flow.stage);
  if (shouldForceOpen) {
    state.mpesaStatusModalDismissed = false;
  }

  if (state.mpesaStatusModalDismissed && !shouldForceOpen) {
    return;
  }

  renderMpesaStatusModal();
}

function buildUtilityReceiptRecord(payment) {
  return {
    id: payment.id,
    kind: "utility",
    title: `${utilityLabel(payment.utilityType)} utility receipt`,
    subject: `${utilityLabel(payment.utilityType)} payment`,
    amountKsh: payment.amountKsh,
    paidAt: payment.paidAt,
    provider: String(payment.provider ?? "mpesa").toUpperCase(),
    providerReference: payment.providerReference ?? "Pending",
    billingMonth: payment.billingMonth ?? "Current bill",
    buildingLabel: getResidentBuildingLabel(),
    houseNumber: state.residentSession?.houseNumber ?? "-",
    secondaryLabel: utilityLabel(payment.utilityType)
  };
}

function buildRentReceiptRecord(payment) {
  return {
    id: payment.id,
    kind: "rent",
    title: "Rent payment receipt",
    subject: "Rent payment",
    amountKsh: payment.amountKsh,
    paidAt: payment.paidAt,
    provider: "MPESA",
    providerReference: payment.providerReference ?? "Pending",
    billingMonth: payment.billingMonth ?? "Current rent month",
    buildingLabel: getResidentBuildingLabel(),
    houseNumber: state.residentSession?.houseNumber ?? "-",
    secondaryLabel: "Rent"
  };
}

function renderReceiptCard(receipt) {
  paymentReceiptCardEl.innerHTML = `
    <div class="receipt-card-head">
      <div class="receipt-card-mark">
        <img src="/mpesa-icon.svg" alt="" width="42" height="42" />
        <div class="receipt-card-meta">
          <p class="receipt-card-status">Paid</p>
          <h3>${escapeHtml(receipt.title)}</h3>
          <p>${escapeHtml(receipt.buildingLabel)} • House ${escapeHtml(receipt.houseNumber)}</p>
        </div>
      </div>
      <div class="receipt-card-total">
        <p>Total paid</p>
        <strong>${escapeHtml(formatCurrency(receipt.amountKsh))}</strong>
      </div>
    </div>
    <dl class="receipt-grid">
      <div>
        <dt>Receipt No.</dt>
        <dd>${escapeHtml(receipt.providerReference)}</dd>
      </div>
      <div>
        <dt>Channel</dt>
        <dd>${escapeHtml(receipt.provider)}</dd>
      </div>
      <div>
        <dt>Payment For</dt>
        <dd>${escapeHtml(receipt.subject)}</dd>
      </div>
      <div>
        <dt>Bill Month</dt>
        <dd>${escapeHtml(receipt.billingMonth)}</dd>
      </div>
      <div>
        <dt>Posted At</dt>
        <dd>${escapeHtml(formatDateTime(receipt.paidAt))}</dd>
      </div>
      <div>
        <dt>Account</dt>
        <dd>${escapeHtml(receipt.secondaryLabel)}</dd>
      </div>
    </dl>
  `;
}

function openPaymentReceiptModal(receipt) {
  closeMpesaStatusModal({ clearFlow: true });
  state.activeReceipt = receipt;
  renderReceiptCard(receipt);
  setModalOpen(paymentReceiptModalEl, true);
}

function buildReceiptDownloadMarkup(receipt) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(receipt.title)}</title>
    <style>
      body { font-family: Outfit, Arial, sans-serif; margin: 0; padding: 24px; background: #f2f7f4; color: #102028; }
      .card { max-width: 720px; margin: 0 auto; padding: 24px; border-radius: 20px; background: #fff; border: 1px solid rgba(16, 28, 40, 0.12); }
      .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; }
      .brand { display: flex; gap: 12px; align-items: center; }
      .brand img { border-radius: 12px; }
      .status { display: inline-block; padding: 6px 10px; border-radius: 999px; background: rgba(10, 168, 58, 0.12); color: #0f6d44; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
      h1, h2, p { margin: 0; }
      .total strong { display: block; font-size: 28px; color: #0f6d44; }
      dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      dl div { padding: 12px; border-radius: 14px; border: 1px solid rgba(16, 28, 40, 0.08); background: #f8fbf9; }
      dt { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #51606d; font-weight: 700; }
      dd { margin: 8px 0 0; font-size: 16px; font-weight: 700; }
    </style>
  </head>
  <body>
    <article class="card">
      <div class="head">
        <div class="brand">
          <img src="data:image/svg+xml;utf8,${encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#0AA83A"/><path d="M9 39V26.5h4.2l3.4 6.7 3.4-6.7H24V39h-4v-5.6l-2.5 4.9h-1.9l-2.5-4.9V39z" fill="#fff"/><path d="M37.5 39V26.5h5.1c3.6 0 5.3 1.8 5.3 4.6 0 2.8-1.8 4.6-5.3 4.6h-1.2V39zm4-6.8h1.1c1 0 1.5-0.4 1.5-1.1 0-0.7-0.5-1.1-1.5-1.1h-1.1z" fill="#fff"/></svg>'
          )}" alt="" width="42" height="42" />
          <div>
            <p class="status">Paid</p>
            <h1>${escapeHtml(receipt.title)}</h1>
            <p>${escapeHtml(receipt.buildingLabel)} • House ${escapeHtml(receipt.houseNumber)}</p>
          </div>
        </div>
        <div class="total">
          <p>Total paid</p>
          <strong>${escapeHtml(formatCurrency(receipt.amountKsh))}</strong>
        </div>
      </div>
      <dl>
        <div><dt>Receipt No.</dt><dd>${escapeHtml(receipt.providerReference)}</dd></div>
        <div><dt>Channel</dt><dd>${escapeHtml(receipt.provider)}</dd></div>
        <div><dt>Payment For</dt><dd>${escapeHtml(receipt.subject)}</dd></div>
        <div><dt>Bill Month</dt><dd>${escapeHtml(receipt.billingMonth)}</dd></div>
        <div><dt>Posted At</dt><dd>${escapeHtml(formatDateTime(receipt.paidAt))}</dd></div>
        <div><dt>Account</dt><dd>${escapeHtml(receipt.secondaryLabel)}</dd></div>
      </dl>
    </article>
  </body>
</html>`;
}

function downloadActiveReceipt() {
  if (!state.activeReceipt) {
    return;
  }

  const fileSafeReference = String(state.activeReceipt.providerReference ?? "receipt")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const blob = new Blob([buildReceiptDownloadMarkup(state.activeReceipt)], {
    type: "text/html;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `jk-flats-${state.activeReceipt.kind}-receipt-${fileSafeReference || "payment"}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function findLatestUtilityPayment(criteria) {
  const sorted = [...(state.utilityPayments ?? [])].sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
  );
  return (
    sorted.find(
      (payment) =>
        criteria.providerReference &&
        String(payment.providerReference ?? "").trim().toUpperCase() ===
          String(criteria.providerReference).trim().toUpperCase()
    ) ??
    sorted.find(
      (payment) =>
        payment.utilityType === criteria.utilityType &&
        payment.billingMonth === criteria.billingMonth &&
        Math.round(Number(payment.amountKsh ?? 0)) === Math.round(Number(criteria.amountKsh ?? 0))
    ) ?? null
  );
}

function findLatestRentPayment(criteria) {
  const sorted = [...(state.rentPayments ?? [])].sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
  );
  return (
    sorted.find(
      (payment) =>
        criteria.providerReference &&
        String(payment.providerReference ?? "").trim().toUpperCase() ===
          String(criteria.providerReference).trim().toUpperCase()
    ) ??
    sorted.find(
      (payment) =>
        payment.billingMonth === criteria.billingMonth &&
        Math.round(Number(payment.amountKsh ?? 0)) === Math.round(Number(criteria.amountKsh ?? 0))
    ) ?? null
  );
}

function openReceiptForPayment(kind, paymentId) {
  if (!paymentId) {
    return;
  }

  if (kind === "utility") {
    const payment = (state.utilityPayments ?? []).find((item) => item.id === paymentId);
    if (payment) {
      openPaymentReceiptModal(buildUtilityReceiptRecord(payment));
    }
    return;
  }

  const payment = (state.rentPayments ?? []).find((item) => item.id === paymentId);
  if (payment) {
    openPaymentReceiptModal(buildRentReceiptRecord(payment));
  }
}

function clearUtilityMpesaProgress({ keepFlow = false } = {}) {
  stopUtilityPaymentPolling();
  state.utilityCheckoutRequestId = null;
  state.utilityCheckoutType = null;
  state.utilityPaymentPollAttempts = 0;
  state.utilityPaymentBaseline = null;
  utilityPaymentBtnEl.disabled = false;
  if (!keepFlow && state.activeMpesaFlow?.scope === "utility") {
    state.activeMpesaFlow = null;
  }
  syncUtilityPaymentProviderUi();
}

function clearRentMpesaProgress({ keepFlow = false } = {}) {
  stopRentPaymentPolling();
  state.rentCheckoutRequestId = null;
  state.rentPaymentPollAttempts = 0;
  state.rentPaymentBaseline = null;
  rentPaymentBtnEl.disabled = false;
  if (!keepFlow && state.activeMpesaFlow?.scope === "rent") {
    state.activeMpesaFlow = null;
  }
  syncRentPaymentButtonUi();
}

function abandonActiveMpesaFlow() {
  const flow = state.activeMpesaFlow;
  if (!flow) {
    return;
  }

  if (flow.scope === "utility") {
    clearUtilityMpesaProgress();
    utilityPaymentPhoneEl.focus();
  } else {
    clearRentMpesaProgress();
    rentPaymentPhoneEl.focus();
  }

  closeMpesaStatusModal({ clearFlow: true });
  showFeedback("Adjust the phone number or amount, then submit the payment again.");
}

async function checkActiveMpesaFlow() {
  const flow = state.activeMpesaFlow;
  if (!flow?.checkoutRequestId) {
    return;
  }

  if (flow.scope === "utility") {
    await pollUtilityMpesaPayment(flow.checkoutRequestId, flow.utilityType, { manual: true });
    return;
  }

  await pollRentMpesaPayment(flow.checkoutRequestId, { manual: true });
}

function updateResidentNavDots() {
  const noticesDot = document.querySelector('[data-dot="notices"]');
  const supportDot = document.querySelector('[data-dot="support"]');
  const paymentsDot = document.querySelector('[data-dot="payments"]');

  const notificationsCount = Array.isArray(state.notifications)
    ? state.notifications.length
    : 0;
  const openReports = Array.isArray(state.reports)
    ? state.reports.filter((report) => report.status !== "resolved").length
    : 0;
  const rentOutstanding = getRentOutstandingBalance();
  const utilityOutstanding = getTotalUtilityOutstandingBalance();

  if (noticesDot instanceof HTMLElement) {
    noticesDot.classList.toggle("hidden", notificationsCount === 0);
  }
  if (supportDot instanceof HTMLElement) {
    supportDot.classList.toggle(
      "hidden",
      !canResidentAccessSupport() || openReports === 0
    );
  }
  if (paymentsDot instanceof HTMLElement) {
    paymentsDot.classList.toggle(
      "hidden",
      rentOutstanding + utilityOutstanding <= 0
    );
  }
}

function isPasswordChangeRequired() {
  return Boolean(state.residentSession?.mustChangePassword);
}

function getResidentVerificationStatus() {
  return state.residentSession?.verificationStatus ?? "verified";
}

function isResidentPendingReview() {
  return getResidentVerificationStatus() === "pending_review";
}

function canResidentAccessBilling() {
  return Boolean(state.residentSession) && getResidentVerificationStatus() === "verified";
}

function canResidentAccessSupport() {
  return Boolean(state.residentSession) && getResidentVerificationStatus() === "verified";
}

function getPendingReviewBillingMessage() {
  return "Payments and balances unlock after landlord verification.";
}

function getPendingReviewSupportMessage() {
  return "Support unlocks after landlord verification.";
}

function formatResidentVerificationLabel(status) {
  return status === "pending_review" ? "Pending review" : "Verified";
}

function setSectionInteractive(sectionEl, enabled) {
  if (!(sectionEl instanceof HTMLElement)) {
    return;
  }

  sectionEl.classList.toggle("is-disabled", !enabled);
  sectionEl
    .querySelectorAll("input, select, textarea, button")
    .forEach((element) => {
      if (element instanceof HTMLInputElement) {
        element.disabled = !enabled;
      }
      if (element instanceof HTMLSelectElement) {
        element.disabled = !enabled;
      }
      if (element instanceof HTMLTextAreaElement) {
        element.disabled = !enabled;
      }
      if (element instanceof HTMLButtonElement) {
        element.disabled = !enabled;
      }
    });
}

function applyPaymentAccessUi() {
  if (state.residentSession && !canResidentAccessBilling()) {
    if (rentPaymentClusterEl instanceof HTMLElement) {
      rentPaymentClusterEl.classList.remove("hidden");
    }
    setSectionInteractive(rentPaymentSectionEl, false);
    setSectionInteractive(utilityPaymentSectionEl, false);
    rentPaymentStateEl.textContent = getPendingReviewBillingMessage();
    utilityPaymentStateEl.textContent = getPendingReviewBillingMessage();
    syncRentPaymentButtonUi();
    syncUtilityPaymentProviderUi();
    syncPaymentMessaging();
    return;
  }

  const rentEnabled = isRentPaymentEnabled();
  if (rentPaymentClusterEl instanceof HTMLElement) {
    rentPaymentClusterEl.classList.toggle("hidden", !rentEnabled);
  }
  setSectionInteractive(rentPaymentSectionEl, rentEnabled);
  rentPaymentStateEl.textContent = rentEnabled
    ? "Rent payment is active for your building."
    : state.paymentAccess?.rentConfigured === false
      ? "Rent payment will appear once rent is configured for your room."
      : "Rent payment is currently disabled by your landlord.";
  syncRentPaymentButtonUi();

  const waterEnabled = isUtilityPaymentEnabled("water");
  const electricityEnabled = isUtilityPaymentEnabled("electricity");
  const bothDisabled = !waterEnabled && !electricityEnabled;

  if (utilityPaymentTypeEl instanceof HTMLSelectElement) {
    [...utilityPaymentTypeEl.options].forEach((option) => {
      if (option.value === "water") {
        option.disabled = !waterEnabled;
      } else if (option.value === "electricity") {
        option.disabled = !electricityEnabled;
      }
    });

    const selectedEnabled = isUtilityPaymentEnabled(utilityPaymentTypeEl.value);
    if (!selectedEnabled) {
      if (waterEnabled) {
        utilityPaymentTypeEl.value = "water";
      } else if (electricityEnabled) {
        utilityPaymentTypeEl.value = "electricity";
      }
    }
  }

  const selectedType = utilityPaymentTypeEl.value || "water";
  const selectedEnabled = isUtilityPaymentEnabled(selectedType);
  setSectionInteractive(utilityPaymentSectionEl, !bothDisabled && selectedEnabled);

  if (bothDisabled) {
    utilityPaymentStateEl.textContent =
      "Water and electricity payments are currently disabled by your landlord.";
  } else if (!selectedEnabled) {
    utilityPaymentStateEl.textContent = `${utilityLabel(
      selectedType
    )} payments are disabled by your landlord.`;
  } else {
    utilityPaymentStateEl.textContent =
      "Selected utility payment channel is active for your building.";
  }

  syncUtilityPaymentProviderUi();
  syncPaymentMessaging();
}

function getResidentToken() {
  return state.residentToken || "";
}

function saveResidentToken(token, options = {}) {
  const rememberDevice =
    typeof options.rememberDevice === "boolean"
      ? options.rememberDevice
      : state.rememberResidentDevice;
  state.residentToken = token;
  state.rememberResidentDevice = rememberDevice;

  if (token) {
    if (rememberDevice) {
      localStorage.setItem(RESIDENT_TOKEN_KEY, token);
      sessionStorage.removeItem(RESIDENT_SESSION_TOKEN_KEY);
      localStorage.setItem(RESIDENT_REMEMBER_DEVICE_KEY, "true");
    } else {
      sessionStorage.setItem(RESIDENT_SESSION_TOKEN_KEY, token);
      localStorage.removeItem(RESIDENT_TOKEN_KEY);
      localStorage.removeItem(RESIDENT_REMEMBER_DEVICE_KEY);
    }
  } else {
    localStorage.removeItem(RESIDENT_TOKEN_KEY);
    sessionStorage.removeItem(RESIDENT_SESSION_TOKEN_KEY);
    localStorage.removeItem(RESIDENT_REMEMBER_DEVICE_KEY);
  }

  if (residentRememberDeviceEl instanceof HTMLInputElement) {
    residentRememberDeviceEl.checked = rememberDevice && Boolean(token);
  }
}

function showFeedback(message, type = "error") {
  feedbackBoxEl.textContent = message;
  feedbackBoxEl.classList.remove("hidden", "error", "success", "info");
  feedbackBoxEl.classList.add(type);
}

function clearFeedback() {
  feedbackBoxEl.textContent = "";
  feedbackBoxEl.classList.add("hidden");
  feedbackBoxEl.classList.remove("error", "success", "info");
}

function focusInlineFeedback(element) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "nearest" });
  element.focus({ preventScroll: true });
}

function showResidentAuthFeedback(message, type = "error", { reveal = false } = {}) {
  residentAuthFeedbackEl.textContent = message;
  residentAuthFeedbackEl.classList.remove("hidden", "error", "success", "info");
  residentAuthFeedbackEl.classList.add(type);

  if (reveal) {
    focusInlineFeedback(residentAuthFeedbackEl);
  }
}

function clearResidentAuthFeedback() {
  residentAuthFeedbackEl.textContent = "";
  residentAuthFeedbackEl.classList.add("hidden");
  residentAuthFeedbackEl.classList.remove("error", "success", "info");
}

function formatSessionExpirySuffix(expiresAt) {
  if (!expiresAt) {
    return ".";
  }

  return ` (expires ${formatDateTime(expiresAt)}).`;
}

function syncReportTypeUi() {
  const isTheftReport = reportTypeEl.value === "stolen_item";
  theftWorkflowFieldsEl.classList.toggle("hidden", !isTheftReport);

  reportStolenItemEl.required = isTheftReport;
  reportIncidentLocationEl.required = isTheftReport;
  reportIncidentStartEl.required = isTheftReport;
  reportIncidentEndEl.required = isTheftReport;

  if (!isTheftReport) {
    reportStolenItemEl.value = "";
    reportIncidentLocationEl.value = "";
    reportIncidentStartEl.value = "";
    reportIncidentEndEl.value = "";
    reportCaseReferenceEl.value = "";
  }
}

function resetReportForm() {
  reportTitleEl.value = "";
  reportDetailsEl.value = "";
  reportTypeEl.value = "room_issue";
  if (reportAttachmentsEl instanceof HTMLInputElement) {
    reportAttachmentsEl.value = "";
  }
  renderSelectedImagePreviews(reportAttachmentPreviewEl, [], {
    emptyText: "No photos selected."
  });
  syncReportTypeUi();
}

function setActiveResidentView(nextView, { scroll = false } = {}) {
  const requestedView = VALID_RESIDENT_VIEWS.has(nextView) ? nextView : "overview";
  const targetView =
    requestedView === "support" && state.residentSession && !canResidentAccessSupport()
      ? "overview"
      : requestedView;

  if (requestedView === "support" && targetView !== "support") {
    showFeedback(getPendingReviewSupportMessage());
  }

  state.activeResidentView = targetView;

  residentNavButtons.forEach((button) => {
    const active = button.dataset.residentView === targetView;
    button.classList.toggle("active", active);
  });

  residentViewPanels.forEach((panel) => {
    const active = panel.dataset.residentViewPanel === targetView;
    panel.classList.toggle("hidden", !active);
  });

  if (scroll) {
    requestAnimationFrame(() => {
      scrollToResidentPanel(targetView);
    });
  }
}

function scrollToResidentPanel(targetView) {
  if (residentLayoutEl.classList.contains("hidden")) {
    return;
  }

  const panel = residentViewPanels.find(
    (item) => item.dataset.residentViewPanel === targetView
  );
  if (!panel) {
    return;
  }

  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setUserMenuOpen(isOpen) {
  if (!(userMenuToggleEl && userMenuPanelEl)) {
    return;
  }

  userMenuPanelEl.classList.toggle("hidden", !isOpen);
  userMenuToggleEl.setAttribute("aria-expanded", String(isOpen));
}

function toggleUserMenu() {
  if (!(userMenuToggleEl && userMenuPanelEl)) {
    return;
  }

  const isOpen = !userMenuPanelEl.classList.contains("hidden");
  setUserMenuOpen(!isOpen);
}

function renderOverviewSession() {
  const session = state.residentSession;
  if (!session) {
    overviewBuildingEl.textContent = "-";
    overviewHouseNumberEl.textContent = "-";
    overviewSessionExpiryEl.textContent = "";
    return;
  }

  const building = state.buildings.find((item) => item.id === session.buildingId);
  overviewBuildingEl.textContent = getPublicBuildingLabel(building);
  overviewHouseNumberEl.textContent = session.houseNumber;
  overviewSessionExpiryEl.textContent = `${formatResidentVerificationLabel(
    session.verificationStatus
  )} account • Expires ${formatDateTime(session.expiresAt)}.`;
}

function hasRequiredDomBindings() {
  const missing = REQUIRED_DOM_BINDINGS
    .filter(([, node]) => !(node instanceof HTMLElement))
    .map(([id]) => id);

  if (residentNavButtons.length < 4) {
    missing.push("resident-nav-buttons");
  }

  if (residentViewPanels.length < 4) {
    missing.push("resident-view-panels");
  }

  if (missing.length === 0) {
    return true;
  }

  console.error("Resident portal DOM mismatch. Missing elements:", missing);

  if (apiStatusEl instanceof HTMLElement) {
    apiStatusEl.textContent = "ui mismatch";
  }

  if (authStateEl instanceof HTMLElement) {
    authStateEl.textContent = "Refresh needed";
  }

  if (feedbackBoxEl instanceof HTMLElement) {
    feedbackBoxEl.textContent =
      "App updated. Please refresh this page (Ctrl+F5) and try again.";
    feedbackBoxEl.classList.remove("hidden", "success");
    feedbackBoxEl.classList.add("error");
  }

  return false;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestJson(url, options = {}, { auth = false } = {}) {
  const headers = new Headers(options.headers ?? {});

  if (auth) {
    const token = getResidentToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const issueMessage = payload.issues?.[0]?.message;
    const err = new Error(
      issueMessage ?? payload.error ?? `Request failed (${response.status})`
    );
    err.status = response.status;
    throw err;
  }

  return payload;
}

function createResidentSupportUploadRequest() {
  const headers = {};
  const token = getResidentToken();
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return {
    url: "/api/media/upload",
    headers,
    fields: {
      category: "support_evidence"
    },
    credentials: "same-origin"
  };
}

function renderPwaControls() {
  const hasSession = Boolean(state.residentSession) && !isPasswordChangeRequired();
  const pushSupported = supportsResidentPush();
  const pushPermission = pushSupported ? Notification.permission : "unsupported";
  const pushEnabled = Boolean(state.pushConfig?.enabled);
  const hasSubscription = Boolean(state.pushSubscriptionEndpoint);
  state.pwaInstalled = isStandaloneApp();

  if (installAppStatusEl instanceof HTMLElement) {
    installAppStatusEl.textContent = state.pwaInstalled
      ? "App installed on this device."
      : deferredInstallPrompt
        ? "Install this portal for faster access on your phone."
        : "Use your browser menu to add this portal to your home screen.";
  }

  if (installAppBtnEl instanceof HTMLButtonElement) {
    installAppBtnEl.classList.toggle(
      "hidden",
      state.pwaInstalled || !deferredInstallPrompt
    );
  }

  if (!(pushStatusTextEl instanceof HTMLElement)) {
    return;
  }

  if (!hasSession) {
    pushStatusTextEl.textContent =
      "Sign in to enable browser alerts for rent, utility, and support updates.";
  } else if (!pushSupported) {
    pushStatusTextEl.textContent =
      "This browser does not support installable alerts for this portal.";
  } else if (!pushEnabled) {
    pushStatusTextEl.textContent =
      "Browser alerts are not configured on this server yet.";
  } else if (pushPermission === "denied") {
    pushStatusTextEl.textContent =
      "Browser alerts are blocked. Re-enable them in your browser site settings.";
  } else if (hasSubscription) {
    pushStatusTextEl.textContent =
      "Browser alerts are active for this resident account on this device.";
  } else if (pushPermission === "granted") {
    pushStatusTextEl.textContent =
      "Browser permission granted. Finalizing device alerts now.";
  } else {
    pushStatusTextEl.textContent =
      "Enable browser alerts for rent due, utility billing, and support updates.";
  }

  if (pushEnableBtnEl instanceof HTMLButtonElement) {
    pushEnableBtnEl.disabled = !hasSession || !pushSupported || !pushEnabled;
    pushEnableBtnEl.classList.toggle(
      "hidden",
      hasSubscription || pushPermission === "denied"
    );
  }

  if (pushDisableBtnEl instanceof HTMLButtonElement) {
    pushDisableBtnEl.disabled = !hasSession || !hasSubscription;
    pushDisableBtnEl.classList.toggle("hidden", !hasSubscription);
  }
}

function renderSmsControls() {
  const hasSession = Boolean(state.residentSession) && !isPasswordChangeRequired();
  const smsConfig = state.smsConfig;
  const serverEnabled = Boolean(smsConfig?.enabled);
  const preferences = {
    ...DEFAULT_SMS_PREFERENCES,
    ...(smsConfig?.preferences ?? {})
  };
  const phoneMask = smsConfig?.phoneMask || "your resident phone";
  const senderId = String(smsConfig?.senderId || "").trim();

  if (smsStatusTextEl instanceof HTMLElement) {
    if (!hasSession) {
      smsStatusTextEl.textContent =
        "Sign in to manage SMS alerts for rent and utility updates.";
    } else if (!serverEnabled) {
      smsStatusTextEl.textContent =
        "SMS alerts are not configured on this server yet.";
    } else if (!preferences.smsEnabled) {
      smsStatusTextEl.textContent = `SMS updates are paused for ${phoneMask}.`;
    } else {
      const categories = [];
      if (preferences.rentEnabled) {
        categories.push("rent");
      }
      if (preferences.utilityEnabled) {
        categories.push("utility");
      }

      smsStatusTextEl.textContent =
        categories.length > 0
          ? `SMS updates are active for ${phoneMask} for ${categories.join(
              " and "
            )} notices.${senderId ? ` Sender ID: ${senderId}.` : ""}`
          : `SMS updates are active for ${phoneMask}, but no billing category is selected yet.${
              senderId ? ` Sender ID: ${senderId}.` : ""
            }`;
    }
  }

  if (smsEnableBtnEl instanceof HTMLButtonElement) {
    smsEnableBtnEl.disabled = !hasSession || !serverEnabled;
    smsEnableBtnEl.classList.toggle("hidden", preferences.smsEnabled);
  }

  if (smsDisableBtnEl instanceof HTMLButtonElement) {
    smsDisableBtnEl.disabled = !hasSession || !serverEnabled || !preferences.smsEnabled;
    smsDisableBtnEl.classList.toggle("hidden", !preferences.smsEnabled);
  }

  if (smsRentToggleEl instanceof HTMLInputElement) {
    smsRentToggleEl.checked = Boolean(preferences.rentEnabled);
    smsRentToggleEl.disabled = !hasSession || !serverEnabled || !preferences.smsEnabled;
  }

  if (smsUtilityToggleEl instanceof HTMLInputElement) {
    smsUtilityToggleEl.checked = Boolean(preferences.utilityEnabled);
    smsUtilityToggleEl.disabled = !hasSession || !serverEnabled || !preferences.smsEnabled;
  }
}

async function ensureResidentServiceWorkerRegistration() {
  if (!supportsResidentPwa()) {
    return null;
  }

  if (!residentSwRegistrationPromise) {
    residentSwRegistrationPromise = navigator.serviceWorker
      .register(RESIDENT_SW_URL, { scope: "/" })
      .catch((error) => {
        residentSwRegistrationPromise = null;
        console.error("Failed to register resident portal service worker", error);
        return null;
      });
  }

  return residentSwRegistrationPromise;
}

async function getResidentPushSubscription() {
  const registration = await ensureResidentServiceWorkerRegistration();
  if (!registration || !supportsResidentPush()) {
    return null;
  }

  return registration.pushManager.getSubscription();
}

async function loadResidentPushConfig() {
  if (!state.residentSession || isPasswordChangeRequired()) {
    state.pushConfig = null;
    state.pushSubscriptionEndpoint = "";
    renderPwaControls();
    return null;
  }

  try {
    const payload = await requestJson("/api/user/push/config", {}, { auth: true });
    state.pushConfig = payload.data ?? null;
  } catch (error) {
    console.error("Failed to load resident push config", error);
    state.pushConfig = { enabled: false, publicKey: null };
  }

  renderPwaControls();
  return state.pushConfig;
}

async function loadResidentSmsConfig() {
  if (!state.residentSession || isPasswordChangeRequired()) {
    state.smsConfig = null;
    renderSmsControls();
    return null;
  }

  try {
    const payload = await requestJson(
      "/api/user/notification-preferences",
      {},
      { auth: true }
    );
    state.smsConfig = payload.data?.sms ?? null;
  } catch (error) {
    console.error("Failed to load resident SMS notification preferences", error);
    state.smsConfig = {
      enabled: false,
      senderId: null,
      phoneMask: "",
      preferences: { ...DEFAULT_SMS_PREFERENCES }
    };
  }

  renderSmsControls();
  return state.smsConfig;
}

async function updateResidentNotificationPreferences(
  patch,
  { successMessage = "" } = {}
) {
  if (!state.residentSession || isPasswordChangeRequired()) {
    showFeedback("Sign in with an active resident session before updating SMS alerts.");
    return null;
  }

  const payload = await requestJson(
    "/api/user/notification-preferences",
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(patch)
    },
    { auth: true }
  );

  state.smsConfig = payload.data?.sms ?? state.smsConfig;
  renderSmsControls();

  if (successMessage) {
    showFeedback(successMessage, "success");
  }

  return state.smsConfig;
}

async function enableResidentSmsNotifications() {
  clearFeedback();

  if (!state.residentSession || isPasswordChangeRequired()) {
    showFeedback("Sign in with an active resident session before enabling SMS alerts.");
    return;
  }

  const smsConfig = state.smsConfig ?? (await loadResidentSmsConfig());
  if (!smsConfig?.enabled) {
    showFeedback("SMS alerts are not configured on this server yet.");
    return;
  }

  try {
    await updateResidentNotificationPreferences(
      { smsEnabled: true },
      { successMessage: "SMS alerts enabled for this resident account." }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to enable SMS alerts.";
    showFeedback(message);
  }
}

async function disableResidentSmsNotifications() {
  clearFeedback();

  try {
    await updateResidentNotificationPreferences(
      { smsEnabled: false },
      { successMessage: "SMS alerts paused for this resident account." }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to pause SMS alerts.";
    showFeedback(message);
  }
}

async function registerResidentPushSubscription(subscription) {
  await requestJson(
    "/api/user/push-subscriptions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(subscription.toJSON())
    },
    { auth: true }
  );
  state.pushSubscriptionEndpoint = subscription.endpoint;
  renderPwaControls();
}

async function syncResidentPushState({ subscribeIfAllowed = false } = {}) {
  renderPwaControls();

  if (!supportsResidentPush()) {
    state.pushSubscriptionEndpoint = "";
    renderPwaControls();
    return;
  }

  const subscription = await getResidentPushSubscription();
  state.pushSubscriptionEndpoint = subscription?.endpoint ?? "";

  if (!state.residentSession || isPasswordChangeRequired()) {
    renderPwaControls();
    return;
  }

  const config = state.pushConfig ?? (await loadResidentPushConfig());
  if (!config?.enabled || !config.publicKey) {
    renderPwaControls();
    return;
  }

  if (!subscription && subscribeIfAllowed && Notification.permission === "granted") {
    try {
      const registration = await ensureResidentServiceWorkerRegistration();
      if (!registration) {
        return;
      }

      const created = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey)
      });
      await registerResidentPushSubscription(created);
      state.pushSubscriptionEndpoint = created.endpoint;
    } catch (error) {
      console.error("Failed to create resident push subscription", error);
    }

    renderPwaControls();
    return;
  }

  if (subscription && Notification.permission === "granted") {
    try {
      await registerResidentPushSubscription(subscription);
    } catch (error) {
      console.error("Failed to sync resident push subscription", error);
    }
  }

  renderPwaControls();
}

async function enableResidentPushNotifications() {
  clearFeedback();

  if (!state.residentSession || isPasswordChangeRequired()) {
    showFeedback("Sign in with an active resident session before enabling alerts.");
    return;
  }

  if (!supportsResidentPush()) {
    showFeedback("This browser does not support resident app alerts.");
    return;
  }

  const config = state.pushConfig ?? (await loadResidentPushConfig());
  if (!config?.enabled || !config.publicKey) {
    showFeedback("Browser alerts are not configured on this server yet.");
    return;
  }

  let permission = Notification.permission;
  if (permission !== "granted") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    renderPwaControls();
    showFeedback("Browser alerts were not enabled.");
    return;
  }

  const registration = await ensureResidentServiceWorkerRegistration();
  if (!registration) {
    showFeedback("Unable to prepare this device for browser alerts.");
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

    await registerResidentPushSubscription(subscription);
    showFeedback("Browser alerts enabled for this device.", "success");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to enable browser alerts.";
    showFeedback(message);
  } finally {
    renderPwaControls();
  }
}

async function disableResidentPushNotifications({ silent = false } = {}) {
  try {
    const subscription = await getResidentPushSubscription();

    if (subscription && state.residentSession) {
      try {
        await requestJson(
          "/api/user/push-subscriptions",
          {
            method: "DELETE",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          },
          { auth: true }
        );
      } catch (error) {
        console.error("Failed to delete resident push subscription", error);
      }

      await subscription.unsubscribe().catch(() => false);
    }

    state.pushSubscriptionEndpoint = "";
    renderPwaControls();

    if (!silent) {
      showFeedback("Browser alerts turned off for this device.", "success");
    }
  } catch (error) {
    if (!silent) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to disable browser alerts.";
      showFeedback(message);
    }
  }
}

async function promptResidentInstall() {
  if (!deferredInstallPrompt) {
    renderPwaControls();
    return;
  }

  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;

  await promptEvent.prompt();
  await promptEvent.userChoice.catch(() => null);
  renderPwaControls();
}

function startResidentPwa() {
  renderPwaControls();

  if (supportsResidentPwa()) {
    void ensureResidentServiceWorkerRegistration();
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    renderPwaControls();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    state.pwaInstalled = true;
    renderPwaControls();
    showFeedback("Resident app installed on this device.", "success");
  });
}

async function readSessionSnapshot(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => ({}));
    return payload?.data ?? null;
  } catch (_error) {
    return null;
  }
}

async function detectExistingPortalSession() {
  const userSession = await readSessionSnapshot("/api/auth/session");
  if (userSession?.role) {
    return {
      role: String(userSession.role),
      source: "user",
      expiresAt: userSession.expiresAt
    };
  }

  const landlordSession = await readSessionSnapshot("/api/auth/landlord/session");
  if (landlordSession?.role) {
    return {
      role: String(landlordSession.role),
      source: "landlord",
      expiresAt: landlordSession.expiresAt
    };
  }

  const adminSession = await readSessionSnapshot("/api/auth/admin/session");
  if (adminSession?.role) {
    return {
      role: String(adminSession.role),
      source: "admin",
      expiresAt: adminSession.expiresAt
    };
  }

  return null;
}

function showNonResidentSessionState(sessionInfo) {
  const role = String(sessionInfo?.role || "account");
  authStateEl.textContent = `Signed in (${role})`;
  residentAuthPanelEl.classList.remove("hidden");
  residentSessionPanelEl.classList.remove("hidden");
  residentPasswordChangePanelEl.classList.add("hidden");
  residentLayoutEl.classList.add("hidden");
  residentSessionSummaryEl.textContent = `Another ${role} session is active${formatSessionExpirySuffix(
    sessionInfo?.expiresAt
  )} Sign out before resident sign up/sign in.`;
}

async function syncAuthConflictState() {
  const sessionInfo = await detectExistingPortalSession();
  if (sessionInfo) {
    showNonResidentSessionState(sessionInfo);
    return true;
  }

  return false;
}

function isAlreadySignedInError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.toLowerCase().includes("already signed in");
}

function renderAuthBuildingLoading() {
  authBuildingIdEl.replaceChildren();

  const option = document.createElement("option");
  option.value = "";
  option.textContent = "Loading buildings...";
  authBuildingIdEl.append(option);
  authBuildingIdEl.disabled = true;
  residentLoginBtnEl.disabled = false;
  residentSignupBtnEl.disabled = true;
  residentForgotBtnEl.disabled = true;
}

async function loadBuildingsWithRetry() {
  let lastError = null;

  for (let attempt = 1; attempt <= BUILDINGS_FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const payload = await requestJson("/api/buildings", {
        cache: "no-store"
      });
      return Array.isArray(payload.data) ? payload.data : [];
    } catch (error) {
      lastError = error;

      const retryDelayMs = BUILDINGS_FETCH_RETRY_DELAYS_MS[attempt - 1];
      if (retryDelayMs) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw lastError ?? new Error("Failed to load buildings.");
}

function renderAuthBuildingOptions(buildings) {
  authBuildingIdEl.replaceChildren();

  if (!Array.isArray(buildings) || buildings.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No building available";
    authBuildingIdEl.append(option);
    authBuildingIdEl.disabled = true;
    residentLoginBtnEl.disabled = false;
    residentSignupBtnEl.disabled = true;
    residentForgotBtnEl.disabled = true;
    updateResidentBranding();
    return;
  }

  authBuildingIdEl.disabled = false;
  residentLoginBtnEl.disabled = false;
  residentSignupBtnEl.disabled = false;
  residentForgotBtnEl.disabled = false;

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select building for access request";
  authBuildingIdEl.append(placeholder);

  buildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getPublicBuildingLabel(building, "Building");
    authBuildingIdEl.append(option);
  });

  updateResidentBranding();
}

function renderReports(reports) {
  reportsListEl.replaceChildren();

  if (!canResidentAccessSupport() && state.residentSession) {
    reportsCountEl.textContent = "Support locked";
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = getPendingReviewSupportMessage();
    reportsListEl.append(empty);
    return;
  }

  reportsCountEl.textContent = `${reports.length} ticket${reports.length === 1 ? "" : "s"}`;

  if (reports.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No support requests yet.";
    reportsListEl.append(empty);
    return;
  }

  reports.forEach((report) => {
    const fragment = reportItemTemplate.content.cloneNode(true);
    const chipEl = fragment.querySelector(".item-chip");
    const detailsEl = fragment.querySelector(".item-details");
    const guidanceEl = fragment.querySelector(".item-guidance");

    fragment.querySelector(".item-title").textContent = report.title;
    chipEl.textContent = report.status.replace("_", " ");
    chipEl.classList.add(`chip-${report.status}`);

    const slaLabel = report.slaBreached
      ? `SLA breached (${report.slaHours}h)`
      : `SLA ${report.slaHours}h (${report.slaState.replace("_", " ")})`;

    fragment.querySelector(".item-meta").textContent =
      `${report.queue} queue • ${formatDateTime(report.createdAt)} • ${slaLabel}`;

    detailsEl.textContent = report.details;

    const guidance =
      report.status === "resolved"
        ? "Resolved. If anything is still pending, open a new request."
        : "Your request is active and the team will update you as progress is made.";
    guidanceEl.textContent = guidance;

    const adminUpdate = report.resolutionNotes || report.adminNote;
    if (adminUpdate) {
      const update = document.createElement("p");
      update.className = "item-details";
      update.textContent = `Latest update: ${adminUpdate}`;
      guidanceEl.after(update);
    }

    const gallery = createUploadedImageGallery(report.evidenceAttachments, {
      linkLabel: "Open support photo"
    });
    if (gallery) {
      guidanceEl.after(gallery);
    }

    reportsListEl.append(fragment);
  });
}

function renderNotifications(notifications) {
  notificationListEl.replaceChildren();
  notificationCountEl.textContent = `${notifications.length} alert${
    notifications.length === 1 ? "" : "s"
  }`;

  if (notifications.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No notifications yet.";
    notificationListEl.append(empty);
    return;
  }

  notifications.forEach((notification) => {
    const fragment = notificationItemTemplate.content.cloneNode(true);
    const chipEl = fragment.querySelector(".item-chip");

    fragment.querySelector(".item-title").textContent = notification.title;
    chipEl.textContent = notification.level;
    chipEl.classList.add(`chip-${notification.level}`);
    fragment.querySelector(".item-details").textContent = notification.message;
    fragment.querySelector(".item-meta").textContent = formatDateTime(
      notification.createdAt
    );

    notificationListEl.append(fragment);
  });
}

function renderRentDue(rentDue, fallbackMessage) {
  state.rentDue = rentDue ?? null;
  rentDueEl.replaceChildren();

  const heading = document.createElement("p");
  heading.className = "subheading";
  heading.textContent = "Rent";
  rentDueEl.append(heading);

  if (!rentDue) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent =
      fallbackMessage ??
      "Rent profile is not configured yet. Contact housing admin.";
    rentDueEl.append(empty);
    syncRentBillingMonthOptions();
    updateRentPaymentGuidance();
    return;
  }

  const statusChip = document.createElement("span");
  statusChip.className = `item-chip chip-${rentDue.status}`;
  statusChip.textContent = rentDue.status.replace("_", " ");
  rentDueEl.append(statusChip);

  const keyvals = document.createElement("dl");
  keyvals.className = "rent-keyvals";
  keyvals.innerHTML = `
    <div>
      <dt>Monthly Rent</dt>
      <dd>${formatCurrency(rentDue.monthlyRentKsh)}</dd>
    </div>
    <div>
      <dt>Balance</dt>
      <dd>${formatCurrency(rentDue.balanceKsh)}</dd>
    </div>
    <div>
      <dt>Paid This Month</dt>
      <dd>${formatCurrency(rentDue.currentMonthPaidKsh ?? rentDue.paidAmountKsh ?? 0)}</dd>
    </div>
    <div>
      <dt>Charge Overdue</dt>
      <dd>${formatCurrency(rentDue.expenseBalanceKsh ?? rentDue.expenseArrearsKsh ?? 0)}</dd>
    </div>
    <div>
      <dt>Due Date</dt>
      <dd>${formatDateTime(rentDue.dueDate)}</dd>
    </div>
    <div>
      <dt>Overdue Starts</dt>
      <dd>${formatDateTime(rentDue.overdueStartsAt ?? rentDue.dueDate)}</dd>
    </div>
    <div>
      <dt>Grace Days</dt>
      <dd>${Number(rentDue.graceDays ?? 0)}</dd>
    </div>
    <div>
      <dt>Days To Due</dt>
      <dd>${rentDue.daysToDue}</dd>
    </div>
    <div>
      <dt>Days To Overdue</dt>
      <dd>${rentDue.daysToOverdue ?? rentDue.daysToDue}</dd>
    </div>
  `;
  rentDueEl.append(keyvals);

  if (!String(rentPaymentAmountEl.value ?? "").trim() && rentDue.balanceKsh > 0) {
    rentPaymentAmountEl.value = formatAmountValue(
      computeSuggestedStarterAmount(rentDue.balanceKsh)
    );
  }

  syncRentBillingMonthOptions();
  updateRentPaymentGuidance();
}

function renderUtilityBills(bills, meters = [], fallbackMessage, latestReadings = []) {
  utilityBillsListEl.replaceChildren();
  const latestReadingCount = appendLatestUtilityReadingCards(
    utilityBillsListEl,
    latestReadings,
    meters
  );

  if (!Array.isArray(bills) || bills.length === 0) {
    if (fallbackMessage) {
      utilityBillsSummaryEl.textContent = fallbackMessage;
    } else {
      const meterSummary = Array.isArray(meters)
        ? meters
            .map((item) => `${utilityLabel(item.utilityType)} meter ${item.meterNumber}`)
            .join(" • ")
        : "";

      utilityBillsSummaryEl.textContent = meterSummary
        ? `No utility bills posted yet. ${meterSummary}`
        : "No utility bills posted yet.";
    }
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = fallbackMessage
      ? latestReadingCount > 0
        ? `${fallbackMessage} The last recorded meter readings are shown above.`
        : fallbackMessage
      : latestReadingCount > 0
        ? "The last recorded meter readings are shown above. Water and electricity balances will appear once monthly bills are posted."
        : "Water and electricity balances plus previous/current readings will appear once monthly bills are posted.";
    utilityBillsListEl.append(empty);
    updateUtilityPaymentGuidance();
    return;
  }

  const outstanding = bills
    .filter((item) => Number(item.balanceKsh) > 0)
    .reduce((sum, item) => sum + Number(item.balanceKsh), 0);
  const outstandingCount = bills.filter((item) => Number(item.balanceKsh) > 0).length;

  if (outstanding > 0) {
    utilityBillsSummaryEl.innerHTML = `Outstanding utility balance: <strong>${formatCurrency(
      outstanding
    )}</strong>${
      outstandingCount > 1 ? ` across ${outstandingCount} open bills.` : " ready to pay now."
    }`;
  } else {
    utilityBillsSummaryEl.textContent = "All utility balances are clear.";
  }

  const sorted = [...bills].sort((a, b) =>
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );
  const outstandingBills = sorted.filter((bill) => Number(bill.balanceKsh) > 0);
  const selectedType = String(utilityPaymentTypeEl.value ?? "water");
  const selectedMonth = getSelectedUtilityBillMonth(selectedType);
  const selectedOutstandingBills = listOutstandingUtilityBills(selectedType);
  const focusBill =
    selectedOutstandingBills.find((bill) => bill.billingMonth === selectedMonth) ??
    selectedOutstandingBills[0] ??
    outstandingBills[0] ??
    sorted[sorted.length - 1];

  if (focusBill) {
    const card = document.createElement("article");
    card.className = "stack-item utility-bill-card utility-focus-card";
    card.dataset.utilityType = focusBill.utilityType;
    card.dataset.billingMonth = focusBill.billingMonth;
    if (Number(focusBill.balanceKsh) > 0) {
      card.classList.add("is-clickable");
      card.title = "Click to load this bill into the payment form";
    }

    const top = document.createElement("div");
    top.className = "stack-top";

    const title = document.createElement("strong");
    title.className = "item-title";
    title.textContent = `${utilityLabel(focusBill.utilityType)} • ${focusBill.billingMonth}`;

    if (Number(focusBill.balanceKsh) > 0) {
      const badge = document.createElement("span");
      badge.className = "utility-focus-badge";
      badge.textContent = "Current due";
      title.append(" ", badge);
    }

    const chip = document.createElement("span");
    chip.className = `item-chip chip-${focusBill.status}`;
    chip.textContent = focusBill.status.replace("_", " ");

    top.append(title, chip);

    const details = document.createElement("p");
    details.className = "item-details";
    const readingDetails =
      focusBill.meterNumber === "NO-METER"
        ? `Fixed charge ${formatCurrency(focusBill.fixedChargeKsh)}`
        : `Reading ${Number(focusBill.previousReading ?? 0).toLocaleString(
            "en-US"
          )} -> ${Number(focusBill.currentReading ?? 0).toLocaleString("en-US")}`;
    details.innerHTML = `Paying against <strong>${formatCurrency(
      focusBill.balanceKsh
    )}</strong> of ${formatCurrency(focusBill.amountKsh)} • Due <strong>${formatDateTime(
      focusBill.dueDate
    )}</strong> • ${readingDetails}`;

    const meta = document.createElement("dl");
    meta.className = "utility-bill-meta";
    meta.innerHTML = `
      <div>
        <dt>Open Balance</dt>
        <dd>${formatCurrency(focusBill.balanceKsh)}</dd>
      </div>
      <div>
        <dt>Total Bill</dt>
        <dd>${formatCurrency(focusBill.amountKsh)}</dd>
      </div>
      <div>
        <dt>Due</dt>
        <dd>${formatDateTime(focusBill.dueDate)}</dd>
      </div>
    `;

    card.append(top, details, meta);
    utilityBillsListEl.append(card);
  }

  const otherOutstandingBills = outstandingBills.filter(
    (bill) =>
      !focusBill ||
      bill.utilityType !== focusBill.utilityType ||
      bill.billingMonth !== focusBill.billingMonth
  );

  if (otherOutstandingBills.length > 0) {
    const rollup = document.createElement("article");
    rollup.className = "stack-item utility-rollup-card";

    const top = document.createElement("div");
    top.className = "stack-top";

    const title = document.createElement("strong");
    title.className = "item-title";
    title.textContent = `${otherOutstandingBills.length} other open utility bill${
      otherOutstandingBills.length === 1 ? "" : "s"
    }`;

    const chip = document.createElement("span");
    chip.className = "item-chip chip-due_soon";
    chip.textContent = "switch in form";

    top.append(title, chip);

    const utilityCounts = otherOutstandingBills.reduce(
      (counts, bill) => {
        counts[bill.utilityType] = (counts[bill.utilityType] ?? 0) + 1;
        return counts;
      },
      { water: 0, electricity: 0 }
    );
    const otherOutstandingTotal = otherOutstandingBills.reduce(
      (sum, bill) => sum + Number(bill.balanceKsh),
      0
    );

    const details = document.createElement("p");
    details.className = "item-details";
    details.textContent = `Water ${utilityCounts.water} • Electricity ${
      utilityCounts.electricity
    } • Remaining ${formatCurrency(
      otherOutstandingTotal
    )}. Payments continue across these open bills automatically.`;

    rollup.append(top, details);
    utilityBillsListEl.append(rollup);
  }
}

function syncUtilityBillingMonthOptions() {
  if (!(utilityPaymentMonthEl instanceof HTMLSelectElement)) {
    return;
  }

  const utilityType = String(utilityPaymentTypeEl.value ?? "water");
  const outstandingBills = listOutstandingUtilityBills(utilityType);
  const currentSelectedMonth = getSelectedUtilityBillMonth(utilityType);
  const nextSelectedMonth =
    outstandingBills.find((bill) => bill.billingMonth === currentSelectedMonth)?.billingMonth ??
    outstandingBills[0]?.billingMonth ??
    null;

  setSelectedUtilityBillMonth(utilityType, nextSelectedMonth);

  utilityPaymentMonthEl.replaceChildren();

  if (outstandingBills.length === 0) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "No open bill";
    utilityPaymentMonthEl.append(emptyOption);
    utilityPaymentMonthEl.value = "";
    utilityPaymentMonthEl.disabled = true;
    return;
  }

  outstandingBills.forEach((bill) => {
    const option = document.createElement("option");
    option.value = bill.billingMonth;
    option.textContent = `${bill.billingMonth} • ${formatCurrency(bill.balanceKsh)}`;
    utilityPaymentMonthEl.append(option);
  });

  utilityPaymentMonthEl.disabled =
    utilityPaymentSectionEl?.classList.contains("is-disabled") ?? false;
  utilityPaymentMonthEl.value = nextSelectedMonth ?? outstandingBills[0].billingMonth;
}

function syncUtilityBillCardSelection() {
  const selectedType = String(utilityPaymentTypeEl.value ?? "water");
  const selectedMonth = getSelectedUtilityBillMonth(selectedType);

  utilityBillsListEl
    .querySelectorAll(".stack-item[data-utility-type][data-billing-month]")
    .forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }

      const isSelected =
        node.dataset.utilityType === selectedType &&
        node.dataset.billingMonth === selectedMonth;
      node.classList.toggle("is-selected", isSelected);
    });
}

function syncUtilityPaymentFormFromBalances() {
  const utilityType = String(utilityPaymentTypeEl.value ?? "water");
  syncUtilityBillingMonthOptions();
  const selectedMonth =
    utilityPaymentMonthEl instanceof HTMLSelectElement &&
    utilityPaymentMonthEl.value.trim().length > 0
      ? utilityPaymentMonthEl.value
      : getSelectedUtilityBillMonth(utilityType);
  const bill = findOutstandingUtilityBill(utilityType, selectedMonth);

  setSelectedUtilityBillMonth(utilityType, bill?.billingMonth ?? null);
  if (utilityPaymentMonthEl instanceof HTMLSelectElement && bill?.billingMonth) {
    utilityPaymentMonthEl.value = bill.billingMonth;
  }

  renderUtilityBills(
    state.utilityBills,
    state.utilityMeters,
    undefined,
    state.utilityLatestReadings
  );
  syncUtilityBillCardSelection();

  if (!bill) {
    utilityPaymentBalanceEl.textContent = `No ${utilityLabel(
      utilityType
    ).toLowerCase()} balance is open right now.`;
    updateUtilityPaymentGuidance();
    return;
  }

  const totalOutstanding = getTotalOutstandingUtilityBalanceForType(utilityType);
  const outstandingCount = listOutstandingUtilityBills(utilityType).length;
  utilityPaymentBalanceEl.textContent =
    outstandingCount > 1
      ? `${utilityLabel(utilityType)} payments auto-apply from ${
          bill.billingMonth
        }. Total open balance: ${formatCurrency(totalOutstanding)} across ${outstandingCount} bills.`
      : `${utilityLabel(utilityType)} ${bill.billingMonth} balance ready: ${formatCurrency(
          bill.balanceKsh
        )}.`;

  if (!String(utilityPaymentAmountEl.value ?? "").trim() && totalOutstanding > 0) {
    utilityPaymentAmountEl.value = formatAmountValue(totalOutstanding);
  }

  updateUtilityPaymentGuidance();
}

function renderUtilityPayments(payments, fallbackMessage) {
  utilityPaymentsListEl.replaceChildren();

  if (!Array.isArray(payments) || payments.length === 0) {
    utilityPaymentsCountEl.textContent = "0 payments";
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent =
      fallbackMessage ??
      (state.residentSession && !canResidentAccessBilling()
        ? getPendingReviewBillingMessage()
        : "No utility payments recorded yet.");
    utilityPaymentsListEl.append(empty);
    return;
  }

  utilityPaymentsCountEl.textContent = `${payments.length} payment${
    payments.length === 1 ? "" : "s"
  }`;

  payments.slice(0, 8).forEach((payment) => {
    const card = document.createElement("article");
    card.className = "stack-item";
    card.dataset.paymentKind = "utility";
    card.dataset.paymentId = payment.id;

    const top = document.createElement("div");
    top.className = "stack-top";

    const title = document.createElement("strong");
    title.className = "item-title";
    title.textContent = `${utilityLabel(payment.utilityType)} • ${formatCurrency(payment.amountKsh)}`;

    const chip = document.createElement("span");
    chip.className = "item-chip chip-success";
    chip.textContent = payment.provider;
    if (String(payment.provider ?? "").toLowerCase().includes("mpesa")) {
      chip.classList.add("chip-mpesa");
    }

    top.append(title, chip);

    const details = document.createElement("p");
    details.className = "item-details";
    const receiptRef = payment.providerReference ?? "pending";
    details.textContent =
      `${payment.billingMonth ?? "latest"} • ${formatDateTime(
        payment.paidAt
      )} • Receipt ${receiptRef}`;

    const actions = document.createElement("div");
    actions.className = "action-row payment-history-actions";

    const receiptBtn = document.createElement("button");
    receiptBtn.type = "button";
    receiptBtn.className = "receipt-open-btn";
    receiptBtn.dataset.receiptKind = "utility";
    receiptBtn.dataset.paymentId = payment.id;
    receiptBtn.textContent = "View receipt";

    actions.append(receiptBtn);

    card.append(top, details, actions);
    utilityPaymentsListEl.append(card);
  });
}

function renderRentPayments(payments, fallbackMessage) {
  rentPaymentsListEl.replaceChildren();

  if (!Array.isArray(payments) || payments.length === 0) {
    rentPaymentsCountEl.textContent = "0 payments";
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent =
      fallbackMessage ??
      (state.residentSession && !canResidentAccessBilling()
        ? getPendingReviewBillingMessage()
        : "No rent payments recorded yet.");
    rentPaymentsListEl.append(empty);
    return;
  }

  rentPaymentsCountEl.textContent = `${payments.length} payment${
    payments.length === 1 ? "" : "s"
  }`;

  payments.slice(0, 8).forEach((payment) => {
    const card = document.createElement("article");
    card.className = "stack-item";
    card.dataset.paymentKind = "rent";
    card.dataset.paymentId = payment.id;

    const top = document.createElement("div");
    top.className = "stack-top";

    const title = document.createElement("strong");
    title.className = "item-title";
    title.textContent = `Rent • ${formatCurrency(payment.amountKsh)}`;

    const chip = document.createElement("span");
    chip.className = "item-chip chip-success";
    chip.textContent = payment.billingMonth ?? "-";

    top.append(title, chip);

    const details = document.createElement("p");
    details.className = "item-details";
    const receiptRef = payment.providerReference ?? "pending";
    details.textContent = `${formatDateTime(payment.paidAt)} • Receipt ${receiptRef}`;

    const actions = document.createElement("div");
    actions.className = "action-row payment-history-actions";

    const receiptBtn = document.createElement("button");
    receiptBtn.type = "button";
    receiptBtn.className = "receipt-open-btn";
    receiptBtn.dataset.receiptKind = "rent";
    receiptBtn.dataset.paymentId = payment.id;
    receiptBtn.textContent = "View receipt";

    actions.append(receiptBtn);

    card.append(top, details, actions);
    rentPaymentsListEl.append(card);
  });
}

function showSignedOutState() {
  closeMpesaStatusModal({ clearFlow: true });
  closePaymentReceiptModal();
  stopRentPaymentPolling();
  state.rentCheckoutRequestId = null;
  state.rentPaymentPollAttempts = 0;
  rentPaymentBtnEl.disabled = false;
  stopUtilityPaymentPolling();
  state.utilityCheckoutRequestId = null;
  state.utilityCheckoutType = null;
  state.utilityPaymentPollAttempts = 0;
  utilityPaymentBtnEl.disabled = false;

  authStateEl.textContent = "Signed out";
  residentAuthPanelEl.classList.remove("hidden");
  residentSessionPanelEl.classList.add("hidden");
  residentPasswordChangePanelEl.classList.add("hidden");
  residentLayoutEl.classList.add("hidden");
  residentPasswordNewEl.value = "";
  residentPasswordConfirmEl.value = "";
  clearResidentAuthFeedback();

  renderReports([]);
  renderNotifications([]);
  renderRentDue(null, undefined);
  renderRentPayments([]);
  state.reports = [];
  state.notifications = [];
  state.pushConfig = null;
  state.pushSubscriptionEndpoint = "";
  state.smsConfig = null;
  state.rentDue = null;
  state.rentPayments = [];
  state.utilityPayments = [];
  state.paymentInstructions = null;
  state.rentPaymentBaseline = null;
  state.rentSelectedBillingMonth = null;
  state.utilityPaymentBaseline = null;
  state.activeReceipt = null;
  updateResidentNavDots();
  state.utilityBills = [];
  state.utilityMeters = [];
  state.utilityLatestReadings = [];
  state.utilitySelectedBillMonthByType = {
    water: null,
    electricity: null
  };
  state.paymentAccess = { ...DEFAULT_PAYMENT_ACCESS };
  renderPaymentInstructions();
  renderUtilityBills([], [], undefined, []);
  renderUtilityPayments([]);
  renderOverviewSession();
  setActiveResidentView("payments");
  resetReportForm();
  syncUtilityPaymentFormFromBalances();
  applyPaymentAccessUi();
  renderPwaControls();
  renderSmsControls();
  syncRememberDeviceToggle();
  updateResidentBranding();
}

function showSignedInState() {
  const session = state.residentSession;
  if (!session) {
    showSignedOutState();
    return;
  }

  const mustChangePassword = isPasswordChangeRequired();
  clearResidentAuthFeedback();
  authStateEl.textContent = mustChangePassword
    ? "Action required"
    : isResidentPendingReview()
      ? "Pending review"
      : "Signed in";
  residentAuthPanelEl.classList.add("hidden");
  residentSessionPanelEl.classList.remove("hidden");
  residentPasswordChangePanelEl.classList.toggle("hidden", !mustChangePassword);
  residentLayoutEl.classList.toggle("hidden", mustChangePassword);

  const building = state.buildings.find((item) => item.id === session.buildingId);
  boundBuildingEl.value = getPublicBuildingLabel(building);
  boundHouseNumberEl.value = session.houseNumber;

  residentSessionSummaryEl.textContent = `House ${session.houseNumber} (${session.phoneMask}) • ${formatResidentVerificationLabel(
    session.verificationStatus
  )} • Expires ${formatDateTime(session.expiresAt)}`;
  renderOverviewSession();
  if (mustChangePassword) {
    setActiveResidentView("payments");
  } else if (isResidentPendingReview()) {
    setActiveResidentView("overview");
  } else {
    setActiveResidentView(state.activeResidentView);
  }
  renderPwaControls();
  renderSmsControls();
  syncRememberDeviceToggle();
  updateResidentBranding();
}

async function loadResidentSession() {
  try {
    const payload = await requestJson("/api/auth/resident/session", {}, { auth: true });
    state.residentSession = payload.data;
    showSignedInState();
    await loadResidentPushConfig();
    await loadResidentSmsConfig();
    await syncResidentPushState({ subscribeIfAllowed: true });
    return true;
  } catch (_error) {
    saveResidentToken("");
    state.residentSession = null;
    showSignedOutState();
    return false;
  }
}

async function refreshRentDueCard(fallbackMessage) {
  try {
    const payload = await requestJson("/api/user/rent-due", {}, { auth: true });
    state.rentDue = payload.data ?? null;
    renderRentDue(state.rentDue, payload.message ?? fallbackMessage);
  } catch (_error) {
    renderRentDue(state.rentDue, fallbackMessage);
  }
}

async function loadTenantData() {
  if (isPasswordChangeRequired()) {
    return;
  }

  clearFeedback();

  try {
    const payload = await requestJson("/api/user/startup", {}, { auth: true });
    const data = payload.data ?? {};
    const messages = payload.messages ?? {};

    state.paymentAccess = {
      ...DEFAULT_PAYMENT_ACCESS,
      ...(data.paymentAccess ?? {})
    };
    applyPaymentAccessUi();

    state.reports = data.reports ?? [];
    state.notifications = data.notifications ?? [];
    state.paymentInstructions = data.paymentInstructions ?? null;
    state.rentDue = data.rentDue ?? null;

    renderReports(state.reports);
    renderNotifications(state.notifications);
    renderPaymentInstructions();
    await refreshRentDueCard(messages.rentDue);
    state.rentPayments = data.rentPayments ?? [];
    renderRentPayments(state.rentPayments, messages.rentPayments);
    state.utilityBills = data.utilityBills ?? [];
    state.utilityMeters = data.utilityMeters ?? [];
    state.utilityLatestReadings = data.utilityLatestReadings ?? [];
    renderUtilityBills(
      state.utilityBills,
      state.utilityMeters,
      messages.utilities,
      state.utilityLatestReadings
    );
    syncUtilityPaymentFormFromBalances();
    state.utilityPayments = data.utilityPayments ?? [];
    renderUtilityPayments(state.utilityPayments, messages.utilityPayments);
    syncPaymentMessaging();
    updateResidentNavDots();
  } catch (error) {
    if (error.status === 401) {
      saveResidentToken("");
      state.residentSession = null;
      showSignedOutState();
      showFeedback("Session expired. Sign in again.");
      return;
    }

    const message =
      error instanceof Error ? error.message : "Unable to load resident data.";
    showFeedback(message);
  }
}

function buildResidentAuthPayload() {
  return {
    buildingId: String(authBuildingIdEl.value || "").trim() || undefined,
    houseNumber: normalizeHouseNumber(authHouseNumberEl.value),
    phoneNumber: authPhoneNumberEl.value.trim(),
    password: authPasswordEl.value
  };
}

function buildResidentSignupPayload() {
  const identityNumber = signupIdentityNumberEl.value.trim();
  const occupationStatus = signupOccupationStatusEl.value.trim();
  const occupationLabel = signupOccupationLabelEl.value.trim();

  return {
    ...buildResidentAuthPayload(),
    identityType: identityNumber ? String(signupIdentityTypeEl.value || "").trim() || undefined : undefined,
    identityNumber: identityNumber || undefined,
    occupationStatus: occupationStatus || undefined,
    occupationLabel: occupationLabel || undefined
  };
}

async function requestResidentPasswordRecovery() {
  clearFeedback();
  clearResidentAuthFeedback();
  const payload = buildResidentAuthPayload();

  if (!payload.buildingId || !payload.houseNumber || !payload.phoneNumber) {
    showResidentAuthFeedback(
      "Provide building, house number, and phone number for password recovery.",
      "error",
      { reveal: true }
    );
    return;
  }

  residentForgotBtnEl.disabled = true;

  try {
    const response = await requestJson("/api/auth/resident/password-recovery/request", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        buildingId: payload.buildingId,
        houseNumber: payload.houseNumber,
        phoneNumber: payload.phoneNumber
      })
    });

    showResidentAuthFeedback(
      response.message ??
        "Recovery request received. Management will share a temporary password after verification.",
      "success",
      { reveal: true }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to submit password recovery request.";
    showResidentAuthFeedback(message, "error", { reveal: true });
  } finally {
    residentForgotBtnEl.disabled = false;
  }
}

async function loginResident(event) {
  event.preventDefault();
  clearFeedback();
  clearResidentAuthFeedback();

  const payload = buildResidentAuthPayload();
  if (!payload.password) {
    showResidentAuthFeedback("Enter your password.", "error", { reveal: true });
    return;
  }

  residentLoginBtnEl.disabled = true;
  residentSignupBtnEl.disabled = true;

  try {
    const response = await requestJson("/api/auth/resident/login-phone", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const token = response.data?.token;
    if (!token) {
      throw new Error("Resident session token was not returned.");
    }

    saveResidentToken(token, {
      rememberDevice: getRememberDeviceSelection()
    });

    const loaded = await loadResidentSession();
    if (!loaded) {
      throw new Error("Could not restore resident session.");
    }

    if (isPasswordChangeRequired()) {
      showFeedback(
        "Temporary password detected. Set a new password before using the portal.",
        "success"
      );
    } else {
      showFeedback(
        isResidentPendingReview()
          ? "Signed in. Management verification is still pending. Payments and balances unlock after approval."
          : "Signed in successfully.",
        "success"
      );
      await loadTenantData();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to sign in resident.";
    showResidentAuthFeedback(message, "error", { reveal: true });
  } finally {
    residentLoginBtnEl.disabled = false;
    residentSignupBtnEl.disabled = false;
  }
}

async function signupResident() {
  clearFeedback();
  clearResidentAuthFeedback();

  if (await syncAuthConflictState()) {
    showResidentAuthFeedback(
      "Another account is signed in. Sign out first, then create resident account.",
      "error",
      { reveal: true }
    );
    return;
  }

  const payload = buildResidentSignupPayload();
  if (!payload.buildingId || !payload.houseNumber || !payload.phoneNumber) {
    showResidentAuthFeedback(
      "Choose the building, enter your house number, and add your phone number to request access.",
      "error",
      { reveal: true }
    );
    return;
  }
  if (!payload.password || payload.password.length < 8) {
    showResidentAuthFeedback(
      "Set a password with at least 8 characters to request access.",
      "error",
      { reveal: true }
    );
    return;
  }

  residentSignupBtnEl.disabled = true;
  residentLoginBtnEl.disabled = true;

  try {
    const response = await requestJson("/api/auth/resident/signup", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const token = response.data?.token;
    if (!token) {
      throw new Error("Resident session token was not returned.");
    }

    saveResidentToken(token, {
      rememberDevice: getRememberDeviceSelection()
    });
    authPasswordEl.value = "";
    signupIdentityNumberEl.value = "";
    signupOccupationStatusEl.value = "";
    signupOccupationLabelEl.value = "";

    const loaded = await loadResidentSession();
    if (!loaded) {
      throw new Error("Could not restore resident session.");
    }

    showFeedback(
      response.message ??
        "Access request submitted. You are signed in now and pending landlord review.",
      "success"
    );

    if (!isPasswordChangeRequired()) {
      await loadTenantData();
    }
  } catch (error) {
    if (isAlreadySignedInError(error)) {
      await syncAuthConflictState();
    }
    const message =
      error instanceof Error ? error.message : "Unable to submit access request.";
    showResidentAuthFeedback(message, "error", { reveal: true });
  } finally {
    residentSignupBtnEl.disabled = false;
    residentLoginBtnEl.disabled = false;
  }
}

async function submitResidentPasswordChange(event) {
  event.preventDefault();
  clearFeedback();

  const newPassword = String(residentPasswordNewEl.value ?? "");
  const confirmPassword = String(residentPasswordConfirmEl.value ?? "");

  if (newPassword.length < 8) {
    showFeedback("New password must be at least 8 characters.");
    return;
  }

  if (newPassword !== confirmPassword) {
    showFeedback("Confirmation password must match the new password.");
    return;
  }

  residentPasswordChangeBtnEl.disabled = true;

  try {
    const response = await requestJson(
      "/api/auth/resident/change-password",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          newPassword,
          confirmPassword
        })
      },
      { auth: true }
    );

    const token = response.data?.token;
    if (token) {
      saveResidentToken(token, {
        rememberDevice: state.rememberResidentDevice
      });
    }

    residentPasswordNewEl.value = "";
    residentPasswordConfirmEl.value = "";

    const loaded = await loadResidentSession();
    if (!loaded) {
      throw new Error("Could not restore resident session.");
    }

    showFeedback("Password updated successfully. Dashboard unlocked.", "success");
    await loadTenantData();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update password.";
    showFeedback(message);
  } finally {
    residentPasswordChangeBtnEl.disabled = false;
  }
}

async function submitTicket(event) {
  event.preventDefault();
  clearFeedback();

  if (!canResidentAccessSupport()) {
    showFeedback(getPendingReviewSupportMessage());
    return;
  }

  const reportType = String(reportTypeEl.value ?? "room_issue");
  const title = reportTitleEl.value.trim();
  const details = reportDetailsEl.value.trim();

  if (!title) {
    showFeedback("Provide a clear request title.");
    return;
  }

  if (details.length < 5) {
    showFeedback("Add enough details so the team can act quickly.");
    return;
  }

  let stolenItem;
  let incidentLocation;
  let incidentWindowStartAt;
  let incidentWindowEndAt;
  let caseReference;
  let evidenceAttachments = [];

  if (reportType === "stolen_item") {
    stolenItem = reportStolenItemEl.value.trim();
    incidentLocation = reportIncidentLocationEl.value.trim();
    caseReference = reportCaseReferenceEl.value.trim() || undefined;

    if (!stolenItem) {
      showFeedback("Stolen item is required for theft reports.");
      return;
    }

    if (!incidentLocation) {
      showFeedback("Incident location is required for theft reports.");
      return;
    }

    const startAt = toIsoFromDateTimeLocal(reportIncidentStartEl.value);
    const endAt = toIsoFromDateTimeLocal(reportIncidentEndEl.value);

    if (!startAt) {
      showFeedback("Incident start date/time is required for theft reports.");
      return;
    }

    if (!endAt) {
      showFeedback("Incident end date/time is required for theft reports.");
      return;
    }

    if (new Date(endAt).getTime() < new Date(startAt).getTime()) {
      showFeedback("Incident end date/time must be after start date/time.");
      return;
    }

    incidentWindowStartAt = startAt;
    incidentWindowEndAt = endAt;
  }

  submitBtnEl.disabled = true;

  try {
    if (reportAttachmentsEl instanceof HTMLInputElement) {
      const selectedFiles = validateImageFiles(reportAttachmentsEl.files, {
        maxFiles: REPORT_ATTACHMENT_LIMIT,
        maxSizeMb: 10
      });

      if (selectedFiles.length > 0) {
        showFeedback("Uploading selected photos...", "info");
        evidenceAttachments = await uploadImageFiles(selectedFiles, {
          createUploadRequest: createResidentSupportUploadRequest
        });
      }
    }

    const payload = {
      type: reportType,
      title,
      details,
      evidenceAttachments
    };
    if (reportType === "stolen_item") {
      payload.stolenItem = stolenItem;
      payload.incidentLocation = incidentLocation;
      payload.incidentWindowStartAt = incidentWindowStartAt;
      payload.incidentWindowEndAt = incidentWindowEndAt;
      payload.caseReference = caseReference;
    }

    const response = await requestJson(
      "/api/user/reports",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      },
      { auth: true }
    );

    const report = response.data?.report;
    showFeedback(
      `Request ${report?.id?.slice(0, 8) ?? ""} submitted successfully.`,
      "success"
    );

    resetReportForm();

    await loadTenantData();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit request.";
    showFeedback(message);
  } finally {
    submitBtnEl.disabled = false;
  }
}

function syncUtilityPaymentProviderUi() {
  const provider = String(utilityPaymentProviderEl.value ?? "mpesa");
  const isMpesa = provider === "mpesa";

  utilityPaymentPhoneEl.disabled = !isMpesa;
  utilityPaymentReferenceEl.disabled = isMpesa;
  utilityPaymentReferenceEl.placeholder = isMpesa
    ? "Reference auto-filled from M-PESA receipt"
    : "QWE123";
  utilityPaymentBtnEl.textContent = isMpesa
    ? state.utilityCheckoutRequestId
      ? "Resume M-PESA Check"
      : "Pay Utility via M-PESA"
    : "Submit Utility Payment";

  if (utilityPaymentSectionEl.classList.contains("is-disabled")) {
    utilityPaymentPhoneEl.disabled = true;
    utilityPaymentReferenceEl.disabled = true;
    utilityPaymentBtnEl.disabled = true;
  }
}

function syncRentPaymentButtonUi() {
  rentPaymentBtnEl.textContent = state.rentCheckoutRequestId
    ? "Resume M-PESA Check"
    : "Pay with M-PESA";

  if (rentPaymentSectionEl.classList.contains("is-disabled")) {
    rentPaymentBtnEl.disabled = true;
  }
}

async function submitUtilityMpesaPayment({ utilityType, billingMonth, amountKsh }) {
  const payload = {
    paymentMethod: "mpesa",
    billingMonth: billingMonth || undefined,
    amountKsh,
    phoneNumber: utilityPaymentPhoneEl.value.trim() || undefined
  };

  const response = await requestJson(
    `/api/user/utilities/${encodeURIComponent(utilityType)}/payments/mpesa/initialize`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    },
    { auth: true }
  );

  const checkoutRequestId = String(response.data?.checkoutRequestId ?? "").trim();
  if (!checkoutRequestId) {
    throw new Error("M-PESA checkout request ID was not returned.");
  }

  stopUtilityPaymentPolling();
  state.utilityCheckoutRequestId = checkoutRequestId;
  state.utilityCheckoutType = utilityType;
  state.utilityPaymentPollAttempts = 0;
  state.activeMpesaFlow = {
    scope: "utility",
    stage: "prompt",
    utilityType,
    billingMonth: response.data?.billingMonth ?? billingMonth ?? "Current bill",
    amountKsh: response.data?.amountKsh ?? amountKsh,
    phoneMask: response.data?.phoneMask ?? utilityPaymentPhoneEl.value.trim(),
    checkoutRequestId,
    title: "Confirm utility payment on your phone",
    badge: "Waiting for PIN",
    copy: `A Safaricom STK prompt has been sent to ${
      response.data?.phoneMask ?? "your phone"
    }. Enter your M-PESA PIN on your phone to complete this ${utilityLabel(
      utilityType
    ).toLowerCase()} payment.`,
    note:
      response.data?.customerMessage ??
      "If the prompt delays, keep your phone unlocked and tap Check status below."
  };
  syncUtilityPaymentProviderUi();
  state.mpesaStatusModalDismissed = false;
  openMpesaStatusModal(null, { force: true });

  showFeedback(
    "M-PESA prompt sent for utility payment. Complete it on your phone.",
    "success"
  );
  scheduleUtilityPaymentPolling(checkoutRequestId, utilityType);
}

function stopUtilityPaymentPolling() {
  if (state.utilityPaymentPollTimer) {
    clearTimeout(state.utilityPaymentPollTimer);
    state.utilityPaymentPollTimer = null;
  }
}

function scheduleUtilityPaymentPolling(checkoutRequestId, utilityType) {
  state.utilityPaymentPollTimer = setTimeout(() => {
    void pollUtilityMpesaPayment(checkoutRequestId, utilityType);
  }, RENT_PAYMENT_POLL_INTERVAL_MS);
}

async function pollUtilityMpesaPayment(checkoutRequestId, utilityType, { manual = false } = {}) {
  openMpesaStatusModal(
    {
      stage: "checking",
      title: "Checking utility payment",
      badge: "Checking",
      copy: `Checking whether your ${utilityLabel(
        utilityType
      ).toLowerCase()} payment has been approved in M-PESA.`,
      note: manual
        ? "This is a live status check. Keep your phone nearby if the prompt is still waiting for your PIN."
        : "We are checking automatically while you approve the prompt on your phone."
    },
    { force: manual }
  );

  try {
    const response = await requestJson(
      `/api/user/utilities/${encodeURIComponent(utilityType)}/payments/mpesa/verify`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ checkoutRequestId })
      },
      { auth: true }
    );

    const status = response.data?.status;
    if (status === "paid") {
      clearUtilityMpesaProgress({ keepFlow: true });
      utilityPaymentAmountEl.value = "";
      utilityPaymentReferenceEl.value = "";
      utilityPaymentPhoneEl.value = "";
      const synced = await pollForUtilityReceipt();
      const payment = synced
        ? findLatestUtilityPayment({
            utilityType,
            billingMonth: response.data?.billingMonth,
            amountKsh: response.data?.amountKsh,
            providerReference: response.data?.receiptReference
          })
        : null;
      openMpesaStatusModal({
        stage: "success",
        receiptReference: response.data?.receiptReference,
        title: "Utility payment confirmed",
        badge: "Paid",
        copy: synced
          ? "Your M-PESA utility payment has been confirmed and posted to your account."
          : "Your M-PESA utility payment is confirmed. The receipt is still syncing."
      });
      showFeedback(
        synced
          ? "M-PESA utility payment confirmed. Receipt posted to your account."
          : "M-PESA utility payment confirmed. Receipt will appear shortly.",
        "success"
      );
      if (payment) {
        openPaymentReceiptModal(buildUtilityReceiptRecord(payment));
      }
      return;
    }

    if (status === "failed") {
      clearUtilityMpesaProgress({ keepFlow: true });
      const reason = response.data?.resultDesc ?? "The payment was not completed.";
      openMpesaStatusModal({
        stage: "failed",
        title: "Utility payment was not completed",
        badge: "Failed",
        copy: reason,
        note: "You do not need to refresh this page. Edit the amount or phone number and try again."
      });
      showFeedback(`M-PESA utility payment failed: ${reason}`);
      return;
    }

    if (status === "unknown") {
      clearUtilityMpesaProgress({ keepFlow: true });
      const synced = await pollForUtilityReceipt();
      const payment = synced
        ? findLatestUtilityPayment({
            utilityType,
            billingMonth: state.activeMpesaFlow?.billingMonth,
            amountKsh: state.activeMpesaFlow?.amountKsh,
            providerReference: state.activeMpesaFlow?.receiptReference
          })
        : null;
      if (payment) {
        openMpesaStatusModal({
          stage: "success",
          title: "Utility payment found in your ledger",
          badge: "Paid",
          copy: "This payment has already moved out of the active queue and into your history."
        });
        openPaymentReceiptModal(buildUtilityReceiptRecord(payment));
        showFeedback("Utility payment found in your ledger.", "success");
        return;
      }
      openMpesaStatusModal({
        stage: "unknown",
        title: "Review your utility ledger",
        badge: "Review ledger",
        copy:
          response.message ??
          "This payment request is no longer in the active queue. Review your payment history below or start again.",
        note: "No page refresh is required."
      });
      showFeedback(
        response.message ??
          "Payment request is no longer in the queue. Review your utility history below."
      );
      return;
    }

    state.utilityPaymentPollAttempts += 1;
    if (state.utilityPaymentPollAttempts >= RENT_PAYMENT_POLL_MAX_ATTEMPTS) {
      stopUtilityPaymentPolling();
      state.utilityPaymentPollAttempts = 0;
      utilityPaymentBtnEl.disabled = false;
      syncUtilityPaymentProviderUi();
      openMpesaStatusModal({
        stage: "pending",
        title: "Still waiting for utility approval",
        badge: "Awaiting approval",
        copy:
          response.data?.resultDesc ??
          "M-PESA has not confirmed this utility payment yet. Finish the PIN prompt on your phone, then tap Check status.",
        note: "You can reopen this status box without refreshing the page."
      });
      showFeedback(
        "Still waiting for M-PESA utility confirmation. Reopen the status box or tap Check status again."
      );
      return;
    }

    openMpesaStatusModal({
      stage: "pending",
      title: "Awaiting utility payment approval",
      badge: "Awaiting approval",
      copy:
        response.data?.resultDesc ??
        "Finish the M-PESA PIN prompt on your phone. We will keep checking automatically."
    });
    scheduleUtilityPaymentPolling(checkoutRequestId, utilityType);
  } catch (error) {
    stopUtilityPaymentPolling();
    const message =
      error instanceof Error ? error.message : "Unable to verify M-PESA utility payment.";
    state.utilityPaymentPollAttempts = 0;
    utilityPaymentBtnEl.disabled = false;
    syncUtilityPaymentProviderUi();
    openMpesaStatusModal({
      stage: "error",
      title: "Could not confirm utility payment",
      badge: "Could not verify",
      copy: message,
      note: "Tap Check status again. You do not need to refresh the page."
    });
    showFeedback(message);
  }
}

async function submitUtilityPayment(event) {
  event.preventDefault();
  clearFeedback();

  const utilityType = String(utilityPaymentTypeEl.value ?? "water");
  if (!isUtilityPaymentEnabled(utilityType)) {
    showFeedback(`${utilityLabel(utilityType)} payments are disabled by your landlord.`);
    return;
  }

  const billingMonth = getSelectedUtilityBillMonth(utilityType);
  const amountKsh = Number(utilityPaymentAmountEl.value);
  const provider = String(utilityPaymentProviderEl.value ?? "mpesa");

  if (
    provider === "mpesa" &&
    state.utilityCheckoutRequestId &&
    state.utilityCheckoutType === utilityType
  ) {
    state.mpesaStatusModalDismissed = false;
    openMpesaStatusModal(null, { force: true });
    return;
  }

  if (!Number.isFinite(amountKsh) || amountKsh <= 0) {
    showFeedback("Provide a valid utility payment amount.");
    return;
  }

  utilityPaymentBtnEl.disabled = true;

  try {
    if (provider === "mpesa") {
      captureUtilityPaymentBaseline(utilityType);
      await submitUtilityMpesaPayment({
        utilityType,
        billingMonth,
        amountKsh
      });
      return;
    }

    const payload = {
      billingMonth,
      amountKsh,
      provider,
      providerReference: utilityPaymentReferenceEl.value.trim() || undefined
    };

    await requestJson(
      `/api/user/utilities/${encodeURIComponent(utilityType)}/payments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      },
      { auth: true }
    );

    utilityPaymentAmountEl.value = "";
    utilityPaymentReferenceEl.value = "";
    showFeedback("Utility payment submitted successfully.", "success");
    await loadTenantData();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit utility payment.";
    showFeedback(message);
  } finally {
    if (!state.utilityCheckoutRequestId) {
      utilityPaymentBtnEl.disabled = false;
    }
  }
}

function stopRentPaymentPolling() {
  if (state.rentPaymentPollTimer) {
    clearTimeout(state.rentPaymentPollTimer);
    state.rentPaymentPollTimer = null;
  }
}

function scheduleRentPaymentPolling(checkoutRequestId) {
  state.rentPaymentPollTimer = setTimeout(() => {
    void pollRentMpesaPayment(checkoutRequestId);
  }, RENT_PAYMENT_POLL_INTERVAL_MS);
}

async function pollRentMpesaPayment(checkoutRequestId, { manual = false } = {}) {
  openMpesaStatusModal(
    {
      stage: "checking",
      title: "Checking rent payment",
      badge: "Checking",
      copy: "Checking whether your rent payment has been approved in M-PESA.",
      note: manual
        ? "This is a live status check. Keep your phone nearby if the prompt still needs your PIN."
        : "We are checking automatically while you approve the prompt on your phone."
    },
    { force: manual }
  );

  try {
    const response = await requestJson(
      "/api/user/rent/payments/mpesa/verify",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ checkoutRequestId })
      },
      { auth: true }
    );

    const status = response.data?.status;
    if (status === "paid") {
      clearRentMpesaProgress({ keepFlow: true });
      rentPaymentAmountEl.value = "";
      rentPaymentPhoneEl.value = "";
      const synced = await pollForRentReceipt();
      const payment = synced
        ? findLatestRentPayment({
            billingMonth: response.data?.billingMonth,
            amountKsh: response.data?.amountKsh,
            providerReference: state.activeMpesaFlow?.receiptReference
          })
        : null;
      openMpesaStatusModal({
        stage: "success",
        title: "Rent payment confirmed",
        badge: "Paid",
        copy: synced
          ? "Your M-PESA rent payment has been confirmed and posted to your ledger."
          : "Your M-PESA rent payment is confirmed. The receipt is still syncing."
      });
      showFeedback(
        synced
          ? "M-PESA payment confirmed. Receipt posted to your account."
          : "M-PESA payment confirmed. Receipt will appear shortly.",
        "success"
      );
      if (payment) {
        openPaymentReceiptModal(buildRentReceiptRecord(payment));
      }
      return;
    }

    if (status === "failed") {
      clearRentMpesaProgress({ keepFlow: true });
      const reason = response.data?.resultDesc ?? "Payment was not completed.";
      openMpesaStatusModal({
        stage: "failed",
        title: "Rent payment was not completed",
        badge: "Failed",
        copy: reason,
        note: "You do not need to refresh this page. Edit the amount or phone number and try again."
      });
      showFeedback(`M-PESA payment failed: ${reason}`);
      return;
    }

    if (status === "unknown") {
      clearRentMpesaProgress({ keepFlow: true });
      const synced = await pollForRentReceipt();
      const payment = synced
        ? findLatestRentPayment({
            billingMonth: state.activeMpesaFlow?.billingMonth,
            amountKsh: state.activeMpesaFlow?.amountKsh,
            providerReference: state.activeMpesaFlow?.receiptReference
          })
        : null;
      if (payment) {
        openMpesaStatusModal({
          stage: "success",
          title: "Rent payment found in your ledger",
          badge: "Paid",
          copy: "This payment has already moved out of the active queue and into your history."
        });
        openPaymentReceiptModal(buildRentReceiptRecord(payment));
        showFeedback("Rent payment found in your ledger.", "success");
        return;
      }
      openMpesaStatusModal({
        stage: "unknown",
        title: "Review your rent ledger",
        badge: "Review ledger",
        copy:
          response.message ??
          "This payment request is no longer in the active queue. Review your payment history below or start again.",
        note: "No page refresh is required."
      });
      showFeedback(
        response.message ??
          "Payment request is no longer in the queue. Review your rent history below."
      );
      return;
    }

    state.rentPaymentPollAttempts += 1;
    if (state.rentPaymentPollAttempts >= RENT_PAYMENT_POLL_MAX_ATTEMPTS) {
      stopRentPaymentPolling();
      state.rentPaymentPollAttempts = 0;
      rentPaymentBtnEl.disabled = false;
      syncRentPaymentButtonUi();
      openMpesaStatusModal({
        stage: "pending",
        title: "Still waiting for rent approval",
        badge: "Awaiting approval",
        copy:
          response.data?.resultDesc ??
          "M-PESA has not confirmed this rent payment yet. Finish the PIN prompt on your phone, then tap Check status.",
        note: "You can reopen this status box without refreshing the page."
      });
      const note =
        response.data?.resultDesc ??
        "Still waiting for confirmation. Check your M-PESA prompt and retry status.";
      showFeedback(note);
      return;
    }

    openMpesaStatusModal({
      stage: "pending",
      title: "Awaiting rent payment approval",
      badge: "Awaiting approval",
      copy:
        response.data?.resultDesc ??
        "Finish the M-PESA PIN prompt on your phone. We will keep checking automatically."
    });
    scheduleRentPaymentPolling(checkoutRequestId);
  } catch (error) {
    stopRentPaymentPolling();
    const message =
      error instanceof Error ? error.message : "Unable to verify M-PESA payment.";
    state.rentPaymentPollAttempts = 0;
    rentPaymentBtnEl.disabled = false;
    syncRentPaymentButtonUi();
    openMpesaStatusModal({
      stage: "error",
      title: "Could not confirm rent payment",
      badge: "Could not verify",
      copy: message,
      note: "Tap Check status again. You do not need to refresh the page."
    });
    showFeedback(message);
  }
}

async function submitRentPayment(event) {
  event.preventDefault();
  clearFeedback();

  if (!isRentPaymentEnabled()) {
    showFeedback("Rent payments are disabled by your landlord for this building.");
    return;
  }

  if (state.rentCheckoutRequestId) {
    state.mpesaStatusModalDismissed = false;
    openMpesaStatusModal(null, { force: true });
    return;
  }

  const amountKsh = Number(rentPaymentAmountEl.value);
  const paymentMethod = String(rentPaymentMethodEl.value ?? "mpesa");
  const phoneNumber = rentPaymentPhoneEl.value.trim();
  const billingMonth = getActiveRentBillingMonth();

  if (!Number.isFinite(amountKsh) || amountKsh <= 0) {
    showFeedback("Provide a valid rent payment amount.");
    return;
  }

  captureRentPaymentBaseline();
  rentPaymentBtnEl.disabled = true;

  try {
    const response = await requestJson(
      "/api/user/rent/payments/mpesa/initialize",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          paymentMethod,
          billingMonth: billingMonth || undefined,
          amountKsh: Math.round(amountKsh),
          phoneNumber: phoneNumber || undefined
        })
      },
      { auth: true }
    );

    const checkoutRequestId = response.data?.checkoutRequestId;
    if (!checkoutRequestId) {
      throw new Error("M-PESA checkout request was not created.");
    }

    stopRentPaymentPolling();
    state.rentCheckoutRequestId = checkoutRequestId;
    state.rentPaymentPollAttempts = 0;
    state.activeMpesaFlow = {
      scope: "rent",
      stage: "prompt",
      billingMonth: response.data?.billingMonth ?? billingMonth ?? "Current rent month",
      amountKsh: response.data?.amountKsh ?? Math.round(amountKsh),
      phoneMask: response.data?.phoneMask ?? phoneNumber,
      checkoutRequestId,
      title: "Confirm rent payment on your phone",
      badge: "Waiting for PIN",
      copy: `A Safaricom STK prompt has been sent to ${
        response.data?.phoneMask ?? "your phone"
      }. Enter your M-PESA PIN on your phone to complete this rent payment.`,
      note:
        response.data?.customerMessage ??
        "If the prompt delays, keep your phone unlocked and tap Check status below."
    };
    syncRentPaymentButtonUi();
    state.mpesaStatusModalDismissed = false;
    openMpesaStatusModal(null, { force: true });

    showFeedback(
      "M-PESA prompt sent. Complete it on your phone to post rent payment.",
      "success"
    );
    scheduleRentPaymentPolling(checkoutRequestId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to initialize M-PESA payment.";
    showFeedback(message);
    rentPaymentBtnEl.disabled = false;
  } finally {
    // Button is re-enabled after verification polling completes or fails.
  }
}

async function signOutResident() {
  clearFeedback();

  await disableResidentPushNotifications({ silent: true });

  try {
    await requestJson(
      "/api/auth/resident/logout",
      {
        method: "POST"
      },
      { auth: true }
    );
  } catch (_error) {
    // legacy sign-out fallback
  }

  try {
    await requestJson("/api/auth/logout", {
      method: "POST"
    });
  } catch (_error) {
    // local sign-out still proceeds
  }

  saveResidentToken("", { rememberDevice: false });
  state.residentSession = null;
  showSignedOutState();
  showFeedback("Signed out.", "success");
}

async function boot() {
  clearFeedback();
  document.body.classList.add("app-loading");
  apiStatusEl.textContent = "Checking...";
  renderAuthBuildingLoading();

  const [healthResult, buildingsResult] = await Promise.allSettled([
    requestJson("/health", { cache: "no-store" }),
    loadBuildingsWithRetry()
  ]);

  if (healthResult.status === "fulfilled") {
    apiStatusEl.textContent = healthResult.value.status ?? "ok";
  } else {
    apiStatusEl.textContent = "degraded";
  }

  if (buildingsResult.status === "fulfilled") {
    state.buildings = buildingsResult.value;
    renderAuthBuildingOptions(state.buildings);
  } else {
    state.buildings = [];
    renderAuthBuildingOptions([]);
    const message =
      buildingsResult.reason instanceof Error
        ? buildingsResult.reason.message
        : "Failed to load buildings.";
    showFeedback(message);
  }

  try {
    const loaded = await loadResidentSession();
    if (loaded) {
      if (isPasswordChangeRequired()) {
        showFeedback(
          "Temporary password detected. Set a new password before using the portal.",
          "success"
        );
      } else {
        await loadTenantData();
      }
    } else {
      showSignedOutState();
      await syncAuthConflictState();
    }
  } catch (error) {
    showSignedOutState();
    const message =
      error instanceof Error ? error.message : "Failed to initialize session.";
    showFeedback(message);
  } finally {
    document.body.classList.remove("app-loading");
    if (!Array.isArray(state.buildings) || state.buildings.length === 0) {
      residentLoginBtnEl.disabled = false;
    }
  }
}

function startResidentPortal() {
  startResidentPwa();

  residentNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.residentView;
      setActiveResidentView(target, { scroll: true });
    });
  });

  if (openSupportViewBtnEl) {
    openSupportViewBtnEl.addEventListener("click", () => {
      setActiveResidentView("support", { scroll: true });
    });
  }

  if (openPaymentsViewBtnEl) {
    openPaymentsViewBtnEl.addEventListener("click", () => {
      setActiveResidentView("payments", { scroll: true });
    });
  }

  if (openNoticesViewBtnEl) {
    openNoticesViewBtnEl.addEventListener("click", () => {
      setActiveResidentView("notices", { scroll: true });
    });
  }

  paymentShortcutButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    button.addEventListener("click", () => {
      applyResidentPaymentShortcut(String(button.dataset.paymentShortcut || ""));
    });
  });

  authBuildingIdEl?.addEventListener("change", () => {
    updateResidentBranding();
  });

  if (residentRememberDeviceEl instanceof HTMLInputElement) {
    residentRememberDeviceEl.addEventListener("change", () => {
      state.rememberResidentDevice = residentRememberDeviceEl.checked;
    });
  }

  if (installAppBtnEl instanceof HTMLButtonElement) {
    installAppBtnEl.addEventListener("click", () => {
      void promptResidentInstall();
    });
  }

  if (pushEnableBtnEl instanceof HTMLButtonElement) {
    pushEnableBtnEl.addEventListener("click", () => {
      void enableResidentPushNotifications();
    });
  }

  if (pushDisableBtnEl instanceof HTMLButtonElement) {
    pushDisableBtnEl.addEventListener("click", () => {
      void disableResidentPushNotifications();
    });
  }

  if (smsEnableBtnEl instanceof HTMLButtonElement) {
    smsEnableBtnEl.addEventListener("click", () => {
      void enableResidentSmsNotifications();
    });
  }

  if (smsDisableBtnEl instanceof HTMLButtonElement) {
    smsDisableBtnEl.addEventListener("click", () => {
      void disableResidentSmsNotifications();
    });
  }

  if (smsRentToggleEl instanceof HTMLInputElement) {
    smsRentToggleEl.addEventListener("change", () => {
      void updateResidentNotificationPreferences({
        rentEnabled: smsRentToggleEl.checked
      }).catch((error) => {
        console.error("Failed to update resident rent SMS preference", error);
        showFeedback(
          error instanceof Error
            ? error.message
            : "Unable to update rent SMS preference."
        );
        renderSmsControls();
      });
    });
  }

  if (smsUtilityToggleEl instanceof HTMLInputElement) {
    smsUtilityToggleEl.addEventListener("change", () => {
      void updateResidentNotificationPreferences({
        utilityEnabled: smsUtilityToggleEl.checked
      }).catch((error) => {
        console.error("Failed to update resident utility SMS preference", error);
        showFeedback(
          error instanceof Error
            ? error.message
            : "Unable to update utility SMS preference."
        );
        renderSmsControls();
      });
    });
  }

  if (userMenuToggleEl && userMenuPanelEl) {
    userMenuToggleEl.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleUserMenu();
    });

    userMenuPanelEl.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Node)) {
        return;
      }
      if (
        userMenuPanelEl.contains(event.target) ||
        userMenuToggleEl.contains(event.target)
      ) {
        return;
      }
      setUserMenuOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        closeMpesaStatusModal();
        closePaymentReceiptModal();
      }
    });
  }

  residentAuthFormEl.addEventListener("submit", (event) => {
    void loginResident(event);
  });

  residentSignupBtnEl.addEventListener("click", () => {
    void signupResident();
  });

  residentForgotBtnEl.addEventListener("click", () => {
    void requestResidentPasswordRecovery();
  });

  residentPasswordChangeFormEl.addEventListener("submit", (event) => {
    void submitResidentPasswordChange(event);
  });

  reportFormEl.addEventListener("submit", (event) => {
    void submitTicket(event);
  });

  reportTypeEl.addEventListener("change", () => {
    syncReportTypeUi();
  });

  reportAttachmentsEl?.addEventListener("change", () => {
    try {
      const selectedFiles = validateImageFiles(reportAttachmentsEl.files, {
        maxFiles: REPORT_ATTACHMENT_LIMIT,
        maxSizeMb: 10
      });
      renderSelectedImagePreviews(reportAttachmentPreviewEl, selectedFiles, {
        emptyText: "No photos selected."
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to preview selected photos.";
      showFeedback(message);
      if (reportAttachmentsEl instanceof HTMLInputElement) {
        reportAttachmentsEl.value = "";
      }
      renderSelectedImagePreviews(reportAttachmentPreviewEl, [], {
        emptyText: "No photos selected."
      });
    }
  });

  rentPaymentFormEl.addEventListener("submit", (event) => {
    void submitRentPayment(event);
  });

  utilityPaymentFormEl.addEventListener("submit", (event) => {
    void submitUtilityPayment(event);
  });

  utilityPaymentTypeEl.addEventListener("change", () => {
    applyPaymentAccessUi();
    syncUtilityPaymentFormFromBalances();
  });

  if (rentPaymentMonthEl instanceof HTMLSelectElement) {
    rentPaymentMonthEl.addEventListener("change", () => {
      setSelectedRentBillingMonth(rentPaymentMonthEl.value);
      syncRentBillingMonthOptions();
      updateRentPaymentGuidance();
    });
  }

  if (utilityPaymentMonthEl instanceof HTMLSelectElement) {
    utilityPaymentMonthEl.addEventListener("change", () => {
      const utilityType = String(utilityPaymentTypeEl.value ?? "water");
      setSelectedUtilityBillMonth(utilityType, utilityPaymentMonthEl.value);
      syncUtilityPaymentFormFromBalances();
    });
  }

  document
    .querySelectorAll('[data-quick-pay="rent"] [data-quick]')
    .forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }
      button.addEventListener("click", () => {
        const mode = button.dataset.quick || "full";
        applyQuickPayAmount(rentPaymentAmountEl, getRentOutstandingBalance(), mode);
      });
    });

  document
    .querySelectorAll('[data-quick-pay="utility"] [data-quick]')
    .forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }
      button.addEventListener("click", () => {
        const mode = button.dataset.quick || "full";
        const utilityType = String(utilityPaymentTypeEl.value || "water");
        applyQuickPayAmount(
          utilityPaymentAmountEl,
          getUtilityOutstandingBalance(utilityType),
          mode
        );
      });
    });

  document.querySelectorAll("[data-fixed-pay]").forEach((row) => {
    if (!(row instanceof HTMLElement)) {
      return;
    }

    row.querySelectorAll("button[data-fixed]").forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      button.addEventListener("click", () => {
        const fixedAmount = Number(button.dataset.fixed ?? 0);
        const target = row.dataset.fixedPay;

        if (target === "rent") {
          setPaymentAmountValue(
            rentPaymentAmountEl,
            getRentOutstandingBalance(),
            fixedAmount
          );
          return;
        }

        const utilityType = String(utilityPaymentTypeEl.value || "water");
        setPaymentAmountValue(
          utilityPaymentAmountEl,
          getUtilityOutstandingBalance(utilityType),
          fixedAmount
        );
      });
    });
  });

  rentPaymentAmountEl.addEventListener("input", () => {
    updateRentPaymentGuidance();
  });

  utilityPaymentAmountEl.addEventListener("input", () => {
    updateUtilityPaymentGuidance();
  });

  utilityBillsListEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const card = target.closest(".stack-item[data-utility-type][data-billing-month]");
    if (!(card instanceof HTMLElement) || !card.classList.contains("is-clickable")) {
      return;
    }

    const utilityType = card.dataset.utilityType;
    const billingMonth = card.dataset.billingMonth;
    if (!utilityType || !billingMonth) {
      return;
    }

    utilityPaymentTypeEl.value = utilityType;
    setSelectedUtilityBillMonth(utilityType, billingMonth);
    if (utilityPaymentMonthEl instanceof HTMLSelectElement) {
      utilityPaymentMonthEl.value = billingMonth;
    }
    applyPaymentAccessUi();
    syncUtilityPaymentFormFromBalances();

    if (!String(utilityPaymentAmountEl.value ?? "").trim()) {
      const totalOutstanding = getTotalOutstandingUtilityBalanceForType(utilityType);
      if (totalOutstanding > 0) {
        utilityPaymentAmountEl.value = formatAmountValue(totalOutstanding);
      }
    }

    utilityPaymentAmountEl.focus();
  });

  utilityPaymentProviderEl.addEventListener("change", () => {
    syncUtilityPaymentProviderUi();
  });

  utilityPaymentsListEl.addEventListener("click", (event) => {
    const trigger = event.target;
    if (!(trigger instanceof HTMLElement)) {
      return;
    }

    const receiptBtn = trigger.closest("button[data-receipt-kind][data-payment-id]");
    if (!(receiptBtn instanceof HTMLButtonElement)) {
      return;
    }

    openReceiptForPayment(receiptBtn.dataset.receiptKind, receiptBtn.dataset.paymentId);
  });

  rentPaymentsListEl.addEventListener("click", (event) => {
    const trigger = event.target;
    if (!(trigger instanceof HTMLElement)) {
      return;
    }

    const receiptBtn = trigger.closest("button[data-receipt-kind][data-payment-id]");
    if (!(receiptBtn instanceof HTMLButtonElement)) {
      return;
    }

    openReceiptForPayment(receiptBtn.dataset.receiptKind, receiptBtn.dataset.paymentId);
  });

  mpesaStatusBackdropEl.addEventListener("click", () => {
    closeMpesaStatusModal();
  });

  mpesaStatusCloseEl.addEventListener("click", () => {
    closeMpesaStatusModal({
      clearFlow: ["failed", "success", "unknown"].includes(state.activeMpesaFlow?.stage ?? "")
    });
  });

  mpesaStatusCloseBtnEl.addEventListener("click", () => {
    closeMpesaStatusModal({
      clearFlow: ["failed", "success", "unknown"].includes(state.activeMpesaFlow?.stage ?? "")
    });
  });

  mpesaStatusCheckBtnEl.addEventListener("click", () => {
    void checkActiveMpesaFlow();
  });

  mpesaStatusRetryBtnEl.addEventListener("click", () => {
    abandonActiveMpesaFlow();
  });

  paymentReceiptBackdropEl.addEventListener("click", () => {
    closePaymentReceiptModal();
  });

  paymentReceiptCloseEl.addEventListener("click", () => {
    closePaymentReceiptModal();
  });

  paymentReceiptDismissBtnEl.addEventListener("click", () => {
    closePaymentReceiptModal();
  });

  paymentReceiptSaveBtnEl.addEventListener("click", () => {
    downloadActiveReceipt();
  });

  refreshAllBtnEl.addEventListener("click", () => {
    void loadTenantData();
  });

  residentLogoutBtnEl.addEventListener("click", () => {
    void signOutResident();
  });

  syncReportTypeUi();
  syncRentPaymentButtonUi();
  syncUtilityPaymentProviderUi();
  syncPaymentMessaging();
  syncUtilityPaymentFormFromBalances();
  applyPaymentAccessUi();

  void boot();
}

if (hasRequiredDomBindings()) {
  initPasswordVisibilityToggles();
  startResidentPortal();
}
