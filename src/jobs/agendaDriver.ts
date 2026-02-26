import mongoose from "mongoose";
import { env } from "../config/env";

let agendaInstance: any | null = null;

export async function getAgenda() {
  if (agendaInstance) return agendaInstance;

  const AgendaCtor = require("agenda").default || require("agenda");
  const dbAddress = env.MONGODB_URI;

  agendaInstance = new AgendaCtor({
    db: { address: dbAddress, collection: env.JOBS_COLLECTION },
    maxConcurrency: env.JOBS_CONCURRENCY,
    defaultLockLifetime: env.JOBS_LOCK_LIFETIME_MS,
    processEvery: "10 seconds"
  });

  return agendaInstance;
}