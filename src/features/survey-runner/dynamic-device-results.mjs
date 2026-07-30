// FEATURE:      Dynamic room per-device result export
// SURFACE:      dynamicDeviceResultFiles(capture, definition), deviceResultFilename, dynamicJsonFile
// WHY TOGETHER: Every polled device must publish one standard V3 result for one shared route.
// STATE:        None
// RULES:        Device files reuse the run evidence; only identity, polls, and sample ids differ.
// PROVENANCE:   Dynamic room multi-device capture request

import {
  buildSurveyResultV3,
  resultFilename,
} from "../../domain/runner-result-v3.mjs";
import { deviceLabelSlug } from "./dynamic-room-devices.mjs";

export function dynamicDeviceResultFiles(capture, definition) {
  return (capture.extraDevices ?? [])
    .filter(device => (device.polls ?? []).length > 0)
    .map((device, index) => {
      const result = buildSurveyResultV3({
        ...capture,
        definition,
        entry: {
          ...capture.entry,
          deviceName: device.label,
          clientIp: device.clientIp,
        },
        preflight: {
          ...capture.preflight,
          sampleId: device.polls[0].id,
        },
        polls: device.polls,
        resultId: device.resultId,
      });
      const slug = device.slug ?? deviceLabelSlug(device.label, index);
      return {
        device: { label: device.label, clientIp: device.clientIp },
        result,
        file: dynamicJsonFile(deviceResultFilename(result, slug), result),
      };
    });
}

export function deviceResultFilename(result, slug) {
  return resultFilename(result)
    .replace(/\.result\.v3\.json$/, `__${slug}.result.v3.json`);
}

export function dynamicJsonFile(filename, value) {
  return Object.freeze({
    filename,
    content: `${JSON.stringify(value, null, 2)}\n`,
    type: "application/json",
  });
}
