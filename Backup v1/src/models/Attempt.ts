import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema({
  qid: { type: String },
  selectedIndex: { type: Number },
  correct: { type: Boolean }
});

const AttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true, index: true },
    quizVersion: { type: Number, required: true },
    answers: [AnswerSchema],
    score: { type: Number }, totalQuestions: { type: Number }, xpAwarded: { type: Number }, coinsAwarded: { type: Number }, diamondsAwarded: { type: Number },
    timeSpentSec: { type: Number },
    idempotencyKey: { type: String, index: true }
  },
  { timestamps: true }
);

AttemptSchema.index({ userId: 1, lessonId: 1, createdAt: -1 });
AttemptSchema.index({ userId: 1, createdAt: -1 });
AttemptSchema.index({ idempotencyKey: 1, userId: 1 }, { unique: true });

export const Attempt = mongoose.model("Attempt", AttemptSchema);