import mongoose from "mongoose";

const UserNotificationReadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
    },
    readAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

UserNotificationReadSchema.index(
  { userId: 1, notificationId: 1 },
  { unique: true }
);

export const UserNotificationRead = mongoose.model(
  "UserNotificationRead",
  UserNotificationReadSchema
);
