import { env } from "../config/env";

type JobName = "sendOtpEmail" | "recomputeWeeklyLeaderboard" | "aiLog";

export type EnqueueOptions = { runAt?: Date };

function isTest() {
  return env.NODE_ENV === "test" || !!process.env.JEST_WORKER_ID;
}

function driver() {
  return env.JOBS_DRIVER;
}

async function inlineEnqueue(name: JobName, payload: any) {
  const { runJobInline } = require("./inlineRunner");
  await runJobInline(name, payload);
}

async function agendaEnqueue(name: JobName, payload: any, opts?: EnqueueOptions) {
  const { getAgenda } = require("./agendaDriver");
  const agenda = await getAgenda();

  if (opts?.runAt) return agenda.schedule(opts.runAt, name, payload);
  return agenda.now(name, payload);
}

export async function enqueueNow(name: JobName, payload: any) {
  if (isTest()) return inlineEnqueue(name, payload);

  if (env.JOBS_ENABLED && driver() === "agenda") return agendaEnqueue(name, payload);
  return inlineEnqueue(name, payload);
}

export async function enqueueAt(name: JobName, payload: any, runAt: Date) {
  if (isTest()) return inlineEnqueue(name, payload);

  if (env.JOBS_ENABLED && driver() === "agenda") return agendaEnqueue(name, payload, { runAt });
  return inlineEnqueue(name, payload);
}