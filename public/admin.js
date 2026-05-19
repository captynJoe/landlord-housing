import { initPasswordVisibilityToggles } from "./password-visibility.js";
import { initResponsiveTables } from "./mobile-table.js";
import { notifyError, notifyStatus } from "./notifications.js";

const authStatusEl = document.getElementById("auth-status");
const adminRoleEl = document.getElementById("admin-role");
const adminLogoutBtnEl = document.getElementById("admin-logout-btn");
const refreshAllBtnEl = document.getElementById("refresh-all-btn");
const adminAccessPanelEl = document.getElementById("admin-access-panel");
const adminAccessFormEl = document.getElementById("admin-access-form");
const adminAccessSummaryEl = document.getElementById("admin-access-summary");
const adminAccessCurrentUsernameEl = document.getElementById(
  "admin-access-current-username"
);
const adminAccessUsernameEl = document.getElementById("admin-access-username");
const adminAccessPasswordEl = document.getElementById("admin-access-password");
const adminAccessConfirmPasswordEl = document.getElementById(
  "admin-access-confirm-password"
);

const metricBuildingsEl = document.getElementById("metric-buildings");
const metricActiveLandlordsEl = document.getElementById("metric-active-landlords");
const metricUnassignedBuildingsEl = document.getElementById("metric-unassigned-buildings");
const metricPendingLandlordAccessEl = document.getElementById(
  "metric-pending-landlord-access"
);
const metricResidentRecoveryEl = document.getElementById("metric-resident-recovery");
const metricAccountRecoveryEl = document.getElementById("metric-account-recovery");
const platformSummaryEl = document.getElementById("platform-summary");
const registrySummaryEl = document.getElementById("registry-summary");

const landlordAccessBodyEl = document.getElementById("landlord-access-body");
const refreshLandlordAccessBtn = document.getElementById("refresh-landlord-access");
const passwordRecoveryBodyEl = document.getElementById("password-recovery-body");
const refreshPasswordRecoveryBtn = document.getElementById("refresh-password-recovery");
const accountPasswordRecoveryBodyEl = document.getElementById(
  "account-password-recovery-body"
);
const refreshAccountPasswordRecoveryBtn = document.getElementById(
  "refresh-account-password-recovery"
);

const landlordPortfoliosBodyEl = document.getElementById("landlord-portfolios-body");
const refreshPortfoliosBtn = document.getElementById("refresh-portfolios");
const ownershipGapBodyEl = document.getElementById("ownership-gap-body");
const refreshOwnershipGapsBtn = document.getElementById("refresh-ownership-gaps");

const buildingCreateFormEl = document.getElementById("building-create-form");
const buildingNameEl = document.getElementById("building-name");
const buildingCountyEl = document.getElementById("building-county");
const buildingAddressEl = document.getElementById("building-address");
const buildingUnitsEl = document.getElementById("building-units");
const buildingCctvStatusEl = document.getElementById("building-cctv-status");
const buildingsBodyEl = document.getElementById("buildings-body");
const refreshBuildingsBtn = document.getElementById("refresh-buildings");
const adminBillingBuildingSelectEl = document.getElementById(
  "admin-billing-building-select"
);
const refreshAdminBillingBtnEl = document.getElementById("refresh-admin-billing");
const deleteAdminBillingBuildingBtnEl = document.getElementById(
  "delete-admin-billing-building"
);
const adminBillingSummaryEl = document.getElementById("admin-billing-summary");
const adminMonthlyCombinedChargeFormEl = document.getElementById(
  "admin-monthly-combined-charge-form"
);
const adminMonthlyCombinedChargeMonthEl = document.getElementById(
  "admin-monthly-combined-charge-month"
);
const adminMonthlyCombinedChargeAmountEl = document.getElementById(
  "admin-monthly-combined-charge-amount"
);
const adminUtilityRegistryBodyEl = document.getElementById("admin-utility-registry-body");
const adminUtilityBillFormEl = document.getElementById("admin-utility-bill-form");
const adminUtilityBillTypeEl = document.getElementById("admin-utility-bill-type");
const adminUtilityBillHouseEl = document.getElementById("admin-utility-bill-house");
const adminUtilityBillMonthEl = document.getElementById("admin-utility-bill-month");
const adminUtilityBillDueDateEl = document.getElementById("admin-utility-bill-due-date");
const adminUtilityBillFixedChargeEl = document.getElementById(
  "admin-utility-bill-fixed-charge"
);
const adminUtilityBillPreviousReadingEl = document.getElementById(
  "admin-utility-bill-previous-reading"
);
const adminUtilityBillCurrentReadingEl = document.getElementById(
  "admin-utility-bill-current-reading"
);
const adminUtilityBillRateEl = document.getElementById("admin-utility-bill-rate");
const adminUtilityBillNoteEl = document.getElementById("admin-utility-bill-note");
const adminUtilityPaymentFormEl = document.getElementById("admin-utility-payment-form");
const adminUtilityPaymentTypeEl = document.getElementById("admin-utility-payment-type");
const adminUtilityPaymentHouseEl = document.getElementById("admin-utility-payment-house");
const adminUtilityPaymentMonthEl = document.getElementById("admin-utility-payment-month");
const adminUtilityPaymentAmountEl = document.getElementById("admin-utility-payment-amount");
const adminUtilityPaymentProviderEl = document.getElementById("admin-utility-payment-provider");
const adminUtilityPaymentPaidAtEl = document.getElementById("admin-utility-payment-paid-at");
const adminUtilityPaymentReferenceEl = document.getElementById(
  "admin-utility-payment-reference"
);
const adminUtilityPaymentNoteEl = document.getElementById("admin-utility-payment-note");
const adminUtilityPaymentsBodyEl = document.getElementById("admin-utility-payments-body");

const adminErrorEl = document.getElementById("admin-error");

const state = {
  role: "-",
  overview: null,
  buildings: [],
  selectedAdminBillingBuildingId: "",
  adminBillingRegistryRows: [],
  adminUtilityPayments: [],
  adminAccess: null
};

initResponsiveTables();

function showError(message) {
  if (!(adminErrorEl instanceof HTMLElement)) {
    return;
  }

  adminErrorEl.textContent = message;
  adminErrorEl.classList.remove("hidden");
  notifyError(message);
}

function clearError() {
  if (!(adminErrorEl instanceof HTMLElement)) {
    return;
  }

  adminErrorEl.textContent = "";
  adminErrorEl.classList.add("hidden");
}

function setStatus(message) {
  if (authStatusEl instanceof HTMLElement) {
    authStatusEl.textContent = message;
  }
  notifyStatus(message);
}

