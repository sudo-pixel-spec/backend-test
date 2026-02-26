import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

import {
  listStandards, createStandard, updateStandard, deleteStandard,
  listSubjects, createSubject, updateSubject, deleteSubject,
  listUnits, createUnit, updateUnit, deleteUnit,
  listChapters, createChapter, updateChapter, deleteChapter,
  listLessons, createLesson, updateLesson, deleteLesson,
  getLatestQuizForLesson, createQuizVersion, setQuizPublished, publishQuizExclusive,
  restoreStandard, restoreSubject, restoreUnit, restoreChapter, restoreLesson, restoreQuiz, jobsStatus 
} from "../controllers/admin.controller";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

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