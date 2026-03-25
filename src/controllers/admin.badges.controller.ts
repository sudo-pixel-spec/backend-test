import { Request, Response } from "express";
import { z } from "zod";
import { Badge } from "../models/Badge";
import { ok, fail } from "../utils/apiResponse";
import { writeAdminAudit } from "../services/adminAudit";

const BadgeSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().min(5),
  iconUrl: z.string().min(1),
  criteria: z.object({
    type: z.enum(["total_xp", "quizzes_completed", "streak_days", "manual"]),
    value: z.number().min(0)
  }),
  isActive: z.boolean().optional()
});

export async function listBadges(req: Request, res: Response) {
  const items = await Badge.find().sort({ createdAt: -1 }).lean();
  return res.json(ok(items));
}

export async function createBadge(req: Request, res: Response) {
  const parsed = BadgeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("VALIDATION", "Invalid payload", parsed.error.flatten()));

  const created = await Badge.create(parsed.data as any) as any;
  await writeAdminAudit(req as any, {
    action: "CREATE",
    entity: "Badge",
    entityId: created._id,
    payload: parsed.data
  });

  return res.status(201).json(ok(created));
}

export async function updateBadge(req: Request, res: Response) {
  const { id } = req.params;
  const parsed = BadgeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("VALIDATION", "Invalid payload", parsed.error.flatten()));

  const updated = await Badge.findByIdAndUpdate(id, parsed.data as any, { new: true }).lean();
  if (!updated) return res.status(404).json(fail("NOT_FOUND", "Badge not found"));

  await writeAdminAudit(req as any, {
    action: "UPDATE",
    entity: "Badge",
    entityId: updated._id,
    payload: parsed.data
  });

  return res.json(ok(updated));
}

export async function deleteBadge(req: Request, res: Response) {
  const { id } = req.params;
  const deleted = await Badge.findByIdAndDelete(id).lean();
  if (!deleted) return res.status(404).json(fail("NOT_FOUND", "Badge not found"));

  await writeAdminAudit(req as any, {
    action: "DELETE",
    entity: "Badge",
    entityId: deleted._id
  });

  return res.json(ok({ deleted: true }));
}
