import { Request, Response } from "express";
import { ok, fail } from "../utils/apiResponse";
import { Attempt } from "../models/Attempt";
import { User } from "../models/User";
import { UserWeeklyStats } from "../models/UserWeeklyStats";
import { Lesson } from "../models/Lesson";
import { Chapter } from "../models/Chapter";
import { Unit } from "../models/Unit";
import { Subject } from "../models/Subject";
import { AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";

export async function getAnalytics(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(fail("UNAUTHORIZED", "User not found"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(fail("NOT_FOUND", "User not found"));
    }

    const attempts = await Attempt.find({ userId });
    const uniqueLessonsCompleted = new Set(attempts.filter(a => (a.score || 0) > 0).map(a => a.lessonId.toString()));
    const lessonsCompleted = uniqueLessonsCompleted.size;

    let totalScore = 0;
    let totalQuestionsCount = 0;
    for (const attempt of attempts) {
      totalScore += attempt.score || 0;
      totalQuestionsCount += attempt.totalQuestions || 0;
    }
    const avgScore = totalQuestionsCount > 0 ? Math.round((totalScore / totalQuestionsCount) * 100) : 0;

    const weeklyStats = await UserWeeklyStats.find({ userId });
    let activeDays = 0;
    for (const stat of weeklyStats) {
      activeDays += stat.activeDays || 0;
    }
    
    const longestStreak = Math.max(user.streakCount || 0, activeDays > 0 ? 1 : 0);

    const xpHistory = [];
    const today = new Date();
    
    const xpByDate = new Map<string, number>();
    const twentyEightDaysAgo = new Date(today);
    twentyEightDaysAgo.setDate(today.getDate() - 28);
    
    const recentAttempts = await Attempt.find({
      userId,
      createdAt: { $gte: twentyEightDaysAgo }
    });

    for (const attempt of recentAttempts) {
      const dateStr = attempt.createdAt.toISOString().slice(0, 10);
      xpByDate.set(dateStr, (xpByDate.get(dateStr) || 0) + (attempt.xpAwarded || 0));
    }

    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      xpHistory.push({
        date: dateStr,
        xp: xpByDate.get(dateStr) || 0
      });
    }

    const subjectStrengths = await Attempt.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "lessons",
          localField: "lessonId",
          foreignField: "_id",
          as: "lesson"
        }
      },
      { $unwind: "$lesson" },
      {
        $lookup: {
          from: "chapters",
          localField: "lesson.chapterId",
          foreignField: "_id",
          as: "chapter"
        }
      },
      { $unwind: "$chapter" },
      {
        $lookup: {
          from: "units",
          localField: "chapter.unitId",
          foreignField: "_id",
          as: "unit"
        }
      },
      { $unwind: "$unit" },
      {
        $lookup: {
          from: "subjects",
          localField: "unit.subjectId",
          foreignField: "_id",
          as: "subject"
        }
      },
      { $unwind: "$subject" },
      {
        $group: {
          _id: "$subject._id",
          subjectName: { $first: "$subject.name" },
          totalScore: { $sum: "$score" },
          totalQuestions: { $sum: "$totalQuestions" }
        }
      },
      {
        $project: {
          _id: 0,
          subject: "$subjectName",
          avgScore: {
            $cond: [
              { $gt: ["$totalQuestions", 0] },
              { $round: [{ $multiply: [{ $divide: ["$totalScore", "$totalQuestions"] }, 100] }, 0] },
              0
            ]
          }
        }
      }
    ]);

    return res.status(200).json(
      ok({
        lessonsCompleted,
        avgScore,
        longestStreak,
        activeDays,
        xpHistory,
        subjectStrengths
      })
    );
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return res.status(500).json(fail("INTERNAL_ERROR", "Failed to fetch analytics data"));
  }
}
