import { Router } from "express";
import { requireAuth, profileGate } from "../middleware/auth";
import { submitAttempt, getQuizForLesson } from "../controllers/attempt.controller";

export const attemptRouter = Router();

attemptRouter.post("/attempts/submit", requireAuth, profileGate, submitAttempt);
attemptRouter.get("/attempts/quiz/:lessonId", requireAuth, profileGate, getQuizForLesson);
