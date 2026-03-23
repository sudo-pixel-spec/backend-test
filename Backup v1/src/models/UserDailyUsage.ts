import mongoose from "mongoose";

const UserDailyUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    aiMessages: { type: Number, default: 0 }
  },
  { timestamps: true }
);

UserDailyUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export const UserDailyUsage = mongoose.model("UserDailyUsage", UserDailyUsageSchema);
