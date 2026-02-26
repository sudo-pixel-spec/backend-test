import { Response } from "express";
import { ok } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { getWeekStartISO, getWeeklyLeaderboard } from "../services/leaderboard.service";

export async function weeklyGrowth(req: AuthRequest, res: Response) {
  const weekStart = typeof req.query.weekStart === "string" ? req.query.weekStart : getWeekStartISO(new Date());
  const data = await getWeeklyLeaderboard(weekStart, "growth", 50);
  return res.json(ok({ weekStart, type: "growth", entries: data }));
}

export async function mastery(req: AuthRequest, res: Response) {
  const weekStart = typeof req.query.weekStart === "string" ? req.query.weekStart : getWeekStartISO(new Date());
  const data = await getWeeklyLeaderboard(weekStart, "mastery", 50);
  return res.json(ok({ weekStart, type: "mastery", entries: data }));
}
