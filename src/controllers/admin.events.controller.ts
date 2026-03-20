import { Request, Response } from "express";
import { z } from "zod";
import { ok, fail } from "../utils/apiResponse";
import { Event } from "../models/Event";

const EventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  type: z.enum(["challenge", "competition"]),
  rewards: z.object({
    xp: z.number().int().min(0).default(0),
    badges: z.array(z.string()).default([])
  }).optional(),
  status: z.enum(["draft", "published", "expired"]).optional(),
  standardIds: z.array(z.string()).min(1)
});

export async function listEvents(req: Request, res: Response) {
  const adminUser = (req as any).user;
  const filter: any = {};

  if (adminUser?.adminType === "regular" && adminUser.allocatedStandards?.length) {
    filter.standardIds = { $in: adminUser.allocatedStandards };
  }

  const events = await Event.find(filter).sort({ startDate: -1 }).lean();
  return res.json(ok(events));
}

export async function createEvent(req: Request, res: Response) {
  const adminUser = (req as any).user;
  const parsed = EventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("VALIDATION", "Invalid payload", parsed.error.flatten()));

  if (adminUser?.adminType === "regular") {
    const allowedIds = (adminUser.allocatedStandards ?? []).map((id: any) => String(id));
    const targetIds = parsed.data.standardIds;
    const isAllowed = targetIds.every(id => allowedIds.includes(id));
    if (!isAllowed) return res.status(403).json(fail("FORBIDDEN", "Cannot create events for unallocated standards"));
  }

  const event = await Event.create({
    ...parsed.data,
    status: parsed.data.status ?? "draft",
    description: parsed.data.description ?? "",
    rewards: parsed.data.rewards ?? { xp: 0, badges: [] },
    creator: adminUser._id
  });

  return res.status(201).json(ok(event));
}

export async function updateEvent(req: Request, res: Response) {
  const { id } = req.params;
  const adminUser = (req as any).user;
  const parsed = EventSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("VALIDATION", "Invalid payload", parsed.error.flatten()));

  const event = await Event.findById(id);
  if (!event) return res.status(404).json(fail("NOT_FOUND", "Event not found"));

  if (adminUser?.adminType === "regular") {
    const allowedIds = (adminUser.allocatedStandards ?? []).map((id: any) => String(id));
    const isAllowed = (event.standardIds ?? []).some(stdId => allowedIds.includes(String(stdId)));
    if (!isAllowed) return res.status(403).json(fail("FORBIDDEN", "Access denied to this event"));

    if (parsed.data.standardIds) {
      const allTargetAllowed = parsed.data.standardIds.every(id => allowedIds.includes(id));
      if (!allTargetAllowed) return res.status(403).json(fail("FORBIDDEN", "Cannot target unallocated standards"));
    }
  }

  Object.assign(event, parsed.data);
  await event.save();

  return res.json(ok(event));
}

export async function deleteEvent(req: Request, res: Response) {
  const { id } = req.params;
  const adminUser = (req as any).user;

  const event = await Event.findById(id);
  if (!event) return res.status(404).json(fail("NOT_FOUND", "Event not found"));

  if (adminUser?.adminType === "regular") {
    const allowedIds = (adminUser.allocatedStandards ?? []).map((id: any) => String(id));
    const isAllowed = (event.standardIds ?? []).some(stdId => allowedIds.includes(String(stdId)));
    if (!isAllowed) return res.status(403).json(fail("FORBIDDEN", "Access denied to this event"));
  }

  await Event.findByIdAndDelete(id);
  return res.json(ok({ deleted: true }));
}
