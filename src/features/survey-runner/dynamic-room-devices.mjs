// FEATURE:      Dynamic room multi-device entry options
// SURFACE:      runnerExtraDevices, runnerDynamicDwellSeconds, dynamicEntryIssues, deviceLabelSlug
// WHY TOGETHER: Optional extra devices and run-level dwell parse from one entry form.
// STATE:        None
// RULES:        Extra devices need both label and client IP; the primary device stays untouched.
// PROVENANCE:   Dynamic room multi-device capture request

import {
  DYNAMIC_DWELL_CHOICES_SECONDS,
  DYNAMIC_DWELL_DEFAULT_SECONDS,
} from "../../domain/dynamic-room-session-v3.mjs";
import { SUPPORTED_SPACINGS_M } from "../../domain/route-contract.mjs";

export const DYNAMIC_MARK_SPACING_DEFAULT_M = 5;

export const EXTRA_DEVICE_FIELDS = Object.freeze([
  Object.freeze(["extraDevice1Label", "extraDevice1Ip"]),
  Object.freeze(["extraDevice2Label", "extraDevice2Ip"]),
]);

export function runnerExtraDevices(entry) {
  const devices = [];
  EXTRA_DEVICE_FIELDS.forEach(([labelField, ipField], index) => {
    const label = clean(entry?.[labelField]);
    const clientIp = clean(entry?.[ipField]);
    if (!label || !clientIp) return;
    devices.push({ label, clientIp, slug: deviceLabelSlug(label, index) });
  });
  return devices;
}

export function deviceLabelSlug(label, index = 0) {
  const slug = String(label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `device-${index + 2}`;
}

export function runnerDynamicDwellSeconds(entry) {
  const seconds = Number(clean(entry?.dynamicDwellSeconds));
  return DYNAMIC_DWELL_CHOICES_SECONDS.includes(seconds)
    ? seconds
    : DYNAMIC_DWELL_DEFAULT_SECONDS;
}

export function runnerDynamicMarkSpacingM(entry) {
  const value = clean(entry?.dynamicMarkSpacingM);
  const spacing = Number(value);
  return value && SUPPORTED_SPACINGS_M.includes(spacing)
    ? spacing
    : DYNAMIC_MARK_SPACING_DEFAULT_M;
}

export function dynamicEntryIssues(entry) {
  const issues = [];
  const dwell = clean(entry?.dynamicDwellSeconds);
  if (dwell && !DYNAMIC_DWELL_CHOICES_SECONDS.includes(Number(dwell))) {
    issues.push("dynamicDwellSeconds is unsupported");
  }
  const proxyBase = clean(entry?.proxyBase);
  if (proxyBase && !/^(https?:\/\/|\/)/i.test(proxyBase)) {
    issues.push("proxyBase must be an absolute URL or path");
  }
  const spacing = clean(entry?.dynamicMarkSpacingM);
  if (spacing && !SUPPORTED_SPACINGS_M.includes(Number(spacing))) {
    issues.push("dynamicMarkSpacingM is unsupported");
  }
  for (const [labelField, ipField] of EXTRA_DEVICE_FIELDS) {
    const label = clean(entry?.[labelField]);
    const clientIp = clean(entry?.[ipField]);
    if (label && !clientIp) issues.push(`${ipField} is required`);
    if (!label && clientIp) issues.push(`${labelField} is required`);
  }
  return issues;
}

function clean(value) {
  return String(value ?? "").trim();
}