function redirectToLogin() {
  window.location.href = "/admin/login";
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

function formatCurrency(value) {
  return `KSh ${Number(value ?? 0).toLocaleString("en-US")}`;
}

function currentBillingMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toBillingMonth(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  return raw.slice(0, 7);
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

function toOptionalNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toIsoFromDateTimeLocal(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return undefined;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function numberToInputString(value) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return parsed % 1 === 0 ? String(Math.trunc(parsed)) : String(parsed);
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getBuildingDisplayName(building, fallback = "Building") {
  const name = String(building?.name ?? "").trim();
  return name || fallback;
}

function getBuildingDisplayNameById(buildingId, fallback = "Selected building") {
  return getBuildingDisplayName(
    state.buildings.find((item) => item.id === buildingId),
    fallback
  );
}

function normalizeHouse(value) {
  return String(value ?? "").trim().toUpperCase();
}

function appendEmptyRow(body, colspan, message) {
  if (!(body instanceof HTMLElement)) {
    return;
  }

  const row = document.createElement("tr");
  row.innerHTML = `<td colspan="${colspan}">${escapeHtml(message)}</td>`;
  body.append(row);
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
    throw err;
  }

  return payload;
}

function handleAdminError(error, fallback) {
  if (error && (error.status === 401 || error.status === 403)) {
    redirectToLogin();
    return;
  }

  showError(error instanceof Error ? error.message : fallback);
}

function syncRootAdminAccessPanel() {
  if (!(adminAccessPanelEl instanceof HTMLElement)) {
    return;
  }

  adminAccessPanelEl.classList.toggle("hidden", state.role !== "root_admin");
}

function renderAdminAccess() {
  syncRootAdminAccessPanel();

  if (state.role !== "root_admin") {
    return;
  }

  const username = String(state.adminAccess?.username ?? "").trim();
  const source =
    state.adminAccess?.source === "app_state"
      ? "housing app state override"
      : state.adminAccess?.source === "environment"
        ? "environment config"
        : "not configured";
  const updatedAt = state.adminAccess?.updatedAt
    ? ` Updated ${formatDateTime(state.adminAccess.updatedAt)}.`
    : "";

  if (adminAccessCurrentUsernameEl instanceof HTMLElement) {
    adminAccessCurrentUsernameEl.textContent = username || "Not configured";
  }

  if (adminAccessSummaryEl instanceof HTMLElement) {
    adminAccessSummaryEl.textContent = username
      ? `Standard admin sign-in currently uses "${username}" from ${source}.${updatedAt}`
      : `Standard admin sign-in is not configured yet. Source: ${source}.${updatedAt}`;
  }

  if (adminAccessUsernameEl instanceof HTMLInputElement) {
    adminAccessUsernameEl.value = username;
  }
}

async function ensureAdminSession() {
  try {
    const payload = await requestJson("/api/auth/admin/session");
    const role = payload.data?.role ?? "admin";
    state.role = role;

    if (adminRoleEl instanceof HTMLElement) {
      adminRoleEl.textContent = `role: ${role}`;
    }

    renderAdminAccess();
    setStatus(`Signed in as ${role}.`);
    return true;
  } catch (error) {
    handleAdminError(error, "Admin session is not available.");
    return false;
  }
}

function renderOverview(overview) {
  state.overview = overview;

  if (metricBuildingsEl instanceof HTMLElement) {
    metricBuildingsEl.textContent = String(overview?.buildings ?? 0);
  }
  if (metricActiveLandlordsEl instanceof HTMLElement) {
    metricActiveLandlordsEl.textContent = String(overview?.activeLandlords ?? 0);
  }
  if (metricUnassignedBuildingsEl instanceof HTMLElement) {
    metricUnassignedBuildingsEl.textContent = String(overview?.unassignedBuildings ?? 0);
  }
  if (metricPendingLandlordAccessEl instanceof HTMLElement) {
    metricPendingLandlordAccessEl.textContent = String(
      overview?.pendingLandlordAccess ?? 0
    );
  }
  if (metricResidentRecoveryEl instanceof HTMLElement) {
    metricResidentRecoveryEl.textContent = String(
      overview?.residentPasswordRecoveryPending ?? 0
    );
  }
  if (metricAccountRecoveryEl instanceof HTMLElement) {
    metricAccountRecoveryEl.textContent = String(
      overview?.accountPasswordRecoveryPending ?? 0
    );
  }

  if (platformSummaryEl instanceof HTMLElement) {
    const buildings = Number(overview?.buildings ?? 0);
    const assignedBuildings = Number(overview?.assignedBuildings ?? 0);
    const trackedUnits = Number(overview?.trackedUnits ?? 0);
    const pendingRecoveries =
      Number(overview?.residentPasswordRecoveryPending ?? 0) +
      Number(overview?.accountPasswordRecoveryPending ?? 0);

    platformSummaryEl.textContent =
      `${assignedBuildings} of ${buildings} buildings currently have a landlord owner, ` +
      `${trackedUnits.toLocaleString("en-US")} tracked units are registered, and ` +
      `${pendingRecoveries} password recovery request(s) are waiting in admin queues.`;
  }
}

async function submitLandlordAccessDecision(requestId, action, note) {
  await requestJson(`/api/admin/landlord-access-requests/${encodeURIComponent(requestId)}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      action,
      note: note || undefined
    })
  });
}

async function revokeLandlordRole(userId, note) {
  return requestJson(`/api/admin/landlord-users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      confirmUserId: userId,
      confirmationText: "REVOKE",
      note: note || undefined
    })
  });
}

