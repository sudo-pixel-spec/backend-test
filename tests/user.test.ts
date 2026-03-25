import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app";
import { Otp } from "../src/models/Otp";

let replset: MongoMemoryReplSet;

async function loginAndGetAccessToken(app: any, phone: string) {
  await request(app).post("/v1/auth/request-otp").send({ phone });

  const normalizedPhone = phone.replace(/\D/g, "");
  const finalPhone = normalizedPhone.length === 10 ? `+91${normalizedPhone}` : normalizedPhone;

  const knownOtp = "123456";
  const rec = await Otp.findOne({ phone: finalPhone });
  if (!rec) throw new Error("OTP record missing");

  rec.otpHash = await bcrypt.hash(knownOtp, 10);
  await rec.save();

  const res = await request(app)
    .post("/v1/auth/verify-otp")
    .send({ phone, otp: knownOtp });

  return res.body.data.accessToken;
}

describe("User endpoints", () => {
  beforeAll(async () => {
    replset = await MongoMemoryReplSet.create({
      replSet: { count: 1 }
    });
  await mongoose.connect(replset.getUri());
  });

  afterEach(async () => {
    await mongoose.connection.db?.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replset.stop();
  });

  it("GET /me should require auth", async () => {
    const app = createApp();
    const res = await request(app).get("/v1/me");
    expect(res.status).toBe(401);
  });

  it("GET /me should return user data", async () => {
    const app = createApp();
    const token = await loginAndGetAccessToken(app, "1234567890");

    const res = await request(app)
      .get("/v1/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.phone).toBe("+911234567890");
  });

  it("PATCH /me/profile should complete profile", async () => {
    const app = createApp();
    const token = await loginAndGetAccessToken(app, "1000000021");

    const res = await request(app)
      .patch("/v1/me/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fullName: "Test User",
        standard: "CBSE_STD_8",
        timezone: "Asia/Kolkata"
      });

    expect(res.status).toBe(200);
    expect(res.body.data.profileComplete).toBe(true);
  });
});
