"use strict";
const app = document.querySelector("#management-app");
const state = {
    role: "-",
    view: "rooms",
    buildings: [],
    paymentAccess: [],
    rooms: [],
    selectedBuildingId: "all",
    selectedStatus: "all",
    search: "",
    loading: true,
    selectedPaymentRoom: null,
    rentPaymentStatus: "Select a room to record a rent payment.",
    rentPaymentSaving: false,
    rentSetupBuildingId: "",
    rentSetupSheet: null,
    rentSetupLoading: false,
    rentSetupSaving: false,
    rentSetupStatus: "Choose a building to tune rent defaults."
};
const money = new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "KES"
});
function text(value, fallback = "") {
    return String(value ?? "").trim() || fallback;
}
function numberValue(value) {
    const next = Number(value);
    return Number.isFinite(next) ? next : 0;
}
function optionalNumber(value) {
    const raw = value.trim();
    if (!raw)
        return null;
    const next = Number(raw);
    return Number.isFinite(next) ? Math.round(next) : null;
}
function currentBillingMonth() {
    return new Date().toISOString().slice(0, 7);
}
function toIsoFromDateTimeLocal(value) {
    const raw = value.trim();
    if (!raw)
        return undefined;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
function formatMoney(value) {
    return money.format(numberValue(value)).replace("KES", "KSh");
}
function optionalInput(value) {
    if (value == null || value === "")
        return "";
    const next = Number(value);
    return Number.isFinite(next) ? String(Math.round(next)) : "";
}
function buildingName(building) {
    return text(building.displayName, text(building.name, "Building"));
}
async function apiEnvelope(path, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    const response = await fetch(path, {
        ...init,
        credentials: "same-origin",
        headers
    });
    if (response.status === 401) {
        window.location.assign("/landlord/login");
        throw new Error("Landlord authentication required");
    }
    const payload = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error(payload.error || `Request failed with ${response.status}`);
    }
    return { data: payload.data, role: payload.role, mode: payload.mode };
}
function normalizeStatus(row) {
    const raw = text(row.status || row.occupancyStatus).toLowerCase();
    if (raw.includes("occupied") || raw.includes("active"))
        return "occupied";
    if (raw.includes("vacant"))
        return "vacant";
    if (raw.includes("pending"))
        return "pending";
    return text(row.residentName || row.name).toLowerCase() === "vacant" ? "vacant" : "unknown";
}
function roomFromResident(row, fallbackBuilding) {
    const status = normalizeStatus(row);
    const residentName = status === "vacant" ? "Vacant" : text(row.residentName || row.name, "Resident");
    return {
        buildingId: text(row.buildingId, fallbackBuilding?.id || ""),
        buildingName: text(row.buildingName, fallbackBuilding ? buildingName(fallbackBuilding) : "Building"),
        houseNumber: text(row.houseNumber, "-"),
        residentName,
        phone: text(row.phone, "-"),
        status,
        rentKsh: numberValue(row.rentKsh ?? row.monthlyRentKsh),
        depositKsh: numberValue(row.depositKsh),
        utilitiesKsh: numberValue(row.utilityBalanceKsh ?? row.currentUtilityDueKsh),
        balanceKsh: numberValue(row.totalOutstandingKsh ?? row.currentBalanceKsh ?? row.arrearsKsh)
    };
}
function buildRooms(payload) {
    const residentRows = Array.isArray(payload.residentDirectory) ? payload.residentDirectory : [];
    if (residentRows.length > 0) {
        return residentRows
            .map((row) => {
            const fallbackBuilding = payload.buildings?.find((item) => item.id === row.buildingId);
            return roomFromResident(row, fallbackBuilding);
        })
            .filter((row) => row.buildingId && row.houseNumber);
    }
    return (payload.buildings || []).flatMap((building) => (building.rooms || []).map((room) => {
        const vacant = room.isVacant !== false;
        return {
            buildingId: building.id,
            buildingName: buildingName(building),
            houseNumber: text(room.houseNumber, "-"),
            residentName: vacant ? "Vacant" : "Occupied",
            phone: "-",
            status: vacant ? "vacant" : "occupied",
            rentKsh: 0,
            depositKsh: 0,
            utilitiesKsh: 0,
            balanceKsh: 0
        };
    }));
}
function filteredRooms() {
    const query = state.search.toLowerCase();
    return state.rooms.filter((room) => {
        const buildingMatches = state.selectedBuildingId === "all" || room.buildingId === state.selectedBuildingId;
        const statusMatches = state.selectedStatus === "all" || room.status === state.selectedStatus;
        const queryMatches = !query ||
            [room.houseNumber, room.residentName, room.phone, room.buildingName]
                .join(" ")
                .toLowerCase()
                .includes(query);
        return buildingMatches && statusMatches && queryMatches;
    });
}
function roomTotals(rows) {
    return rows.reduce((summary, room) => {
        summary.rooms += 1;
        summary.occupied += room.status === "occupied" ? 1 : 0;
        summary.vacant += room.status === "vacant" ? 1 : 0;
        summary.balance += room.balanceKsh;
        summary.utilities += room.utilitiesKsh;
        return summary;
    }, { rooms: 0, occupied: 0, vacant: 0, balance: 0, utilities: 0 });
}
function rentEnabledBuildings() {
    const accessByBuilding = new Map(state.paymentAccess.map((item) => [text(item.buildingId), item.rentEnabled]));
    return state.buildings.filter((building) => accessByBuilding.get(building.id) !== false);
}
function getRentSetupBuildingId() {
    const options = rentEnabledBuildings();
    if (state.rentSetupBuildingId && options.some((item) => item.id === state.rentSetupBuildingId)) {
        return state.rentSetupBuildingId;
    }
    return options[0]?.id || state.buildings[0]?.id || "";
}
function roomUrl(room) {
    return `/landlord/rooms/${encodeURIComponent(room.buildingId)}/${encodeURIComponent(room.houseNumber)}`;
}
function render() {
    if (!app)
        return;
    app.innerHTML = `
    <div class="management-shell">
      ${renderSidebar()}
      <main class="management-main">
        ${renderOperationsHeader()}
        ${state.view === "rent" ? renderRentSetupView() : renderRoomsView()}
      </main>
    </div>
  `;
    bindRenderedControls();
}
function renderSidebar() {
    return `
    <aside class="management-sidebar" aria-label="EstateDesk navigation">
      <div class="brand-lockup">
        <img src="/icons/housing-app.svg" alt="" />
        <div>
          <p class="management-kicker">EstateDesk</p>
          <h1>JK Flats</h1>
          <p class="management-muted">Operations desk · ${escapeHtml(state.role)}</p>
        </div>
      </div>
      <nav>
        <button class="${state.view === "rooms" ? "active" : ""}" type="button" data-view="rooms">Room Ledger</button>
        <button class="${state.view === "rent" ? "active" : ""}" type="button" data-view="rent">Rent Standards</button>
        <a href="/landlord">Classic Tools</a>
        <a href="/resident">Resident Desk</a>
      </nav>
      <div class="sidebar-note">
        <strong>${escapeHtml(String(state.rooms.length))}</strong>
        <span>rooms tracked across ${escapeHtml(String(state.buildings.length || 0))} building${state.buildings.length === 1 ? "" : "s"}</span>
      </div>
    </aside>
  `;
}
function renderOperationsHeader() {
    const allRooms = roomTotals(state.rooms);
    const selectedBuilding = state.selectedBuildingId === "all"
        ? "All buildings"
        : buildingName(state.buildings.find((building) => building.id === state.selectedBuildingId) ?? { id: "", name: "Selected building" });
    return `
    <section class="ops-header">
      <div>
        <p class="management-kicker">Live property desk</p>
        <h2>${state.view === "rent" ? "Rent Standards" : "Room Ledger"}</h2>
        <p class="management-muted">${escapeHtml(selectedBuilding)} · ${escapeHtml(String(allRooms.occupied))} occupied · ${escapeHtml(String(allRooms.vacant))} vacant</p>
      </div>
      <div class="ops-header-strip" aria-label="Portfolio snapshot">
        <span><strong>${escapeHtml(formatMoney(allRooms.balance))}</strong> outstanding</span>
        <span><strong>${escapeHtml(formatMoney(allRooms.utilities))}</strong> utilities</span>
        <span><strong>${escapeHtml(String(allRooms.rooms))}</strong> rooms</span>
      </div>
    </section>
  `;
}
function renderRoomsView() {
    const rows = filteredRooms();
    const summary = roomTotals(rows);
    const buildingOptions = state.buildings
        .map((building) => `<option value="${escapeAttr(building.id)}"${building.id === state.selectedBuildingId ? " selected" : ""}>${escapeHtml(buildingName(building))}</option>`)
        .join("");
    return `
    <section class="management-toolbar">
      <div>
        <p class="management-kicker">Portfolio ledger</p>
        <h2>Room control desk</h2>
      </div>
      <div class="management-controls">
        <label>
          Building
          <select id="building-filter">
            <option value="all"${state.selectedBuildingId === "all" ? " selected" : ""}>All buildings</option>
            ${buildingOptions}
          </select>
        </label>
        <label>
          Status
          <select id="status-filter">
            ${statusOption("all", "All")}
            ${statusOption("occupied", "Occupied")}
            ${statusOption("vacant", "Vacant")}
            ${statusOption("pending", "Pending")}
            ${statusOption("unknown", "Unknown")}
          </select>
        </label>
        <label>
          Search
          <input id="room-search" type="search" value="${escapeAttr(state.search)}" placeholder="House, resident, phone" />
        </label>
        <button id="refresh-management" type="button">Refresh</button>
      </div>
    </section>

    <section class="management-metrics" aria-label="Room account summary">
      ${metric("Rooms", summary.rooms)}
      ${metric("Occupied", summary.occupied)}
      ${metric("Vacant", summary.vacant)}
      ${metric("Outstanding", formatMoney(summary.balance))}
      ${metric("Utilities", formatMoney(summary.utilities))}
    </section>

    ${renderRentPaymentPanel()}

    <section class="management-table-card">
      <div class="management-table-head">
        <strong>${state.loading ? "Loading rooms..." : `${rows.length} room${rows.length === 1 ? "" : "s"}`}</strong>
        <span class="management-muted">Operational view for balances, tenant status, and quick rent posting.</span>
      </div>
      <div class="management-table-wrap">
        <table>
          <thead>
            <tr>
              <th>House</th>
              <th>Building</th>
              <th>Resident</th>
              <th>Status</th>
              <th>Rent</th>
              <th>Deposit</th>
              <th>Utilities</th>
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(renderRoomRow).join("") : renderEmptyRow(9, "No rooms match this view.")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function renderRentPaymentPanel() {
    const room = state.selectedPaymentRoom;
    if (!room) {
        return `
      <section class="rent-payment-panel is-empty">
        <strong>Rent payment desk</strong>
        <span class="management-muted">Pick a room from the ledger to post rent without leaving this desk.</span>
      </section>
    `;
    }
    const amount = Math.max(0, Math.round(room.balanceKsh || room.rentKsh || 0));
    return `
    <section class="rent-payment-panel">
      <div class="rent-payment-summary">
        <p class="management-kicker">Record rent payment</p>
        <h3>${escapeHtml(room.buildingName)} ${escapeHtml(room.houseNumber)}</h3>
        <p class="management-muted">${escapeHtml(room.residentName)} · Balance ${escapeHtml(formatMoney(room.balanceKsh))}</p>
      </div>
      <form id="rent-payment-form" class="rent-payment-form">
        <label>
          Amount
          <input id="rent-payment-amount" type="number" min="1" max="500000" step="1" value="${escapeAttr(amount > 0 ? amount : "")}" required />
        </label>
        <label>
          Month
          <input id="rent-payment-month" type="month" value="${escapeAttr(currentBillingMonth())}" />
        </label>
        <label>
          Provider
          <select id="rent-payment-provider">
            <option value="cash">Cash</option>
            <option value="mpesa">M-PESA</option>
            <option value="bank">Bank</option>
            <option value="card">Card</option>
          </select>
        </label>
        <label>
          Reference
          <input id="rent-payment-reference" maxlength="120" placeholder="Required except cash" />
        </label>
        <label>
          Paid At
          <input id="rent-payment-paid-at" type="datetime-local" />
        </label>
        <button type="submit" ${state.rentPaymentSaving ? "disabled" : ""}>${state.rentPaymentSaving ? "Posting..." : "Post Payment"}</button>
      </form>
      <p class="rent-payment-status">${escapeHtml(state.rentPaymentStatus)}</p>
    </section>
  `;
}
function renderRentSetupView() {
    const selectedBuildingId = getRentSetupBuildingId();
    const buildingOptions = rentEnabledBuildings()
        .map((building) => `<option value="${escapeAttr(building.id)}"${building.id === selectedBuildingId ? " selected" : ""}>${escapeHtml(buildingName(building))}</option>`)
        .join("");
    const sheet = state.rentSetupSheet;
    const rows = [...(sheet?.rows || [])].sort((left, right) => text(left.houseNumber).localeCompare(text(right.houseNumber), undefined, { numeric: true }));
    return `
    <section class="management-toolbar rent-toolbar">
      <div>
        <p class="management-kicker">Rent standards</p>
        <h2>${escapeHtml(sheet?.buildingName || "Building policy")}</h2>
      </div>
      <div class="management-controls rent-controls">
        <label>
          Building
          <select id="rent-building-filter" ${buildingOptions ? "" : "disabled"}>
            ${buildingOptions || '<option value="">No rent-enabled buildings</option>'}
          </select>
        </label>
        <button id="load-rent-setup" type="button" ${selectedBuildingId ? "" : "disabled"}>Reload</button>
        <button id="save-rent-setup" type="button" ${sheet && !state.rentSetupSaving ? "" : "disabled"}>${state.rentSetupSaving ? "Saving..." : "Save Setup"}</button>
      </div>
    </section>

    <form id="rent-setup-form" class="rent-workbook" data-building-id="${escapeAttr(selectedBuildingId)}">
      <section class="rent-defaults">
        ${rentDefaultField("Building Default Rent", "rent-default", sheet?.buildingDefaultMonthlyRentKsh, "Set")}
        ${rentDefaultField("Default Deposit", "deposit-default", sheet?.buildingDefaultDepositKsh, "Set")}
        ${rentDefaultField("Due Day", "due-day-default", sheet?.buildingDefaultDueDay, "Day")}
        ${rentDefaultField("Grace Days", "grace-days-default", sheet?.buildingDefaultGraceDays ?? 0, "0")}
        <label>
          Charge Start Date
          <input id="charge-start-date" type="date" value="${escapeAttr(sheet?.chargeStartDate || "")}" />
        </label>
        <label class="rent-note-field">
          Note
          <input id="rent-setup-note" maxlength="280" placeholder="Optional save note" />
        </label>
      </section>

      <section class="management-table-card rent-table-card">
        <div class="management-table-head">
          <strong>${state.rentSetupLoading ? "Loading rent setup..." : `${rows.length} room${rows.length === 1 ? "" : "s"}`}</strong>
          <span class="management-muted">${escapeHtml(state.rentSetupStatus)}</span>
        </div>
        <div class="management-table-wrap rent-setup-wrap">
          <table>
            <thead>
              <tr>
                <th>House</th>
                <th>Resident</th>
                <th>Source</th>
                <th>Resolved</th>
                <th>Room Rent</th>
                <th>Deposit</th>
                <th>Due Day</th>
                <th>Grace</th>
                <th>Charge</th>
                <th>Balance</th>
                <th>Paid This Month</th>
                <th>Arrears</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(renderRentSetupRow).join("") : renderEmptyRow(12, selectedBuildingId ? "Choose a building to load room defaults." : "No rent-enabled building is available.")}
            </tbody>
          </table>
        </div>
      </section>
    </form>
  `;
}
function rentDefaultField(label, id, value, placeholder) {
    return `
    <label>
      ${escapeHtml(label)}
      <input id="${escapeAttr(id)}" type="number" min="0" step="1" value="${escapeAttr(optionalInput(value))}" placeholder="${escapeAttr(placeholder)}" />
    </label>
  `;
}
function renderRentSetupRow(row) {
    const houseNumber = text(row.houseNumber, "-");
    const resident = text(row.residentName, row.hasActiveResident ? "Resident linked" : "Vacant");
    const phone = text(row.residentPhone);
    const resolvedRent = numberValue(row.resolvedMonthlyRentKsh);
    const currentMonthPaid = numberValue(row.currentMonthPaidKsh);
    const roomActive = row.roomDefaultActive !== false;
    return `
    <tr data-rent-row="true" data-house-number="${escapeAttr(houseNumber)}" data-resolved-rent="${escapeAttr(resolvedRent)}" data-original-paid="${escapeAttr(currentMonthPaid)}">
      <td><strong>${escapeHtml(houseNumber)}</strong></td>
      <td><strong>${escapeHtml(resident)}</strong>${phone ? `<small>${escapeHtml(phone)}</small>` : ""}</td>
      <td>${escapeHtml(rentSetupSourceLabel(row.rentSetupSource))}</td>
      <td>${escapeHtml(formatMoney(resolvedRent))}<small>${escapeHtml(formatRentTiming(row))}</small></td>
      <td><input data-field="monthlyRentKsh" type="number" min="0" step="1" value="${escapeAttr(optionalInput(row.roomDefaultMonthlyRentKsh))}" placeholder="Building default" /></td>
      <td><input data-field="depositKsh" type="number" min="0" step="1" value="${escapeAttr(optionalInput(row.depositKsh))}" placeholder="Building default" /></td>
      <td><input data-field="paymentDueDay" type="number" min="1" max="31" step="1" value="${escapeAttr(optionalInput(row.roomDefaultDueDay))}" placeholder="Default" /></td>
      <td><input data-field="graceDays" type="number" min="0" max="31" step="1" value="${escapeAttr(optionalInput(row.roomDefaultGraceDays))}" placeholder="Default" /></td>
      <td><input data-field="active" type="checkbox" ${roomActive ? "checked" : ""} aria-label="Charge rent" /></td>
      <td>${escapeHtml(formatMoney(row.balanceKsh))}</td>
      <td><input data-field="currentMonthPaidKsh" type="number" min="0" step="1" value="${currentMonthPaid > 0 ? escapeAttr(currentMonthPaid) : ""}" placeholder="${escapeAttr(formatMoney(currentMonthPaid))}" /></td>
      <td>${escapeHtml(formatMoney(row.arrearsKsh))}</td>
    </tr>
  `;
}
function statusOption(value, label) {
    return `<option value="${value}"${state.selectedStatus === value ? " selected" : ""}>${label}</option>`;
}
function metric(label, value) {
    return `<div class="management-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}