function renderLandlordAccessRequests(requests) {
  if (!(landlordAccessBodyEl instanceof HTMLElement)) {
    return;
  }

  landlordAccessBodyEl.replaceChildren();
  const visibleRequests = Array.isArray(requests)
    ? requests.filter((item) => {
        if (item.status !== "approved") {
          return true;
        }
        return item.user?.role === "landlord";
      })
    : [];

  if (visibleRequests.length === 0) {
    appendEmptyRow(landlordAccessBodyEl, 7, "No landlord access requests found.");
    return;
  }

  visibleRequests.forEach((request) => {
    const row = document.createElement("tr");
    const reviewedBy =
      request.reviewedBy?.fullName ?? request.reviewedBy?.email ?? "legacy admin";
    const reviewedAt = request.reviewedAt
      ? formatDateTime(request.reviewedAt)
      : "Pending review";
    const reason = request.reason ?? "-";

    if (request.status === "pending") {
      row.innerHTML = `
        <td>${formatDateTime(request.requestedAt)}</td>
        <td>${escapeHtml(request.user.fullName)}</td>
        <td>${escapeHtml(request.user.email)}</td>
        <td>${escapeHtml(request.user.phone)}</td>
        <td><strong>${escapeHtml(request.status)}</strong></td>
        <td>${escapeHtml(reason)}</td>
        <td class="admin-review-cell">
          <div class="admin-review-layout admin-review-layout-single">
            <input data-action="note" type="text" maxlength="500" placeholder="Optional review note" />
            <button data-action="approve" type="button">Approve</button>
            <button data-action="reject" type="button">Reject</button>
          </div>
        </td>
      `;

      const noteInput = row.querySelector('input[data-action="note"]');
      const approveButton = row.querySelector('button[data-action="approve"]');
      const rejectButton = row.querySelector('button[data-action="reject"]');

      const handleDecision = (action) => {
        clearError();
        approveButton.disabled = true;
        rejectButton.disabled = true;

        void (async () => {
          try {
            await submitLandlordAccessDecision(
              request.id,
              action,
              noteInput instanceof HTMLInputElement ? noteInput.value.trim() : ""
            );
            setStatus(
              action === "approve"
                ? `Landlord request ${request.id.slice(0, 8)} approved.`
                : `Landlord request ${request.id.slice(0, 8)} rejected.`
            );
            await Promise.all([loadOverview(), loadLandlordAccessRequests(), loadBuildings()]);
          } catch (error) {
            handleAdminError(error, "Failed to review landlord access request.");
          } finally {
            approveButton.disabled = false;
            rejectButton.disabled = false;
          }
        })();
      };

      approveButton.addEventListener("click", () => {
        handleDecision("approve");
      });

      rejectButton.addEventListener("click", () => {
        handleDecision("reject");
      });
    } else {
      const canRevokeLandlord =
        request.status === "approved" && request.user?.role === "landlord";

      if (canRevokeLandlord) {
        row.innerHTML = `
          <td>${formatDateTime(request.requestedAt)}</td>
          <td>${escapeHtml(request.user.fullName)}</td>
          <td>${escapeHtml(request.user.email)}</td>
          <td>${escapeHtml(request.user.phone)}</td>
          <td><strong>${escapeHtml(request.status)}</strong></td>
          <td>${escapeHtml(reason)}</td>
          <td>
            <button data-action="revoke-landlord" type="button" class="btn-danger">Remove Landlord</button>
            <br /><small>${escapeHtml(reviewedAt)} • ${escapeHtml(reviewedBy)}</small>
          </td>
        `;

        const revokeButton = row.querySelector(
          'button[data-action="revoke-landlord"]'
        );
        if (revokeButton instanceof HTMLButtonElement) {
          revokeButton.addEventListener("click", () => {
            const shouldProceed = window.confirm(
              `Remove landlord role for ${request.user.fullName} (${request.user.phone})?\nThis revokes active sessions and clears building ownership links.`
            );
            if (!shouldProceed) {
              return;
            }

            const noteRaw = window.prompt(
              "Optional admin note for this landlord removal. Leave blank to skip."
            );
            const note =
              noteRaw == null || String(noteRaw).trim().length === 0
                ? undefined
                : String(noteRaw).trim();

            clearError();
            revokeButton.disabled = true;

            void (async () => {
              try {
                const payload = await revokeLandlordRole(request.user.id, note);
                const revoked = payload.data ?? {};
                setStatus(
                  `Removed landlord role from ${request.user.fullName}. Cleared ${Number(revoked.clearedBuildingsCount ?? 0)} building owner link(s).`
                );
                await Promise.all([
                  loadOverview(),
                  loadLandlordAccessRequests(),
                  loadBuildings()
                ]);
              } catch (error) {
                handleAdminError(error, "Failed to remove landlord role.");
              } finally {
                revokeButton.disabled = false;
              }
            })();
          });
        }
      } else {
        row.innerHTML = `
          <td>${formatDateTime(request.requestedAt)}</td>
          <td>${escapeHtml(request.user.fullName)}</td>
          <td>${escapeHtml(request.user.email)}</td>
          <td>${escapeHtml(request.user.phone)}</td>
          <td><strong>${escapeHtml(request.status)}</strong></td>
          <td>${escapeHtml(reason)}</td>
          <td>${escapeHtml(reviewedAt)}<br /><small>${escapeHtml(reviewedBy)}</small></td>
        `;
      }
    }

    landlordAccessBodyEl.append(row);
  });
}

async function submitPasswordRecoveryDecision(
  requestId,
  action,
  temporaryPassword,
  note
) {
  await requestJson(
    `/api/admin/auth/resident/password-recovery-requests/${encodeURIComponent(requestId)}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action,
        temporaryPassword: temporaryPassword || undefined,
        note: note || undefined
      })
    }
  );
}

async function submitAccountPasswordRecoveryDecision(
  requestId,
  action,
  temporaryPassword,
  note
) {
  await requestJson(
    `/api/admin/auth/account/password-recovery-requests/${encodeURIComponent(requestId)}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action,
        temporaryPassword: temporaryPassword || undefined,
        note: note || undefined
      })
    }
  );
}

function renderPasswordRecoveryRequests(requests) {
  if (!(passwordRecoveryBodyEl instanceof HTMLElement)) {
    return;
  }

  passwordRecoveryBodyEl.replaceChildren();

  if (!Array.isArray(requests) || requests.length === 0) {
    appendEmptyRow(passwordRecoveryBodyEl, 7, "No password recovery requests found.");
    return;
  }

  requests.forEach((request) => {
    const row = document.createElement("tr");
    const residentNote = request.note ?? "-";
    const reviewedBy = request.reviewedByRole ?? "-";
    const reviewedAt = request.reviewedAt ? formatDateTime(request.reviewedAt) : "-";

    if (request.status === "pending") {
      row.innerHTML = `
        <td>${formatDateTime(request.requestedAt)}</td>
        <td>${escapeHtml(getBuildingDisplayNameById(request.buildingId))}</td>
        <td>${escapeHtml(request.houseNumber)}</td>
        <td>${escapeHtml(request.phoneMask ?? request.phoneNumber)}</td>
        <td><strong>${escapeHtml(request.status)}</strong></td>
        <td>${escapeHtml(residentNote)}</td>
        <td class="admin-review-cell">
          <div class="admin-review-layout admin-review-layout-reset">
            <input data-action="temporary-password" type="password" minlength="8" maxlength="128" placeholder="Temp password" />
            <input data-action="note" type="text" maxlength="500" placeholder="Admin note (optional)" />
            <div class="decision-actions">
              <button data-action="approve" type="button">Issue Reset</button>
              <button data-action="reject" type="button">Reject</button>
            </div>
          </div>
        </td>
      `;

      const tempPasswordInput = row.querySelector(
        'input[data-action="temporary-password"]'
      );
      const noteInput = row.querySelector('input[data-action="note"]');
      const approveButton = row.querySelector('button[data-action="approve"]');
      const rejectButton = row.querySelector('button[data-action="reject"]');

      const handleDecision = (action) => {
        clearError();
        approveButton.disabled = true;
        rejectButton.disabled = true;

        void (async () => {
          try {
            const temporaryPassword =
              tempPasswordInput instanceof HTMLInputElement
                ? tempPasswordInput.value.trim()
                : "";
            if (action === "approve" && temporaryPassword.length < 8) {
              throw new Error("Temporary password must be at least 8 characters.");
            }

            await submitPasswordRecoveryDecision(
              request.id,
              action,
              temporaryPassword,
              noteInput instanceof HTMLInputElement ? noteInput.value.trim() : ""
            );

            setStatus(
              `Resident recovery ${request.id.slice(0, 8)} ${
                action === "approve" ? "approved" : "rejected"
              }.`
            );
            await Promise.all([loadOverview(), loadPasswordRecoveryRequests()]);
          } catch (error) {
            handleAdminError(error, "Failed to review password recovery request.");
          } finally {
            approveButton.disabled = false;
            rejectButton.disabled = false;
          }
        })();
      };

      approveButton.addEventListener("click", () => {
        handleDecision("approve");
      });

      rejectButton.addEventListener("click", () => {
        handleDecision("reject");
      });
    } else {
      row.innerHTML = `
        <td>${formatDateTime(request.requestedAt)}</td>
        <td>${escapeHtml(getBuildingDisplayNameById(request.buildingId))}</td>
        <td>${escapeHtml(request.houseNumber)}</td>
        <td>${escapeHtml(request.phoneMask ?? request.phoneNumber)}</td>
        <td><strong>${escapeHtml(request.status)}</strong></td>
        <td>${escapeHtml(residentNote)}</td>
        <td>${escapeHtml(reviewedAt)}<br /><small>${escapeHtml(reviewedBy)}</small></td>
      `;
    }

    passwordRecoveryBodyEl.append(row);
  });

  initPasswordVisibilityToggles(passwordRecoveryBodyEl);
}

