// Balances screen: one card per room with what the tenant owes on rent and utilities.
// Built for going room to room: record what was actually paid, correct a balance
// (tagged "Manually adjusted" with a reason), and mark the room as checked.

export interface BalanceAdjustmentInfo {
  kind: "rent" | "utility";
  previousKsh: number;
  newKsh: number;
  reason: string;
  adjustedAt: string;
  adjustedBy?: string;
}

export interface BalanceRow {
  houseNumber: string;
  residentName: string;
  residentPhone: string;
  hasActiveResident: boolean;
  rent: { balanceKsh: number; monthlyRentKsh: number; dueDate: string; status: string } | null;
  utilities: { water: number; electricity: number; total: number };
  totalKsh: number;
  lastAdjustment: BalanceAdjustmentInfo | null;
  checkedAt: string | null;
}

export type BalanceFilter = "all" | "unchecked" | "owing";

export function isCheckedToday(row: BalanceRow, now: Date = new Date()): boolean {
  if (!row.checkedAt) {
    return false;
  }
  const checked = new Date(row.checkedAt);
  return checked.toDateString() === now.toDateString();
}

export function filterRows(rows: BalanceRow[], filter: BalanceFilter, now = new Date()) {
  const sorted = [...rows].sort((a, b) =>
    a.houseNumber.localeCompare(b.houseNumber, undefined, { numeric: true })
  );
  if (filter === "unchecked") {
    return sorted.filter((row) => row.hasActiveResident && !isCheckedToday(row, now));
  }
  if (filter === "owing") {
    return sorted.filter((row) => row.totalKsh > 0);
  }
  return sorted;
}

