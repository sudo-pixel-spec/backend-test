import { getEmailProvider } from "../../services/emailProvider";

export async function sendOtpEmail(payload: { email: string; otp: string }) {
  const { email, otp } = payload;
  if (!email || !otp) {
    throw new Error("Missing email/otp");
  }

  const emailProvider = getEmailProvider();
  await emailProvider.sendOtp(email, otp);
}
