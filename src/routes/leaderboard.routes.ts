import { Router } from "express";
import { requireAuth, profileGate } from "../middleware/auth";
import { weeklyGrowth, mastery } from "../controllers/leaderboard.controller";

export const leaderboardRouter = Router();

leaderboardRouter.get("/leaderboards/weekly-growth", requireAuth, profileGate, weeklyGrowth);
leaderboardRouter.get("/leaderboards/mastery", requireAuth, profileGate, mastery);
