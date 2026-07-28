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
  return value.startsWith("../../") ? `@/${value.slice(6)}` : value;
}
