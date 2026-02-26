import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getMe, completeProfile } from "../controllers/user.controller";

export const userRouter = Router();

userRouter.get("/me", requireAuth, getMe);
userRouter.patch("/me/profile", requireAuth, completeProfile);
