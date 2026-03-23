import mongoose from "mongoose";
import { softDeletePlugin } from "../models/plugins/softDeletePlugin";

const QuestionSchema = new mongoose.Schema({
  qid: { type: String, required: true },
  prompt: { type: String, required: true },
  options: [{ type: String, required: true }],
  answerIndex: { type: Number, required: true },
  explanation: { type: String }
});

const QuizSchema = new mongoose.Schema(
  {
    lessonId: {type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true, index: true},
    version: { type: Number, required: true },
    source: {type: String, enum: ["seed", "ai"], default: "seed"},
    difficulty: {type: String, enum: ["easy", "medium", "hard"], default: "medium"},
    published: {type: Boolean, default: false, index: true},
    deletedAt: {type: Date, default: null, index: true},
    deletedBy: {type: mongoose.Schema.Types.ObjectId, ref: "User", default: null},
    questions: [QuestionSchema]
  },
  { timestamps: true }
);

QuizSchema.index({ lessonId: 1, version: -1 });
QuizSchema.index({ lessonId: 1, published: 1, version: -1 });
QuizSchema.plugin(softDeletePlugin);

export const Quiz = mongoose.model("Quiz", QuizSchema);
