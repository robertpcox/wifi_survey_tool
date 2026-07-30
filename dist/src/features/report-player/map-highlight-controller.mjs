// FEATURE:      Report Player map highlight choice
// SURFACE:      bindMapHighlight(options)
// WHY TOGETHER: Mode selection and its one visible limit/legend must change as one control.
// STATE:        Selected sticky or accuracy highlight
// RULES:        Only the active threshold is presented; every change is explicit to the caller.
// PROVENANCE:   Scope/steps/05b_improve_report.md

export function bindMapHighlight({
  root,
  initialKind = "sticky",
  onChange = () => {},
}) {
  const input = root.querySelector("[data-map-highlight]");
  let kind = normalize(input?.value ?? initialKind);
  if (!input) throw new Error("Map highlight control is required");

  input.addEventListener("change", () => {
    kind = normalize(input.value);
    updatePresentation();
    onChange(kind);
  });

  function updatePresentation() {
    input.value = kind;
    root.querySelectorAll("[data-highlight-threshold]").forEach(label => {
      label.hidden = label.dataset.highlightThreshold !== kind;
    });
    root.querySelectorAll("[data-highlight-legend]").forEach(legend => {
      legend.hidden = legend.dataset.highlightLegend !== kind;
    });
  }

  updatePresentation();
  return Object.freeze({
    get kind() { return kind; },
  });
}

function normalize(value) {
  return value === "accuracy" ? "accuracy" : "sticky";
}
