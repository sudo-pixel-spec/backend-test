import { recomputeWeeklyLeaderboardJob } from "../handlers/recomputeWeeklyLeaderboardJob";

export async function recomputeWeeklyLeaderboard(payload: any) {
  const fakeJob: any = { attrs: { data: payload } };
  await recomputeWeeklyLeaderboardJob(fakeJob);
}