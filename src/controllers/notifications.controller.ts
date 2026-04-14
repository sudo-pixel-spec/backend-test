import { Response } from "express";
import mongoose from "mongoose";
import { ok, fail } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { Notification } from "../models/Notification";
import { UserNotificationRead } from "../models/UserNotificationRead";
import { User } from "../models/User";

async function buildTargetFilter(userId: string) {
  const user = await User.findById(userId).select("profile.standard").lean();
  const standard = (user as any)?.profile?.standard as string | undefined;

  const clauses: any[] = [{ "target.type": "all" }];

  if (standard) {
    clauses.push({ "target.type": "standard", "target.value": standard });
  }

  clauses.push({ "target.type": "user", "target.value": userId });

  return { $or: clauses };
}

export async function listMyNotifications(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json(fail("NO_AUTH", "Not authenticated"));

  const userId = req.user.id;
  const page  = Math.max(1, Number(req.query.page  ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
  const skip  = (page - 1) * limit;
  const unreadOnly = req.query.unread === "true";

  const targetFilter = await buildTargetFilter(userId);
  const baseFilter   = {
    ...targetFilter,
    status: "sent",
    type: { $in: ["platform", "both"] },
  };

  const [notifications, total] = await Promise.all([
    Notification.find(baseFilter)
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(baseFilter),
  ]);

  if (notifications.length === 0) {
    return res.json(ok({ page, limit, total, unreadCount: 0, items: [] }));
  }

  const notifIds = notifications.map((n) => n._id);
  const reads    = await UserNotificationRead.find({
    userId: new mongoose.Types.ObjectId(userId),
    notificationId: { $in: notifIds },
  })
    .select("notificationId")
    .lean();

  const readSet = new Set(reads.map((r) => String(r.notificationId)));

  let items = notifications.map((n) => ({
    id:        String(n._id),
    title:     n.title,
    message:   n.message,
    type:      n.type,
    sentAt:    (n as any).sentAt,
    createdAt: (n as any).createdAt,
    isRead:    readSet.has(String(n._id)),
  }));

  if (unreadOnly) {
    items = items.filter((i) => !i.isRead);
  }

  const unreadCount = await Notification.countDocuments(baseFilter).then(
    async () => {
      const totalRead = await UserNotificationRead.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        notificationId: { $in: notifIds },
      });
      return items.filter((i) => !i.isRead).length;
    }
  );

  return res.json(ok({ page, limit, total, unreadCount, items }));
}

export async function getUnreadCount(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json(fail("NO_AUTH", "Not authenticated"));

  const userId = req.user.id;

  const targetFilter = await buildTargetFilter(userId);
  const baseFilter   = {
    ...targetFilter,
    status: "sent",
    type: { $in: ["platform", "both"] },
  };

  const [totalVisible, totalRead] = await Promise.all([
    Notification.countDocuments(baseFilter),
    UserNotificationRead.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
    }),
  ]);

  const count = Math.max(0, totalVisible - totalRead);

  return res.json(ok({ count }));
}

export async function markNotificationRead(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json(fail("NO_AUTH", "Not authenticated"));

  const id = req.params.id as string;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json(fail("VALIDATION", "Invalid notification id"));
  }

  const userId = req.user.id;

  const targetFilter = await buildTargetFilter(userId);
  const notification = await Notification.findOne({
    _id: new mongoose.Types.ObjectId(id),
    ...targetFilter,
    status: "sent",
    type: { $in: ["platform", "both"] },
  }).lean();

  if (!notification) {
    return res.status(404).json(fail("NOT_FOUND", "Notification not found"));
  }

  await UserNotificationRead.updateOne(
    {
      userId:         new mongoose.Types.ObjectId(userId),
      notificationId: new mongoose.Types.ObjectId(id),
    },
    { $setOnInsert: { readAt: new Date() } },
    { upsert: true }
  );

  return res.json(ok({ read: true }));
}

export async function markAllNotificationsRead(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json(fail("NO_AUTH", "Not authenticated"));

  const userId = req.user.id;

  const targetFilter = await buildTargetFilter(userId);
  const notifications = await Notification.find({
    ...targetFilter,
    status: "sent",
    type: { $in: ["platform", "both"] },
  })
    .select("_id")
    .lean();

  if (notifications.length === 0) {
    return res.json(ok({ markedRead: 0 }));
  }

  const ops = notifications.map((n) => ({
    updateOne: {
      filter: {
        userId:         new mongoose.Types.ObjectId(userId),
        notificationId: n._id,
      },
      update:   { $setOnInsert: { readAt: new Date() } },
      upsert:   true,
    },
  }));

  const result = await UserNotificationRead.bulkWrite(ops, { ordered: false });
  const markedRead = result.upsertedCount;

  return res.json(ok({ markedRead }));
}
