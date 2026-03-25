import { Request, Response } from "express";
import { ok } from "../utils/apiResponse";
import { User } from "../models/User";
import { Standard } from "../models/Standard";
import { Attempt } from "../models/Attempt";
import { Subject } from "../models/Subject";
import { Unit } from "../models/Unit";
import { Chapter } from "../models/Chapter";
import { Lesson } from "../models/Lesson";

export async function getAdminDashboardMetrics(req: Request, res: Response) {
  const adminUser = (req as any).user;
  let allowedStandardCodes: string[] | null = null;
  let allowedLessonIds: string[] | null = null;

  const isSuper = adminUser?.adminType === "super";

  if (!isSuper && adminUser.allocatedStandards?.length) {
    const standards = await Standard.find({ _id: { $in: adminUser.allocatedStandards } }).select("code").lean();
    allowedStandardCodes = standards.map((s: any) => s.code);

    const subjects = await Subject.find({ standardId: { $in: adminUser.allocatedStandards } }).select("_id").lean();
    const units = await Unit.find({ subjectId: { $in: subjects.map((s: any) => s._id) } }).select("_id").lean();
    const chapters = await Chapter.find({ unitId: { $in: units.map((u: any) => u._id) } }).select("_id").lean();
    const lessons = await Lesson.find({ chapterId: { $in: chapters.map((c: any) => c._id) } }).select("_id").lean();
    allowedLessonIds = lessons.map((l: any) => l._id);
  }

  const userFilter: any = { role: "learner" };
  if (allowedStandardCodes) {
    userFilter["profile.standard"] = { $in: allowedStandardCodes };
  }

  const attemptFilter: any = {};
  if (allowedLessonIds) {
    attemptFilter.lessonId = { $in: allowedLessonIds };
  }

  const totalUsers = await User.countDocuments(userFilter);

  const todayStr = new Date().toISOString().split("T")[0];
  const activeUsersToday = await User.countDocuments({ ...userFilter, lastActiveDate: todayStr });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
  const activeUsersWeek = await User.countDocuments({ ...userFilter, lastActiveDate: { $gte: sevenDaysAgoStr } });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newRegistrationsMonth = await User.countDocuments({ ...userFilter, createdAt: { $gte: thirtyDaysAgo } });

  const totalQuizzesTaken = await Attempt.countDocuments(attemptFilter);

  const userGrowthData = await User.aggregate([
    { $match: { ...userFilter, createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const dauData = await User.aggregate([
    { $match: { ...userFilter, lastActiveDate: { $gte: sevenDaysAgoStr } } },
    { $group: { _id: "$lastActiveDate", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  let system: any = undefined;
  if (isSuper) {
    const db = User.db;
    if (!db.db) {
       system = { status: "offline", reason: "DATABASE_NOT_READY" };
    } else {
      const collections = await db.db.listCollections().toArray();
      const hasAgenda = collections.some(c => c.name === "agendaJobs");
      
      let jobStats = { running: 0, failed: 0, queued: 0 };
      if (hasAgenda) {
        const agendaJobs = db.db.collection("agendaJobs");
        jobStats = {
          running: await agendaJobs.countDocuments({ lockedAt: { $exists: true }, lastFinishedAt: { $exists: false } }),
          failed: await agendaJobs.countDocuments({ failCount: { $gt: 0 } }),
          queued: await agendaJobs.countDocuments({ nextRunAt: { $exists: true } }),
        };
      }

      system = {
        status: "online",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        jobs: jobStats
      };
    }
  }

  return res.json(ok({
    widgets: {
      totalUsers,
      activeUsersToday,
      activeUsersWeek,
      newRegistrationsMonth,
      quizzesTaken: totalQuizzesTaken,
      lessonsCompleted: totalQuizzesTaken,
      system
    },
    charts: {
      userGrowth: userGrowthData.map((d: any) => ({ date: d._id, count: d.count })),
      dailyActiveUsers: dauData.map((d: any) => ({ date: d._id, count: d.count }))
    }
  }));
}

export async function getRetentionAnalytics(req: Request, res: Response) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const users = await User.find({ role: "learner", createdAt: { $gte: thirtyDaysAgo } }).select("createdAt lastActiveDate");
  const cohort: Record<string, { total: number, active: number }> = {};
  
  users.forEach((u) => {
    if (!u.createdAt) return;
    const joinDate = u.createdAt.toISOString().split("T")[0];
    if (!joinDate) return;

    if (!cohort[joinDate]) cohort[joinDate] = { total: 0, active: 0 };
    cohort[joinDate].total++;
    
    const lastActive = new Date(u.lastActiveDate || u.createdAt);
    const diffDays = Math.floor((new Date().getTime() - lastActive.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 7) cohort[joinDate].active++;
  });
  
  return res.json(ok({ cohort, totalAnalyzed: users.length }));
}