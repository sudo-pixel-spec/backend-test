import type Agenda from "agenda";
import { runJobInline } from "./inlineRunner";

export function defineAgendaJobs(agenda: Agenda) {
  agenda.define("sendOtpEmail", async (job) => {
    await runJobInline("sendOtpEmail", job.attrs.data);
  });

  agenda.define("recomputeWeeklyLeaderboard", async (job) => {
    await runJobInline("recomputeWeeklyLeaderboard", job.attrs.data);
  });

  agenda.define("aiLog", async (job) => {
    await runJobInline("aiLog", job.attrs.data);
  });
}