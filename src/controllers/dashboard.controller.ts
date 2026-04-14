import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ok, fail } from "../utils/apiResponse";
import { User } from "../models/User";
import { Attempt } from "../models/Attempt";
import { Lesson } from "../models/Lesson";
import { Chapter } from "../models/Chapter";
import { Unit } from "../models/Unit";
import { Subject } from "../models/Subject";
import { UserWeeklyStats } from "../models/UserWeeklyStats";
import { getWeekStartISO, getWeeklyLeaderboard } from "../services/leaderboard.service";
import mongoose from "mongoose";

export async function getDashboardHome(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json(fail("NO_AUTH", "Not authenticated"));
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json(fail("USER_NOT_FOUND", "User not found"));
  }

  // ----- 1. Leaderboard top-5 + current user rank -----
  const weekStart = getWeekStartISO(new Date());
  const allEntries = await getWeeklyLeaderboard(weekStart, "growth", 200);

  const top5 = allEntries.slice(0, 5);
  const userRankIndex = allEntries.findIndex(
    (e) => e.userId === String(user._id)
  );
  const rank = userRankIndex >= 0 ? userRankIndex + 1 : null;

  // ---- 2. Continue Learning -----------------------------------------------
  // Find the most-recently attempted lesson that still has a published quiz,.
  // so the learner can pick up where they left off..
  let continueLearning: null | {
    lessonId: string;
    lessonTitle: string;
    chapterName: string;
    subjectName: string;
    lastAttemptedAt: string;
  } = null;

  try {
    const lastAttempt = await Attempt.findOne({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    if (lastAttempt) {
      const lesson = await Lesson.findById(lastAttempt.lessonId)
        .select("title chapterId published")
        .lean();

      if (lesson && lesson.published) {
        const chapter = await Chapter.findById(lesson.chapterId)
          .select("name unitId")
          .lean();
        const unit = await Unit.findById(chapter?.unitId)
          .select("subjectId")
          .lean();
        const subject = await Subject.findById(unit?.subjectId)
          .select("name")
          .lean();

        continueLearning = {
          lessonId: String(lastAttempt.lessonId),
          lessonTitle: lesson.title,
          chapterName: chapter?.name ?? "",
          subjectName: subject?.name ?? "",
          lastAttemptedAt: (lastAttempt as any).createdAt?.toISOString?.() ?? "",
        };
      }
    }
  } catch {
  }

  // ---- 3. Recent Activity (last 5 quiz attempts with lesson title) -----------
  let recentActivity: Array<{
    lessonId: string;
    lessonTitle: string;
    score: number;
    totalQuestions: number;
    xpAwarded: number;
    completedAt: string;
  }> = [];

  try {
    const recentAttempts = await Attempt.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (recentAttempts.length > 0) {
      const lessonIds = [...new Set(recentAttempts.map((a) => String(a.lessonId)))];
      const lessons = await Lesson.find({
        _id: { $in: lessonIds.map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .select("title")
        .lean();

      const lessonMap = new Map(lessons.map((l) => [String(l._id), l.title]));

      recentActivity = recentAttempts.map((a) => ({
        lessonId: String(a.lessonId),
        lessonTitle: lessonMap.get(String(a.lessonId)) ?? "Unknown Lesson",
        score: a.score ?? 0,
        totalQuestions: a.totalQuestions ?? 0,
        xpAwarded: a.xpAwarded ?? 0,
        completedAt: (a as any).createdAt?.toISOString?.() ?? "",
      }));
    }
  } catch {
  }

  // ---- 4. This week's stats for the current user -------------------------
  const weeklyStats = await UserWeeklyStats.findOne({
    userId: user._id,
    weekStart,
  }).lean();

  const data = {
    profile: user.profile,
    xp: user.totalXP,
    level: user.level,
    streak: user.streakCount,
    coins: user.wallet?.coins ?? 0,
    diamonds: user.wallet?.diamonds ?? 0,

    rank,
    weeklyXP: weeklyStats?.eligibleXP ?? 0,
    weeklyActiveDays: weeklyStats?.activeDays ?? 0,

    continueLearning,
    leaderboard: top5,
    recentActivity,
  };

  return res.json(ok(data));
}