function renderAccountPasswordRecoveryRequests(requests) {
  if (!(accountPasswordRecoveryBodyEl instanceof HTMLElement)) {
    return;
  }

  accountPasswordRecoveryBodyEl.replaceChildren();

  if (!Array.isArray(requests) || requests.length === 0) {
    appendEmptyRow(
      accountPasswordRecoveryBodyEl,
      7,
      "No landlord account recovery requests found."
    );
    return;
  }

  requests.forEach((request) => {
    const row = document.createElement("tr");
    const accountNote = request.note ?? "-";
    const reviewedBy = request.reviewedByRole ?? "-";
    const reviewedAt = request.reviewedAt ? formatDateTime(request.reviewedAt) : "-";
    const identifier =
      request.identifierType === "phone"
        ? request.phoneMask ?? request.phone
        : request.email;

    if (request.status === "pending") {
      row.innerHTML = `
        <td>${formatDateTime(request.requestedAt)}</td>
        <td>${escapeHtml(request.fullName)}</td>
        <td>${escapeHtml(request.role)}</td>
        <td>${escapeHtml(identifier)}</td>
        <td><strong>${escapeHtml(request.status)}</strong></td>
        <td>${escapeHtml(accountNote)}</td>
        <td class="admin-review-cell">
          <div class="admin-review-layout admin-review-layout-reset">
            <input data-action="temporary-password" type="password" minlength="8" maxlength="128" placeholder="Temp password" />
            <input data-action="note" type="text" maxlength="500" placeholder="Admin note (optional)" />
            <div class="decision-actions">
              <button data-action="approve" type="button">Issue Reset</button>
              <button data-action="reject" type="button">Reject</button>
            </div>
          </div>
        </td>
      `;

      const tempPasswordInput = row.querySelector(
        'input[data-action="temporary-password"]'
      );
      const noteInput = row.querySelector('input[data-action="note"]');
      const approveButton = row.querySelector('button[data-action="approve"]');
      const rejectButton = row.querySelector('button[data-action="reject"]');

      const handleDecision = (action) => {
        clearError();
        approveButton.disabled = true;
        rejectButton.disabled = true;

        void (async () => {
          try {
            const temporaryPassword =
              tempPasswordInput instanceof HTMLInputElement
                ? tempPasswordInput.value.trim()
                : "";
            if (action === "approve" && temporaryPassword.length < 8) {
              throw new Error("Temporary password must be at least 8 characters.");
            }

            await submitAccountPasswordRecoveryDecision(
              request.id,
              action,
              temporaryPassword,
              noteInput instanceof HTMLInputElement ? noteInput.value.trim() : ""
            );

            setStatus(
              `Account recovery ${request.id.slice(0, 8)} ${
                action === "approve" ? "approved" : "rejected"
              }.`
            );
            await Promise.all([loadOverview(), loadAccountPasswordRecoveryRequests()]);
          } catch (error) {
            handleAdminError(error, "Failed to review account recovery request.");
          } finally {
            approveButton.disabled = false;
            rejectButton.disabled = false;
          }
        })();
      };

      approveButton.addEventListener("click", () => {
        handleDecision("approve");
      });

      rejectButton.addEventListener("click", () => {
        handleDecision("reject");
      });
    } else {
      row.innerHTML = `
        <td>${formatDateTime(request.requestedAt)}</td>
        <td>${escapeHtml(request.fullName)}</td>
        <td>${escapeHtml(request.role)}</td>
        <td>${escapeHtml(identifier)}</td>
        <td><strong>${escapeHtml(request.status)}</strong></td>
        <td>${escapeHtml(accountNote)}</td>
        <td>${escapeHtml(reviewedAt)}<br /><small>${escapeHtml(reviewedBy)}</small></td>
      `;
    }

    accountPasswordRecoveryBodyEl.append(row);
  });

  initPasswordVisibilityToggles(accountPasswordRecoveryBodyEl);
}

function deriveLandlordPortfolios(buildings) {
  const portfolios = new Map();

  buildings.forEach((building) => {
    if (!building.landlordUserId) {
      return;
    }

    const key = building.landlordUserId;
    const current = portfolios.get(key) ?? {
      landlordUserId: key,
      fullName: building.landlordOwnerName ?? "Unknown landlord",
      phone: building.landlordOwnerPhone ?? "-",
      role: building.landlordOwnerRole ?? "landlord",
      buildingCount: 0,
      trackedUnits: 0,
      latestUpdatedAt: "",
      buildings: []
    };

    current.buildingCount += 1;
    current.trackedUnits +=
      typeof building.units === "number" && Number.isFinite(building.units)
        ? building.units
        : 0;
    current.buildings.push({
      id: building.id,
      name: building.name
    });
    if (!current.latestUpdatedAt || building.updatedAt > current.latestUpdatedAt) {
      current.latestUpdatedAt = building.updatedAt;
    }

    portfolios.set(key, current);
  });

  return [...portfolios.values()].sort((left, right) => {
    if (right.buildingCount !== left.buildingCount) {
      return right.buildingCount - left.buildingCount;
    }

    return left.fullName.localeCompare(right.fullName);
  });
}

function renderLandlordPortfolios(buildings) {
  if (!(landlordPortfoliosBodyEl instanceof HTMLElement)) {
    return;
  }

  landlordPortfoliosBodyEl.replaceChildren();
  const portfolios = deriveLandlordPortfolios(buildings);

  if (portfolios.length === 0) {
    appendEmptyRow(
      landlordPortfoliosBodyEl,
      6,
      "No landlord portfolios yet. Assign buildings to landlord accounts first."
    );
    return;
  }

  portfolios.forEach((portfolio) => {
    const row = document.createElement("tr");
    const portfolioNames = portfolio.buildings
      .map((item) => `${item.name} (${item.id})`)
      .join(", ");

    row.innerHTML = `
      <td>
        <strong>${escapeHtml(portfolio.fullName)}</strong><br />
        <small>${escapeHtml(portfolio.phone)}</small>
      </td>
      <td>${escapeHtml(portfolio.role)}</td>
      <td>${portfolio.buildingCount}</td>
      <td>${portfolio.trackedUnits.toLocaleString("en-US")}</td>
      <td>${escapeHtml(formatDateTime(portfolio.latestUpdatedAt))}</td>
      <td><small>${escapeHtml(portfolioNames)}</small></td>
    `;

    landlordPortfoliosBodyEl.append(row);
  });
}