function renderRoomRow(room) {
    return `
    <tr>
      <td><strong>${escapeHtml(room.houseNumber)}</strong></td>
      <td>${escapeHtml(room.buildingName)}</td>
      <td>
        <strong>${escapeHtml(room.residentName)}</strong>
        <small>${escapeHtml(room.phone)}</small>
      </td>
      <td><span class="status-pill status-${escapeAttr(room.status)}">${escapeHtml(room.status)}</span></td>
      <td>${escapeHtml(formatMoney(room.rentKsh))}</td>
      <td>${escapeHtml(formatMoney(room.depositKsh))}</td>
      <td>${escapeHtml(formatMoney(room.utilitiesKsh))}</td>
      <td><strong>${escapeHtml(formatMoney(room.balanceKsh))}</strong></td>
      <td class="row-actions"><button type="button" class="row-action" data-action="record-rent" data-building-id="${escapeAttr(room.buildingId)}" data-house-number="${escapeAttr(room.houseNumber)}">Record</button><a class="row-action secondary" href="${escapeAttr(roomUrl(room))}">Open</a></td>
    </tr>
  `;
}
function renderEmptyRow(colspan, message) {
    return `<tr><td colspan="${colspan}" class="empty-row">${escapeHtml(message)}</td></tr>`;
}
function rentSetupSourceLabel(source) {
    const value = text(source);
    if (value === "room_default")
        return "Room Default";
    if (value === "building_default")
        return "Building Default";
    if (value === "agreement_legacy")
        return "Tenant Record";
    if (value === "room_disabled")
        return "No Charge";
    return "Unset";
}
function formatRentTiming(row) {
    const dueDay = row.resolvedDueDay == null ? "No due day" : `Day ${Math.round(numberValue(row.resolvedDueDay))}`;
    const grace = `${Math.max(0, Math.round(numberValue(row.resolvedGraceDays)))} grace`;
    return `${dueDay} - ${grace}`;
}
function bindRenderedControls() {
    document.querySelectorAll("[data-view]").forEach((button) => {
        button.addEventListener("click", () => {
            state.view = button.dataset.view === "rent" ? "rent" : "rooms";
            render();
            if (state.view === "rent" && !state.rentSetupSheet && !state.rentSetupLoading) {
                void loadRentSetup();
            }
        });
    });
    document.querySelector("#building-filter")?.addEventListener("change", (event) => {
        state.selectedBuildingId = event.currentTarget.value;
        render();
    });
    document.querySelector("#status-filter")?.addEventListener("change", (event) => {
        state.selectedStatus = event.currentTarget.value;
        render();
    });
    document.querySelector("#room-search")?.addEventListener("input", (event) => {
        const target = event.currentTarget;
        const cursor = target.selectionStart;
        state.search = target.value;
        render();
        const nextSearch = document.querySelector("#room-search");
        if (nextSearch) {
            nextSearch.focus();
            if (cursor !== null) {
                nextSearch.setSelectionRange(cursor, cursor);
            }
        }
    });
    document.querySelector("#refresh-management")?.addEventListener("click", () => {
        void load();
    });
    document.querySelectorAll('[data-action="record-rent"]').forEach((button) => {
        button.addEventListener("click", () => {
            const buildingId = text(button.dataset.buildingId);
            const houseNumber = text(button.dataset.houseNumber);
            state.selectedPaymentRoom = state.rooms.find((room) => room.buildingId === buildingId && room.houseNumber === houseNumber) ?? null;
            state.rentPaymentStatus = state.selectedPaymentRoom
                ? `Ready to post rent for ${state.selectedPaymentRoom.buildingName} ${state.selectedPaymentRoom.houseNumber}.`
                : "Room details were not found. Refresh and try again.";
            render();
            document.querySelector("#rent-payment-amount")?.focus();
        });
    });
    document.querySelector("#rent-payment-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        void submitRentPayment();
    });
    document.querySelector("#rent-building-filter")?.addEventListener("change", (event) => {
        state.rentSetupBuildingId = event.currentTarget.value;
        state.rentSetupSheet = null;
        void loadRentSetup();
    });
    document.querySelector("#load-rent-setup")?.addEventListener("click", () => {
        void loadRentSetup();
    });
    document.querySelector("#save-rent-setup")?.addEventListener("click", () => {
        void saveRentSetup();
    });
}
async function load() {
    state.loading = true;
    render();
    try {
        const response = await apiEnvelope("/api/landlord/startup?mode=quick");
        const payload = response.data;
        state.role = text(response.role, state.role);
        state.buildings = Array.isArray(payload.buildings) ? payload.buildings : [];
        state.paymentAccess = Array.isArray(payload.paymentAccess) ? payload.paymentAccess : [];
        state.rooms = buildRooms(payload).sort((left, right) => `${left.buildingName}-${left.houseNumber}`.localeCompare(`${right.buildingName}-${right.houseNumber}`, undefined, {
            numeric: true
        }));
        state.rentSetupBuildingId = getRentSetupBuildingId();
    }
    catch (error) {
        if (app) {
            app.innerHTML = `<div class="management-error"><strong>Could not load management data.</strong><p>${escapeHtml(error instanceof Error ? error.message : "Unknown error")}</p><a href="/landlord">Open classic workspace</a></div>`;
        }
        return;
    }
    finally {
        state.loading = false;
    }
    render();
}
async function submitRentPayment() {
    const room = state.selectedPaymentRoom;
    if (!room)
        return;
    const amountKsh = optionalNumber(document.querySelector("#rent-payment-amount")?.value ?? "");
    const provider = text(document.querySelector("#rent-payment-provider")?.value, "cash");
    const providerReference = text(document.querySelector("#rent-payment-reference")?.value);
    const billingMonth = text(document.querySelector("#rent-payment-month")?.value) || undefined;
    const paidAt = toIsoFromDateTimeLocal(document.querySelector("#rent-payment-paid-at")?.value ?? "");
    if (amountKsh == null || amountKsh <= 0) {
        state.rentPaymentStatus = "Enter a payment amount greater than zero.";
        render();
        return;
    }
    if (amountKsh > 500_000) {
        state.rentPaymentStatus = "Rent payment amount cannot exceed KSh 500,000.";
        render();
        return;
    }
    if (provider !== "cash" && !providerReference) {
        state.rentPaymentStatus = "Reference is required for non-cash rent payments.";
        render();
        return;
    }
    state.rentPaymentSaving = true;
    state.rentPaymentStatus = "Posting rent payment...";
    render();
    try {
        const response = await apiEnvelope(`/api/landlord/rent/${encodeURIComponent(room.houseNumber)}/payments`, {
            method: "POST",
            body: JSON.stringify({
                buildingId: room.buildingId,
                billingMonth,
                amountKsh,
                provider,
                providerReference: providerReference || undefined,
                paidAt
            })
        });
        state.role = text(response.role, state.role);
        state.rentPaymentStatus = `Posted ${formatMoney(response.data.amountKsh)} via ${response.data.provider.toUpperCase()} (${response.data.providerReference}).`;
        await refreshRoomsQuietly();
        const refreshedRoom = state.rooms.find((item) => item.buildingId === room.buildingId && item.houseNumber === room.houseNumber);
        state.selectedPaymentRoom = refreshedRoom ?? room;
    }
    catch (error) {
        state.rentPaymentStatus = error instanceof Error ? error.message : "Failed to post rent payment.";
    }
    finally {
        state.rentPaymentSaving = false;
    }
    render();
}
async function loadRentSetup() {
    const buildingId = getRentSetupBuildingId();
    if (!buildingId) {
        state.rentSetupStatus = "No rent-enabled building is available.";
        state.rentSetupSheet = null;
        render();
        return;
    }
    state.rentSetupBuildingId = buildingId;
    state.rentSetupLoading = true;
    state.rentSetupStatus = "Loading rent setup...";
    render();
    try {
        const response = await apiEnvelope(`/api/landlord/buildings/${encodeURIComponent(buildingId)}/rent-setup-sheet`);
        state.role = text(response.role, state.role);
        state.rentSetupSheet = response.data;
        state.rentSetupStatus = "Current month paid cannot exceed resolved rent. Empty room values use the building defaults.";
    }
    catch (error) {
        state.rentSetupStatus = error instanceof Error ? error.message : "Failed to load rent setup.";
    }
    finally {
        state.rentSetupLoading = false;
    }
    render();
}
async function saveRentSetup() {
    const buildingId = state.rentSetupSheet?.buildingId || getRentSetupBuildingId();
    if (!buildingId || !state.rentSetupSheet)
        return;
    let payload;
    try {
        payload = buildRentSetupPayload();
    }
    catch (error) {
        state.rentSetupStatus = error instanceof Error ? error.message : "Invalid rent setup values.";
        render();
        return;
    }
    state.rentSetupSaving = true;
    state.rentSetupStatus = "Saving rent setup...";
    render();
    try {
        const response = await apiEnvelope(`/api/landlord/buildings/${encodeURIComponent(buildingId)}/rent-setup-sheet`, {
            method: "PUT",
            body: JSON.stringify(payload)
        });
        state.role = text(response.role, state.role);
        state.rentSetupSheet = response.data;
        const updated = numberValue(response.data.updatedCount);
        state.rentSetupStatus = `Saved rent setup. ${updated} room${updated === 1 ? "" : "s"} updated.`;
        await refreshRoomsQuietly();
    }
    catch (error) {
        state.rentSetupStatus = error instanceof Error ? error.message : "Failed to save rent setup.";
    }
    finally {
        state.rentSetupSaving = false;
    }
    render();
}
async function refreshRoomsQuietly() {
    try {
        const response = await apiEnvelope("/api/landlord/startup?mode=quick");
        const payload = response.data;
        state.buildings = Array.isArray(payload.buildings) ? payload.buildings : state.buildings;
        state.paymentAccess = Array.isArray(payload.paymentAccess) ? payload.paymentAccess : state.paymentAccess;
        state.rooms = buildRooms(payload).sort((left, right) => `${left.buildingName}-${left.houseNumber}`.localeCompare(`${right.buildingName}-${right.houseNumber}`, undefined, {
            numeric: true
        }));
    }
    catch {
        // The rent setup save succeeded; room summaries can refresh on the next explicit load.
    }
}
function buildRentSetupPayload() {
    const buildingDefaultMonthlyRentKsh = readOptionalNumber("#rent-default", "Building Default rent");
    const buildingDefaultDepositKsh = readOptionalNumber("#deposit-default", "Default deposit");
    const buildingDefaultDueDay = readOptionalNumber("#due-day-default", "Building Default due day");
    const buildingDefaultGraceDays = readOptionalNumber("#grace-days-default", "Building Default grace days") ?? 0;
    const chargeStartDate = text(document.querySelector("#charge-start-date")?.value) || null;
    const note = text(document.querySelector("#rent-setup-note")?.value);
    if (buildingDefaultDueDay != null && (buildingDefaultDueDay < 1 || buildingDefaultDueDay > 31)) {
        throw new Error("Building Default due day must be from 1 to 31.");
    }
    if (buildingDefaultGraceDays < 0 || buildingDefaultGraceDays > 31) {
        throw new Error("Building Default grace days must be from 0 to 31.");
    }
    const rows = [...document.querySelectorAll('tr[data-rent-row="true"]')].map((row) => {
        const houseNumber = text(row.dataset.houseNumber);
        const monthlyRentKsh = readRowOptionalNumber(row, "monthlyRentKsh", `Room Default rent for ${houseNumber}`);
        const depositKsh = readRowOptionalNumber(row, "depositKsh", `Deposit for ${houseNumber}`);
        const paymentDueDay = readRowOptionalNumber(row, "paymentDueDay", `Due day for ${houseNumber}`);
        const graceDays = readRowOptionalNumber(row, "graceDays", `Grace days for ${houseNumber}`);
        const currentMonthPaidKsh = readRowOptionalNumber(row, "currentMonthPaidKsh", `Paid this month for ${houseNumber}`);
        const active = row.querySelector('input[data-field="active"]')?.checked ?? true;
        if (!houseNumber)
            throw new Error("A rent setup row is missing its house number.");
        if (paymentDueDay != null && (paymentDueDay < 1 || paymentDueDay > 31)) {
            throw new Error(`Due day for ${houseNumber} must be from 1 to 31.`);
        }
        if (graceDays != null && (graceDays < 0 || graceDays > 31)) {
            throw new Error(`Grace days for ${houseNumber} must be from 0 to 31.`);
        }
        const originalPaid = numberValue(row.dataset.originalPaid);
        const resolvedRent = Math.max(0, monthlyRentKsh ?? buildingDefaultMonthlyRentKsh ?? numberValue(row.dataset.resolvedRent));
        const paidChanged = currentMonthPaidKsh != null && currentMonthPaidKsh !== originalPaid;
        if (paidChanged && currentMonthPaidKsh > resolvedRent) {
            throw new Error(`Paid this month for ${houseNumber} cannot be more than ${formatMoney(resolvedRent)}.`);
        }
        return {
            houseNumber,
            monthlyRentKsh,
            depositKsh,
            currentMonthPaidKsh: paidChanged ? currentMonthPaidKsh : null,
            paymentDueDay,
            graceDays,
            active
        };
    });
    return {
        buildingDefaultMonthlyRentKsh,
        buildingDefaultDepositKsh,
        buildingDefaultDueDay,
        buildingDefaultGraceDays,
        chargeStartDate,
        note: note || undefined,
        rows
    };
}
function readOptionalNumber(selector, label) {
    const value = document.querySelector(selector)?.value ?? "";
    const parsed = optionalNumber(value);
    if (parsed != null && parsed < 0) {
        throw new Error(`${label} cannot be negative.`);
    }
    return parsed;
}
function readRowOptionalNumber(row, field, label) {
    const value = row.querySelector(`input[data-field="${field}"]`)?.value ?? "";
    const parsed = optionalNumber(value);
    if (parsed != null && parsed < 0) {
        throw new Error(`${label} cannot be negative.`);
    }
    return parsed;
}
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function escapeAttr(value) {
    return escapeHtml(value);
}
if (app) {
    void load();
}
