import { Request, Response, NextFunction } from "express";
import { fail } from "../utils/apiResponse";
import { verifyToken } from "../services/authTokens";
import { User } from "../models/User";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json(fail("NO_AUTH", "Missing access token"));
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json(fail("USER_NOT_FOUND", "Invalid user"));
    }

    req.user = { id: String(user._id), role: user.role };
    next();
  } catch {
    return res.status(401).json(fail("INVALID_TOKEN", "Invalid or expired token"));
  }
}

export function requireRole(role: "admin" | "learner") {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json(fail("NO_AUTH", "Not authenticated"));
    if (req.user.role !== role)
      return res.status(403).json(fail("FORBIDDEN", "Insufficient permissions"));
    next();
  };
}

export async function profileGate(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json(fail("NO_AUTH", "Not authenticated"));

  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json(fail("USER_NOT_FOUND", "Invalid user"));

  if (!user.profileComplete) {
    return res.status(403).json(fail("PROFILE_INCOMPLETE", "Complete profile first"));
  }

  next();
}
