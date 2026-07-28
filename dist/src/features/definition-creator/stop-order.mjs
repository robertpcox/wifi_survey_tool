export function reorderCreatorStops(
  stops,
  index,
  offset,
  selectedIndex = -1,
) {
  if (!Array.isArray(stops)) throw new TypeError("stops: must be an array");
  const from = Number(index);
  const change = Number(offset);
  if (!Number.isInteger(from) || ![-1, 1].includes(change)) {
    throw new TypeError("stop reorder: requires an index and one-step direction");
  }
  const to = from + change;
  if (!stops[from]) throw new Error(`stop ${from + 1}: does not exist`);
  if (!stops[to]) {
    throw new Error(`stop ${from + 1}: cannot move beyond the route boundary`);
  }
  const ordered = [...stops];
  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
  const selection = selectedIndex === from
    ? to
    : selectedIndex === to ? from : selectedIndex;
  return { movedStop: ordered[to], selectedIndex: selection, stops: ordered };
}
