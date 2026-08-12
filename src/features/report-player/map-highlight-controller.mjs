// FEATURE:      Report Player map highlight choice
// SURFACE:      bindMapHighlight(options)
// WHY TOGETHER: Mode selection and its one visible limit/legend must change as one control.
// STATE:        Selected report highlight
// RULES:        Only the active threshold is presented; every change is explicit to the caller.
// PROVENANCE:   Scope/steps/05b_improve_report.md

export function bindMapHighlight({
  root,
  initialKind = "sticky",
  onChange = () => {},
}) {
  const input = root.querySelector("[data-map-highlight]");
  let kind = normalize(initialKind ?? input?.value);
  if (!input) throw new Error("Map highlight control is required");

  input.addEventListener("change", () => {
    setKind(input.value);
  });

  function setKind(value) {
    kind = normalize(value);
    updatePresentation();
    onChange(kind);
    return kind;
  }

  function updatePresentation() {
    input.value = kind;
    root.querySelectorAll("[data-highlight-threshold]").forEach(label => {
      const thresholdKind = kind === "freeze" ? "sticky" : kind;
      label.hidden = label.dataset.highlightThreshold !== thresholdKind;
    });
    root.querySelectorAll("[data-highlight-legend]").forEach(legend => {
      legend.hidden = legend.dataset.highlightLegend !== kind;
    });
  }

  updatePresentation();
  return Object.freeze({
    setKind,
    get kind() { return kind; },
  });
}

function normalize(value) {
  if (value === "freeze") return "freeze";
  if (value === "room") return "room";
  if (value === "zone") return "zone";
  if (value === "lag") return "lag";
  return value === "accuracy" ? "accuracy" : "sticky";
}
