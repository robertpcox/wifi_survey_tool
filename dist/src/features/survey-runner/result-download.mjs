import { downloadFile as browserDownload } from "../../adapters/files.mjs";
import {
  buildSurveyResultV3,
  resultFilename,
} from "../../domain/runner-result-v3.mjs";

export function downloadRunnerResult(options) {
  const exportedAt = options.nowDate().toISOString();
  const result = buildSurveyResultV3({
    definition: options.definition,
    entry: options.entry,
    preflight: options.preflight,
    polls: options.polls,
    checkIns: options.run.progress.checkIns,
    events: options.run.events,
    notes: options.run.notes,
    startedAt: options.run.startedAt,
    stoppedAt: options.run.stoppedAt,
    exportedAt,
    completionStatus: options.run.completionStatus,
    operatorComment: options.operatorComment,
    resultId: options.createId(),
  });
  const filename = resultFilename(result);
  const download = options.downloadFile
    ?? ((name, content, type) =>
      browserDownload(name, content, type, options.documentRef));
  download(filename, `${JSON.stringify(result, null, 2)}\n`, "application/json");
  return { filename, result };
}
