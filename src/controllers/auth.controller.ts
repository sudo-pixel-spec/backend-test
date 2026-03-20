import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { ok, fail } from "../utils/apiResponse";
import { createOtp, verifyOtp as verifyOtpSvc } from "../services/otpService";
import { User } from "../models/User";
import { RefreshToken } from "../models/RefreshToken";
import { signAccessToken, signRefreshToken, hashToken, verifyToken, compareToken } from "../services/authTokens";
import { env } from "../config/env";
import { enqueueNow } from "../jobs/enqueue";
import { JOBS } from "../jobs/definitions";
import { smsProvider } from "../services/smsProvider";

function normalizeIndianPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return raw.trim();
}

const RequestOtpSchema = z.object({
  phone: z.string().transform(normalizeIndianPhone).pipe(z.string().min(10))
});
const VerifyOtpSchema = z.object({
  phone: z.string().transform(normalizeIndianPhone).pipe(z.string().min(10)),
  otp: z.string().min(6).max(6)
});

const GoogleSchema = z.object({
  credential: z.string().min(20)
});

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    path: "/v1/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });
}

export async function requestOtp(req: Request, res: Response) {
  console.log(`[TRACE] requestOtp hit with body:`, req.body);
  const parsed = RequestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(fail("VALIDATION", "Invalid phone number", parsed.error.flatten()));
  }

  const { phone } = parsed.data;
  const otp = await createOtp(phone, req.ip);

  await smsProvider.sendOtp(phone, otp);

  const logMsg = `[${new Date().toISOString()}] OTP for ${phone}: ${otp}\n`;
  fs.appendFileSync(path.join(process.cwd(), "debug_otp.txt"), logMsg);

  return res.json(ok({ message: "OTP sent successfully" }));
}

export async function verifyOtp(req: Request, res: Response) {
  const parsed = VerifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(fail("VALIDATION", "Invalid payload", parsed.error.flatten()));
  }

  const { phone, otp } = parsed.data;

  const result = await verifyOtpSvc(phone, otp);
  if (!result.ok) {
    return res.status(401).json(fail(result.reason, "OTP verification failed", result));
  }

  let user = await User.findOne({ phone });
  if (!user) user = await User.create({ phone, role: "learner" });

  const accessToken = signAccessToken({ sub: String(user._id), role: user.role });
  const refreshToken = signRefreshToken({ sub: String(user._id), role: user.role });

  const tokenHash = await hashToken(refreshToken);

  const deviceId = req.headers["x-device-id"] || req.body.deviceId || "unknown";

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    createdIp: req.ip || null,
    userAgent: req.get("user-agent") || null,
    deviceId: String(deviceId)
  });

  setRefreshCookie(res, refreshToken);

  return res.json(
    ok({
      accessToken,
      user: {
        id: String(user._id),
        phone: user.phone,
        role: user.role,
        adminType: (user as any).adminType,
        allocatedStandards: (user as any).allocatedStandards,
        profileComplete: user.profileComplete,
        onboardingComplete: user.onboardingComplete
      }
    })
  );
}

export async function googleSignIn(req: Request, res: Response) {
  const parsed = GoogleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("VALIDATION", "Invalid payload", parsed.error.flatten()));

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return res.status(500).json(fail("CONFIG", "GOOGLE_CLIENT_ID missing"));
  }

  const { credential } = parsed.data;

  const googleClient = new OAuth2Client(googleClientId);

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId
    });
  } catch {
    return res.status(401).json(fail("GOOGLE_AUTH_FAILED", "Invalid Google credential"));
  }

  const payload = ticket.getPayload();
  const email = payload?.email;
  const emailVerified = payload?.email_verified;
  const name = payload?.name ?? "";
  const picture = payload?.picture ?? "";
  const sub = payload?.sub ?? "";

  if (!email || emailVerified !== true) {
    return res.status(401).json(fail("GOOGLE_AUTH_FAILED", "Google account email not verified"));
  }

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      role: "learner",
      authProvider: "google",
      googleSub: sub || undefined,
      profile: {
        fullName: name,
        avatarUrl: picture
      },
      profileComplete: false
    } as any);
  } else {
    const updates: any = {};
    if (!user.authProvider) updates.authProvider = "google";
    if (!user.googleSub && sub) updates.googleSub = sub;
    if (picture && !(user as any).profile?.avatarUrl) updates["profile.avatarUrl"] = picture;
    if (name && !(user as any).profile?.fullName) updates["profile.fullName"] = name;

    if (Object.keys(updates).length) {
      await User.updateOne({ _id: user._id }, { $set: updates });
      user = await User.findById(user._id);
    }
  }

  const accessToken = signAccessToken({ sub: String(user!._id), role: user!.role });
  const refreshToken = signRefreshToken({ sub: String(user!._id), role: user!.role });

  const tokenHash = await hashToken(refreshToken);

  const deviceId = req.headers["x-device-id"] || req.body.deviceId || "unknown";

  await RefreshToken.create({
    userId: user!._id,
    tokenHash,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    createdIp: req.ip || null,
    userAgent: req.get("user-agent") || null,
    deviceId: String(deviceId)
  });

  setRefreshCookie(res, refreshToken);

  return res.json(
    ok({
      accessToken,
      user: {
        id: String(user!._id),
        email: user!.email,
        role: user!.role,
        adminType: (user as any).adminType,
        allocatedStandards: (user as any).allocatedStandards,
        profileComplete: user!.profileComplete,
        onboardingComplete: (user as any).onboardingComplete || false
      }
    })
  );
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json(fail("NO_REFRESH", "Missing refresh token"));

  let decoded: { sub: string; role: string };
  try {
    decoded = verifyToken(token);
  } catch {
    return res.status(401).json(fail("INVALID_REFRESH", "Invalid refresh token"));
  }

  const sessions = await RefreshToken.find({ userId: decoded.sub, revokedAt: null });

  const matching = await (async () => {
    for (const s of sessions) {
      const okMatch = await compareToken(token, s.tokenHash);
      if (okMatch) return s;
    }
    return null;
  })();

  if (!matching) {
    await RefreshToken.updateMany({ userId: decoded.sub }, { revokedAt: new Date() });
    return res.status(401).json(fail("REFRESH_REUSE", "Refresh token reuse detected"));
  }

  matching.revokedAt = new Date();
  await matching.save();

  const newRefresh = signRefreshToken({ sub: decoded.sub, role: decoded.role });
  const newHash = await hashToken(newRefresh);

  await RefreshToken.create({
    userId: decoded.sub,
    tokenHash: newHash,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    createdIp: req.ip || null,
    userAgent: req.get("user-agent") || null
  });

  setRefreshCookie(res, newRefresh);

  const accessToken = signAccessToken({ sub: decoded.sub, role: decoded.role });
  return res.json(ok({ accessToken }));
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.refresh_token;

  if (token) {
    const sessions = await RefreshToken.find({ revokedAt: null });
    for (const s of sessions) {
      const okMatch = await compareToken(token, s.tokenHash);
      if (okMatch) {
        s.revokedAt = new Date();
        await s.save();
        break;
      }
    }
  }

  res.clearCookie("refresh_token", { path: "/v1/auth" });
  return res.json(ok({ message: "Logged out" }));
}