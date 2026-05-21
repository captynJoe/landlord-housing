import {
  applyDocumentBranding,
  getResidentProfileTitle,
  getResidentShellBrand
} from "./portal-branding.js?v=20260521b";
import { notifyError, notifyStatus } from "./notifications.js";

const RESIDENT_SW_URL = "/resident-sw.js?v=20260521b";

const apiStatusEl = document.getElementById("api-status");
const authStateEl = document.getElementById("auth-state");
const feedbackBoxEl = document.getElementById("feedback-box");
const userMenuToggleEl = document.getElementById("user-menu-toggle");
const userMenuPanelEl = document.getElementById("user-menu-panel");
const profileBrandEl = document.getElementById("profile-brand");
const profileHeroTitleEl = document.getElementById("profile-hero-title");
const residentSessionPanelEl = document.getElementById("resident-session-panel");
const residentSessionSummaryEl = document.getElementById("resident-session-summary");
const residentLogoutBtnEl = document.getElementById("resident-logout-btn");

const userAuthPanelEl = document.getElementById("user-auth-panel");
const userLayoutEl = document.getElementById("user-layout");
const residentProfileFormEl = document.getElementById("resident-profile-form");
const profileSaveBtnEl = document.getElementById("profile-save-btn");

const profileTenantNameEl = document.getElementById("profile-tenant-name");
const profileSessionCopyEl = document.getElementById("profile-session-copy");
const profileBuildingNameEl = document.getElementById("profile-building-name");
const profileBuildingAddressEl = document.getElementById("profile-building-address");
const profileHouseNumberEl = document.getElementById("profile-house-number");
const profilePhoneNumberEl = document.getElementById("profile-phone-number");
const profileEmailAddressEl = document.getElementById("profile-email-address");

const profileIdentityTypeEl = document.getElementById("profile-identity-type");
const profileIdentityNumberEl = document.getElementById("profile-identity-number");
const profileOccupationStatusEl = document.getElementById("profile-occupation-status");
const profileOccupationLabelEl = document.getElementById("profile-occupation-label");
const profileOrganizationNameEl = document.getElementById("profile-organization-name");
const profileOrganizationLocationEl = document.getElementById("profile-organization-location");
const profileStudentRegistrationNumberEl = document.getElementById(
  "profile-student-registration-number"
);
const profileSponsorNameEl = document.getElementById("profile-sponsor-name");
const profileSponsorPhoneEl = document.getElementById("profile-sponsor-phone");
const profileEmergencyContactNameEl = document.getElementById(
  "profile-emergency-contact-name"
);
const profileEmergencyContactPhoneEl = document.getElementById(
  "profile-emergency-contact-phone"
);

const agreementStatusCopyEl = document.getElementById("agreement-status-copy");
const agreementLeaseStartEl = document.getElementById("agreement-lease-start");
const agreementLeaseEndEl = document.getElementById("agreement-lease-end");
const agreementRentEl = document.getElementById("agreement-rent");
const agreementDepositEl = document.getElementById("agreement-deposit");
const agreementDueDayEl = document.getElementById("agreement-due-day");
const agreementUpdatedAtEl = document.getElementById("agreement-updated-at");
const agreementSpecialTermsEl = document.getElementById("agreement-special-terms");

const state = {
  profile: null
};

function setApiStatus(copy) {
  apiStatusEl.textContent = copy;
}

function setAuthState(copy) {
  authStateEl.textContent = copy;
}

function setLoading(isLoading) {
  document.body.classList.toggle("app-loading", isLoading);
}

function showFeedback(message, tone = "info") {
  if (!message) {
    feedbackBoxEl.textContent = "";
    feedbackBoxEl.className = "feedback hidden";
    return;
  }

  feedbackBoxEl.textContent = message;
  feedbackBoxEl.className = `feedback ${tone}`;
  if (tone === "error") {
    notifyError(message);
  } else {
    notifyStatus(message, { tone: tone === "success" ? "success" : "warning" });
  }
}

async function apiRequest(url, init = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    },
    ...init
  });

  const payload = await response
    .json()
    .catch(() => ({ error: `Request failed with status ${response.status}` }));

  if (!response.ok) {
    const issueMessage = payload.issues?.[0]?.message;
    throw new Error(
      issueMessage || payload.error || `Request failed with status ${response.status}`
    );
  }

  return payload;
}

