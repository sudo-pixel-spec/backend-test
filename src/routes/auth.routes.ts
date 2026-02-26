import { Router } from "express";
import { requestOtp, verifyOtp, refresh, logout, googleSignIn } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/auth/request-otp", requestOtp);
authRouter.post("/auth/verify-otp", verifyOtp);
authRouter.post("/auth/refresh", refresh);
authRouter.post("/auth/logout", logout);

authRouter.post("/auth/google", googleSignIn);