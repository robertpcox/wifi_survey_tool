// FEATURE:      Dynamic room-survey route authoring
// SURFACE:      createDynamicRouteAuthor({ routeBetween })
// WHY TOGETHER: Ordered routing, stale-response rejection, retry, and finalisation share queue state.
// STATE:        Committed stops, adjacent-leg jobs, and a monotonic topology revision
// RULES:        Provider failures remain explicit; no direct geometry is ever substituted.
// PROVENANCE:   Dynamic room-survey Runner request

import {
  dynamicRouteFinaliseError,
  newDynamicRouteJob,
  sameDynamicRoutePair,
  validatedDynamicGeometry,
  validatedDynamicStops,
} from "./dynamic-route-author-values.mjs";
export function createDynamicRouteAuthor({ routeBetween } = {}) {
  if (typeof routeBetween !== "function") {
    throw new TypeError("routeBetween: must be a function");
  }
  let revision = 0;
  let stops = [];
  let jobs = [];
  let activeJob = null;
  let waiters = [];
  function commitStop(stop) {
    return reviseStops([...stops, stop]);
  }

  function reviseStops(values) {
    const nextStops = validatedDynamicStops(values);
    const previousJobs = jobs;
    revision++;
    jobs = nextStops.slice(1).map((to, index) => {
      const from = nextStops[index];
      const prior = previousJobs[index];
      return prior && sameDynamicRoutePair(prior, from, to)
        ? prior
        : newDynamicRouteJob(index, from, to);
    });
    stops = nextStops;
    signal();
    void pump();
    return snapshot();
  }

  function retryFailed() {
    for (const job of jobs) {
      if (job.status !== "failed") continue;
      job.status = "pending";
      job.error = null;
    }
    signal();
    void pump();
    return snapshot();
  }

  async function finalise({ retryFailed: retry = false } = {}) {
    if (retry) retryFailed();
    const targetRevision = revision;
    void pump();
    while (jobs.some(job => ["pending", "routing"].includes(job.status))) {
      await changed();
      if (revision !== targetRevision) {
        throw new Error("Dynamic route changed while finalising");
      }
    }
    const failures = failedJobs();
    if (failures.length) throw dynamicRouteFinaliseError(failures);
    return Object.freeze({
      revision,
      stops: structuredClone(stops),
      legs: jobs.map(job => ({
        fromStopId: job.from.id,
        toStopId: job.to.id,
        geometry: structuredClone(job.geometry),
      })),
    });
  }

  async function pump() {
    if (activeJob && jobs.includes(activeJob)) return;
    const job = jobs.find(candidate => candidate.status === "pending");
    if (!job) return;
    activeJob = job;
    job.status = "routing";
    job.attempts++;
    signal();
    try {
      const geometry = validatedDynamicGeometry(
        await routeBetween(structuredClone(job.from), structuredClone(job.to)),
      );
      if (jobs.includes(job)) {
        job.geometry = geometry;
        job.status = "ready";
      }
    } catch (error) {
      if (jobs.includes(job)) {
        job.error = error instanceof Error ? error.message : String(error);
        job.status = "failed";
      }
    } finally {
      if (activeJob === job) activeJob = null;
      signal();
      void pump();
    }
  }

  function snapshot() {
    const pendingCount = jobs.filter(
      job => ["pending", "routing"].includes(job.status),
    ).length;
    const failures = failedJobs();
    return Object.freeze({
      revision,
      status: pendingCount ? "routing" : failures.length ? "failed" : "ready",
      stopCount: stops.length,
      legCount: jobs.filter(job => job.status === "ready").length,
      pendingCount,
      failedCount: failures.length,
      failures,
    });
  }

  function failedJobs() {
    return jobs.filter(job => job.status === "failed").map(job => ({
      legIndex: job.index,
      fromStopId: job.from.id,
      toStopId: job.to.id,
      attempts: job.attempts,
      message: job.error,
    }));
  }

  function signal() {
    const pending = waiters;
    waiters = [];
    pending.forEach(resolve => resolve());
  }

  function changed() {
    return new Promise(resolve => waiters.push(resolve));
  }

  return Object.freeze({
    commitStop,
    finalise,
    retryFailed,
    reviseStops,
    snapshot,
  });
}
