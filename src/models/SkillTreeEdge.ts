import mongoose from "mongoose";

const SkillTreeEdgeSchema = new mongoose.Schema(
  {
    fromNodeId: { type: mongoose.Schema.Types.ObjectId, ref: "SkillTreeNode", required: true, index: true },
    toNodeId:   { type: mongoose.Schema.Types.ObjectId, ref: "SkillTreeNode", required: true, index: true },
    standardId: { type: mongoose.Schema.Types.ObjectId, ref: "Standard", required: true, index: true }
  },
  { timestamps: true }
);

SkillTreeEdgeSchema.index({ fromNodeId: 1, toNodeId: 1 }, { unique: true });

export const SkillTreeEdge = mongoose.model("SkillTreeEdge", SkillTreeEdgeSchema);
