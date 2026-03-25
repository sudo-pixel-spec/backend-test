import mongoose from "mongoose";

export interface IBadge extends mongoose.Document {
  name: string;
  code: string;
  description: string;
  iconUrl: string;
  criteria: {
    type: "total_xp" | "quizzes_completed" | "streak_days" | "manual";
    value: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    iconUrl: { type: String, required: true },
    criteria: {
      type: { 
        type: String, 
        enum: ["total_xp", "quizzes_completed", "streak_days", "manual"], 
        required: true 
      },
      value: { type: Number, required: true }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Badge = mongoose.model<IBadge>("Badge", BadgeSchema);
