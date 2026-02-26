import mongoose from "mongoose";
import { softDeletePlugin } from "../models/plugins/softDeletePlugin";

const UnitSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
  name: { type: String, required: true },
  orderIndex: { type: Number, default: 0 },

  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

UnitSchema.plugin(softDeletePlugin);
export const Unit = mongoose.model("Unit", UnitSchema);
