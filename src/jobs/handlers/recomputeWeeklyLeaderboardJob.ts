import type { Job } from "agenda";
import { UserWeeklyStats } from "../../models/UserWeeklyStats";

export async function recomputeWeeklyLeaderboardJob(_job: Job) {

  await UserWeeklyStats.countDocuments();
}
