import { env } from "../config/env";

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
    console.log(`[SMS Msg91] (Implementation Pending) To: ${phone}, OTP: ${otp}`);
  }
}

export class TwilioSmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string) {
    console.log(`[SMS Twilio] (Implementation Pending) To: ${phone}, OTP: ${otp}`);
  }
}

export function getSmsProvider(): SmsProvider {
  switch (env.SMS_PROVIDER) {
    case "msg91":
      return new Msg91SmsProvider();
    case "twilio":
      return new TwilioSmsProvider();
    default:
      return new ConsoleSmsProvider();
  }
}

export const smsProvider = getSmsProvider();
