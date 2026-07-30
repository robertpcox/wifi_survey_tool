export function normalizeCampusId(value) {
  const campusId = Number(value);
  if (!Number.isInteger(campusId) || campusId <= 0) {
    throw new TypeError("Campus ID must be a positive integer");
  }
  return campusId;
}

export function numericZ(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function waitForMapLoad(map, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = callback => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(
      () => finish(() => reject(
        new Error(`MazeMap did not load within ${timeoutMs} ms`),
      )),
      timeoutMs,
    );
    map.on("error", event => finish(() => reject(
      new Error(`MazeMap failed to load: ${errorMessage(event?.error ?? event)}`),
    )));
    map.on("load", () => finish(resolve));
  });
}

export function errorMessage(error) {
  return error?.message ?? String(error);
}
