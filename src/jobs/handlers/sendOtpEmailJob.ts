import type { Job } from "agenda";
import { emailProvider } from "../../services/emailProvider";

export async function sendOtpEmailJob(job: Job) {
  const { email, otp } = job.attrs.data as { email?: string; otp?: string };

  if (!email || !otp) {
    throw new Error("Missing email/otp");
  }

  await emailProvider.sendOtp(email, otp);
}