function renderOwnershipGaps(buildings) {
  if (!(ownershipGapBodyEl instanceof HTMLElement)) {
    return;
  }

  ownershipGapBodyEl.replaceChildren();
  const gaps = buildings
    .filter((building) => !building.landlordUserId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  if (gaps.length === 0) {
    appendEmptyRow(
      ownershipGapBodyEl,
      6,
      "Every registered building currently has an assigned landlord owner."
    );
    return;
  }

  gaps.forEach((building) => {
      const row = document.createElement("tr");
      row.innerHTML = `
      <td>
        <strong>${escapeHtml(getBuildingDisplayName(building))}</strong>
      </td>
      <td>${escapeHtml(building.county)}</td>
      <td>${escapeHtml(building.units ?? "-")}</td>
      <td>${escapeHtml(building.cctvStatus)}</td>
      <td>${escapeHtml(formatDateTime(building.updatedAt))}</td>
      <td><small>Assign a landlord from Building Registry below.</small></td>
    `;
    ownershipGapBodyEl.append(row);
  });
}

function renderRegistrySummary() {
  if (!(registrySummaryEl instanceof HTMLElement)) {
    return;
  }

  const buildings = state.buildings;
  const assigned = buildings.filter((item) => item.landlordUserId).length;
  const unassigned = buildings.length - assigned;
  const trackedUnits = buildings.reduce(
    (sum, item) =>
      sum + (typeof item.units === "number" && Number.isFinite(item.units) ? item.units : 0),
    0
  );

  registrySummaryEl.textContent =
    `${assigned} building(s) are assigned, ${unassigned} are still waiting for an owner, ` +
    `and ${trackedUnits.toLocaleString("en-US")} unit(s) are registered in the platform.`;
}

function getSelectedAdminBillingBuildingId() {
  return adminBillingBuildingSelectEl instanceof HTMLSelectElement
    ? String(adminBillingBuildingSelectEl.value || state.selectedAdminBillingBuildingId || "").trim()
    : String(state.selectedAdminBillingBuildingId || "").trim();
}

async function deleteBuildingFromAdmin(buildingId, buildingName) {
  const shouldProceed = window.confirm(
    `Delete ${buildingName}? This permanently removes the building and linked unit records.`
  );
  if (!shouldProceed) {
    return false;
  }

  await requestJson(`/api/admin/buildings/${encodeURIComponent(buildingId)}`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      confirmBuildingId: buildingId,
      confirmationText: "DELETE"
    })
  });

  if (state.selectedAdminBillingBuildingId === buildingId) {
    state.selectedAdminBillingBuildingId = "";
  }

  setStatus(`Deleted building ${buildingName}.`);
  await Promise.all([loadOverview(), loadBuildings()]);
  return true;
}

function renderAdminUtilityPayments(rows) {
  if (!(adminUtilityPaymentsBodyEl instanceof HTMLElement)) {
    return;
  }

  adminUtilityPaymentsBodyEl.replaceChildren();

  if (!Array.isArray(rows) || rows.length === 0) {
    appendEmptyRow(
      adminUtilityPaymentsBodyEl,
      8,
      "No utility payments found for the selected building."
    );
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(item.utilityType)}</td>
      <td>${escapeHtml(item.houseNumber)}</td>
      <td>${escapeHtml(formatBillingMonth(item.billingMonth))}</td>
      <td>${escapeHtml(formatBillingMonth(item.paidAt))}</td>
      <td>${escapeHtml(item.provider)}</td>
      <td>${escapeHtml(item.providerReference ?? "-")}</td>
      <td>${escapeHtml(formatCurrency(item.amountKsh))}</td>
      <td>${escapeHtml(formatDateTime(item.paidAt))}</td>
    `;
    adminUtilityPaymentsBodyEl.append(row);
  });
}

function renderAdminUtilityRegistry(rows) {
  if (!(adminUtilityRegistryBodyEl instanceof HTMLElement)) {
    return;
  }

  adminUtilityRegistryBodyEl.replaceChildren();

  if (!Array.isArray(rows) || rows.length === 0) {
    appendEmptyRow(
      adminUtilityRegistryBodyEl,
      6,
      "No rooms found for the selected building."
    );
    return;
  }

  rows
    .slice()
    .sort((left, right) => normalizeHouse(left.houseNumber).localeCompare(normalizeHouse(right.houseNumber), undefined, {
      numeric: true,
      sensitivity: "base"
    }))
    .forEach((item) => {
      const row = document.createElement("tr");
      const residentLabel = item.residentName
        ? `${escapeHtml(item.residentName)}<br /><small>${escapeHtml(item.residentPhone ?? "-")}</small>`
        : '<small>Vacant</small>';
      row.innerHTML = `
        <td>${escapeHtml(item.houseNumber)}</td>
        <td>${residentLabel}</td>
        <td><input data-field="waterFixedChargeKsh" type="number" min="0" step="1" value="${escapeHtml(numberToInputString(item.waterFixedChargeKsh))}" /></td>
        <td><input data-field="electricityFixedChargeKsh" type="number" min="0" step="1" value="${escapeHtml(numberToInputString(item.electricityFixedChargeKsh))}" /></td>
        <td><input data-field="combinedUtilityChargeKsh" type="number" min="0" step="1" value="${escapeHtml(numberToInputString(item.combinedUtilityChargeKsh))}" /></td>
        <td>
          <button type="button" data-action="save-room-billing" data-house-number="${escapeHtml(item.houseNumber)}">
            Save Room
          </button>
        </td>
      `;
      adminUtilityRegistryBodyEl.append(row);
    });
}

function renderAdminBillingSummary() {
  if (!(adminBillingSummaryEl instanceof HTMLElement)) {
    return;
  }

  const buildingId = getSelectedAdminBillingBuildingId();
  if (!buildingId) {
    adminBillingSummaryEl.textContent =
      "Select a building to manage room-level utility charging, post bills, and record payments from admin.";
    return;
  }

  const building = state.buildings.find((item) => item.id === buildingId);
  const roomCount = Array.isArray(state.adminBillingRegistryRows)
    ? state.adminBillingRegistryRows.length
    : 0;
  const paymentCount = Array.isArray(state.adminUtilityPayments)
    ? state.adminUtilityPayments.length
    : 0;
  adminBillingSummaryEl.textContent =
    `${getBuildingDisplayName(building)} has ${roomCount} room billing row(s) in view and ${paymentCount} recent utility payment(s) loaded.`;
}

function syncAdminBillingBuildingOptions() {
  if (!(adminBillingBuildingSelectEl instanceof HTMLSelectElement)) {
    return;
  }

  const currentValue = getSelectedAdminBillingBuildingId();
  const sortedBuildings = [...state.buildings].sort((left, right) =>
    `${left.name}:${left.id}`.localeCompare(`${right.name}:${right.id}`)
  );

  adminBillingBuildingSelectEl.replaceChildren();

  if (sortedBuildings.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No buildings";
    adminBillingBuildingSelectEl.append(option);
    state.selectedAdminBillingBuildingId = "";
    renderAdminUtilityRegistry([]);
    renderAdminUtilityPayments([]);
    renderAdminBillingSummary();
    return;
  }

  sortedBuildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = getBuildingDisplayName(building);
    adminBillingBuildingSelectEl.append(option);
  });

  state.selectedAdminBillingBuildingId =
    sortedBuildings.some((item) => item.id === currentValue)
      ? currentValue
      : sortedBuildings[0].id;
  adminBillingBuildingSelectEl.value = state.selectedAdminBillingBuildingId;
  renderAdminBillingSummary();
}

async function loadAdminUtilityRegistry() {
  const buildingId = getSelectedAdminBillingBuildingId();
  if (!buildingId) {
    state.adminBillingRegistryRows = [];
    renderAdminUtilityRegistry([]);
    renderAdminBillingSummary();
    return;
  }

  const payload = await requestJson(
    `/api/admin/buildings/${encodeURIComponent(buildingId)}/utility-registry`
  );
  state.adminBillingRegistryRows = payload.data ?? [];
  renderAdminUtilityRegistry(state.adminBillingRegistryRows);
  renderAdminBillingSummary();
}

async function loadAdminUtilityPayments() {
  const buildingId = getSelectedAdminBillingBuildingId();
  if (!buildingId) {
    state.adminUtilityPayments = [];
    renderAdminUtilityPayments([]);
    renderAdminBillingSummary();
    return;
  }

  const payload = await requestJson(
    `/api/admin/utilities/payments?buildingId=${encodeURIComponent(buildingId)}&limit=120`
  );
  state.adminUtilityPayments = payload.data ?? [];
  renderAdminUtilityPayments(state.adminUtilityPayments);
  renderAdminBillingSummary();
}

async function loadAdminMonthlyCombinedCharge() {
  const buildingId = getSelectedAdminBillingBuildingId();
  const billingMonth = toBillingMonth(adminMonthlyCombinedChargeMonthEl?.value) || currentBillingMonth();

  if (adminMonthlyCombinedChargeMonthEl instanceof HTMLInputElement) {
    adminMonthlyCombinedChargeMonthEl.value = billingMonth;
  }

  if (!buildingId) {
    if (adminMonthlyCombinedChargeAmountEl instanceof HTMLInputElement) {
      adminMonthlyCombinedChargeAmountEl.value = "";
    }
    return;
  }

  const payload = await requestJson(
    `/api/admin/buildings/${encodeURIComponent(buildingId)}/monthly-combined-utility-charge?billingMonth=${encodeURIComponent(
      billingMonth
    )}`
  );
  if (adminMonthlyCombinedChargeAmountEl instanceof HTMLInputElement) {
    adminMonthlyCombinedChargeAmountEl.value =
      payload.data?.amountKsh != null ? numberToInputString(payload.data.amountKsh) : "";
  }
}

async function loadAdminBillingConsole() {
  const buildingId = getSelectedAdminBillingBuildingId();
  if (!buildingId) {
    renderAdminUtilityRegistry([]);
    renderAdminUtilityPayments([]);
    renderAdminBillingSummary();
    return;
  }

  await Promise.all([
    loadAdminUtilityRegistry(),
    loadAdminUtilityPayments(),
    loadAdminMonthlyCombinedCharge()
  ]);
}

function renderBuildings(rows) {
  if (!(buildingsBodyEl instanceof HTMLElement)) {
    return;
  }

  buildingsBodyEl.replaceChildren();

  if (!Array.isArray(rows) || rows.length === 0) {
    appendEmptyRow(buildingsBodyEl, 8, "No buildings configured.");
    return;
  }

  rows
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .forEach((building) => {
      const ownerLabel = building.landlordOwnerName
        ? `${escapeHtml(building.landlordOwnerName)}<br /><small>${escapeHtml(
            building.landlordOwnerPhone ?? "-"
          )}</small>`
        : '<small class="registry-status registry-status-warn">Unassigned</small>';

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${escapeHtml(getBuildingDisplayName(building))}</strong></td>
        <td>${escapeHtml(building.county)}</td>
        <td>${escapeHtml(building.address)}</td>
        <td>${escapeHtml(building.units ?? "-")}</td>
        <td>${ownerLabel}</td>
        <td>${escapeHtml(building.cctvStatus)}</td>
        <td>${escapeHtml(formatDateTime(building.updatedAt))}</td>
        <td>
          <button
            type="button"
            data-action="assign-building-landlord"
            data-building-id="${escapeHtml(building.id)}"
            data-building-name="${escapeHtml(building.name)}"
            data-owner-phone="${escapeHtml(building.landlordOwnerPhone ?? "")}"
          >
            ${building.landlordUserId ? "Reassign Landlord" : "Assign Landlord"}
          </button>
          <button
            type="button"
            class="btn-danger"
            data-action="delete-building"
            data-building-id="${escapeHtml(building.id)}"
            data-building-name="${escapeHtml(building.name)}"
          >
            Delete
          </button>
        </td>
      `;
      buildingsBodyEl.append(row);
    });
}

