// FEATURE:      Dynamic room paired file download
// SURFACE:      downloadDynamicRoomFile(output, kind, options)
// WHY TOGETHER: Both standard JSON files use the same browser/injected download seam.
// STATE:        None
// RULES:        Only finalised definition/result files can be downloaded.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import { downloadFile as browserDownload } from "../../adapters/files.mjs";

export function downloadDynamicRoomFile(output, kind, options = {}) {
  const file = output?.files?.[kind];
  if (!file) return null;
  const download = options.downloadFile
    ?? ((name, content, type) => browserDownload(
      name,
      content,
      type,
      options.documentRef,
    ));
  download(file.filename, file.content, file.type);
  return file;
}
