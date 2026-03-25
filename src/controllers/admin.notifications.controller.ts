import { Request, Response } from "express";
import { z } from "zod";
import { ok, fail } from "../utils/apiResponse";
import { Notification } from "../models/Notification";
import { User } from "../models/User";
import * as OneSignal from '@onesignal/node-onesignal';
import { env } from "../config/env";

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

  if (env.ONESIGNAL_APP_ID && env.ONESIGNAL_REST_API_KEY) {
    try {
      const configuration = OneSignal.createConfiguration({
        restApiKey: env.ONESIGNAL_REST_API_KEY as string
      });
      const client = new OneSignal.DefaultApi(configuration);
      const pushNotification = new OneSignal.Notification();

      pushNotification.app_id = env.ONESIGNAL_APP_ID;
      pushNotification.headings = { en: parsed.data.title };
      pushNotification.contents = { en: parsed.data.message };

      if (target.type === "all") {
        pushNotification.included_segments = ["Subscribed Users"];
      } else if (target.type === "user") {
        pushNotification.include_aliases = { external_id: [target.value as string] };
      } else if (target.type === "standard") {
        pushNotification.filters = [
          { field: "tag", key: "standard", relation: "=", value: target.value as string }
        ];
      }

      await client.createNotification(pushNotification);
      console.log(`[Push Notification] Sent successfully for targeting: ${target.type}`);
    } catch (pushError) {
      console.error("[Push Notification] Failed to send via OneSignal", pushError);
    }
  } else {
    console.warn("[Push Notification] Skipped. Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY in .env");
  }

  return res.status(201).json(ok(notification));
}