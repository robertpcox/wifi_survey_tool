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
