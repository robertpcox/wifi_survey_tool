export function downloadFile(
  filename,
  content,
  type,
  documentRef = document,
  urlRef = URL,
) {
  const blob = new Blob([content], { type });
  const anchor = documentRef.createElement("a");
  anchor.href = urlRef.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  urlRef.revokeObjectURL(anchor.href);
}
