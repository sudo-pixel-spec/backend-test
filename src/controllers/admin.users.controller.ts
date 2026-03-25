import { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { ok, fail } from "../utils/apiResponse";
import { User } from "../models/User";
import { Attempt } from "../models/Attempt";
import { Subject } from "../models/Subject";
import { Unit } from "../models/Unit";
import { Chapter } from "../models/Chapter";
import { Lesson } from "../models/Lesson";
import { Standard } from "../models/Standard";

function parsePaging(req: Request) {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export async function listUsers(req: Request, res: Response) {
  const adminUser = (req as any).user;
  const { page, limit, skip } = parsePaging(req);

  const filter: any = { role: "learner" };

  if (adminUser?.adminType === "regular" && adminUser.allocatedStandards?.length) {
    const standards = await Standard.find({ _id: { $in: adminUser.allocatedStandards } }).select("code").lean();
    const allowedCodes = standards.map((s: any) => s.code);
    filter["profile.standard"] = { $in: allowedCodes };
  }

  if (req.query.search) {
    const re = new RegExp(String(req.query.search), "i");
    filter.$or = [{ "profile.fullName": re }, { email: re }, { phone: re }];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter)
  ]);

  return res.json(ok({
    page, limit, total,
    items: items.map((u: any) => ({
      id: String(u._id),
      fullName: u.profile?.fullName ?? null,
      email: u.email ?? null,
      phone: u.phone ?? null,
      age: u.profile?.age ?? null,
      standard: u.profile?.standard ?? null,
      school: u.profile?.school ?? null,
      joinDate: u.createdAt,
      status: u.status ?? "active",
      totalXP: u.totalXP ?? 0,
      level: u.level ?? 1
    }))
  }));
}

const UserEditSchema = z.object({
  fullName: z.string().min(1).optional(),
  school: z.string().optional(),
  age: z.number().int().min(5).max(25).optional(),
  status: z.enum(["active", "banned", "suspended"]).optional()
});

export async function editUser(req: Request, res: Response) {
  const { id } = req.params;
  const parsed = UserEditSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("VALIDATION", "Invalid payload", parsed.error.flatten()));

  const updates: any = {};
  if (parsed.data.fullName !== undefined) updates["profile.fullName"] = parsed.data.fullName;
  if (parsed.data.school !== undefined) updates["profile.school"] = parsed.data.school;
  if (parsed.data.age !== undefined) updates["profile.age"] = parsed.data.age;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
  if (!user) return res.status(404).json(fail("NOT_FOUND", "User not found"));

  return res.json(ok({ id: String((user as any)._id), status: (user as any).status, profile: (user as any).profile }));
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  const user = await User.findByIdAndDelete(id).lean();
  if (!user) return res.status(404).json(fail("NOT_FOUND", "User not found"));
  return res.json(ok({ deleted: true }));
}

const BadgeSchema = z.object({
  badge: z.string().min(1)
});

export async function awardBadge(req: Request, res: Response) {
  const { id } = req.params;
  const parsed = BadgeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("VALIDATION", "badge field required"));

  const user = await User.findByIdAndUpdate(
    id,
    { $addToSet: { badges: parsed.data.badge } },
    { new: true }
  ).lean();
  if (!user) return res.status(404).json(fail("NOT_FOUND", "User not found"));

  return res.json(ok({ id: String((user as any)._id), badges: (user as any).badges ?? [] }));
}

const XPSchema = z.object({
  amount: z.number().int().min(1).max(1000000)
});

export async function awardXP(req: Request, res: Response) {
  const { id } = req.params;
  const parsed = XPSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("VALIDATION", "Invalid amount", parsed.error.flatten()));

  const user = await User.findById(id);
  if (!user) return res.status(404).json(fail("NOT_FOUND", "User not found"));

  user.totalXP = (user.totalXP ?? 0) + parsed.data.amount;
  user.level = Math.floor(user.totalXP / 1000) + 1;
  await user.save();

  return res.json(ok({ id: String(user._id), totalXP: user.totalXP, level: user.level }));
}


export async function getUserProfile(req: Request, res: Response) {
  const { id } = req.params;
  const user = await User.findById(id).lean();
  if (!user) return res.status(404).json(fail("NOT_FOUND", "User not found"));

  const attempts = await Attempt.find({ userId: new mongoose.Types.ObjectId(String(id)) }).sort({ createdAt: -1 }).limit(50).lean();

  const lessonsCompleted = [...new Set(attempts.map((a: any) => String(a.lessonId)))].length;
  const avgScore = attempts.length
    ? Math.round(attempts.reduce((s: number, a: any) => s + ((a.score ?? 0) / Math.max(1, a.totalQuestions ?? 1)) * 100, 0) / attempts.length)
    : 0;

  return res.json(ok({
    id: String((user as any)._id),
    profile: (user as any).profile,
    email: (user as any).email,
    phone: (user as any).phone,
    totalXP: (user as any).totalXP ?? 0,
    level: (user as any).level ?? 1,
    streakCount: (user as any).streakCount ?? 0,
    wallet: (user as any).wallet,
    badges: (user as any).badges ?? [],
    status: (user as any).status ?? "active",
    joinDate: (user as any).createdAt,
    stats: {
      lessonsCompleted,
      quizzesTaken: attempts.length,
      avgScore
    },
    recentAttempts: attempts.slice(0, 10).map((a: any) => ({
      lessonId: String(a.lessonId),
      score: a.score,
      totalQuestions: a.totalQuestions,
      xpAwarded: a.xpAwarded,
      date: a.createdAt
    }))
  }));
}
export async function createAdminAccount(req: Request, res: Response) {
  const adminUser = (req as any).user;
  if (adminUser?.adminType !== "super") return res.status(403).json(fail("FORBIDDEN", "Only super admins can create admin accounts"));

  const AdminCreateSchema = z.object({
    phone: z.string().min(10).optional(),
    email: z.string().email().optional(),
    fullName: z.string().min(1),
    allocatedStandards: z.array(z.string())
  }).refine(data => data.phone || data.email, "Either phone or email is required");

  const parsed = AdminCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("VALIDATION", "Invalid payload", parsed.error.flatten()));

  const { phone, email, fullName, allocatedStandards } = parsed.data;

  const existing = await User.findOne({ $or: [{ phone: phone || "NONE" }, { email: email || "NONE" }] });
  if (existing) return res.status(409).json(fail("CONFLICT", "User with this phone/email already exists"));

  const user = await User.create({
    phone,
    email,
    role: "admin",
    adminType: "regular",
    allocatedStandards,
    profile: { fullName },
    profileComplete: true,
    onboardingComplete: true
  } as any) as any;

  return res.status(201).json(ok({
    id: String(user._id),
    phone: user.phone,
    email: user.email,
    fullName: user.profile?.fullName
  }));
}

export async function resetUserProgress(req: Request, res: Response) {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json(fail("NOT_FOUND", "User not found"));

  await Attempt.deleteMany({ userId: user._id });

  user.totalXP = 0;
  user.level = 1;
  user.streakCount = 0;
  user.wallet = { coins: 0, diamonds: 0 };
  user.badges = [];
  await user.save();

  return res.json(ok({ message: "Progress reset successfully" }));
}