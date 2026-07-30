// FEATURE:      Dynamic room-survey paired export
// SURFACE:      finaliseDynamicSurvey(options, deps)
// WHY TOGETHER: Route finalisation, capture freeze, V3 authoring, identity, and files are one boundary.
// STATE:        None; the caller retains polling and live-capture ownership
// RULES:        Capture freezes after routing; definition and result share the exact route identity.
// PROVENANCE:   Dynamic room-survey Runner request

import {
  authorSurveyDefinitionV3,
} from "../../domain/definition-authoring-v3.mjs";
import {
  buildSurveyResultV3,
  resultFilename,
} from "../../domain/runner-result-v3.mjs";
import {
  validateSurveyDefinitionV3,
} from "../../domain/survey-definition-v3.mjs";
import {
  validateSurveyResultV3,
} from "../../domain/survey-result-v3.mjs";
import { dynamicDefinitionInput } from "./dynamic-survey-definition.mjs";

export async function finaliseDynamicSurvey(options, deps = {}) {
  if (typeof options?.routeAuthor?.finalise !== "function") {
    throw new TypeError("routeAuthor.finalise: must be a function");
  }
  if (typeof options.captureAfterRoute !== "function") {
    throw new TypeError("captureAfterRoute: must be a function");
  }
  const plan = await options.routeAuthor.finalise({
    retryFailed: options.retryFailed ?? true,
  });
  if (plan.stops.length < 2) {
    throw new Error("Dynamic survey requires at least two checked-in rooms");
  }
  const capture = await options.captureAfterRoute(structuredClone(plan));
  const authoredInput = dynamicDefinitionInput(options, plan);
  const definition = await authorSurveyDefinitionV3(authoredInput, {
    cryptoRef: deps.cryptoRef,
    now: deps.now,
  });
  assertValid(
    "Dynamic definition",
    validateSurveyDefinitionV3(definition),
  );
  const result = buildSurveyResultV3({
    ...capture,
    definition,
  });
  assertValid("Dynamic result", validateSurveyResultV3(result));
  assertDynamicExportIdentity(definition, result);
  return {
    definition,
    result,
    files: {
      definition: jsonFile(
        `${safeName(definition.meta.surveyId)}.definition.v3.json`,
        definition,
      ),
      result: jsonFile(resultFilename(result), result),
    },
  };
}

export function assertDynamicExportIdentity(definition, result) {
  const pairs = [
    ["surveyId", definition.meta.surveyId, result.run.surveyId],
    ["routeId", definition.route.routeId, result.run.routeId],
    ["routeHash", definition.route.hash, result.run.routeHash],
    ["customerId", definition.meta.customerId, result.run.customerId],
    ["campusId", definition.meta.campusId, result.run.campusId],
    ["sourceId", definition.meta.positionSourceId, result.run.sourceId],
  ];
  const mismatch = pairs.find(([, expected, actual]) => expected !== actual);
  if (mismatch) {
    throw new Error(
      `Dynamic export identity mismatch: result.run.${mismatch[0]}`,
    );
  }
  if (JSON.stringify(definition.route) !== JSON.stringify(result.route)) {
    throw new Error("Dynamic export identity mismatch: embedded route");
  }
}

function assertValid(label, validation) {
  if (!validation.valid) {
    throw new Error(`${label} is invalid:\n${validation.errors.join("\n")}`);
  }
}

function jsonFile(filename, value) {
  return Object.freeze({
    filename,
    content: `${JSON.stringify(value, null, 2)}\n`,
    type: "application/json",
  });
}

function safeName(value) {
  return String(value)
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "survey";
}
