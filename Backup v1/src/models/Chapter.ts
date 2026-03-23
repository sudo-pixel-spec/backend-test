import mongoose from "mongoose";
import { softDeletePlugin } from "../models/plugins/softDeletePlugin";

const ChapterSchema = new mongoose.Schema({
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true, index: true },
  name: { type: String, required: true },
  orderIndex: { type: Number, default: 0 },

  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

ChapterSchema.plugin(softDeletePlugin);
export const Chapter = mongoose.model("Chapter", ChapterSchema);
