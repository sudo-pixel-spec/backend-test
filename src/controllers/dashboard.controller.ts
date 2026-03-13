import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ok, fail } from "../utils/apiResponse";
import { User } from "../models/User";

export async function getDashboardHome(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json(fail("NO_AUTH", "Not authenticated"));
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json(fail("USER_NOT_FOUND", "User not found"));
  }

  const data = {
    profile: user.profile,
    xp: user.totalXP,
    level: user.level,
    streak: user.streakCount,
    coins: user.wallet?.coins ?? 0,
    diamonds: user.wallet?.diamonds ?? 0,

    rank: null,

    continueLearning: null,

    leaderboard: [],

    recentActivity: []
  };

  return res.json(ok(data));
}