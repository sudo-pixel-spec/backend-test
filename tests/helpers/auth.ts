import request from "supertest";
import bcrypt from "bcryptjs";
import { Otp } from "../../src/models/Otp";

export async function loginAndGetAccessToken(app: any, phone: string) {
  const reqRes = await request(app).post("/v1/auth/request-otp").send({ phone });
  if (reqRes.status !== 200) {
    throw new Error(`OTP request failed: ${reqRes.status} ${JSON.stringify(reqRes.body)}`);
  }

  const knownOtp = "123456";
  const normalizedPhone = phone.replace(/\D/g, "");
  const finalPhone = normalizedPhone.length === 10 ? `+91${normalizedPhone}` : normalizedPhone;

  const rec = await Otp.findOne({ phone: finalPhone });
  if (!rec) throw new Error("OTP record missing");

  rec.otpHash = await bcrypt.hash(knownOtp, 10);
  await rec.save();

  const res = await request(app).post("/v1/auth/verify-otp").send({ phone, otp: knownOtp });
  return res.body.data.accessToken as string;
}

export async function completeProfile(app: any, token: string) {
  const res = await request(app)
    .patch("/v1/me/profile")
    .set("Authorization", `Bearer ${token}`)
    .send({ fullName: "Test User", standard: "CBSE_STD_8", timezone: "Asia/Kolkata" });

  if (res.status !== 200) throw new Error(`Profile completion failed: ${JSON.stringify(res.body)}`);
}
