import mongoose from "mongoose";
import { softDeletePlugin } from "../models/plugins/softDeletePlugin";

const StandardSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  active: { type: Boolean, default: false },

  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

StandardSchema.plugin(softDeletePlugin);
export const Standard = mongoose.model("Standard", StandardSchema);
