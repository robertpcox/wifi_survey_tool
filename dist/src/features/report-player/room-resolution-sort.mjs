// FEATURE:      Room outcome table sorting
// SURFACE:      bindRoomResolutionSort(root), compareRoomRows(left, right, key, direction)
// WHY TOGETHER: Sort buttons, ARIA state, and stable row ordering are one interaction.
// STATE:        Bound buttons and each table's active sort direction
// RULES:        Rebinding after view refresh never attaches a button listener twice.
// PROVENANCE:   Consolidated MazeMap room report

const NUMERIC = new Set(["level", "resolution", "inside", "outside", "visits"]);
const bound = new WeakSet();

export function bindRoomResolutionSort(root) {
  root.querySelectorAll?.("[data-room-sort]").forEach(button => {
    if (bound.has(button)) return;
    bound.add(button);
    button.addEventListener("click", () => sortTable(button));
  });
}

export function compareRoomRows(left, right, key, direction = "ascending") {
  const first = value(left, key);
  const second = value(right, key);
  const compared = NUMERIC.has(key)
    ? number(first) - number(second)
    : String(first).localeCompare(String(second), undefined, {
      numeric: true, sensitivity: "base",
    });
  return direction === "descending" ? -compared : compared;
}

function sortTable(button) {
  const table = button.closest("table");
  const header = button.closest("th");
  if (!table || !header) return;
  const direction = header.getAttribute("aria-sort") === "ascending"
    ? "descending" : "ascending";
  table.querySelectorAll("thead th[aria-sort]").forEach(item => {
    item.setAttribute("aria-sort", item === header ? direction : "none");
  });
  const body = table.querySelector("tbody");
  const rows = [...(body?.rows ?? [])];
  rows.map((row, index) => ({ row, index }))
    .sort((left, right) => compareRoomRows(
      left.row, right.row, button.dataset.roomSort, direction,
    ) || left.index - right.index)
    .forEach(({ row }) => body.append(row));
}

function value(row, key) {
  const name = `room${key[0].toUpperCase()}${key.slice(1)}`;
  return row?.dataset?.[name] ?? "";
}

function number(valueToParse) {
  const result = Number(valueToParse);
  return Number.isFinite(result) ? result : Number.NEGATIVE_INFINITY;
}
