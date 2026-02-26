import mongoose from "mongoose";
import { softDeletePlugin } from "../models/plugins/softDeletePlugin";

const SubjectSchema = new mongoose.Schema({
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: "Standard", required: true, index: true },
  name: { type: String, required: true },
  orderIndex: { type: Number, default: 0 },

  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

SubjectSchema.plugin(softDeletePlugin);
export const Subject = mongoose.model("Subject", SubjectSchema);
