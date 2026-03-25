import type { Job } from "agenda";
import { recomputeWeeklyLeaderboard } from "../tasks/recomputeWeeklyLeaderboard";

export async function recomputeWeeklyLeaderboardJob(job: Job) {
  await recomputeWeeklyLeaderboard(job.attrs.data);
}