function createBuildingPayload() {
  const unitsRaw =
    buildingUnitsEl instanceof HTMLInputElement
      ? String(buildingUnitsEl.value ?? "").trim()
      : "";
  const units = unitsRaw === "" ? undefined : Number(unitsRaw);

  if (
    unitsRaw !== "" &&
    (!Number.isFinite(units) || !Number.isInteger(units) || units <= 0)
  ) {
    throw new Error("Units must be a positive whole number.");
  }

  return {
    name:
      buildingNameEl instanceof HTMLInputElement
        ? String(buildingNameEl.value ?? "").trim()
        : "",
    county:
      buildingCountyEl instanceof HTMLInputElement
        ? String(buildingCountyEl.value ?? "").trim()
        : "",
    address:
      buildingAddressEl instanceof HTMLInputElement
        ? String(buildingAddressEl.value ?? "").trim()
        : "",
    units,
    cctvStatus:
      buildingCctvStatusEl instanceof HTMLSelectElement
        ? String(buildingCctvStatusEl.value ?? "none")
        : "none",
    media: {
      imageUrls: [],
      videoUrls: []
    }
  };
}

async function loadOverview() {
  const payload = await requestJson("/api/admin/overview");
  renderOverview(payload.data ?? {});
}

async function loadLandlordAccessRequests() {
  const payload = await requestJson("/api/admin/landlord-access-requests?limit=500");
  renderLandlordAccessRequests(payload.data ?? []);
}

async function loadPasswordRecoveryRequests() {
  const payload = await requestJson(
    "/api/admin/auth/resident/password-recovery-requests?limit=500"
  );
  renderPasswordRecoveryRequests(payload.data ?? []);
}

async function loadAccountPasswordRecoveryRequests() {
  const payload = await requestJson(
    "/api/admin/auth/account/password-recovery-requests?limit=500"
  );
  renderAccountPasswordRecoveryRequests(payload.data ?? []);
}

async function loadAdminAccess() {
  if (state.role !== "root_admin") {
    state.adminAccess = null;
    renderAdminAccess();
    return;
  }

  const payload = await requestJson("/api/admin/auth/access");
  state.adminAccess = payload.data ?? null;
  renderAdminAccess();
}

async function loadBuildings() {
  const payload = await requestJson("/api/admin/buildings");
  state.buildings = payload.data ?? [];
  renderBuildings(state.buildings);
  renderLandlordPortfolios(state.buildings);
  renderOwnershipGaps(state.buildings);
  renderRegistrySummary();
  syncAdminBillingBuildingOptions();
  await loadAdminBillingConsole();
}

async function loadAdminData() {
  clearError();

  try {
    await Promise.all([
      loadOverview(),
      loadBuildings(),
      loadLandlordAccessRequests(),
      loadPasswordRecoveryRequests(),
      loadAccountPasswordRecoveryRequests(),
      loadAdminAccess()
    ]);
    setStatus(`Signed in as ${state.role}. Platform data refreshed.`);
  } catch (error) {
    handleAdminError(error, "Unable to load admin data.");
    setStatus("Admin data load failed.");
  }
}

async function signOut() {
  try {
    await requestJson("/api/auth/admin/logout", {
      method: "POST"
    });
  } catch (_error) {
    // Continue logout redirect.
  }

  redirectToLogin();
}

