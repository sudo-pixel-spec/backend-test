import mongoose from "mongoose";

export type UserRole = "learner" | "admin";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["learner", "admin"], default: "learner" },
    adminType: { type: String, enum: ["super", "regular"] },
    allocatedStandards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Standard" }],

    authProvider: { type: String, enum: ["otp", "google"], default: "otp" },
    googleSub: { type: String, sparse: true },

    profileComplete: { type: Boolean, default: false },
    onboardingComplete: { type: Boolean, default: false },
    profile: {
      fullName: { type: String },
      avatarUrl: { type: String },
      school: { type: String },
      age: { type: Number },
      standard: { type: String },
      timezone: { type: String }
    },

    totalXP: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streakCount: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: null },
    status: { type: String, enum: ["active", "banned", "suspended"], default: "active" },
    badges: [{ type: String }],

    wallet: {
      coins: { type: Number, default: 0 },
      diamonds: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);