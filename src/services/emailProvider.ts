import nodemailer from "nodemailer";
import { Resend } from "resend";
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
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER!, pass: env.SMTP_PASS! }
      : undefined
  });

  async sendOtp(email: string, otp: string) {
    const from = env.SMTP_FROM || "no-reply@example.com";

    await this.transporter.sendMail({
      from,
      to: email,
      subject: "Your login code",
      text: `Your OTP code is: ${otp}\n\nThis code expires soon.`
    });
  }
}

export class ResendEmailProvider implements EmailProvider {
  private resend = new Resend(env.RESEND_API_KEY);

  async sendOtp(email: string, otp: string) {
    await this.resend.emails.send({
      from: env.EMAIL_FROM!,
      to: email,
      subject: "Your login code",
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>Your Login Code</h2>
          <p>Your OTP is:</p>
          <h1 style="letter-spacing:4px">${otp}</h1>
          <p>This code expires soon.</p>
        </div>
      `
    });
  }
}

export function getEmailProvider(): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case "smtp":
      return new SmtpEmailProvider();

    case "resend":
      return new ResendEmailProvider();

    default:
      return new DevConsoleEmailProvider();
  }
}

export const emailProvider: EmailProvider = getEmailProvider();