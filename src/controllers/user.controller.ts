import { Request, Response } from "express";
import { z } from "zod";
import { ok, fail } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { User } from "../models/User";

export async function getMe(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json(fail("NO_AUTH", "Not authenticated"));

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json(fail("USER_NOT_FOUND", "User not found"));

  return res.json(
    ok({
      id: String(user._id),
      email: user.email,
      role: user.role,
      profileComplete: user.profileComplete,
      profile: user.profile,
      totalXP: user.totalXP,
      level: user.level,
      streakCount: user.streakCount,
      wallet: user.wallet
    })
  );
}

const ProfileSchema = z.object({
  fullName: z.string().min(2),
  standard: z.literal("CBSE_STD_8"),
  timezone: z.string().min(2)
});

export async function completeProfile(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json(fail("NO_AUTH", "Not authenticated"));

  const parsed = ProfileSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json(fail("VALIDATION", "Invalid profile data", parsed.error.flatten()));

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json(fail("USER_NOT_FOUND", "User not found"));

  user.profile = parsed.data;
  user.profileComplete = true;

  await user.save();

  return res.json(ok({ profileComplete: true }));
}
