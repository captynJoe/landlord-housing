const apiStatusEl = document.getElementById("api-status");
const storageModeEl = document.getElementById("storage-mode");
const registryCountEl = document.getElementById("registry-count");
const cctvCountEl = document.getElementById("cctv-count");
const errorBoxEl = document.getElementById("error-box");
const emptyStateEl = document.getElementById("empty-state");
const gridEl = document.getElementById("building-grid");
const cctvGridEl = document.getElementById("cctv-grid");
const cardTemplate = document.getElementById("building-card-template");
const cctvCardTemplate = document.getElementById("cctv-card-template");
const refreshBtn = document.getElementById("refresh-btn");

const moduleTabs = [...document.querySelectorAll("[data-module]")];
const modulePanels = [...document.querySelectorAll("[data-module-panel]")];

const wifiPackagesEl = document.getElementById("wifi-packages");
const wifiPackageTemplate = document.getElementById("wifi-package-template");
const wifiBuildingEl = document.getElementById("wifi-building");
const wifiPhoneEl = document.getElementById("wifi-phone");
const wifiStatusEl = document.getElementById("wifi-status");
const wifiErrorEl = document.getElementById("wifi-error");
const wifiFormEl = document.getElementById("wifi-payment-form");
const wifiPayBtnEl = document.getElementById("wifi-pay-btn");

const PAYMENT_POLL_INTERVAL_MS = 5000;
const PAYMENT_POLL_MAX_ATTEMPTS = 24;
const validModules = new Set(["overview", "wifi", "cctv"]);

const state = {
  selectedBuildingId: null,
  selectedPackageId: null,
  packages: [],
  buildings: [],
  paymentPollTimer: null,
  latestCheckoutReference: null,
  activeModule: "overview"
};

function formatUpdatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updated: unknown";

  return `Updated ${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date)}`;
}

function cctvBadge(value) {
  switch (value) {
    case "verified":
      return { text: "CCTV Verified", className: "cctv-verified" };
    case "partial":
      return { text: "CCTV Partial", className: "cctv-partial" };
    default:
      return { text: "No CCTV", className: "cctv-none" };
  }
}

function syncHash(moduleName) {
  const targetHash = moduleName === "overview" ? "" : `#${moduleName}`;
  if (window.location.hash === targetHash) {
    return;
  }

  const targetUrl = `${window.location.pathname}${targetHash}`;
  window.history.replaceState(null, "", targetUrl);
}

function setActiveModule(moduleName) {
  if (!validModules.has(moduleName)) {
    return;
  }

  state.activeModule = moduleName;

  moduleTabs.forEach((button) => {
    const active = button.dataset.module === moduleName;
    button.classList.toggle("active", active);
  });

  modulePanels.forEach((panel) => {
    const active = panel.dataset.modulePanel === moduleName;
    panel.classList.toggle("hidden", !active);
  });

  syncHash(moduleName);
}

function showError(message) {
  errorBoxEl.textContent = message;
  errorBoxEl.classList.remove("hidden");
}

function clearError() {
  errorBoxEl.textContent = "";
  errorBoxEl.classList.add("hidden");
}

function showWifiError(message) {
  wifiErrorEl.textContent = message;
  wifiErrorEl.classList.remove("hidden");
}

function clearWifiError() {
  wifiErrorEl.textContent = "";
  wifiErrorEl.classList.add("hidden");
}

function renderBuildings(buildings) {
  gridEl.replaceChildren();

  if (!Array.isArray(buildings) || buildings.length === 0) {
    emptyStateEl.classList.remove("hidden");
    registryCountEl.textContent = "0 buildings";
    return;
  }

  emptyStateEl.classList.add("hidden");
  registryCountEl.textContent = `${buildings.length} building${
    buildings.length === 1 ? "" : "s"
  }`;

  buildings.forEach((building, index) => {
    const fragment = cardTemplate.content.cloneNode(true);
    const cardEl = fragment.querySelector(".card");

    fragment.querySelector(".building-name").textContent = building.name;
    fragment.querySelector(".building-id").textContent = building.id;
    fragment.querySelector(".county").textContent = building.county;
    fragment.querySelector(".address").textContent = building.address;
    fragment.querySelector(".units").textContent = building.units ?? "-";
    fragment.querySelector(".incidents").textContent = String(
      building.openIncidents ?? 0
    );
    fragment.querySelector(".updated-at").textContent = formatUpdatedAt(
      building.updatedAt
    );

    const badge = cctvBadge(building.cctvStatus);
    const badgeEl = fragment.querySelector(".cctv-badge");
    badgeEl.textContent = badge.text;
    badgeEl.classList.add(badge.className);

    cardEl.style.animationDelay = `${index * 70}ms`;
    gridEl.append(fragment);
  });
}

