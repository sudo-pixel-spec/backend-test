import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { type: String, enum: ["challenge", "competition"], default: "challenge" },
    rewards: {
      xp: { type: Number, default: 0 },
      badges: [{ type: String }]
    },
    status: { type: String, enum: ["draft", "published", "expired"], default: "draft" },
    standardIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Standard" }], // Which grades can see this
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Event = mongoose.model("Event", EventSchema);