if (buildingCreateFormEl instanceof HTMLFormElement) {
  buildingCreateFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError();

    let payload;
    try {
      payload = createBuildingPayload();
    } catch (error) {
      handleAdminError(error, "Unable to prepare building payload.");
      return;
    }

    if (!payload.name || !payload.county || !payload.address) {
      showError("Building name, county, and address are required.");
      return;
    }

    const submitButton = buildingCreateFormEl.querySelector("button[type='submit']");
    if (!(submitButton instanceof HTMLButtonElement)) {
      return;
    }

    submitButton.disabled = true;

    void (async () => {
      try {
        await requestJson("/api/buildings", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        buildingCreateFormEl.reset();
        if (buildingCctvStatusEl instanceof HTMLSelectElement) {
          buildingCctvStatusEl.value = "none";
        }

        setStatus(`Building ${payload.name} created successfully.`);
        await Promise.all([loadOverview(), loadBuildings()]);
      } catch (error) {
        handleAdminError(error, "Failed to create building.");
      } finally {
        submitButton.disabled = false;
      }
    })();
  });
}

if (buildingsBodyEl instanceof HTMLElement) {
  buildingsBodyEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const action = String(target.dataset.action || "");
    const buildingId = String(target.dataset.buildingId || "").trim();
    const buildingName = String(
      target.dataset.buildingName || getBuildingDisplayNameById(buildingId)
    ).trim();
    if (!buildingId) {
      return;
    }

    if (action === "assign-building-landlord") {
      const currentOwnerPhone = String(target.dataset.ownerPhone || "").trim();
      const identifierRaw = window.prompt(
        `Assign landlord for ${buildingName}.\nEnter landlord phone or email:`,
        currentOwnerPhone
      );
      if (identifierRaw == null) {
        return;
      }

      const identifier = String(identifierRaw).trim();
      if (!identifier) {
        showError("Provide landlord phone or email.");
        return;
      }

      target.disabled = true;
      clearError();

      void (async () => {
        try {
          const payload = await requestJson(
            `/api/admin/buildings/${encodeURIComponent(buildingId)}/landlord`,
            {
              method: "PATCH",
              headers: {
                "content-type": "application/json"
              },
              body: JSON.stringify({
                identifier
              })
            }
          );

          const landlord = payload.data?.landlord;
          setStatus(
            `Assigned ${landlord?.fullName ?? "landlord"} to ${buildingName}.`
          );
          await Promise.all([
            loadOverview(),
            loadBuildings(),
            loadLandlordAccessRequests()
          ]);
        } catch (error) {
          handleAdminError(error, "Failed to assign landlord to building.");
        } finally {
          target.disabled = false;
        }
      })();
      return;
    }

    if (action !== "delete-building") {
      return;
    }

    target.disabled = true;
    clearError();

    void (async () => {
      try {
        await deleteBuildingFromAdmin(buildingId, buildingName);
      } catch (error) {
        handleAdminError(error, "Failed to delete building.");
      } finally {
        target.disabled = false;
      }
    })();
  });
}

if (adminUtilityRegistryBodyEl instanceof HTMLElement) {
  adminUtilityRegistryBodyEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    if (String(target.dataset.action ?? "") !== "save-room-billing") {
      return;
    }

    const buildingId = getSelectedAdminBillingBuildingId();
    const houseNumber = normalizeHouse(target.dataset.houseNumber);
    const row = target.closest("tr");
    if (!buildingId || !houseNumber || !(row instanceof HTMLTableRowElement)) {
      showError("Select a building and room before saving room billing.");
      return;
    }

    const waterInput = row.querySelector('input[data-field="waterFixedChargeKsh"]');
    const electricityInput = row.querySelector(
      'input[data-field="electricityFixedChargeKsh"]'
    );
    const combinedInput = row.querySelector(
      'input[data-field="combinedUtilityChargeKsh"]'
    );

    clearError();
    target.disabled = true;

    void (async () => {
      try {
        await requestJson(
          `/api/admin/buildings/${encodeURIComponent(buildingId)}/utility-registry`,
          {
            method: "PUT",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              rows: [
                {
                  houseNumber,
                  waterFixedChargeKsh:
                    waterInput instanceof HTMLInputElement
                      ? toOptionalNumber(waterInput.value)
                      : undefined,
                  electricityFixedChargeKsh:
                    electricityInput instanceof HTMLInputElement
                      ? toOptionalNumber(electricityInput.value)
                      : undefined,
                  combinedUtilityChargeKsh:
                    combinedInput instanceof HTMLInputElement
                      ? toOptionalNumber(combinedInput.value)
                      : undefined
                }
              ],
              rateDefaults: {}
            })
          }
        );

        setStatus(`Room billing defaults saved for house ${houseNumber} in ${buildingId}.`);
        await loadAdminUtilityRegistry();
      } catch (error) {
        handleAdminError(error, "Failed to save room billing defaults.");
      } finally {
        target.disabled = false;
      }
    })();
  });
}

if (adminMonthlyCombinedChargeFormEl instanceof HTMLFormElement) {
  adminMonthlyCombinedChargeFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError();

    const buildingId = getSelectedAdminBillingBuildingId();
    const billingMonth = toBillingMonth(adminMonthlyCombinedChargeMonthEl?.value);
    const amountKsh = Number(adminMonthlyCombinedChargeAmountEl?.value);

    if (!buildingId || !billingMonth || !Number.isFinite(amountKsh) || amountKsh <= 0) {
      showError("Combined utility charge requires building, month, and amount.");
      return;
    }

    const submitButton = adminMonthlyCombinedChargeFormEl.querySelector(
      'button[type="submit"]'
    );
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    void (async () => {
      try {
        await requestJson(
          `/api/admin/buildings/${encodeURIComponent(buildingId)}/monthly-combined-utility-charge`,
          {
            method: "PUT",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              billingMonth,
              amountKsh: Math.round(amountKsh),
              acknowledgeImpact: true
            })
          }
        );

        setStatus(
          `Monthly combined utility charge saved for ${buildingId} (${formatBillingMonth(
            billingMonth
          )}).`
        );
        await loadAdminMonthlyCombinedCharge();
      } catch (error) {
        handleAdminError(error, "Failed to save monthly combined utility charge.");
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
        }
      }
    })();
  });
}

if (adminUtilityBillFormEl instanceof HTMLFormElement) {
  adminUtilityBillFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError();

    const buildingId = getSelectedAdminBillingBuildingId();
    const utilityType = String(adminUtilityBillTypeEl?.value ?? "water");
    const houseNumber = normalizeHouse(adminUtilityBillHouseEl?.value);
    const billingMonth = toBillingMonth(adminUtilityBillMonthEl?.value);
    const dueDate = toIsoFromDateTimeLocal(adminUtilityBillDueDateEl?.value);
    const payload = {
      buildingId,
      billingMonth,
      dueDate,
      fixedChargeKsh: toOptionalNumber(adminUtilityBillFixedChargeEl?.value),
      previousReading: toOptionalNumber(adminUtilityBillPreviousReadingEl?.value),
      currentReading: toOptionalNumber(adminUtilityBillCurrentReadingEl?.value),
      ratePerUnitKsh: toOptionalNumber(adminUtilityBillRateEl?.value),
      note: String(adminUtilityBillNoteEl?.value ?? "").trim() || undefined
    };

    if (!buildingId || !houseNumber || !billingMonth || !dueDate) {
      showError("Utility bill requires building, house, month, and due date.");
      return;
    }

    const submitButton = adminUtilityBillFormEl.querySelector('button[type="submit"]');
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    void (async () => {
      try {
        await requestJson(
          `/api/admin/utilities/${encodeURIComponent(utilityType)}/${encodeURIComponent(houseNumber)}/bills`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify(payload)
          }
        );

        setStatus(
          `${utilityType} bill posted for house ${houseNumber} (${formatBillingMonth(
            billingMonth
          )}) in ${buildingId}.`
        );
        if (adminUtilityBillNoteEl instanceof HTMLInputElement) {
          adminUtilityBillNoteEl.value = "";
        }
        await Promise.all([loadAdminUtilityRegistry(), loadAdminUtilityPayments()]);
      } catch (error) {
        handleAdminError(error, "Failed to post utility bill.");
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
        }
      }
    })();
  });
}