function renderCctv(buildings) {
  cctvGridEl.replaceChildren();

  if (!Array.isArray(buildings) || buildings.length === 0) {
    cctvCountEl.textContent = "0 buildings";
    return;
  }

  cctvCountEl.textContent = `${buildings.length} building${
    buildings.length === 1 ? "" : "s"
  }`;

  buildings.forEach((building, index) => {
    const fragment = cctvCardTemplate.content.cloneNode(true);
    const cardEl = fragment.querySelector(".cctv-card");

    fragment.querySelector(".cctv-building-name").textContent = building.name;
    fragment.querySelector(".cctv-building-id").textContent = building.id;

    const badge = cctvBadge(building.cctvStatus);
    const badgeEl = fragment.querySelector(".cctv-badge");
    badgeEl.textContent = badge.text;
    badgeEl.classList.add(badge.className);

    cardEl.style.animationDelay = `${index * 70}ms`;
    cctvGridEl.append(fragment);
  });
}

function renderBuildingOptions(buildings) {
  wifiBuildingEl.replaceChildren();

  if (!Array.isArray(buildings) || buildings.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No building available";
    wifiBuildingEl.append(option);
    wifiBuildingEl.disabled = true;
    return;
  }

  wifiBuildingEl.disabled = false;

  buildings.forEach((building) => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = `${building.name} (${building.id})`;
    wifiBuildingEl.append(option);
  });

  const selectedBuildingId =
    state.selectedBuildingId && buildings.some((item) => item.id === state.selectedBuildingId)
      ? state.selectedBuildingId
      : buildings[0]?.id ?? "";

  state.selectedBuildingId = selectedBuildingId || null;
  wifiBuildingEl.value = selectedBuildingId;
}

function renderWifiPackages(packages) {
  wifiPackagesEl.replaceChildren();

  if (!Array.isArray(packages) || packages.length === 0) {
    showWifiError("No Wi-Fi packages configured.");
    return;
  }

  clearWifiError();

  packages.forEach((pkg) => {
    const fragment = wifiPackageTemplate.content.cloneNode(true);
    const button = fragment.querySelector(".wifi-package");

    fragment.querySelector(".wifi-package-name").textContent = pkg.name;
    fragment.querySelector(".wifi-package-profile").textContent = pkg.profile;
    fragment.querySelector(
      ".wifi-package-meta"
    ).textContent = `${pkg.hours}h • KSh ${pkg.priceKsh}`;

    button.dataset.packageId = pkg.id;
    if (pkg.id === state.selectedPackageId) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      state.selectedPackageId = pkg.id;
      wifiStatusEl.textContent = `Selected ${pkg.name} (${pkg.hours}h).`;
      renderWifiPackages(state.packages);
    });

    wifiPackagesEl.append(fragment);
  });
}

function stopPaymentPolling() {
  if (state.paymentPollTimer) {
    clearTimeout(state.paymentPollTimer);
    state.paymentPollTimer = null;
  }
}

function schedulePaymentPolling(checkoutReference, attempt) {
  state.paymentPollTimer = setTimeout(() => {
    void pollPaymentStatus(checkoutReference, attempt + 1);
  }, PAYMENT_POLL_INTERVAL_MS);
}

async function pollPaymentStatus(checkoutReference, attempt = 0) {
  try {
    const response = await fetch(
      `/api/wifi/payments/${encodeURIComponent(checkoutReference)}`
    );

    if (!response.ok) {
      throw new Error("Could not fetch payment status.");
    }

    const payload = await response.json();
    const payment = payload.data;

    if (payment.status === "active") {
      stopPaymentPolling();
      wifiStatusEl.textContent = `Connected. Voucher ${payment.voucher.username} / ${payment.voucher.password} (expires ${new Date(
        payment.voucher.expiresAt
      ).toLocaleString()}).`;
      return;
    }

    if (
      payment.status === "payment_failed" ||
      payment.status === "provisioning_failed"
    ) {
      stopPaymentPolling();
      wifiStatusEl.textContent = "Checkout did not complete.";
      showWifiError(payment.message ?? "Payment or provisioning failed.");
      return;
    }

    wifiStatusEl.textContent = `${payment.message} [${payment.status}]`;

    if (attempt < PAYMENT_POLL_MAX_ATTEMPTS) {
      schedulePaymentPolling(checkoutReference, attempt);
    } else {
      wifiStatusEl.textContent =
        "Still waiting for payment confirmation. Refresh status shortly.";
      stopPaymentPolling();
    }
  } catch (error) {
    stopPaymentPolling();
    const message =
      error instanceof Error ? error.message : "Status polling failed.";
    showWifiError(message);
  }
}

