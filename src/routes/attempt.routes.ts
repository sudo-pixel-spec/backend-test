import { Router } from "express";
import { requireAuth, profileGate } from "../middleware/auth";
import { submitAttempt } from "../controllers/attempt.controller";

export const attemptRouter = Router();

attemptRouter.post("/attempts/submit", requireAuth, profileGate, submitAttempt);
