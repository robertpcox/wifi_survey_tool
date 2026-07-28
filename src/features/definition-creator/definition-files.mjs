import {
  assertCreatorCampus,
  fieldsFromDefinition,
  parseCreatorFields,
} from "./form.mjs";
import { deriveMapCoverage } from "./map-coverage.mjs";

export function createDefinitionFiles(options) {
  const {
    downloadDefinition,
    readDefinition,
    render,
    state,
    view,
    workflow,
    configuredCampusId,
  } = options;

  async function exportDefinition() {
    if (!state.planLocked) {
      throw new Error("Lock the checkpoint plan before exporting.");
    }
    if (state.stops.length < 2) {
      throw new Error("route.stops: add at least two stops");
    }
    if (typeof downloadDefinition !== "function") {
      throw new Error("Definition download is unavailable.");
    }
    const coverage = deriveMapCoverage({
      fallbackMeta: state.imported?.previousDefinition?.meta,
      legs: state.route.legs,
      stops: state.stops,
    });
    const parsed = parseCreatorFields(view.readFields(), coverage);
    assertCreatorCampus(parsed.meta, configuredCampusId);
    const definition = await workflow.author(parsed, {
      stops: state.stops,
      legs: state.route.legs,
      checkpoints: state.route.checkpoints,
    }, state.imported);
    const filename = `${safeName(definition.meta.surveyId)}.definition.v3.json`;
    await downloadDefinition(filename, `${JSON.stringify(definition, null, 2)}\n`);
    state.imported = workflow.importDefinition(definition);
    view.setStatus(`Validated and exported ${filename}.`, "ok");
    return definition;
  }

  async function importDefinition() {
    const file = view.importFile();
    if (!file) return null;
    if (typeof readDefinition !== "function") {
      throw new Error("Definition import is unavailable.");
    }
    const source = await readDefinition(file);
    const definition = typeof source === "string" ? JSON.parse(source) : source;
    assertCreatorCampus(definition.meta, configuredCampusId);
    const imported = workflow.importDefinition(definition);
    state.imported = imported;
    state.stops = structuredClone(imported.stops);
    state.plan = {
      spacingM: imported.checkpointSpacingM,
      midLegDwellSeconds: imported.midLegDwellSeconds,
      legEndDwellSeconds: imported.legEndDwellSeconds,
    };
    state.planLocked = true;
    state.selectedIndex = -1;
    state.shortWarningDismissed = false;
    state.route = workflow.reviewImported(imported);
    view.writeFields(fieldsFromDefinition(definition));
    view.setPlanLocked(true);
    render();
    view.setStatus(`Imported ${definition.meta.surveyId} without rerouting.`, "ok");
    return definition;
  }

  return { exportDefinition, importDefinition };
}

function safeName(value) {
  return String(value)
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "survey";
}
