export function fetchCloudPosition(config, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = config.cloudBase.trim().replace(/\/+$/, "");
  const parameters = new URLSearchParams({
    configId: config.configId,
    clientIp: config.clientIp,
  });
  return fetchImpl(`${base}/mm-positioning-proxy/position?${parameters}`, {
    headers: {
      Accept: "application/json",
      "X-Mazemap-App-Id": config.appId,
      "X-Mazemap-App-Key": config.appKey,
    },
    signal: options.signal,
  });
}
