import { Router } from "express";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

import {
  listStandards, createStandard, updateStandard, deleteStandard,
  listSubjects, createSubject, updateSubject, deleteSubject,
  listUnits, createUnit, updateUnit, deleteUnit,
  listChapters, createChapter, updateChapter, deleteChapter,
  listLessons, createLesson, updateLesson, deleteLesson,
  getLatestQuizForLesson, createQuizVersion, setQuizPublished, publishQuizExclusive,
  restoreStandard, restoreSubject, restoreUnit, restoreChapter, restoreLesson, restoreQuiz, jobsStatus, listAdminAuditLogs
} from "../controllers/admin.controller";

import { getAdminDashboardMetrics } from "../controllers/admin.dashboard.controller";
import { listUsers, editUser, deleteUser, awardBadge, awardXP, getUserProfile, createAdminAccount, resetUserProgress } from "../controllers/admin.users.controller";
import { listEvents, createEvent, updateEvent, deleteEvent } from "../controllers/admin.events.controller";
import { listNotifications, sendNotification } from "../controllers/admin.notifications.controller";
import { listBadges, createBadge, updateBadge, deleteBadge } from "../controllers/admin.badges.controller";
import { getLeaderboardConfig, updateLeaderboardConfig, resetLeaderboard, getApiLogs } from "../controllers/admin.system.controller";
import { listJobs, retryJob, deleteJob } from "../controllers/admin.jobs.controller";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/metrics", getAdminDashboardMetrics);

adminRouter.post("/admins", requireSuperAdmin, createAdminAccount);

adminRouter.get("/notifications", listNotifications);
adminRouter.post("/notifications", sendNotification);

adminRouter.get("/events", listEvents);
adminRouter.post("/events", createEvent);
adminRouter.patch("/events/:id", updateEvent);
adminRouter.delete("/events/:id", deleteEvent);

adminRouter.get("/badges", listBadges);
adminRouter.post("/badges", createBadge);
adminRouter.patch("/badges/:id", updateBadge);
adminRouter.delete("/badges/:id", deleteBadge);

adminRouter.get("/system/leaderboard", getLeaderboardConfig);
adminRouter.patch("/system/leaderboard", requireSuperAdmin, updateLeaderboardConfig);
adminRouter.post("/system/leaderboard/reset", requireSuperAdmin, resetLeaderboard);
adminRouter.get("/system/api-logs", requireSuperAdmin, getApiLogs);

adminRouter.get("/jobs", requireSuperAdmin, listJobs);
adminRouter.post("/jobs/:id/retry", requireSuperAdmin, retryJob);
adminRouter.delete("/jobs/:id", requireSuperAdmin, deleteJob);

adminRouter.get("/standards", listStandards);
adminRouter.post("/standards", createStandard);
adminRouter.patch("/standards/:id", updateStandard);
adminRouter.delete("/standards/:id", deleteStandard);

adminRouter.get("/subjects", listSubjects);
adminRouter.post("/subjects", createSubject);
adminRouter.patch("/subjects/:id", updateSubject);
adminRouter.delete("/subjects/:id", deleteSubject);

adminRouter.get("/units", listUnits);
adminRouter.post("/units", createUnit);
adminRouter.patch("/units/:id", updateUnit);
adminRouter.delete("/units/:id", deleteUnit);

adminRouter.get("/chapters", listChapters);
adminRouter.post("/chapters", createChapter);
adminRouter.patch("/chapters/:id", updateChapter);
adminRouter.delete("/chapters/:id", deleteChapter);

adminRouter.get("/lessons", listLessons);
adminRouter.post("/lessons", createLesson);
adminRouter.patch("/lessons/:id", updateLesson);
adminRouter.delete("/lessons/:id", deleteLesson);

adminRouter.get("/quizzes/latest", getLatestQuizForLesson);
adminRouter.post("/quizzes/version", createQuizVersion);
adminRouter.patch("/quizzes/:id/published", setQuizPublished);
adminRouter.patch("/quizzes/:id/publish", publishQuizExclusive);

adminRouter.patch("/standards/:id/restore", restoreStandard);
adminRouter.patch("/subjects/:id/restore", restoreSubject);
adminRouter.patch("/units/:id/restore", restoreUnit);
adminRouter.patch("/chapters/:id/restore", restoreChapter);
adminRouter.patch("/lessons/:id/restore", restoreLesson);
adminRouter.patch("/quizzes/:id/restore", restoreQuiz);

adminRouter.get("/jobs/status", jobsStatus);
adminRouter.get("/audit", listAdminAuditLogs);

adminRouter.get("/users", listUsers);
adminRouter.patch("/users/:id", editUser);
adminRouter.delete("/users/:id", deleteUser);
adminRouter.post("/users/:id/badges", awardBadge);
adminRouter.post("/users/:id/xp", awardXP);
adminRouter.post("/users/:id/reset-progress", resetUserProgress);
adminRouter.get("/users/:id/profile", getUserProfile);