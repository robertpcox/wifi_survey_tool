// FEATURE:      Customer-filtered survey dashboard
// SURFACE:      bootDashboard(options), browser module entry
// WHY TOGETHER: Dashboard dependency composition and automatic boot belong at the app boundary.
// STATE:        One mounted dashboard promise
// RULES:        Load only the customer manifest named by the current URL.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { createManifestSource } from "../../adapters/manifest-source.mjs";
import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import {
  customerIdFromUrl,
  reportPlayerBaseFromUrl,
} from "../../domain/dashboard-selection.mjs";
import { bindCaptureConvertPanel } from "../../features/dashboard/capture-convert-bind.mjs";
import { bindDashboardMapAccess } from "../../features/dashboard/dashboard-map-access.mjs";
import { mountDashboard } from "../../features/dashboard/dashboard.mjs";

export function bootDashboard({
  documentRef = document,
  locationRef = globalThis.location,
  manifestSource = createManifestSource(),
  credentials = createMemoryCredentialStore(),
  windowRef = globalThis.window,
} = {}) {
  const customerId = customerIdFromUrl(locationRef.href);
  const root = documentRef.querySelector("[data-dashboard-root]");
  void bindCaptureConvertPanel({
    root: documentRef.querySelector("[data-capture-convert-root]"),
    customerId,
    manifestSource,
  });
  return mountDashboard({
    root,
    customerId,
    manifestSource,
    reportPlayerBase: reportPlayerBaseFromUrl(locationRef.href),
  }).then(model => {
    if (model) bindDashboardMapAccess({ root, credentials, windowRef });
    return model;
  });
}

if (typeof document !== "undefined") bootDashboard();
