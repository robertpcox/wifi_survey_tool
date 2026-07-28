export function fetchLipiPosition(config, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  return fetchImpl(config.lipiUrl, {
    headers: {
      Accept: "application/json",
    },
    referrer: config.referrer,
    referrerPolicy: "unsafe-url",
    signal: options.signal,
  });
}
