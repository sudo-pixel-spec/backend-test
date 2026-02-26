import mongoose from "mongoose";

const ChatSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
    title: { type: String }
  },
  { timestamps: true }
);

export const ChatSession = mongoose.model("ChatSession", ChatSessionSchema);
