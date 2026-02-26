import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app";
import { Otp } from "../src/models/Otp";

let replset: MongoMemoryReplSet;

async function loginAndGetAccessToken(app: any, email: string) {
  await request(app).post("/v1/auth/request-otp").send({ email });

  const knownOtp = "123456";
  const rec = await Otp.findOne({ email });
  if (!rec) throw new Error("OTP record missing");

  rec.otpHash = await bcrypt.hash(knownOtp, 10);
  await rec.save();

  const res = await request(app)
    .post("/v1/auth/verify-otp")
    .send({ email, otp: knownOtp });

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
    await mongoose.connection.db.dropDatabase();
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
    const token = await loginAndGetAccessToken(app, "me@example.com");

    const res = await request(app)
      .get("/v1/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.email).toBe("me@example.com");
  });

  it("PATCH /me/profile should complete profile", async () => {
    const app = createApp();
    const token = await loginAndGetAccessToken(app, "profile@example.com");

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
