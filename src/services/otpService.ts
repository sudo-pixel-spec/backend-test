import bcrypt from "bcryptjs";
import { Otp } from "../models/Otp";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createOtp(phone: string, ip?: string) {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await Otp.deleteMany({ phone });

  await Otp.create({ phone, otpHash, expiresAt, attemptsLeft: 5, createdIp: ip ?? null });
  return otp;
}

export async function verifyOtp(phone: string, otp: string) {
  const record = await Otp.findOne({ phone });
  if (!record) return { ok: false as const, reason: "OTP_NOT_FOUND" };

  if (record.expiresAt.getTime() < Date.now()) {
    await Otp.deleteMany({ phone });
    return { ok: false as const, reason: "OTP_EXPIRED" };
  }

  if (record.attemptsLeft <= 0) {
    await Otp.deleteMany({ phone });
    return { ok: false as const, reason: "OTP_LOCKED" };
  }

  const matches = await bcrypt.compare(otp, record.otpHash);
  if (!matches) {
    record.attemptsLeft -= 1;
    await record.save();
    return { ok: false as const, reason: "OTP_INVALID", attemptsLeft: record.attemptsLeft };
  }

  await Otp.deleteMany({ phone });
  return { ok: true as const };
}
