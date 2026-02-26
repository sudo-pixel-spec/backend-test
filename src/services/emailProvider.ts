import nodemailer from "nodemailer";
import { env } from "../config/env";

export interface EmailProvider {
  sendOtp(email: string, otp: string): Promise<void>;
}

export class DevConsoleEmailProvider implements EmailProvider {
  async sendOtp(email: string, otp: string) {
    console.log(`[DEV OTP] email=${email} otp=${otp}`);
  }
}

export class SmtpEmailProvider implements EmailProvider {
  private transporter = nodemailer.createTransport({
    host: env.SMTP_HOST!,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER!, pass: env.SMTP_PASS! } : undefined
  });

  async sendOtp(email: string, otp: string) {
    const from = env.SMTP_FROM || "no-reply@example.com";
    const subject = "Your login code";
    const text = `Your OTP code is: ${otp}\n\nThis code expires soon.`;

    await this.transporter.sendMail({ from, to: email, subject, text });
  }
}

export function getEmailProvider(): EmailProvider {
  if (env.EMAIL_PROVIDER === "smtp") return new SmtpEmailProvider();
  return new DevConsoleEmailProvider();
}

export const emailProvider: EmailProvider = getEmailProvider();