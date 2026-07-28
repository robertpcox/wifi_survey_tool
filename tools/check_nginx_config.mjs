import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(new URL("../", import.meta.url).pathname);
const deploymentConfig = resolve(repositoryRoot, "deployment/served-nginx.json");

export function nginxConfigFindings(text) {
  const findings = [];
  const firstServer = text.indexOf("server {");
  const firstCustomTypes = text.indexOf("types {");
  const requirements = [
    [/\binclude\s+\/etc\/nginx\/mime\.types\s*;/, "system mime types are not included"],
    [
      /\blocation\s+~\*?\s+[^{]*\\\.mjs[^{]*\{[^}]*\btypes\s*\{[^}]*\bapplication\/javascript\s+mjs\s*;/s,
      ".mjs is not mapped to application/javascript in a dedicated location",
    ],
    [/\bdefault_type\s+application\/octet-stream\s*;/, "safe default type is missing"],
    [/\blocation\s+\/\s*\{[^}]*\broot\s+\/usr\/share\/nginx\/html\s*;/s, "served root is missing"],
    [/\bindex\s+index\.html\s*;/, "directory index is missing"],
    [/\bX-Content-Type-Options\s+nosniff\b/, "nosniff header is missing"],
    [/Permissions-Policy\s+"geolocation=\(self\)/, "geolocation permission is missing"],
  ];
  for (const [pattern, message] of requirements) {
    if (!pattern.test(text)) findings.push(message);
  }
  if (firstCustomTypes !== -1 && firstCustomTypes < firstServer) {
    findings.push("custom types block must not duplicate mime.types in the http scope");
  }
  return findings;
}

export async function checkServedNginx(configPath) {
  let path = configPath;
  if (!path) {
    const settings = JSON.parse(await readFile(deploymentConfig, "utf8"));
    path = resolve(repositoryRoot, settings.configPath);
  }
  const findings = nginxConfigFindings(await readFile(path, "utf8"));
  return { path, findings };
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const result = await checkServedNginx(process.argv[2] && resolve(process.argv[2]));
  if (result.findings.length) {
    console.error(`Nginx configuration gate failed:\n- ${result.findings.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log(`Nginx configuration gate passed: ${result.path}`);
  }
}
