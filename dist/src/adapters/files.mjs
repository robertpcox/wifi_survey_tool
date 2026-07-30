export { downloadFile } from "./download.mjs";

export async function readJsonFile(file) {
  return JSON.parse(await file.text());
}
