import { Request, Response } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { ok, fail } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { Quiz } from "../models/Quiz";
import { Attempt } from "../models/Attempt";
import { User } from "../models/User";
import { WalletTransaction } from "../models/WalletTransaction";
import {
  calculateXP,
  calculateLevel,
  calculateCoins,
  calculateDiamonds,
  updateStreak
} from "../services/gamification.service";
import { UserWeeklyStats } from "../models/UserWeeklyStats";
import { getWeekStartISO, getDayISO } from "../services/leaderboard.service";
import { weekWindow } from "../services/weekWindow";


const SubmitSchema = z.object({
  lessonId: z.string(),
  answers: z.array(
    z.object({
      qid: z.string(),
      selectedIndex: z.number()
    })
  ),
  timeSpentSec: z.number().optional(),
  idempotencyKey: z.string()
});

export async function submitAttempt(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json(fail("NO_AUTH", "Not authenticated"));

  const parsed = SubmitSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json(fail("VALIDATION", "Invalid payload", parsed.error.flatten()));

  const { lessonId, answers, timeSpentSec, idempotencyKey } = parsed.data;

  const existing = await Attempt.findOne({ userId: req.user.id, idempotencyKey });

  if (existing) {
    return res.json(ok(existing));
  }

  const quiz = await Quiz.findOne({ lessonId, published: true }).sort({ version: -1 });
  if (!quiz) return res.status(404).json(fail("QUIZ_NOT_FOUND", "No quiz for lesson"));

  let score = 0;

  const evaluated = answers.map((a) => {
    const question = quiz.questions.find((q) => q.qid === a.qid);
    const correct = question && question.answerIndex === a.selectedIndex;
    if (correct) score++;
    return { ...a, correct };
  });

  const xp = calculateXP(score, quiz.questions.length, quiz.difficulty);
  const coins = calculateCoins(score, quiz.questions.length);
  const diamonds = calculateDiamonds(score, quiz.questions.length, quiz.difficulty);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(req.user.id).session(session);
    if (!user) throw new Error("User not found");

    user.totalXP += xp;
    user.level = calculateLevel(user.totalXP);

    const streakResult = updateStreak(user.lastActiveDate);
    if (streakResult.newStreak) user.streakCount = streakResult.newStreak;
    if (streakResult.increment) user.streakCount += 1;
    if (streakResult.reset) user.streakCount = 1;
    user.lastActiveDate = streakResult.today;

    user.wallet.coins += coins;
    user.wallet.diamonds += diamonds;

    await user.save({ session });

    const weekStart = getWeekStartISO(new Date());
    const todayISO = getDayISO(new Date());
    const { start, end } = weekWindow(weekStart);

    const alreadyCounted = await Attempt.findOne({
      userId: user._id,
      lessonId: lessonId,
      createdAt: { $gte: start, $lt: end }
    }).session(session);

    const eligible = (timeSpentSec ?? 0) >= 20;

    const stats = await UserWeeklyStats.findOneAndUpdate(
      { userId: user._id, weekStart },
      { $setOnInsert: { userId: user._id, weekStart } },
      { upsert: true, new: true, session }
    );

    if (stats.lastActiveDay !== todayISO) {
      stats.activeDays += 1;
      stats.lastActiveDay = todayISO;
    }

    stats.questionsAttempted += quiz.questions.length;
    stats.questionsCorrect += score;

    if (!alreadyCounted && eligible) {
      stats.lessonsCompleted += 1;

      const DAILY_CAP = 300;
      const xpToAdd = Math.min(xp, DAILY_CAP);

      stats.eligibleXP += xpToAdd;

      if (quiz.difficulty === "hard" && score === quiz.questions.length) {
        stats.hardPerfectCount += 1;
      }
    }

    await stats.save({ session });


    await Attempt.create(
      [
        {
          userId: user._id,
          lessonId,
          quizVersion: quiz.version,
          answers: evaluated,
          score,
          totalQuestions: quiz.questions.length,
          xpAwarded: xp,
          coinsAwarded: coins,
          diamondsAwarded: diamonds,
          timeSpentSec,
          idempotencyKey
        }
      ],
      { session }
    );

    await WalletTransaction.create(
        [
            { userId: user._id, type: "earn", currency: "coins", amount: coins, reason: "lesson_complete" },
            { userId: user._id, type: "earn", currency: "diamonds", amount: diamonds, reason: "mastery_bonus" }
        ],
        { session, ordered: true }
    );


    await session.commitTransaction();
    session.endSession();

    return res.json(
      ok({
        score,
        total: quiz.questions.length,
        xpAwarded: xp,
        coinsAwarded: coins,
        diamondsAwarded: diamonds
      })
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}
