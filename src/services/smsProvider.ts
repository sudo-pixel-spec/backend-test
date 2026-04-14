import { env } from "../config/env";
import twilio from "twilio";

export interface SmsProvider {
  sendOtp(phone: string, otp: string): Promise<void>;
}

export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string) {
    console.log(`\n************************************`);
    console.log(`SMS CONSOLE - OTP LOG`);
    console.log(`To: ${phone}`);
    console.log(`Message: Your Gamifyed OTP is ${otp}. Valid for 5 minutes.`);
    console.log(`************************************\n`);
  }
}

export class Msg91SmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string) {
    const { MSG91_AUTH_KEY, MSG91_TEMPLATE_ID } = env;
    const url = "https://control.msg91.com/api/v5/otp";
    const body = {
      template_id: MSG91_TEMPLATE_ID,
      mobile: phone.replace("+", ""),
      authkey: MSG91_AUTH_KEY,
      otp: otp,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`Msg91 Error: ${await response.text()}`);
      }
      console.log(`[SMS Msg91] Sent OTP to ${phone}`);
    } catch (error) {
      console.error("[SMS Msg91] Failed to send OTP", error);
      throw error;
    }
  }
}

export class TwilioSmsProvider implements SmsProvider {
  private _client: twilio.Twilio | null = null;

  private get client(): twilio.Twilio {
    if (!this._client) {
      const sid = env.TWILIO_ACCOUNT_SID;
      const token = env.TWILIO_AUTH_TOKEN;

      if (!sid || !token) {
        throw new Error(
          "[SMS] TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required when SMS_PROVIDER=twilio"
        );
      }

      this._client = twilio(sid, token);
    }
    return this._client;
  }

  async sendOtp(phone: string, otp: string) {
    try {
      await this.client.messages.create({
        body: `Your Gamifyed OTP is ${otp}. Valid for 5 minutes.`,
        from: env.TWILIO_FROM_NUMBER!,
        to: phone,
      });
      console.log(`[SMS Twilio] Sent OTP to ${phone}`);
    } catch (error) {
      console.error("[SMS Twilio] Failed to send OTP", error);
      throw error;
    }
  }
}

export function getSmsProvider(): SmsProvider {
  if (env.NODE_ENV === "test") {
    return new ConsoleSmsProvider();
  }

  switch (env.SMS_PROVIDER) {
    case "msg91":
      return new Msg91SmsProvider();
    case "twilio":
      return new TwilioSmsProvider();
    default:
      return new ConsoleSmsProvider();
  }
}

export const smsProvider: SmsProvider = getSmsProvider();
