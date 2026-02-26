import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { createApp } from "../src/app";
import { User } from "../src/models/User";
import { Standard } from "../src/models/Standard";
import { Quiz } from "../src/models/Quiz";
import { Subject } from "../src/models/Subject";
import { Unit } from "../src/models/Unit";
import { Chapter } from "../src/models/Chapter";
import { Lesson } from "../src/models/Lesson";
import { Attempt } from "../src/models/Attempt";

import { loginAndGetAccessToken, completeProfile } from "./helpers/auth";
import { seedLessonWithQuiz } from "./helpers/seedLessonQuiz";

let replset: MongoMemoryReplSet;

async function makeAdmin(app: any, email: string) {
  const token = await loginAndGetAccessToken(app, email);
  await completeProfile(app, token);
  await User.updateOne({ email }, { $set: { role: "admin" } });
  const token2 = await loginAndGetAccessToken(app, email);
  return token2;
}

describe("Admin CMS", () => {
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

  it("should forbid non-admin access", async () => {
    const app = createApp();
    const token = await loginAndGetAccessToken(app, "user@x.com");
    await completeProfile(app, token);

    const res = await request(app)
      .get("/v1/admin/standards")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("admin can create/list/update/delete standard", async () => {
    const app = createApp();
    const adminToken = await makeAdmin(app, "admin@x.com");

    const createRes = await request(app)
      .post("/v1/admin/standards")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ code: "CBSE_STD_8", name: "Std 8", active: true });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.code).toBe("CBSE_STD_8");

    const listRes = await request(app)
      .get("/v1/admin/standards")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.total).toBe(1);

    const id = createRes.body.data._id;

    const updRes = await request(app)
      .patch(`/v1/admin/standards/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Class 8" });

    expect(updRes.status).toBe(200);
    expect(updRes.body.data.name).toBe("Class 8");

    const delRes = await request(app)
      .delete(`/v1/admin/standards/${id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);

    expect(await Standard.countDocuments({ deletedAt: null })).toBe(0);
    expect(await Standard.countDocuments({ deletedAt: { $ne: null } })).toBe(1);
  });

  it("admin can create next quiz version for a lesson", async () => {
    const app = createApp();
    const adminToken = await makeAdmin(app, "admin2@x.com");

    const seeded = await seedLessonWithQuiz("medium");
    const lessonId = seeded.lesson._id.toString();

    const v2 = await request(app)
      .post("/v1/admin/quizzes/version")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        lessonId,
        difficulty: "hard",
        source: "seed",
        published: true,
        questions: [
          { qid: "n1", prompt: "New Q1", options: ["a", "b"], answerIndex: 1, explanation: "E" }
        ]
      });

    expect(v2.status).toBe(201);
    expect(v2.body.data.version).toBe(2);
    expect(v2.body.data.published).toBe(true);

    const latest = await request(app)
      .get("/v1/admin/quizzes/latest")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ lessonId });

    expect(latest.status).toBe(200);
    expect(latest.body.data.version).toBe(2);
  });

  it("publish safeguard: only one published quiz per lesson", async () => {
  const app = createApp();
  const adminToken = await makeAdmin(app, "adminpub@x.com");

  const seeded = await seedLessonWithQuiz("medium");
  const lessonId = seeded.lesson._id.toString();

  const v2 = await request(app)
    .post("/v1/admin/quizzes/version")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      lessonId,
      difficulty: "hard",
      source: "seed",
      published: false,
      questions: [{ qid: "n1", prompt: "New Q1", options: ["a", "b"], answerIndex: 1 }]
    });

  expect(v2.status).toBe(201);

  const v1Doc = await Quiz.findOne({ lessonId, version: 1 }).lean();
  const v2Id = v2.body.data._id;

  expect(v1Doc).toBeTruthy();
  expect(v1Doc!.published).toBe(true);

  const pub = await request(app)
    .patch(`/v1/admin/quizzes/${v2Id}/publish`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({});

  expect(pub.status).toBe(200);
  expect(pub.body.data.published).toBe(true);

  const afterV1 = await Quiz.findOne({ lessonId, version: 1 }).lean();
  const afterV2 = await Quiz.findOne({ lessonId, version: 2 }).lean();

  expect(afterV1!.published).toBe(false);
  expect(afterV2!.published).toBe(true);

  const publishedCount = await Quiz.countDocuments({ lessonId, published: true });
  expect(publishedCount).toBe(1);
});

it("delete safeguard: cannot delete standard if subjects exist", async () => {
  const app = createApp();
  const adminToken = await makeAdmin(app, "guard1@x.com");

  const std = await request(app)
    .post("/v1/admin/standards")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ code: "CBSE_STD_8", name: "Std 8", active: true });

  const standardId = std.body.data._id;

  await Subject.create({ standardId, name: "Science", orderIndex: 1 });

  const del = await request(app)
    .delete(`/v1/admin/standards/${standardId}`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(del.status).toBe(409);
  expect(del.body.ok).toBe(false);
  expect(del.body.error.code).toBe("HAS_CHILDREN");
});

