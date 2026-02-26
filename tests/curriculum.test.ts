import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";

import { createApp } from "../src/app";
import { Otp } from "../src/models/Otp";
import { Attempt } from "../src/models/Attempt";
import { seedCurriculumStd8 } from "./helpers/seedCurriculum";

let mongod: MongoMemoryServer;

async function loginAndGetAccessToken(app: any, email: string) {
  await request(app).post("/v1/auth/request-otp").send({ email });

  const knownOtp = "123456";
  const rec = await Otp.findOne({ email });
  if (!rec) throw new Error("OTP record missing");
  rec.otpHash = await bcrypt.hash(knownOtp, 10);
  await rec.save();

  const res = await request(app).post("/v1/auth/verify-otp").send({ email, otp: knownOtp });
  return res.body.data.accessToken as string;
}

async function completeProfile(app: any, token: string) {
  const res = await request(app)
    .patch("/v1/me/profile")
    .set("Authorization", `Bearer ${token}`)
    .send({ fullName: "Test User", standard: "CBSE_STD_8", timezone: "Asia/Kolkata" });

  if (res.status !== 200) {
    throw new Error(`Profile completion failed: ${JSON.stringify(res.body)}`);
  }
}

describe("Curriculum + Unlocking", () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("GET /v1/curriculum/standards returns standards (no auth)", async () => {
    const app = createApp();
    await seedCurriculumStd8();

    const res = await request(app).get("/v1/curriculum/standards");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const codes = res.body.data.map((s: any) => s.code);
    expect(codes).toEqual(expect.arrayContaining(["CBSE_STD_8", "CBSE_STD_9", "CBSE_STD_10"]));
  });

  it("GET /v1/curriculum/subjects returns subjects for a standard", async () => {
    const app = createApp();
    const seeded = await seedCurriculumStd8();

    const res = await request(app)
      .get("/v1/curriculum/subjects")
      .query({ standardId: seeded.standards.std8._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe("Science");
  });

  it("GET /v1/units returns units for a subject", async () => {
    const app = createApp();
    const seeded = await seedCurriculumStd8();

    const res = await request(app).get("/v1/units").query({ subjectId: seeded.subject._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe("Biology Basics");
  });

  it("GET /v1/chapters returns chapters for a unit", async () => {
    const app = createApp();
    const seeded = await seedCurriculumStd8();

    const res = await request(app).get("/v1/chapters").query({ unitId: seeded.unit._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe("Photosynthesis");
  });

  it("GET /v1/lessons requires auth and profile complete", async () => {
    const app = createApp();
    const seeded = await seedCurriculumStd8();

    const resNoAuth = await request(app).get("/v1/lessons").query({ chapterId: seeded.chapter._id.toString() });
    expect(resNoAuth.status).toBe(401);

    const token = await loginAndGetAccessToken(app, "a@b.com");
    const resNoProfile = await request(app)
      .get("/v1/lessons")
      .query({ chapterId: seeded.chapter._id.toString() })
      .set("Authorization", `Bearer ${token}`);

    expect(resNoProfile.status).toBe(403);
    expect(resNoProfile.body.ok).toBe(false);
    expect(resNoProfile.body.error.code).toBe("PROFILE_INCOMPLETE");
  });

  it("Unlocking: only first lesson unlocked initially; next unlocks after attempt", async () => {
    const app = createApp();
    const seeded = await seedCurriculumStd8();

    const token = await loginAndGetAccessToken(app, "unlock@b.com");
    await completeProfile(app, token);

    const res1 = await request(app)
      .get("/v1/lessons")
      .query({ chapterId: seeded.chapter._id.toString() })
      .set("Authorization", `Bearer ${token}`);

    expect(res1.status).toBe(200);
    const lessons1 = res1.body.data as any[];

    expect(lessons1.map((l) => l.title)).toEqual([
      "Lesson 1: Introduction",
      "Lesson 2: Process",
      "Lesson 3: Factors"
    ]);

    expect(lessons1[0].unlocked).toBe(true);
    expect(lessons1[0].completed).toBe(false);

    expect(lessons1[1].unlocked).toBe(false);
    expect(lessons1[2].unlocked).toBe(false);

    
    const userId = (await request(app).get("/v1/me").set("Authorization", `Bearer ${token}`)).body.data.id;

    await Attempt.create({
  userId,
  lessonId: seeded.lessons[0]._id,
  quizVersion: 1,
  answers: [],
  score: 1,
  totalQuestions: 1,
  xpAwarded: 0,
  coinsAwarded: 0,
  diamondsAwarded: 0,
  idempotencyKey: "curriculum-test"
});


   const res2 = await request(app)
      .get("/v1/lessons")
      .query({ chapterId: seeded.chapter._id.toString() })
      .set("Authorization", `Bearer ${token}`);

    expect(res2.status).toBe(200);
    const lessons2 = res2.body.data as any[];

    expect(lessons2[0].completed).toBe(true);
    expect(lessons2[1].unlocked).toBe(true);
    expect(lessons2[2].unlocked).toBe(false);
  });
});
