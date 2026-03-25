import type { Job } from "agenda";
import { sendOtpEmail } from "../tasks/sendOtpEmail";

export async function sendOtpEmailJob(job: Job) {
  const data = job.attrs.data as { email: string; otp: string };
  await sendOtpEmail(data);
}