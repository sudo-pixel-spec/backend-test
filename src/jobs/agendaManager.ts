import type { Agenda as AgendaType } from "agenda";
import { env } from "../config/env";
import { defineJobs } from "./definitions";

class AgendaManager {
  private static instance: AgendaManager;
  private agenda: AgendaType | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): AgendaManager {
    if (!AgendaManager.instance) {
      AgendaManager.instance = new AgendaManager();
    }
    return AgendaManager.instance;
  }

  public async getAgenda(): Promise<AgendaType> {
    if (this.agenda) return this.agenda;

    const Agenda = require("agenda");

    this.agenda = new Agenda({
      db: { address: env.MONGODB_URI, collection: env.JOBS_COLLECTION },
      maxConcurrency: env.JOBS_CONCURRENCY,
      defaultLockLifetime: env.JOBS_LOCK_LIFETIME_MS,
      processEvery: "10 seconds"
    });

    return this.agenda!;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    const agenda = await this.getAgenda();
    defineJobs(agenda);
    await agenda.start();
    this.initialized = true;
    console.log("[AgendaManager] initialized and started");
  }

  public async stop(): Promise<void> {
    if (this.agenda) {
      await this.agenda.stop();
      console.log("[AgendaManager] stopped");
    }
  }

  public isReady(): boolean {
    return this.initialized && !!this.agenda;
  }

  public async getStatus() {
    if (!this.agenda) return { enabled: false, ready: false };
    
    return {
      enabled: env.JOBS_ENABLED,
      ready: this.initialized,
      name: (this.agenda as any)._name || "agenda"
    };
  }
}

export const agendaManager = AgendaManager.getInstance();
