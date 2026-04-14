import { Request, Response } from "express";
import { z } from "zod";
import { ok, fail } from "../utils/apiResponse";
import { writeAdminAudit } from "../services/adminAudit";
import { User } from "../models/User";
import { getRecentLogs } from "../utils/requestLogBuffer";

/**
 * NOTE: leaderboardConfig is intentionally in-memory for now.
 * The values are reset on each server restart. For multi-instance
 * deployments, persist this in the DB (e.g. a SystemConfig collection).
 * Basically, dont think much about it as long as it works. maybe.
 */
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
  const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100)));
  const logs = getRecentLogs(limit);
  return res.json(ok({ total: logs.length, limit, items: logs }));
}

