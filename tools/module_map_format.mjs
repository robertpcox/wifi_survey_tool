// FEATURE:      Module-map row formatting
// SURFACE:      compactImportPath(), compactModuleFields(), formatModuleShard()
// WHY TOGETHER: Path aliases, row wrapping, and shard markup share one compact notation
// STATE:        None
// RULES:        Generated lines stay below 160 bytes and retain every module fact
// PROVENANCE:   Scope/coding_pattern.md generated module-map requirement

export function compactModuleFields(base, fields, limit = 150) {
  const lines = [base];
  for (const field of fields) {
    const inline = field.startsWith("  - ")
      ? ` ${field.slice(4)}`
      : null;
    const lastIndex = lines.length - 1;
    if (inline && Buffer.byteLength(lines[lastIndex] + inline) <= limit) {
      lines[lastIndex] += inline;
    } else {
      lines.push(field);
    }
  }
  return lines;
}

export function compactImportPath(value) {
  for (const [prefix, alias] of [
    ["../../adapters/", "@a/"],
    ["../../domain/", "@d/"],
    ["../../features/", "@f/"],
    ["../../shared/", "@s/"],
  ]) {
    if (value.startsWith(prefix)) return `${alias}${value.slice(prefix.length)}`;
  }
  if (value.startsWith("./")) return value.slice(2);
  return value.startsWith("../../") ? `@/${value.slice(6)}` : value;
}

function fieldLines(label, values) {
  if (!values.length) return [];
  const lines = [];
  let line = `  - ${label} `;
  const tokens = values.map((value, index) => (
    `${value}${index === values.length - 1 ? "" : ", "}`
  ));
  for (const token of tokens) {
    if (Buffer.byteLength(line + token) > 159) {
      lines.push(line.trimEnd());
      line = `    ${token}`;
    } else {
      line += token;
    }
  }
  lines.push(line.trimEnd());
  return lines;
}

function rowLocation(layer, path) {
  const sourcePath = path.startsWith("src/") ? path.slice(4) : path;
  const localPath = layer === "." ? sourcePath : sourcePath.slice(layer.length + 1);
  const separator = localPath.lastIndexOf("/");
  return {
    directory: separator === -1 ? "." : localPath.slice(0, separator),
    name: separator === -1 ? localPath : localPath.slice(separator + 1),
  };
}

export function formatModuleShard(layer, rows) {
  const sourceLabel = layer === "." ? "src/" : `src/${layer}/`;
  const output = [
    `# Module map — ${sourceLabel}`,
    "`node tools/module_map.mjs`; paths combine this shard, heading, and filename.",
    "`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.",
    "E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.",
    "",
  ];
  let currentDirectory;
  for (const row of rows) {
    const location = rowLocation(layer, row.path);
    if (location.directory !== currentDirectory) {
      const heading = location.directory === "." ? "./" : `${location.directory}/`;
      output.push(`## ${heading}`);
      currentDirectory = location.directory;
    }
    const fileName = location.name.endsWith(".mjs")
      ? location.name.slice(0, -4)
      : location.name;
    const base = `- ${fileName} ${row.lines}/${row.bytes} ${row.test ? "T+" : "T-"}`;
    output.push(...compactModuleFields(
      base,
      [...fieldLines("E", row.exports), ...fieldLines("I", row.imports)],
      159,
    ));
  }
  output.push("");
  return output.join("\n");
}
