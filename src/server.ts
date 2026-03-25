import { env } from "./config/env";
import { connectDB, disconnectDB } from "./config/db";
import { createApp } from "./app";
import { JOBS, defineJobs } from "./jobs/definitions";

async function main() {
  await connectDB();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}`);
  });

  let agenda: any = null;

  const jobsEnabled = env.NODE_ENV !== "test" && env.JOBS_ENABLED === true;
  const useAgenda = env.JOBS_DRIVER === "agenda";

  if (jobsEnabled && useAgenda) {
    const { agendaManager } = require("./jobs/agendaManager");
    await agendaManager.initialize();
    
    const agenda = await agendaManager.getAgenda();
    await agenda.every("5 minutes", JOBS.RECOMPUTE_WEEKLY_LEADERBOARD);
  }

  const shutdown = async (signal: string) => {
    try {
      console.log(`Shutting down (${signal})...`);

      await new Promise<void>((resolve) => server.close(() => resolve()));

      if (agenda || (jobsEnabled && useAgenda)) {
        console.log("Stopping agenda...");
        const { agendaManager } = require("./jobs/agendaManager");
        await agendaManager.stop();
      }

      await disconnectDB();

      process.exit(0);
    } catch (e) {
      console.error("Shutdown failed:", e);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((e) => {
  console.error("Failed to start server:", e);
  process.exit(1);
});