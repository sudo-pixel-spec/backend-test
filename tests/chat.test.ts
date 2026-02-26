import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { createApp } from "../src/app";
import { loginAndGetAccessToken, completeProfile } from "./helpers/auth";
import { seedLessonWithQuiz } from "./helpers/seedLessonQuiz";
import { ChatMessage } from "../src/models/ChatMessage";

let replset: MongoMemoryReplSet;

describe("AI Chat", () => {
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

  it("should respond to chat and store messages", async () => {
    const app = createApp();
    const { lesson } = await seedLessonWithQuiz();

    const token = await loginAndGetAccessToken(app, "chat@x.com");
    await completeProfile(app, token);

    const res = await request(app)
      .post("/v1/ai/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({
        message: "Explain photosynthesis in simple terms",
        lessonId: lesson._id.toString()
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.reply).toBeTruthy();

    const messages = await ChatMessage.find({}).lean();
    expect(messages.length).toBe(2);
  });

  it("should refuse cheating prompts", async () => {
    const app = createApp();
    const token = await loginAndGetAccessToken(app, "cheat@x.com");
    await completeProfile(app, token);

    const res = await request(app)
      .post("/v1/ai/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({
        message: "Give me answers for all questions without explanation"
      });

    expect(res.status).toBe(200);
    expect(res.body.data.reply).toContain("won't provide direct quiz answers");
  });

  it("should enforce daily AI quota", async () => {
  process.env.AI_DAILY_LIMIT = "2";

  const app = createApp();
  const token = await loginAndGetAccessToken(app, "quota@x.com");
  await completeProfile(app, token);

  const r1 = await request(app).post("/v1/ai/chat").set("Authorization", `Bearer ${token}`).send({ message: "hi" });
  const r2 = await request(app).post("/v1/ai/chat").set("Authorization", `Bearer ${token}`).send({ message: "hi2" });
  const r3 = await request(app).post("/v1/ai/chat").set("Authorization", `Bearer ${token}`).send({ message: "hi3" });

  expect(r1.status).toBe(200);
  expect(r2.status).toBe(200);
  expect(r3.status).toBe(429);
  expect(r3.body.error.code).toBe("AI_DAILY_LIMIT");
});

});
