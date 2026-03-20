import { sendOtpEmail } from "./tasks/sendOtpEmail";
import { recomputeWeeklyLeaderboard } from "./tasks/recomputeWeeklyLeaderboard";
import { writeAiLog } from "./tasks/writeAiLog";

export async function runJobInline(name: string, payload: any) {
  switch (name) {
    case "sendOtpEmail":
      return sendOtpEmail(payload);
    case "recomputeWeeklyLeaderboard":
      return recomputeWeeklyLeaderboard(payload);
    case "aiLog":
      return writeAiLog(payload);
    default:
      throw new Error(`Unknown job: ${name}`);
  }
}