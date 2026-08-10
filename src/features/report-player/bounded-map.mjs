// FEATURE:      Bounded asynchronous mapping
// SURFACE:      mapWithConcurrency(values, limit, visit)
// WHY TOGETHER: Worker scheduling and stable output ordering form one small primitive.
// STATE:        Private next-index cursor per call
// RULES:        Never exceed the positive concurrency limit; preserve input order.
// PROVENANCE:   MazeMap area lookup loading

export async function mapWithConcurrency(values, limit, visit) {
  const output = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next++;
      output[index] = await visit(values[index], index);
    }
  }
  const count = Math.min(Math.max(1, limit), values.length);
  await Promise.all(Array.from({ length: count }, worker));
  return output;
}