if (adminUtilityPaymentFormEl instanceof HTMLFormElement) {
  adminUtilityPaymentFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError();

    const buildingId = getSelectedAdminBillingBuildingId();
    const utilityType = String(adminUtilityPaymentTypeEl?.value ?? "water");
    const houseNumber = normalizeHouse(adminUtilityPaymentHouseEl?.value);
    const payload = {
      buildingId,
      billingMonth: toBillingMonth(adminUtilityPaymentMonthEl?.value) || undefined,
      amountKsh: Number(adminUtilityPaymentAmountEl?.value),
      provider: String(adminUtilityPaymentProviderEl?.value ?? "cash"),
      providerReference:
        String(adminUtilityPaymentReferenceEl?.value ?? "").trim() || undefined,
      paidAt: toIsoFromDateTimeLocal(adminUtilityPaymentPaidAtEl?.value),
      note: String(adminUtilityPaymentNoteEl?.value ?? "").trim() || undefined
    };

    if (!buildingId || !houseNumber || !Number.isFinite(payload.amountKsh) || payload.amountKsh <= 0) {
      showError("Utility payment requires building, house, and amount.");
      return;
    }

    const submitButton = adminUtilityPaymentFormEl.querySelector(
      'button[type="submit"]'
    );
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    void (async () => {
      try {
        const response = await requestJson(
          `/api/admin/utilities/${encodeURIComponent(utilityType)}/${encodeURIComponent(houseNumber)}/payments`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify(payload)
          }
        );
        const coverage = formatUtilityPaymentCoverage(response?.data, payload.billingMonth);

        setStatus(
          `${utilityType} payment recorded for house ${houseNumber}${
            coverage ? ` covering ${coverage}` : ""
          }.`
        );
        if (adminUtilityPaymentReferenceEl instanceof HTMLInputElement) {
          adminUtilityPaymentReferenceEl.value = "";
        }
        if (adminUtilityPaymentNoteEl instanceof HTMLInputElement) {
          adminUtilityPaymentNoteEl.value = "";
        }
        await Promise.all([loadAdminUtilityRegistry(), loadAdminUtilityPayments()]);
      } catch (error) {
        handleAdminError(error, "Failed to record utility payment.");
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
        }
      }
    })();
  });
}

if (adminAccessFormEl instanceof HTMLFormElement) {
  adminAccessFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError();

    if (state.role !== "root_admin") {
      showError("Root admin role required.");
      return;
    }

    const username = String(adminAccessUsernameEl?.value ?? "").trim();
    const password = String(adminAccessPasswordEl?.value ?? "").trim();
    const confirmPassword = String(adminAccessConfirmPasswordEl?.value ?? "").trim();

    if (!username || !password || !confirmPassword) {
      showError("Provide the admin username, new password, and confirmation.");
      return;
    }

    const submitButton = adminAccessFormEl.querySelector('button[type="submit"]');
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    void (async () => {
      try {
        const payload = await requestJson("/api/admin/auth/access", {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            username,
            password,
            confirmPassword
          })
        });

        state.adminAccess = payload.data ?? null;
        if (adminAccessPasswordEl instanceof HTMLInputElement) {
          adminAccessPasswordEl.value = "";
        }
        if (adminAccessConfirmPasswordEl instanceof HTMLInputElement) {
          adminAccessConfirmPasswordEl.value = "";
        }
        renderAdminAccess();
        setStatus(`Standard admin sign-in updated to username "${username}".`);
      } catch (error) {
        handleAdminError(error, "Failed to update admin sign-in.");
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
        }
      }
    })();
  });
}

adminBillingBuildingSelectEl?.addEventListener("change", () => {
  state.selectedAdminBillingBuildingId = getSelectedAdminBillingBuildingId();
  void loadAdminBillingConsole().catch((error) => {
    handleAdminError(error, "Unable to refresh admin billing console.");
  });
});

refreshAdminBillingBtnEl?.addEventListener("click", () => {
  state.selectedAdminBillingBuildingId = getSelectedAdminBillingBuildingId();
  void loadAdminBillingConsole().catch((error) => {
    handleAdminError(error, "Unable to refresh admin billing console.");
  });
});

deleteAdminBillingBuildingBtnEl?.addEventListener("click", () => {
  const buildingId = getSelectedAdminBillingBuildingId();
  if (!buildingId) {
    showError("Select a building first.");
    return;
  }

  const buildingName =
    state.buildings.find((item) => item.id === buildingId)?.name ?? buildingId;
  deleteAdminBillingBuildingBtnEl.disabled = true;
  clearError();

  void (async () => {
    try {
      await deleteBuildingFromAdmin(buildingId, buildingName);
    } catch (error) {
      handleAdminError(error, "Failed to delete building.");
    } finally {
      deleteAdminBillingBuildingBtnEl.disabled = false;
    }
  })();
});

adminMonthlyCombinedChargeMonthEl?.addEventListener("change", () => {
  void loadAdminMonthlyCombinedCharge().catch((error) => {
    handleAdminError(error, "Unable to load monthly combined utility charge.");
  });
});

refreshLandlordAccessBtn?.addEventListener("click", () => {
  void loadLandlordAccessRequests().catch((error) => {
    handleAdminError(error, "Unable to refresh landlord access requests.");
  });
});

refreshPasswordRecoveryBtn?.addEventListener("click", () => {
  void loadPasswordRecoveryRequests().catch((error) => {
    handleAdminError(error, "Unable to refresh password recovery requests.");
  });
});

refreshAccountPasswordRecoveryBtn?.addEventListener("click", () => {
  void loadAccountPasswordRecoveryRequests().catch((error) => {
    handleAdminError(error, "Unable to refresh account password recovery requests.");
  });
});

refreshPortfoliosBtn?.addEventListener("click", () => {
  void Promise.all([loadOverview(), loadBuildings()]).catch((error) => {
    handleAdminError(error, "Unable to refresh landlord portfolios.");
  });
});

refreshOwnershipGapsBtn?.addEventListener("click", () => {
  void Promise.all([loadOverview(), loadBuildings()]).catch((error) => {
    handleAdminError(error, "Unable to refresh ownership gaps.");
  });
});

refreshBuildingsBtn?.addEventListener("click", () => {
  void Promise.all([loadOverview(), loadBuildings()]).catch((error) => {
    handleAdminError(error, "Unable to refresh buildings.");
  });
});

refreshAllBtnEl?.addEventListener("click", () => {
  void loadAdminData();
});

adminLogoutBtnEl?.addEventListener("click", () => {
  void signOut();
});

void (async () => {
  clearError();
  renderAdminAccess();
  const ok = await ensureAdminSession();
  if (!ok) {
    return;
  }

  await loadAdminData();
})();
