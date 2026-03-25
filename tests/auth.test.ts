import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import bcrypt from "bcryptjs";

import { createApp } from "../src/app";
import { Otp } from "../src/models/Otp";

let replset: MongoMemoryReplSet;

describe("Auth OTP flow", () => {
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

  it("request-otp should create OTP record", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/v1/auth/request-otp")
      .send({ phone: "1234567890" });

    expect(res.status).toBe(200);

    const normalizedPhone = "+911234567890";
    const rec = await Otp.findOne({ phone: normalizedPhone });
    expect(rec).toBeTruthy();
  });

  it("verify-otp with wrong code should fail", async () => {
    const app = createApp();

    await request(app)
      .post("/v1/auth/request-otp")
      .send({ phone: "0987654321" });

    const res = await request(app)
      .post("/v1/auth/verify-otp")
      .send({ phone: "0987654321", otp: "000000" });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it("verify-otp with correct code should succeed and set refresh cookie", async () => {
    const app = createApp();
    const phone = "1231231234";

    await request(app)
      .post("/v1/auth/request-otp")
      .send({ phone });

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

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();

    const cookies = String(res.headers["set-cookie"] || "");
    expect(cookies).toContain("refresh_token=");
  });
});
