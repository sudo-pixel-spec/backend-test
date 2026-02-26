import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { createApp } from "../src/app";
import { User } from "../src/models/User";
import { Attempt } from "../src/models/Attempt";
import { WalletTransaction } from "../src/models/WalletTransaction";

import { loginAndGetAccessToken, completeProfile } from "./helpers/auth";
import { seedLessonWithQuiz } from "./helpers/seedLessonQuiz";

let replset: MongoMemoryReplSet;

describe("Attempts submit", () => {
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

  it("should require auth", async () => {
    const app = createApp();
    const { lesson } = await seedLessonWithQuiz();

    const res = await request(app).post("/v1/attempts/submit").send({
      lessonId: lesson._id.toString(),
      answers: [],
      idempotencyKey: "k1"
    });

    expect(res.status).toBe(401);
  });

  it("should require profile complete", async () => {
    const app = createApp();
    const { lesson } = await seedLessonWithQuiz();

    const token = await loginAndGetAccessToken(app, "p@p.com");

    const res = await request(app)
      .post("/v1/attempts/submit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        lessonId: lesson._id.toString(),
        answers: [],
        idempotencyKey: "k2"
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PROFILE_INCOMPLETE");
  });

  it("should score answers, award xp/coins, update user, create attempt + wallet txns", async () => {
    const app = createApp();
    const { lesson } = await seedLessonWithQuiz("medium");

    const token = await loginAndGetAccessToken(app, "a@a.com");
    await completeProfile(app, token);

    const res = await request(app)
      .post("/v1/attempts/submit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        lessonId: lesson._id.toString(),
        answers: [
          { qid: "q1", selectedIndex: 0 },
          { qid: "q2", selectedIndex: 1 },
          { qid: "q3", selectedIndex: 0 }
        ],
        timeSpentSec: 40,
        idempotencyKey: "k3"
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.score).toBe(2);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.xpAwarded).toBeGreaterThan(0);

    const user = await User.findOne({ email: "a@a.com" });
    expect(user).toBeTruthy();
    expect(user!.totalXP).toBe(res.body.data.xpAwarded);
    expect(user!.wallet.coins).toBe(res.body.data.coinsAwarded);

    const attempts = await Attempt.find({}).lean();
    expect(attempts.length).toBe(1);
    expect(attempts[0].score).toBe(2);
    expect(attempts[0].answers.length).toBe(3);

    const txns = await WalletTransaction.find({ userId: user!._id }).lean();
    expect(txns.length).toBe(2);
  });

  it("should award diamonds only for hard + perfect score", async () => {
    const app = createApp();
    const { lesson } = await seedLessonWithQuiz("hard");

    const token = await loginAndGetAccessToken(app, "d@d.com");
    await completeProfile(app, token);

    const res = await request(app)
      .post("/v1/attempts/submit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        lessonId: lesson._id.toString(),
        answers: [
          { qid: "q1", selectedIndex: 0 },
          { qid: "q2", selectedIndex: 1 },
          { qid: "q3", selectedIndex: 2 }
        ],
        idempotencyKey: "k4"
      });

    expect(res.status).toBe(200);
    expect(res.body.data.score).toBe(3);
    expect(res.body.data.diamondsAwarded).toBeGreaterThan(0);

    const user = await User.findOne({ email: "d@d.com" });
    expect(user!.wallet.diamonds).toBe(res.body.data.diamondsAwarded);
  });

  it("idempotency should prevent double awarding", async () => {
    const app = createApp();
    const { lesson } = await seedLessonWithQuiz("medium");

    const token = await loginAndGetAccessToken(app, "i@i.com");
    await completeProfile(app, token);

    const payload = {
      lessonId: lesson._id.toString(),
      answers: [
        { qid: "q1", selectedIndex: 0 },
        { qid: "q2", selectedIndex: 1 },
        { qid: "q3", selectedIndex: 2 }
      ],
      idempotencyKey: "same-key"
    };

    const res1 = await request(app).post("/v1/attempts/submit").set("Authorization", `Bearer ${token}`).send(payload);
    const res2 = await request(app).post("/v1/attempts/submit").set("Authorization", `Bearer ${token}`).send(payload);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const user = await User.findOne({ email: "i@i.com" });
    expect(user).toBeTruthy();

    const attempts = await Attempt.find({}).lean();
    expect(attempts.length).toBe(1);

    expect(user!.totalXP).toBe(res1.body.data.xpAwarded);
  });
});
