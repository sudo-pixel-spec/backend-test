import bcrypt from "bcryptjs";
import { Otp } from "../models/Otp";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createOtp(email: string, ip?: string) {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await Otp.deleteMany({ email });

  await Otp.create({ email, otpHash, expiresAt, attemptsLeft: 5, createdIp: ip });
  return otp;
}

export async function verifyOtp(email: string, otp: string) {
  const record = await Otp.findOne({ email });
  if (!record) return { ok: false as const, reason: "OTP_NOT_FOUND" };

  if (record.expiresAt.getTime() < Date.now()) {
    await Otp.deleteMany({ email });
    return { ok: false as const, reason: "OTP_EXPIRED" };
  }

  if (record.attemptsLeft <= 0) {
    await Otp.deleteMany({ email });
    return { ok: false as const, reason: "OTP_LOCKED" };
  }

  const matches = await bcrypt.compare(otp, record.otpHash);
  if (!matches) {
    record.attemptsLeft -= 1;
    await record.save();
    return { ok: false as const, reason: "OTP_INVALID", attemptsLeft: record.attemptsLeft };
  }

  await Otp.deleteMany({ email });
  return { ok: true as const };
}
