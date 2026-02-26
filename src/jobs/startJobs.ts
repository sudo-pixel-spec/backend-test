import { env } from "../config/env";

export async function startJobsIfEnabled() {
  if (env.NODE_ENV === "test") return;

  if (!env.JOBS_ENABLED) return;

  if (env.JOBS_DRIVER === "inline") return;

  const { getAgenda } = await import("./agendaDriver");
  const { defineJobs } = await import("./definitions");

  const agenda = await getAgenda();
  defineJobs(agenda);
  await agenda.start();

  console.log("[jobs] agenda started");
}