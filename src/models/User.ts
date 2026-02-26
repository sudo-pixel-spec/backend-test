import mongoose from "mongoose";

export type UserRole = "learner" | "admin";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ["learner", "admin"], default: "learner" },

    authProvider: { type: String, enum: ["otp", "google"], default: "otp" },

    profileComplete: { type: Boolean, default: false },
    profile: {
      fullName: { type: String },
      avatarUrl: { type: String }, // ✅ add
      standard: { type: String },
      timezone: { type: String }
    },

    totalXP: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streakCount: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: null },

    wallet: {
      coins: { type: Number, default: 0 },
      diamonds: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);