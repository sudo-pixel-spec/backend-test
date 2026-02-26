import { Response } from "express";
import { z } from "zod";
import { ok, fail } from "../utils/apiResponse";
import { verifyGoogleCredential } from "../services/googleAuth";
import { User } from "../models/User";
import { signAccessToken, setRefreshCookie } from "../services/token.service";

const GoogleSchema = z.object({
  credential: z.string().min(10)
});

export async function googleSignIn(req: any, res: Response) {
  const parsed = GoogleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(fail("VALIDATION", "Invalid payload", parsed.error.flatten()));
  }

  const { credential } = parsed.data;

  const info = await verifyGoogleCredential(credential);

  if (!info.email) {
    return res.status(400).json(fail("GOOGLE_EMAIL_MISSING", "Google account has no email"));
  }

  let user = await User.findOne({ email: info.email });

  if (!user) {
    user = await User.create({
      email: info.email,
      name: info.name || info.email.split("@")[0],
      authProvider: "google",
      googleSub: info.sub,
      avatarUrl: info.picture || null
    });
  } else {
    const updates: any = {};
    if (!user.googleSub) updates.googleSub = info.sub;
    if (!user.authProvider) updates.authProvider = "google";
    if (!user.avatarUrl && info.picture) updates.avatarUrl = info.picture;
    if (Object.keys(updates).length) {
      await User.updateOne({ _id: user._id }, { $set: updates });
      user = await User.findById(user._id);
    }
  }

  const accessToken = signAccessToken({ userId: String(user!._id) });
  setRefreshCookie(res, { userId: String(user!._id) });

  return res.json(ok({ token: accessToken, user }));
}