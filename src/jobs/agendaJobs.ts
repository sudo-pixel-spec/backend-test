import { Job } from "agenda";
import { runJobInline } from "./inlineRunner";

export function defineAgendaJobs(agenda: any) {
  agenda.define("sendOtpEmail", async (job: Job) => {
    await runJobInline("sendOtpEmail", job.attrs.data);
  });

  agenda.define("recomputeWeeklyLeaderboard", async (job: Job) => {
    await runJobInline("recomputeWeeklyLeaderboard", job.attrs.data);
  });

  agenda.define("aiLog", async (job: Job) => {
    await runJobInline("aiLog", job.attrs.data);
  });
}