// Splits a utility payment across meters: water first, then electricity, any excess
// on water (it is kept as credit there).
export function splitUtilityPayment(
  amountKsh: number,
  balances: { water: number; electricity: number }
): Array<{ utilityType: "water" | "electricity"; amountKsh: number }> {
  const amount = Math.max(0, Math.round(amountKsh));
  if (amount <= 0) {
    return [];
  }
  const toElectricity = Math.min(
    Math.max(0, balances.electricity),
    Math.max(0, amount - Math.max(0, balances.water))
  );
  const toWater = amount - toElectricity;
  return [
    ...(toWater > 0 ? [{ utilityType: "water" as const, amountKsh: toWater }] : []),
    ...(toElectricity > 0 ? [{ utilityType: "electricity" as const, amountKsh: toElectricity }] : [])
  ];
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shortDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function wholeNumber(value: string): number | null {
  const text = value.replace(/[^0-9]/g, "");
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

interface BalancesResponse {
  data?: BalanceRow[] | BalanceRow | null;
  adjustmentsAvailable?: boolean;
  error?: string;
}

export interface BalancesViewDeps {
  root: HTMLElement;
  requestJson: (url: string, options?: RequestInit) => Promise<BalancesResponse>;
  getBuildingId: () => string;
  formatCurrency: (value: number) => string;
  onStatus: (message: string) => void;
  onError: (error: unknown, fallback: string) => void;
  onSaved?: () => void;
  // Show a single house (the quick-action modal) instead of the whole building.
  onlyHouse?: () => string;
}

type OpenPanel = { houseNumber: string; panel: "pay" | "adjust" } | null;

export function createBalancesView(deps: BalancesViewDeps) {
  const listEl = deps.root.querySelector<HTMLElement>("[data-balances-list]");
  const summaryEl = deps.root.querySelector<HTMLElement>("#balances-summary");
  const filterButtons = [...deps.root.querySelectorAll<HTMLButtonElement>("[data-balance-filter]")];

  let buildingId = "";
  let rows: BalanceRow[] = [];
  let filter: BalanceFilter = "all";
  let openPanel: OpenPanel = null;
  let adjustmentsAvailable = true;
  const busy = new Set<string>();

  const rowFor = (houseNumber: string) => rows.find((row) => row.houseNumber === houseNumber);
  const money = (value: number) => deps.formatCurrency(Math.max(0, Number(value) || 0));

  function renderSummary() {
    if (!summaryEl) {
      return;
    }
    const occupied = rows.filter((row) => row.hasActiveResident);
    const checked = occupied.filter((row) => isCheckedToday(row)).length;
    const owing = rows.reduce((sum, row) => sum + row.totalKsh, 0);
    summaryEl.innerHTML = [
      `<span class="mr-chip ${checked === occupied.length && occupied.length > 0 ? "is-ok" : ""}">${checked} of ${occupied.length} checked today</span>`,
      `<span class="mr-chip is-rate">${escapeHtml(money(owing))} owed in total</span>`
    ].join("");
    filterButtons.forEach((button) => {
      const active = button.dataset.balanceFilter === filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderPayPanel(row: BalanceRow) {
    const hasUtilities = row.utilities.total > 0;
    return `<form class="bal-panel" data-panel="pay">
      <div class="bal-fields">
        <label>Amount (KSh)
          <input name="amount" class="bal-input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" required />
        </label>
        <label>For
          <select name="target" class="bal-input">
            <option value="rent"${hasUtilities && !row.rent ? "" : " selected"}>Rent</option>
            <option value="utility"${hasUtilities && !row.rent ? " selected" : ""}>Utilities</option>
          </select>
        </label>
        <label>Method
          <select name="provider" class="bal-input">
            <option value="cash">Cash</option>
            <option value="mpesa">M-PESA</option>
            <option value="bank">Bank</option>
          </select>
        </label>
        <label>M-PESA / bank code
          <input name="reference" class="bal-input" type="text" maxlength="40" autocomplete="off" placeholder="Optional for cash" />
        </label>
      </div>
      <div class="bal-panel-actions">
        <button type="button" class="ghost-btn" data-action="close">Cancel</button>
        <button type="submit">Record payment</button>
      </div>
    </form>`;
  }

  function renderAdjustPanel(row: BalanceRow) {
    if (!adjustmentsAvailable) {
      return `<p class="bal-note">Adjustments need the database connection, which is unavailable right now.</p>`;
    }
    return `<form class="bal-panel" data-panel="adjust">
      <p class="bal-note">The tenant will see this as "Manually adjusted" with your reason.</p>
      <div class="bal-fields">
        ${
          row.rent
            ? `<label>Rent owed (KSh)
                <input name="rent" class="bal-input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${escapeHtml(row.rent.balanceKsh)}" />
              </label>`
            : ""
        }
        <label>Utilities owed (KSh)
          <input name="utility" class="bal-input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${escapeHtml(row.utilities.total)}" />
        </label>
        <label class="bal-wide">Reason
          <input name="reason" class="bal-input" type="text" maxlength="200" autocomplete="off" placeholder="e.g. Paid KSh 2,000 cash in Sept, confirmed with tenant" required />
        </label>
      </div>
      <div class="bal-panel-actions">
        <button type="button" class="ghost-btn" data-action="close">Cancel</button>
        <button type="submit">Save balance</button>
      </div>
    </form>`;
  }

  function renderCard(row: BalanceRow) {
    const checked = isCheckedToday(row);
    const panel =
      openPanel && openPanel.houseNumber === row.houseNumber
        ? openPanel.panel === "pay"
          ? renderPayPanel(row)
          : renderAdjustPanel(row)
        : "";
    const adjustment = row.lastAdjustment
      ? `<p class="bal-tag">Manually adjusted · ${escapeHtml(shortDate(row.lastAdjustment.adjustedAt))} · ${
          row.lastAdjustment.kind === "rent" ? "Rent" : "Utilities"
        } ${escapeHtml(money(row.lastAdjustment.previousKsh))} → ${escapeHtml(
          money(row.lastAdjustment.newKsh)
        )}${row.lastAdjustment.reason ? ` · ${escapeHtml(row.lastAdjustment.reason)}` : ""}</p>`
      : "";
    const isBusy = busy.has(row.houseNumber);
    return `<article class="bal-card${checked ? " is-checked" : ""}${row.totalKsh > 0 ? " is-owing" : ""}" data-house="${escapeHtml(row.houseNumber)}">
      <header class="bal-card-head">
        <div class="mr-room">
          <strong>${escapeHtml(row.houseNumber)}</strong>
          <span>${escapeHtml(row.residentName || (row.hasActiveResident ? "" : "Vacant"))}${
            row.residentPhone ? ` · ${escapeHtml(row.residentPhone)}` : ""
          }</span>
        </div>
        <span class="bal-check ${checked ? "is-done" : ""}">${checked ? "Checked today" : row.checkedAt ? `Checked ${escapeHtml(shortDate(row.checkedAt))}` : "Not checked"}</span>
      </header>
      <dl class="bal-figures">
        <div><dt>Rent</dt><dd>${row.rent ? escapeHtml(money(row.rent.balanceKsh)) : "Not set up"}</dd></div>
        <div><dt>Utilities</dt><dd>${escapeHtml(money(row.utilities.total))}</dd></div>
        <div class="bal-total"><dt>Total</dt><dd>${escapeHtml(money(row.totalKsh))}</dd></div>
      </dl>
      ${adjustment}
      ${panel}
      ${
        panel
          ? ""
          : `<div class="bal-actions">
              <button type="button" data-action="pay"${isBusy ? " disabled" : ""}>Record payment</button>
              <button type="button" class="ghost-btn" data-action="adjust"${isBusy ? " disabled" : ""}>Set balance</button>
              ${
                checked
                  ? ""
                  : `<button type="button" class="ghost-btn" data-action="check"${isBusy ? " disabled" : ""}>Mark checked</button>`
              }
            </div>`
      }
    </article>`;
  }

  function render() {
    renderSummary();
    if (!listEl) {
      return;
    }
    if (!buildingId) {
      listEl.innerHTML = `<p class="mr-empty">Choose a building at the top.</p>`;
      return;
    }
    const onlyHouse = deps.onlyHouse?.() ?? "";
    const visible = onlyHouse
      ? rows.filter((row) => row.houseNumber.toUpperCase() === onlyHouse.toUpperCase())
      : filterRows(rows, filter);
    listEl.innerHTML = visible.length
      ? visible.map(renderCard).join("")
      : `<p class="mr-empty">${
          filter === "unchecked"
            ? "Every occupied house has been checked today."
            : filter === "owing"
              ? "No house owes anything."
              : "No houses in this building yet."
        }</p>`;
    const focusInput = listEl.querySelector<HTMLInputElement>(".bal-panel input");
    focusInput?.focus();
  }

  async function load() {
    const nextBuildingId = String(deps.getBuildingId() ?? "").trim();
    if (nextBuildingId !== buildingId) {
      openPanel = null;
    }
    buildingId = nextBuildingId;
    if (!buildingId) {
      rows = [];
      render();
      return;
    }
    if (listEl && rows.length === 0) {
      listEl.innerHTML = `<p class="mr-empty">Loading houses...</p>`;
    }
    const payload = await deps.requestJson(
      `/api/landlord/buildings/${encodeURIComponent(buildingId)}/balances`,
      { cache: "no-store" }
    );
    rows = Array.isArray(payload.data) ? payload.data : [];
    adjustmentsAvailable = payload.adjustmentsAvailable !== false;
    render();
  }

  function replaceRow(updated: BalanceRow | null | undefined) {
    if (!updated) {
      return;
    }
    rows = rows.map((row) => (row.houseNumber === updated.houseNumber ? updated : row));
  }

  async function withBusy(houseNumber: string, work: () => Promise<void>) {
    if (busy.has(houseNumber)) {
      return;
    }
    busy.add(houseNumber);
    try {
      await work();
    } finally {
      busy.delete(houseNumber);
      render();
    }
  }

  async function markChecked(houseNumber: string) {
    await withBusy(houseNumber, async () => {
      try {
        const payload = await deps.requestJson(
          `/api/landlord/buildings/${encodeURIComponent(buildingId)}/houses/${encodeURIComponent(houseNumber)}/balance-adjustments`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ markChecked: true })
          }
        );
        replaceRow(payload.data as BalanceRow);
        deps.onStatus(`House No. ${houseNumber} marked as checked.`);
      } catch (error) {
        deps.onError(error, `Unable to mark house ${houseNumber} as checked.`);
      }
    });
  }

  async function saveAdjustment(houseNumber: string, form: HTMLFormElement) {
    const row = rowFor(houseNumber);
    if (!row) {
      return;
    }
    const data = new FormData(form);
    const reason = String(data.get("reason") ?? "").trim();
    const rentValue = row.rent ? wholeNumber(String(data.get("rent") ?? "")) : null;
    const utilityValue = wholeNumber(String(data.get("utility") ?? ""));
    const body: Record<string, unknown> = { reason, markChecked: true };
    if (row.rent && rentValue !== null && rentValue !== row.rent.balanceKsh) {
      body.rentBalanceKsh = rentValue;
    }
    if (utilityValue !== null && utilityValue !== row.utilities.total) {
      body.utilityBalanceKsh = utilityValue;
    }
    if (body.rentBalanceKsh === undefined && body.utilityBalanceKsh === undefined) {
      deps.onError(new Error("Change rent or utilities owed before saving."), "Nothing changed.");
      return;
    }
    if (reason.length < 3) {
      deps.onError(new Error("Give a short reason for the adjustment."), "Reason required.");
      return;
    }

    await withBusy(houseNumber, async () => {
      try {
        const payload = await deps.requestJson(
          `/api/landlord/buildings/${encodeURIComponent(buildingId)}/houses/${encodeURIComponent(houseNumber)}/balance-adjustments`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body)
          }
        );
        replaceRow(payload.data as BalanceRow);
        openPanel = null;
        deps.onStatus(`House No. ${houseNumber} balance saved.`);
        deps.onSaved?.();
      } catch (error) {
        deps.onError(error, `Unable to adjust house ${houseNumber}.`);
      }
    });
  }

  async function recordPayment(houseNumber: string, form: HTMLFormElement) {
    const row = rowFor(houseNumber);
    if (!row) {
      return;
    }
    const data = new FormData(form);
    const amount = wholeNumber(String(data.get("amount") ?? ""));
    const target = String(data.get("target") ?? "rent");
    const provider = String(data.get("provider") ?? "cash");
    const reference = String(data.get("reference") ?? "").trim().toUpperCase();
    if (!amount || amount <= 0) {
      deps.onError(new Error("Enter the amount paid."), "Amount required.");
      return;
    }
    if (provider !== "cash" && !reference) {
      deps.onError(new Error("Enter the M-PESA or bank code for this payment."), "Code required.");
      return;
    }

    await withBusy(houseNumber, async () => {
      try {
        const house = encodeURIComponent(houseNumber);
        const query = `buildingId=${encodeURIComponent(buildingId)}`;
        if (target === "rent") {
          await deps.requestJson(`/api/landlord/rent/${house}/payments?${query}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              buildingId,
              amountKsh: amount,
              provider,
              providerReference: reference || undefined
            })
          });
        } else {
          const parts = splitUtilityPayment(amount, row.utilities);
          for (const [index, part] of parts.entries()) {
            await deps.requestJson(
              `/api/landlord/utilities/${part.utilityType}/${house}/payments?${query}`,
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  buildingId,
                  amountKsh: part.amountKsh,
                  provider,
                  providerReference: reference
                    ? parts.length > 1
                      ? `${reference}-${index + 1}`
                      : reference
                    : undefined,
                  note: "Recorded on the Balances page."
                })
              }
            );
          }
        }
        openPanel = null;
        deps.onStatus(`Recorded ${money(amount)} ${target === "rent" ? "rent" : "utility"} payment for house ${houseNumber}.`);
        deps.onSaved?.();
        await load();
      } catch (error) {
        deps.onError(error, `Unable to record the payment for house ${houseNumber}.`);
      }
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.balanceFilter;
      filter = next === "all" || next === "owing" ? next : "unchecked";
      openPanel = null;
      render();
    });
  });

  listEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const houseNumber = target.closest<HTMLElement>("[data-house]")?.dataset.house;
    const action = target.dataset.action;
    if (!houseNumber || !action) {
      return;
    }
    if (action === "pay" || action === "adjust") {
      openPanel = { houseNumber, panel: action };
      render();
    } else if (action === "close") {
      openPanel = null;
      render();
    } else if (action === "check") {
      void markChecked(houseNumber);
    }
  });

  listEl?.addEventListener("input", (event) => {
    const input = event.target;
    if (
      input instanceof HTMLInputElement &&
      ["amount", "rent", "utility"].includes(input.name)
    ) {
      const cleaned = input.value.replace(/[^0-9]/g, "");
      if (cleaned !== input.value) {
        input.value = cleaned;
      }
    }
  });

  listEl?.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    event.preventDefault();
    const houseNumber = form.closest<HTMLElement>("[data-house]")?.dataset.house;
    if (!houseNumber) {
      return;
    }
    if (form.dataset.panel === "pay") {
      void recordPayment(houseNumber, form);
    } else {
      void saveAdjustment(houseNumber, form);
    }
  });

  async function open(houseNumber: string, panel: "pay" | "adjust" | null = null) {
    rows = [];
    openPanel = panel ? { houseNumber: houseNumber.toUpperCase(), panel } : null;
    await load();
    const row = rows.find((item) => item.houseNumber.toUpperCase() === houseNumber.toUpperCase());
    if (row && panel) {
      openPanel = { houseNumber: row.houseNumber, panel };
      render();
    }
  }

  return { load, open };
}
