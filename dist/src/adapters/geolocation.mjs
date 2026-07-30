const PERMISSION_DENIED = 1;

export function captureCurrentPosition({
  geolocation = globalThis.navigator?.geolocation,
  now = () => new Date(),
  options,
} = {}) {
  if (typeof geolocation?.getCurrentPosition !== "function") {
    return Promise.reject(unavailableError());
  }

  return new Promise((resolve, reject) => {
    const succeed = position => {
      try {
        resolve(normalizePosition(position, now));
      } catch {
        reject(unavailableError());
      }
    };
    const fail = error => reject(geolocationError(error));
    try {
      geolocation.getCurrentPosition(succeed, fail, options);
    } catch {
      reject(unavailableError());
    }
  });
}

function normalizePosition(position, now) {
  const lng = Number(position?.coords?.longitude);
  const lat = Number(position?.coords?.latitude);
  const accuracyM = Number(position?.coords?.accuracy);
  if (![lng, lat, accuracyM].every(Number.isFinite) || accuracyM < 0) {
    throw new TypeError("Invalid geolocation position");
  }
  return {
    lng,
    lat,
    accuracyM,
    capturedAt: normalizeTimestamp(position?.timestamp, now),
  };
}

function normalizeTimestamp(reportedTimestamp, now) {
  const hasReportedTimestamp = reportedTimestamp !== undefined
    && reportedTimestamp !== null
    && reportedTimestamp !== "";
  const value = hasReportedTimestamp ? Number(reportedTimestamp) : now();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("Invalid capture timestamp");
  return date.toISOString();
}

function geolocationError(error) {
  if (Number(error?.code) === PERMISSION_DENIED) {
    return new Error("Geolocation permission was denied.");
  }
  return unavailableError();
}

function unavailableError() {
  return new Error("Geolocation is unavailable.");
}
