import { Request, Response } from "express";
import { z } from "zod";
import { ok, fail } from "../utils/apiResponse";
import { writeAdminAudit } from "../services/adminAudit";
import { User } from "../models/User";

let leaderboardConfig = {
  period: "weekly",
  lastReset: new Date().toISOString()
};

export async function getLeaderboardConfig(req: Request, res: Response) {
  return res.json(ok(leaderboardConfig));
}

export async function updateLeaderboardConfig(req: Request, res: Response) {
  const schema = z.object({
    period: z.enum(["daily", "weekly", "monthly"])
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("VALIDATION", "Invalid period", parsed.error.flatten()));

  leaderboardConfig.period = parsed.data.period;

  await writeAdminAudit(req as any, {
    action: "UPDATE",
    entity: "SystemConfig",
    entityId: "leaderboard",
    payload: parsed.data
  });

  return res.json(ok(leaderboardConfig));
}

export async function resetLeaderboard(req: Request, res: Response) {
  leaderboardConfig.lastReset = new Date().toISOString();

  await User.updateMany({}, { $set: { "stats.weeklyXP": 0 } });

  await writeAdminAudit(req as any, {
    action: "RESET",
    entity: "Leaderboard",
    entityId: "global"
  });

  return res.json(ok({ message: "Leaderboard reset successfully", config: leaderboardConfig }));
}

export async function getApiLogs(req: Request, res: Response) {
  const mockLogs = [
    { method: "GET", path: "/v1/auth/me", status: 200, duration: "45ms", ip: "127.0.0.1", timestamp: new Date().toISOString() },
    { method: "POST", path: "/v1/admin/badges", status: 201, duration: "120ms", ip: "127.0.0.1", timestamp: new Date().toISOString() },
    { method: "GET", path: "/v1/learner/chapters", status: 200, duration: "30ms", ip: "127.0.0.1", timestamp: new Date().toISOString() },
    { method: "POST", path: "/v1/auth/login", status: 401, duration: "200ms", ip: "127.0.0.1", timestamp: new Date().toISOString() },
  ];

  return res.json(ok(mockLogs));
}
