import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { fail } from "../utils/apiResponse";

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json(fail("NO_AUTH", "Not authenticated"));
  if (req.user.role !== "admin") return res.status(403).json(fail("FORBIDDEN", "Admin only"));
  next();
}