it("delete safeguard: cannot delete subject if units exist", async () => {
  const app = createApp();
  const adminToken = await makeAdmin(app, "guard2@x.com");

  const std = await request(app)
    .post("/v1/admin/standards")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ code: "CBSE_STD_8", name: "Std 8", active: true });

  const subject = await Subject.create({ standardId: std.body.data._id, name: "Science", orderIndex: 1 });
  await Unit.create({ subjectId: subject._id, name: "Unit 1", orderIndex: 1 });

  const del = await request(app)
    .delete(`/v1/admin/subjects/${subject._id}`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(del.status).toBe(409);
  expect(del.body.error.code).toBe("HAS_CHILDREN");
});

it("delete safeguard: cannot delete unit if chapters exist", async () => {
  const app = createApp();
  const adminToken = await makeAdmin(app, "guard3@x.com");

  const std = await request(app)
    .post("/v1/admin/standards")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ code: "CBSE_STD_8", name: "Std 8", active: true });

  const subject = await Subject.create({ standardId: std.body.data._id, name: "Science", orderIndex: 1 });
  const unit = await Unit.create({ subjectId: subject._id, name: "Unit 1", orderIndex: 1 });
  await Chapter.create({ unitId: unit._id, name: "Ch 1", orderIndex: 1 });

  const del = await request(app)
    .delete(`/v1/admin/units/${unit._id}`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(del.status).toBe(409);
  expect(del.body.error.code).toBe("HAS_CHILDREN");
});

it("delete safeguard: cannot delete chapter if lessons exist", async () => {
  const app = createApp();
  const adminToken = await makeAdmin(app, "guard4@x.com");

  const std = await request(app)
    .post("/v1/admin/standards")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ code: "CBSE_STD_8", name: "Std 8", active: true });

  const subject = await Subject.create({ standardId: std.body.data._id, name: "Science", orderIndex: 1 });
  const unit = await Unit.create({ subjectId: subject._id, name: "Unit 1", orderIndex: 1 });
  const chapter = await Chapter.create({ unitId: unit._id, name: "Ch 1", orderIndex: 1 });

  await Lesson.create({ chapterId: chapter._id, title: "L1", orderIndex: 1, published: true });

  const del = await request(app)
    .delete(`/v1/admin/chapters/${chapter._id}`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(del.status).toBe(409);
  expect(del.body.error.code).toBe("HAS_CHILDREN");
});

it("delete safeguard: cannot delete lesson if quizzes exist", async () => {
  const app = createApp();
  const adminToken = await makeAdmin(app, "guard5@x.com");

  const seeded = await seedLessonWithQuiz("medium");
  const lessonId = seeded.lesson._id.toString();

  const del = await request(app)
    .delete(`/v1/admin/lessons/${lessonId}`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(del.status).toBe(409);
  expect(del.body.error.code).toBe("HAS_CHILDREN");
});

it("delete safeguard: cannot delete lesson if attempts exist", async () => {
  const app = createApp();
  const adminToken = await makeAdmin(app, "guard6@x.com");

  const seeded = await seedLessonWithQuiz("medium");
  const lessonId = seeded.lesson._id.toString();

  const token = await loginAndGetAccessToken(app, "attempt@x.com");
  await completeProfile(app, token);

  await request(app)
    .post("/v1/attempts/submit")
    .set("Authorization", `Bearer ${token}`)
    .send({
      lessonId,
      answers: [
        { qid: "q1", selectedIndex: 0 },
        { qid: "q2", selectedIndex: 1 },
        { qid: "q3", selectedIndex: 2 }
      ],
      timeSpentSec: 30,
      idempotencyKey: "guard-attempt-1"
    });

  const del = await request(app)
    .delete(`/v1/admin/lessons/${lessonId}`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(del.status).toBe(409);
  expect(del.body.error.code).toBe("HAS_CHILDREN");
});

it("soft delete: deleted items excluded from admin list by default, included with includeDeleted=true, and can be restored", async () => {
  const app = createApp();
  const adminToken = await makeAdmin(app, "soft@x.com");

  const createRes = await request(app)
    .post("/v1/admin/standards")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ code: "CBSE_STD_8", name: "Std 8", active: true });

  const id = createRes.body.data._id;

  const del = await request(app)
    .delete(`/v1/admin/standards/${id}`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(del.status).toBe(200);

  const listDefault = await request(app)
    .get("/v1/admin/standards")
    .set("Authorization", `Bearer ${adminToken}`);

  expect(listDefault.status).toBe(200);
  expect(listDefault.body.data.total).toBe(0);

  const listIncl = await request(app)
    .get("/v1/admin/standards?includeDeleted=true")
    .set("Authorization", `Bearer ${adminToken}`);

  expect(listIncl.status).toBe(200);
  expect(listIncl.body.data.total).toBe(1);
  expect(listIncl.body.data.items[0].deletedAt).toBeTruthy();

  const restore = await request(app)
    .patch(`/v1/admin/standards/${id}/restore`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(restore.status).toBe(200);
  expect(restore.body.data.deletedAt).toBe(null);

  const listAfter = await request(app)
    .get("/v1/admin/standards")
    .set("Authorization", `Bearer ${adminToken}`);

  expect(listAfter.body.data.total).toBe(1);
});

it("admin jobs status returns enabled false when jobs disabled", async () => {
  const app = createApp();
  const adminToken = await makeAdmin(app, "jobs@x.com");

  process.env.JOBS_ENABLED = "false";

  const res = await request(app)
    .get("/v1/admin/jobs/status")
    .set("Authorization", `Bearer ${adminToken}`);

  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  expect(res.body.data.enabled).toBe(false);
});
});
