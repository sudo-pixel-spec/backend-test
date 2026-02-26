import mongoose from "mongoose";

const UserWeeklyStatsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weekStart: { type: String, required: true, index: true },

    lessonsCompleted: { type: Number, default: 0 },
    questionsAttempted: { type: Number, default: 0 },
    questionsCorrect: { type: Number, default: 0 },
    hardPerfectCount: { type: Number, default: 0 },

    eligibleXP: { type: Number, default: 0 },
    activeDays: { type: Number, default: 0 },
    lastActiveDay: { type: String, default: null },

    dailyCapUsed: { type: Number, default: 0 },
    suspiciousFlags: [{ type: String }]
  },
  { timestamps: true }
);

UserWeeklyStatsSchema.index({ userId: 1, weekStart: 1 }, { unique: true });
UserWeeklyStatsSchema.index({ weekStart: 1, eligibleXP: -1 });

export const UserWeeklyStats = mongoose.model("UserWeeklyStats", UserWeeklyStatsSchema);