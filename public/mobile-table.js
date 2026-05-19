function normalizeHeaderLabel(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function syncResponsiveTable(table) {
  if (!(table instanceof HTMLTableElement)) {
    return;
  }

  const headerCells = [...table.querySelectorAll("thead th")];
  const headers = headerCells.map((cell) => normalizeHeaderLabel(cell.textContent));
  const bodyRows = [...table.querySelectorAll("tbody tr")];

  table.dataset.mobileCards = headers.length > 0 ? "true" : "false";

  bodyRows.forEach((row) => {
    const cells = [...row.children].filter((cell) => cell instanceof HTMLTableCellElement);
    const hasSingleSpanningCell =
      cells.length === 1 && cells[0] instanceof HTMLTableCellElement && cells[0].colSpan > 1;

    row.classList.toggle("table-row-empty", hasSingleSpanningCell);

    cells.forEach((cell, index) => {
      if (!(cell instanceof HTMLTableCellElement)) {
        return;
      }

      cell.classList.toggle("table-cell-full", hasSingleSpanningCell);

      if (hasSingleSpanningCell) {
        cell.removeAttribute("data-label");
        return;
      }

      const label = headers[index] ?? "";
      if (label) {
        cell.dataset.label = label;
      } else {
        cell.removeAttribute("data-label");
      }
    });
  });
}

export function initResponsiveTables(root = document) {
  const tables = [...root.querySelectorAll(".table-wrap table")];

  tables.forEach((table) => {
    if (!(table instanceof HTMLTableElement)) {
      return;
    }

    syncResponsiveTable(table);

    const observer = new MutationObserver(() => {
      syncResponsiveTable(table);
    });

    observer.observe(table, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });
}
