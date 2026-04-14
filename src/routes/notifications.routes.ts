import { Router } from "express";
import { requireAuth, profileGate } from "../middleware/auth";
import {
  listMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notifications.controller";

export const notificationsRouter = Router();

notificationsRouter.get(
  "/notifications",
  requireAuth,
  profileGate,
  listMyNotifications
);

notificationsRouter.get(
  "/notifications/unread-count",
  requireAuth,
  profileGate,
  getUnreadCount
);

notificationsRouter.patch(
  "/notifications/read-all",
  requireAuth,
  profileGate,
  markAllNotificationsRead
);

notificationsRouter.patch(
  "/notifications/:id/read",
  requireAuth,
  profileGate,
  markNotificationRead
);
