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
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replset.stop();
  });

  it("request-otp should create OTP record", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/v1/auth/request-otp")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(200);

    const rec = await Otp.findOne({ email: "test@example.com" });
    expect(rec).toBeTruthy();
  });

  it("verify-otp with wrong code should fail", async () => {
    const app = createApp();

    await request(app)
      .post("/v1/auth/request-otp")
      .send({ email: "test2@example.com" });

    const res = await request(app)
      .post("/v1/auth/verify-otp")
      .send({ email: "test2@example.com", otp: "000000" });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it("verify-otp with correct code should succeed and set refresh cookie", async () => {
    const app = createApp();
    const email = "ok@example.com";

    await request(app)
      .post("/v1/auth/request-otp")
      .send({ email });

    const knownOtp = "123456";
    const rec = await Otp.findOne({ email });
    if (!rec) throw new Error("OTP record missing");

    rec.otpHash = await bcrypt.hash(knownOtp, 10);
    await rec.save();

    const res = await request(app)
      .post("/v1/auth/verify-otp")
      .send({ email, otp: knownOtp });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();

    const cookies = res.headers["set-cookie"]?.join(";") ?? "";
    expect(cookies).toContain("refresh_token=");
  });
});
