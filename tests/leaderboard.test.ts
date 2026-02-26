import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { createApp } from "../src/app";
import { UserWeeklyStats } from "../src/models/UserWeeklyStats";

import { loginAndGetAccessToken, completeProfile } from "./helpers/auth";
import { seedLessonWithQuiz } from "./helpers/seedLessonQuiz";

let replset: MongoMemoryReplSet;

describe("Leaderboards", () => {
  beforeAll(async () => {
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replset.getUri());
  });

  afterEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replset.stop();
  });

  it("should create weekly stats on attempt submit and return leaderboard entries", async () => {
    const app = createApp();
    const { lesson } = await seedLessonWithQuiz("medium");

    const t1 = await loginAndGetAccessToken(app, "u1@x.com");
    await completeProfile(app, t1);
    await request(app)
      .post("/v1/attempts/submit")
      .set("Authorization", `Bearer ${t1}`)
      .send({
        lessonId: lesson._id.toString(),
        answers: [
          { qid: "q1", selectedIndex: 0 },
          { qid: "q2", selectedIndex: 1 },
          { qid: "q3", selectedIndex: 2 }
        ],
        timeSpentSec: 30,
        idempotencyKey: "u1-k1"
      });

    const t2 = await loginAndGetAccessToken(app, "u2@x.com");
    await completeProfile(app, t2);
    await request(app)
      .post("/v1/attempts/submit")
      .set("Authorization", `Bearer ${t2}`)
      .send({
        lessonId: lesson._id.toString(),
        answers: [
          { qid: "q1", selectedIndex: 0 },
          { qid: "q2", selectedIndex: 0 },
          { qid: "q3", selectedIndex: 0 }
        ],
        timeSpentSec: 30,
        idempotencyKey: "u2-k1"
      });

    const stats = await UserWeeklyStats.find({}).lean();
    expect(stats.length).toBe(2);

    const lb = await request(app)
      .get("/v1/leaderboards/weekly-growth")
      .set("Authorization", `Bearer ${t1}`);

    expect(lb.status).toBe(200);
    expect(lb.body.ok).toBe(true);
    expect(lb.body.data.entries.length).toBeGreaterThanOrEqual(2);

    expect(lb.body.data.entries[0].userId).not.toBeNull();
  });

  it("anti-grind: repeating same lesson in same week should not increase lessonsCompleted/eligibleXP", async () => {
    const app = createApp();
    const { lesson } = await seedLessonWithQuiz("medium");

    const token = await loginAndGetAccessToken(app, "grind@x.com");
    await completeProfile(app, token);

    await request(app)
      .post("/v1/attempts/submit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        lessonId: lesson._id.toString(),
        answers: [
          { qid: "q1", selectedIndex: 0 },
          { qid: "q2", selectedIndex: 1 },
          { qid: "q3", selectedIndex: 2 }
        ],
        timeSpentSec: 30,
        idempotencyKey: "g-1"
      });

    await request(app)
      .post("/v1/attempts/submit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        lessonId: lesson._id.toString(),
        answers: [
          { qid: "q1", selectedIndex: 0 },
          { qid: "q2", selectedIndex: 1 },
          { qid: "q3", selectedIndex: 2 }
        ],
        timeSpentSec: 30,
        idempotencyKey: "g-2"
      });

    const stat = await UserWeeklyStats.findOne({}).lean();
    expect(stat).toBeTruthy();
    expect(stat!.lessonsCompleted).toBe(1);
    expect(stat!.eligibleXP).toBeGreaterThan(0);
  });

  it("ineligible attempt (timeSpentSec < 20) should not count lessonsCompleted/eligibleXP, but should count accuracy aggregates", async () => {
    const app = createApp();
    const { lesson } = await seedLessonWithQuiz("medium");

    const token = await loginAndGetAccessToken(app, "fast@x.com");
    await completeProfile(app, token);

    await request(app)
      .post("/v1/attempts/submit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        lessonId: lesson._id.toString(),
        answers: [
          { qid: "q1", selectedIndex: 0 },
          { qid: "q2", selectedIndex: 1 },
          { qid: "q3", selectedIndex: 2 }
        ],
        timeSpentSec: 5,
        idempotencyKey: "f-1"
      });

    const stat = await UserWeeklyStats.findOne({}).lean();
    expect(stat).toBeTruthy();
    expect(stat!.lessonsCompleted).toBe(0);
    expect(stat!.eligibleXP).toBe(0);

    expect(stat!.questionsAttempted).toBe(3);
    expect(stat!.questionsCorrect).toBe(3);
  });
});
