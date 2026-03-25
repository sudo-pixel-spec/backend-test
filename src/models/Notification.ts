import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["platform", "push", "both"], default: "platform" },
    target: {
      type: { type: String, enum: ["all", "standard", "user"], required: true },
      value: { type: String }
    },
    status: { type: String, enum: ["draft", "sent"], default: "draft" },
    sentAt: { type: Date },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", NotificationSchema);
