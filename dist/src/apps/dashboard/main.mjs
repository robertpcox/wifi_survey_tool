// FEATURE:      Customer-filtered survey dashboard
// SURFACE:      bootDashboard(options), browser module entry
// WHY TOGETHER: Dashboard dependency composition and automatic boot belong at the app boundary.
// STATE:        One mounted dashboard promise
// RULES:        Load only the customer manifest named by the current URL.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { createManifestSource } from "../../adapters/manifest-source.mjs";
import {
  customerIdFromUrl,
  reportPlayerBaseFromUrl,
} from "../../domain/dashboard-selection.mjs";
import { mountDashboard } from "../../features/dashboard/dashboard.mjs";

export function bootDashboard({
  documentRef = document,
  locationRef = globalThis.location,
  manifestSource = createManifestSource(),
} = {}) {
  return mountDashboard({
    root: documentRef.querySelector("[data-dashboard-root]"),
    customerId: customerIdFromUrl(locationRef.href),
    manifestSource,
    reportPlayerBase: reportPlayerBaseFromUrl(locationRef.href),
  });
}

if (typeof document !== "undefined") bootDashboard();
