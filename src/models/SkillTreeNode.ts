import mongoose from "mongoose";

const SkillTreeNodeSchema = new mongoose.Schema(
  {
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true, index: true },
    standardId: { type: mongoose.Schema.Types.ObjectId, ref: "Standard", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    orderIndex: { type: Number, default: 0 },
    xpReward: { type: Number, default: 50 },
    type: { type: String, enum: ["lesson", "quiz", "challenge", "milestone"], default: "lesson" },
    iconEmoji: { type: String, default: "📘" },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const SkillTreeNode = mongoose.model("SkillTreeNode", SkillTreeNodeSchema);
