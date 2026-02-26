import { getEmailProvider } from "../services/emailProvider";
import { recomputeWeeklyLeaderboard } from "./tasks/recomputeWeeklyLeaderboard";
import { writeAiLog } from "./tasks/writeAiLog";

export async function runJobInline(name: string, payload: any) {
  switch (name) {
    case "sendOtpEmail": {
      const { email, otp } = payload;
      const emailProvider = getEmailProvider();
      await emailProvider.sendOtp(email, otp);
      return;
    }
    case "recomputeWeeklyLeaderboard": {
      await recomputeWeeklyLeaderboard(payload);
      return;
    }
    case "aiLog": {
      await writeAiLog(payload);
      return;
    }
    default:
      throw new Error(`Unknown job: ${name}`);
  }
}