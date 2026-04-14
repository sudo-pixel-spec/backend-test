import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../src/app";
import { loginAndGetAccessToken, completeProfile } from "./helpers/auth";
import { Notification } from "../src/models/Notification";
import { UserNotificationRead } from "../src/models/UserNotificationRead";
import { User } from "../src/models/User";

let replset: MongoMemoryReplSet;
let app: any;
let learnerToken1: string;
let learnerToken2: string;
let adminId: string;
let user1Id: string;
let user2Id: string;

describe("Notifications Endpoints", () => {
  beforeAll(async () => {
    replset = await MongoMemoryReplSet.create({
      replSet: { count: 1 }
    });
    await mongoose.connect(replset.getUri());
    app = createApp();

    learnerToken1 = await loginAndGetAccessToken(app, "9999999901");
    await completeProfile(app, learnerToken1);
    const u1 = await User.findOne({ phone: "+919999999901" });
    user1Id = String(u1!._id);

    learnerToken2 = await loginAndGetAccessToken(app, "9999999902");
    await completeProfile(app, learnerToken2);
    const u2 = await User.findOne({ phone: "+919999999902" });
    u2!.profile!.standard = "CBSE_STD_9";
    await u2!.save();
    
    user2Id = String(u2!._id);

    const admin = await User.create({ email: "admin@gamifyed.com", role: "admin", adminType: "super" });
    adminId = String(admin._id);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replset.stop();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
    await UserNotificationRead.deleteMany({});
  });

  async function createTestNotification(title: string, targetType: string, targetValue?: string, type = "platform") {
    return await Notification.create({
      title,
      message: "Test message",
      type,
      target: { type: targetType, value: targetValue },
      status: "sent",
      sentAt: new Date(),
      sender: adminId
    });
  }

  it("should list notifications targeted to all users", async () => {
    await createTestNotification("Global Alert", "all");

    const res = await request(app)
      .get("/v1/notifications")
      .set("Authorization", `Bearer ${learnerToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].title).toBe("Global Alert");
    expect(res.body.data.items[0].isRead).toBe(false);
  });

  it("should filter notifications by standard", async () => {
    await createTestNotification("Class 8 Alert", "standard", "CBSE_STD_8");
    await createTestNotification("Class 9 Alert", "standard", "CBSE_STD_9");

    const res1 = await request(app)
      .get("/v1/notifications")
      .set("Authorization", `Bearer ${learnerToken1}`);

    expect(res1.body.data.items.length).toBe(1);
    expect(res1.body.data.items[0].title).toBe("Class 8 Alert");

    const res2 = await request(app)
      .get("/v1/notifications")
      .set("Authorization", `Bearer ${learnerToken2}`);

    expect(res2.status).toBe(200);
    expect(res2.body.data.items.length).toBe(1);
    expect(res2.body.data.items[0].title).toBe("Class 9 Alert");
  });

  it("should fetch specific user notifications", async () => {
    await createTestNotification("User 1 Only", "user", user1Id);

    const res1 = await request(app)
      .get("/v1/notifications")
      .set("Authorization", `Bearer ${learnerToken1}`);

    const res2 = await request(app)
      .get("/v1/notifications")
      .set("Authorization", `Bearer ${learnerToken2}`);

    expect(res1.body.data.items.length).toBe(1);
    expect(res2.body.data.items.length).toBe(0);
  });

  it("should not list push-only notifications", async () => {
    await createTestNotification("Push Only", "all", undefined, "push");
    await createTestNotification("Platform And Push", "all", undefined, "both");

    const res = await request(app)
      .get("/v1/notifications")
      .set("Authorization", `Bearer ${learnerToken1}`);

    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].title).toBe("Platform And Push");
  });

  it("should return unread count", async () => {
    const n1 = await createTestNotification("Notif 1", "all");
    const n2 = await createTestNotification("Notif 2", "all");

    let res = await request(app).get("/v1/notifications/unread-count").set("Authorization", `Bearer ${learnerToken1}`);
    expect(res.body.data.count).toBe(2);

    await request(app).patch(`/v1/notifications/${n1._id}/read`).set("Authorization", `Bearer ${learnerToken1}`);

    res = await request(app).get("/v1/notifications/unread-count").set("Authorization", `Bearer ${learnerToken1}`);
    expect(res.body.data.count).toBe(1);

    await request(app).patch("/v1/notifications/read-all").set("Authorization", `Bearer ${learnerToken1}`);

    res = await request(app).get("/v1/notifications/unread-count").set("Authorization", `Bearer ${learnerToken1}`);
    expect(res.body.data.count).toBe(0);
  });

  it("should mark all as read correctly", async () => {
    await createTestNotification("N1", "all");
    await createTestNotification("N2", "all");

    const res = await request(app).patch("/v1/notifications/read-all").set("Authorization", `Bearer ${learnerToken1}`);
    expect(res.body.data.markedRead).toBe(2);

    const check = await request(app).get("/v1/notifications").set("Authorization", `Bearer ${learnerToken1}`);
    expect(check.body.data.unreadCount).toBe(0);
    expect(check.body.data.items.every((i: any) => i.isRead)).toBe(true);
  });
});