function optionalTrimmedValue(value) {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

function formatDateTime(value) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

function formatCurrency(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Not set";
  }

  return `KSh ${value.toLocaleString("en-KE")}`;
}

function isPendingReview(session) {
  return session?.verificationStatus === "pending_review";
}

function formatVerificationLabel(session) {
  return isPendingReview(session) ? "Pending review" : "Verified";
}

function setSignedOutState(apiStatus = "Online") {
  state.profile = null;
  setApiStatus(apiStatus);
  setAuthState("Signed out");
  residentSessionPanelEl.classList.add("hidden");
  userLayoutEl.classList.add("hidden");
  userAuthPanelEl.classList.remove("hidden");
  updateProfileBranding();
}

function updateProfileBranding(buildingName = "") {
  const shellBrand = getResidentShellBrand(buildingName);
  const profileTitle = getResidentProfileTitle(buildingName);

  if (profileBrandEl instanceof HTMLElement) {
    profileBrandEl.textContent = shellBrand;
  }
  if (profileHeroTitleEl instanceof HTMLElement) {
    profileHeroTitleEl.textContent = profileTitle;
  }

  applyDocumentBranding(profileTitle, shellBrand);
}

function renderProfile(profile) {
  state.profile = profile;
  userAuthPanelEl.classList.add("hidden");
  userLayoutEl.classList.remove("hidden");
  residentSessionPanelEl.classList.remove("hidden");
  setAuthState(isPendingReview(profile.session) ? "Pending review" : "Signed in");

  const session = profile.session;
  const resident = profile.resident;
  const agreement = profile.agreement;
  const building = profile.building;
  updateProfileBranding(building?.name);

  residentSessionSummaryEl.textContent = `House ${session.houseNumber} (${session.phoneMask}) • ${formatVerificationLabel(
    session
  )} • Expires ${formatDateTime(session.expiresAt)}`;

  profileTenantNameEl.textContent = resident.fullName || "Resident";
  profileSessionCopyEl.textContent = session.mustChangePassword
    ? "Update your password in the resident workspace before continuing."
    : isPendingReview(session)
      ? `Unverified account for house ${session.houseNumber}. You can still complete your profile, view balances, and make payments while landlord review is pending.`
      : `Signed in for house ${session.houseNumber}. Session expires ${formatDateTime(
          session.expiresAt
        )}.`;
  profileBuildingNameEl.textContent = building.name || "Assigned building";
  profileBuildingAddressEl.textContent = [building.address, building.county]
    .filter(Boolean)
    .join(" • ");
  profileHouseNumberEl.textContent = session.houseNumber || "-";
  profilePhoneNumberEl.textContent = resident.phone || session.phoneMask || "-";
  profileEmailAddressEl.textContent = resident.email || "Not added";

  profileIdentityTypeEl.value = agreement?.identityType || "";
  profileIdentityNumberEl.value = agreement?.identityNumber || "";
  profileOccupationStatusEl.value = agreement?.occupationStatus || "";
  profileOccupationLabelEl.value = agreement?.occupationLabel || "";
  profileOrganizationNameEl.value = agreement?.organizationName || "";
  profileOrganizationLocationEl.value = agreement?.organizationLocation || "";
  profileStudentRegistrationNumberEl.value = agreement?.studentRegistrationNumber || "";
  profileSponsorNameEl.value = agreement?.sponsorName || "";
  profileSponsorPhoneEl.value = agreement?.sponsorPhone || "";
  profileEmergencyContactNameEl.value = agreement?.emergencyContactName || "";
  profileEmergencyContactPhoneEl.value = agreement?.emergencyContactPhone || "";

  agreementStatusCopyEl.textContent = agreement
    ? isPendingReview(session)
      ? "Agreement details are loaded from your tenancy record. Support features stay locked until landlord verification is completed."
      : "Agreement details are loaded from your active tenancy record."
    : isPendingReview(session)
      ? "Your account is pending landlord review. You can still save your ID and emergency-contact details now."
      : "No tenant agreement has been completed yet. You can still save your ID and emergency-contact details.";
  agreementLeaseStartEl.textContent = formatDate(agreement?.leaseStartDate);
  agreementLeaseEndEl.textContent = formatDate(agreement?.leaseEndDate);
  agreementRentEl.textContent = formatCurrency(agreement?.monthlyRentKsh);
  agreementDepositEl.textContent = formatCurrency(agreement?.depositKsh);
  agreementDueDayEl.textContent =
    typeof agreement?.paymentDueDay === "number"
      ? `Day ${agreement.paymentDueDay}`
      : "Not set";
  agreementUpdatedAtEl.textContent = formatDateTime(agreement?.updatedAt);
  agreementSpecialTermsEl.textContent =
    agreement?.specialTerms || "No special terms have been added yet.";
}