async function loadWifiPackagesForBuilding(buildingId) {
  if (!buildingId) {
    state.packages = [];
    state.selectedPackageId = null;
    renderWifiPackages([]);
    return;
  }

  const response = await fetch(
    `/api/wifi/packages?buildingId=${encodeURIComponent(buildingId)}`
  );

  if (!response.ok) {
    throw new Error(`Wi-Fi package list failed with status ${response.status}`);
  }

  const payload = await response.json();
  state.packages = payload.data ?? [];

  if (!state.packages.some((item) => item.id === state.selectedPackageId)) {
    state.selectedPackageId = state.packages[0]?.id ?? null;
  }

  if (state.selectedPackageId) {
    const selected = state.packages.find((item) => item.id === state.selectedPackageId);
    if (selected) {
      wifiStatusEl.textContent = `Selected ${selected.name} (${selected.hours}h).`;
    }
  } else {
    wifiStatusEl.textContent = "Select a building to view available Wi-Fi packages.";
  }

  renderWifiPackages(state.packages);
}

async function loadPageData() {
  clearError();
  clearWifiError();
  refreshBtn.disabled = true;

  try {
    const [healthRes, buildingsRes] = await Promise.all([
      fetch("/health"),
      fetch("/api/buildings")
    ]);

    if (!healthRes.ok) {
      throw new Error(`Health check failed with status ${healthRes.status}`);
    }

    if (!buildingsRes.ok) {
      throw new Error(`Building list failed with status ${buildingsRes.status}`);
    }

    const health = await healthRes.json();
    const buildingsPayload = await buildingsRes.json();

    state.buildings = buildingsPayload.data ?? [];

    apiStatusEl.textContent = health.status ?? "unknown";
    storageModeEl.textContent = health.storage ?? "unknown";
    renderBuildings(state.buildings);
    renderCctv(state.buildings);
    renderBuildingOptions(state.buildings);
    await loadWifiPackagesForBuilding(state.selectedBuildingId);
  } catch (error) {
    apiStatusEl.textContent = "error";
    storageModeEl.textContent = "unknown";
    registryCountEl.textContent = "load failed";
    cctvCountEl.textContent = "load failed";
    renderBuildings([]);
    renderCctv([]);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load resident portal data.";
    showError(message);
  } finally {
    refreshBtn.disabled = false;
  }
}

async function createWifiPayment(event) {
  event.preventDefault();
  clearWifiError();

  if (!state.selectedPackageId) {
    showWifiError("Select a package before checkout.");
    return;
  }

  const buildingId = wifiBuildingEl.value;
  const phoneNumber = wifiPhoneEl.value.trim();

  if (!buildingId) {
    showWifiError("Select a building.");
    return;
  }

  if (!phoneNumber) {
    showWifiError("Enter an M-PESA number.");
    return;
  }

  wifiPayBtnEl.disabled = true;
  wifiStatusEl.textContent = "Creating payment request...";

  try {
    const response = await fetch("/api/wifi/payments", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        buildingId,
        packageId: state.selectedPackageId,
        phoneNumber
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      const issueMessage = payload.issues?.[0]?.message;
      throw new Error(issueMessage ?? payload.error ?? "Unable to process payment");
    }

    const payment = payload.data;
    state.latestCheckoutReference = payment.checkoutReference;

    wifiStatusEl.textContent = `Request ${payment.checkoutReference} created. Confirm the M-PESA prompt on ${payment.phoneNumber}.`;

    stopPaymentPolling();
    schedulePaymentPolling(payment.checkoutReference, 0);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process payment.";
    showWifiError(message);
    wifiStatusEl.textContent = "Checkout failed. Update details and retry.";
  } finally {
    wifiPayBtnEl.disabled = false;
  }
}

moduleTabs.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.module;
    if (!target) return;
    setActiveModule(target);
  });
});

window.addEventListener("hashchange", () => {
  const moduleFromHash = window.location.hash.slice(1);
  if (validModules.has(moduleFromHash)) {
    setActiveModule(moduleFromHash);
  }
});

refreshBtn.addEventListener("click", () => {
  void loadPageData();
});

wifiBuildingEl.addEventListener("change", () => {
  state.selectedBuildingId = wifiBuildingEl.value || null;
  state.selectedPackageId = null;
  clearWifiError();
  void loadWifiPackagesForBuilding(state.selectedBuildingId).catch((error) => {
    const message =
      error instanceof Error ? error.message : "Unable to load Wi-Fi packages.";
    showWifiError(message);
  });
});

wifiFormEl.addEventListener("submit", (event) => {
  void createWifiPayment(event);
});

const initialModule = window.location.hash.slice(1);
if (validModules.has(initialModule)) {
  state.activeModule = initialModule;
}

setActiveModule(state.activeModule);
void loadPageData();
