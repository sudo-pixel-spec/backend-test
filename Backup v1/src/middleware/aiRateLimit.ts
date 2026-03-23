import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,

  keyGenerator: (req: any) => req.user?.id || ipKeyGenerator(req),

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    ok: false,
    error: {
      code: "AI_RATE_LIMIT",
      message: "Too many AI requests. Try again later."
    }
  }
});