async function loadProfile() {
  setApiStatus("Loading");
  const sessionResponse = await fetch("/api/auth/resident/session", {
    credentials: "same-origin"
  });

  if (sessionResponse.status === 401) {
    setSignedOutState();
    return;
  }

  if (!sessionResponse.ok) {
    const payload = await sessionResponse.json().catch(() => ({}));
    throw new Error(payload.error || "Unable to restore resident session.");
  }

  const payload = await apiRequest("/api/resident/profile");
  renderProfile(payload.data);
  setApiStatus("Online");
}

async function handleSave(event) {
  event.preventDefault();
  showFeedback("");
  profileSaveBtnEl.disabled = true;

  try {
    const payload = {
      identityType: optionalTrimmedValue(profileIdentityTypeEl.value),
      identityNumber: optionalTrimmedValue(profileIdentityNumberEl.value),
      occupationStatus: optionalTrimmedValue(profileOccupationStatusEl.value),
      occupationLabel: optionalTrimmedValue(profileOccupationLabelEl.value),
      organizationName: optionalTrimmedValue(profileOrganizationNameEl.value),
      organizationLocation: optionalTrimmedValue(profileOrganizationLocationEl.value),
      studentRegistrationNumber: optionalTrimmedValue(
        profileStudentRegistrationNumberEl.value
      ),
      sponsorName: optionalTrimmedValue(profileSponsorNameEl.value),
      sponsorPhone: optionalTrimmedValue(profileSponsorPhoneEl.value),
      emergencyContactName: optionalTrimmedValue(profileEmergencyContactNameEl.value),
      emergencyContactPhone: optionalTrimmedValue(profileEmergencyContactPhoneEl.value)
    };

    const response = await apiRequest("/api/resident/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    renderProfile(response.data);
    showFeedback("Resident profile updated.", "success");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Unable to save resident profile.", "error");
  } finally {
    profileSaveBtnEl.disabled = false;
  }
}

async function handleLogout() {
  residentLogoutBtnEl.disabled = true;

  try {
    await apiRequest("/api/auth/resident/logout", { method: "POST", body: "{}" });
    showFeedback("Signed out.", "success");
    setSignedOutState();
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Unable to sign out.", "error");
  } finally {
    residentLogoutBtnEl.disabled = false;
  }
}

function closeMenu() {
  userMenuPanelEl.classList.add("hidden");
  userMenuToggleEl.setAttribute("aria-expanded", "false");
}

function toggleMenu() {
  const nextOpen = userMenuPanelEl.classList.contains("hidden");
  userMenuPanelEl.classList.toggle("hidden", !nextOpen);
  userMenuToggleEl.setAttribute("aria-expanded", nextOpen ? "true" : "false");
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register(RESIDENT_SW_URL, { scope: "/" });
  } catch (_error) {
    // Ignore service-worker registration errors for this auxiliary page.
  }
}

async function boot() {
  setLoading(true);
  showFeedback("");

  try {
    await Promise.all([loadProfile(), registerServiceWorker()]);
  } catch (error) {
    setSignedOutState("Offline");
    showFeedback(error instanceof Error ? error.message : "Unable to load resident profile.", "error");
  } finally {
    setLoading(false);
  }
}

userMenuToggleEl.addEventListener("click", toggleMenu);
document.addEventListener("click", (event) => {
  if (
    !userMenuPanelEl.contains(event.target) &&
    !userMenuToggleEl.contains(event.target)
  ) {
    closeMenu();
  }
});
residentProfileFormEl.addEventListener("submit", handleSave);
residentLogoutBtnEl.addEventListener("click", handleLogout);

void boot();
