import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../src/app";
import { User } from "../src/models/User";
import { loginAndGetAccessToken, completeProfile } from "./helpers/auth";

let replset: MongoMemoryReplSet;

export async function setupTestUser(app: any, phone: string, role: string, adminType?: string, allocatedStandards?: string[]) {
  const token = await loginAndGetAccessToken(app, phone);
  await completeProfile(app, token);

  const normalizedPhone = phone.replace(/\D/g, "");
  const finalPhone = normalizedPhone.length === 10 ? `+91${normalizedPhone}` : normalizedPhone;

  const update: any = { role };
  if (adminType) update.adminType = adminType;
  if (allocatedStandards) update.allocatedStandards = allocatedStandards;

  await User.updateOne({ phone: finalPhone }, { $set: update });
  return await loginAndGetAccessToken(app, phone);
}

describe("Admin Features & RBAC", () => {
  let standard1Id: string;
  let standard2Id: string;

  beforeAll(async () => {
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replset.getUri());

    standard1Id = new mongoose.Types.ObjectId().toString();
    standard2Id = new mongoose.Types.ObjectId().toString();
  });

  afterEach(async () => {
    await mongoose.models.Badge?.deleteMany({});
    await mongoose.models.Event?.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
    await replset.stop();
  });

  it("should restrict creating admins to super admin only", async () => {
    const app = createApp();

    const learnerToken = await setupTestUser(app, "1000000001", "learner");
    const regularAdminToken = await setupTestUser(app, "1000000002", "admin", "regular");
    const superAdminToken = await setupTestUser(app, "1000000003", "admin", "super");

    const payload = { email: "newadmin@example.com", adminType: "regular", fullName: "New", allocatedStandards: [standard1Id] };

    const res1 = await request(app).post("/v1/admin/admins").set("Authorization", `Bearer ${learnerToken}`).send(payload);
    expect(res1.status).toBe(403);

    const res2 = await request(app).post("/v1/admin/admins").set("Authorization", `Bearer ${regularAdminToken}`).send(payload);
    expect(res2.status).toBe(403);

    const res3 = await request(app).post("/v1/admin/admins").set("Authorization", `Bearer ${superAdminToken}`).send(payload);
    expect(res3.status).toBe(201);
    expect(res3.body.data.email).toBe("newadmin@example.com");
  });

  it("should allow regular admin to perform day-to-day tasks (badges, events)", async () => {
    const app = createApp();
    const adminToken = await setupTestUser(app, "1000000004", "admin", "regular", [standard1Id]);

    const badgeRes = await request(app)
      .post("/v1/admin/badges")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Test Badge",
        code: "TEST_BADGE",
        description: "Test description",
        iconUrl: "http://example.com/icon.png",
        criteria: { type: "total_xp", value: 10 }
      });
    expect(badgeRes.status).toBe(201);

    const eventRes = await request(app)
      .post("/v1/admin/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Test Event",
        description: "Test description",
        startDate: new Date(Date.now() + 10000).toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        type: "challenge",
        standardIds: [standard1Id]
      });
    expect(eventRes.status).toBe(201);

    const usersRes = await request(app)
      .get("/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(usersRes.status).toBe(200);
    expect(usersRes.body.data.items).toBeInstanceOf(Array);
  });

  it("should restrict system configuration to super admin", async () => {
    const app = createApp();
    const regularAdminToken = await setupTestUser(app, "1000000005", "admin", "regular");
    const superAdminToken = await setupTestUser(app, "1000000006", "admin", "super");

    const payload = { period: "daily" };

    const res1 = await request(app)
      .patch("/v1/admin/system/leaderboard")
      .set("Authorization", `Bearer ${regularAdminToken}`)
      .send(payload);
    expect(res1.status).toBe(403);

    const res2 = await request(app)
      .patch("/v1/admin/system/leaderboard")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.data.period).toBe("daily");

    const res3 = await request(app)
      .get("/v1/admin/system/api-logs")
      .set("Authorization", `Bearer ${regularAdminToken}`);
    expect(res3.status).toBe(403);

    const res4 = await request(app)
      .get("/v1/admin/system/api-logs")
      .set("Authorization", `Bearer ${superAdminToken}`);
    expect(res4.status).toBe(200);
  });
});