import { Request, Response } from "express";
import { z } from "zod";
import { ok, fail } from "../utils/apiResponse";
import { Notification } from "../models/Notification";
import { User } from "../models/User";

const NotificationCreateSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(["platform", "push", "both"]).default("platform"),
  target: z.object({
    type: z.enum(["all", "standard", "user"]),
    value: z.string().optional()
  })
});

export async function listNotifications(req: Request, res: Response) {
  const adminUser = (req as any).user;
  const filter: any = {};

  if (adminUser?.adminType === "regular") {
    filter.sender = adminUser.id;
  }

  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).lean();
  return res.json(ok(notifications));
}

export async function sendNotification(req: Request, res: Response) {
  const adminUser = (req as any).user;
  const parsed = NotificationCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("VALIDATION", "Invalid payload", parsed.error.flatten()));

  const { target } = parsed.data;

  if (adminUser?.adminType === "regular") {
    const allocatedStandards = (adminUser.allocatedStandards ?? []).map((id: any) => String(id));

    if (target.type === "all") {
    } else if (target.type === "standard") {
      if (!allocatedStandards.includes(String(target.value))) {
        return res.status(403).json(fail("FORBIDDEN", "Cannot send notification to unallocated standard"));
      }
    } else if (target.type === "user") {
      const targetUser = await User.findById(target.value).select("profile.standard").lean();
      if (!targetUser || !allocatedStandards.includes(String(targetUser.profile?.standard))) {
        return res.status(403).json(fail("FORBIDDEN", "Cannot send notification to user in different grade"));
      }
    }
  }

  const notification = await Notification.create({
    ...parsed.data,
    target: {
      ...parsed.data.target,
      value: parsed.data.target.value ?? null
    },
    sender: adminUser.id,
    status: "sent",
    sentAt: new Date()
  });

  return res.status(201).json(ok(notification));
}
