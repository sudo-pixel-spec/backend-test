import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const boolFromString = z
  .string()
  .optional()
  .default("false")
  .transform((v) => v === "true");

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),

    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

    CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),
    COOKIE_SECURE: boolFromString,
    COOKIE_SAMESITE: z.enum(["lax", "none", "strict"]).default("lax"),

    JWT_SECRET: z.string().min(20, "JWT_SECRET must be at least 20 chars"),
    ACCESS_TOKEN_TTL_MIN: z.coerce.number().default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),

    AI_DAILY_LIMIT: z.coerce.number().default(50),

    JOBS_ENABLED: boolFromString,
    JOBS_DRIVER: z.enum(["inline", "agenda"]).default("inline"),
    JOBS_COLLECTION: z.string().default("jobs"),
    JOBS_CONCURRENCY: z.coerce.number().default(5),
    JOBS_LOCK_LIFETIME_MS: z.coerce.number().default(600000),

    GOOGLE_CLIENT_ID: z.string().optional(),

    EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_SECURE: boolFromString,
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
  })
  .superRefine((cfg, ctx) => {

    if (cfg.NODE_ENV === "production" && cfg.COOKIE_SECURE !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_SECURE"],
        message: "In production, COOKIE_SECURE must be true",
      });
    }

    if (cfg.COOKIE_SAMESITE === "none" && cfg.COOKIE_SECURE !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_SAMESITE"],
        message: "COOKIE_SAMESITE=none requires COOKIE_SECURE=true",
      });
    }

    if (cfg.EMAIL_PROVIDER === "smtp") {
      const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM"] as const;

      for (const k of required) {
        if (!(cfg as any)[k]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [k],
            message: `${k} is required when EMAIL_PROVIDER=smtp`,
          });
        }
      }

      if ((cfg.SMTP_USER && !cfg.SMTP_PASS) || (!cfg.SMTP_USER && cfg.SMTP_PASS)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMTP_USER"],
          message: "Provide both SMTP_USER and SMTP_PASS (or neither)",
        });
      }
    }

    if (cfg.EMAIL_PROVIDER === "resend") {
      if (!cfg.RESEND_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RESEND_API_KEY"],
          message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend",
        });
      }

      if (!cfg.EMAIL_FROM) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EMAIL_FROM"],
          message: "EMAIL_FROM is required when EMAIL_PROVIDER=resend",
        });
      }
    }

    if (cfg.JOBS_DRIVER === "agenda" && cfg.JOBS_ENABLED !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JOBS_ENABLED"],
        message: "If JOBS_DRIVER=agenda, set JOBS_ENABLED=true",
      });
    }

    if (cfg.NODE_ENV === "production" && !cfg.GOOGLE_CLIENT_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_CLIENT_ID"],
        message:
          "GOOGLE_CLIENT_ID is required in production (frontend has Google sign-in)",
      });
    }
  });

export const env = EnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,

  MONGODB_URI: process.env.MONGODB_URI,

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? process.env.CLIENT_ORIGIN,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,

  JWT_SECRET: process.env.JWT_SECRET,
  ACCESS_TOKEN_TTL_MIN: process.env.ACCESS_TOKEN_TTL_MIN,
  REFRESH_TOKEN_TTL_DAYS: process.env.REFRESH_TOKEN_TTL_DAYS,

  AI_DAILY_LIMIT: process.env.AI_DAILY_LIMIT,

  JOBS_ENABLED: process.env.JOBS_ENABLED ?? process.env.ENABLE_JOBS,
  JOBS_DRIVER: process.env.JOBS_DRIVER,
  JOBS_COLLECTION: process.env.JOBS_COLLECTION,
  JOBS_CONCURRENCY: process.env.JOBS_CONCURRENCY,
  JOBS_LOCK_LIFETIME_MS: process.env.JOBS_LOCK_LIFETIME_MS,

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,

  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,

  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
});