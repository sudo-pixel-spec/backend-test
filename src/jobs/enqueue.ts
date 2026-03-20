import { env } from "../config/env";
import { agendaManager } from "./agendaManager";
import { JobName } from "./definitions";

export type EnqueueOptions = { runAt?: Date };

function isTest() {
  return env.NODE_ENV === "test" || !!process.env.JEST_WORKER_ID;
}

async function inlineEnqueue(name: string, payload: any) {
  const { runJobInline } = require("./inlineRunner");
  await runJobInline(name, payload);
}

async function agendaEnqueue(name: string, payload: any, opts?: EnqueueOptions) {
  const agenda = await agendaManager.getAgenda();

  if (opts?.runAt) return agenda.schedule(opts.runAt, name, payload);
  return agenda.now(name, payload);
}

export async function enqueueNow(name: JobName, payload: any) {
  if (isTest()) return inlineEnqueue(name, payload);

  if (env.JOBS_ENABLED && env.JOBS_DRIVER === "agenda") return agendaEnqueue(name, payload);
  return inlineEnqueue(name, payload);
}

export async function enqueueAt(name: JobName, payload: any, runAt: Date) {
  if (isTest()) return inlineEnqueue(name, payload);

  if (env.JOBS_ENABLED && env.JOBS_DRIVER === "agenda") return agendaEnqueue(name, payload, { runAt });
  return inlineEnqueue(name, payload);
}