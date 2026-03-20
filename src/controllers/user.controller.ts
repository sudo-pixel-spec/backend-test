import { Response } from "express";
import { z } from "zod";
import { ok, fail } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { User } from "../models/User";

export async function getMe(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json(fail("NO_AUTH", "Not authenticated"));

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json(fail("USER_NOT_FOUND", "User not found"));
  const userData = user.toObject();
  return res.json(
    ok({
      id: String(user._id),
      phone: userData.phone,
      email: userData.email,
      role: userData.role,
      profileComplete: userData.profileComplete,
      onboardingComplete: userData.onboardingComplete,
      profile: userData.profile,
      totalXP: userData.totalXP,
      level: userData.level,
      streakCount: userData.streakCount,
      wallet: userData.wallet,
      adminType: userData.adminType,
      allocatedStandards: userData.allocatedStandards
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

const OnboardingSchema = z.object({
  fullName: z.string().min(2).max(80),
  school: z.string().min(2).max(120).optional(),
  age: z.number().int().min(5).max(25).optional(),
  standard: z.string().min(2),
  timezone: z.string().min(2).default("Asia/Kolkata")
});

export async function completeOnboarding(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json(fail("NO_AUTH", "Not authenticated"));

  const parsed = OnboardingSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json(fail("VALIDATION", "Invalid onboarding data", parsed.error.flatten()));

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json(fail("USER_NOT_FOUND", "User not found"));

  const { fullName, school, age, standard, timezone } = parsed.data;

  user.profile = {
    ...((user.profile as any) || {}),
    fullName,
    school: school ?? undefined,
    age: age ?? undefined,
    standard,
    timezone
  };
  user.profileComplete = true;
  user.onboardingComplete = true;

  await user.save();

  return res.json(ok({
    onboardingComplete: true,
    profileComplete: true,
    profile: user.toObject().profile
  }));
}
