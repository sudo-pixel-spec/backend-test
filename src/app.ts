import express from "express";
import helmet from "helmet";
import pino from "pino-http";
import cookieParser from "cookie-parser";

import { corsMiddleware } from "./config/cors";
import { requestId } from "./middleware/requestId";
import { appendRequestLog } from "./utils/requestLogBuffer";

import { healthRouter } from "./routes/health.routes";
import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";
import { curriculumRouter } from "./routes/curriculum.routes";
import { attemptRouter } from "./routes/attempt.routes";
import { leaderboardRouter } from "./routes/leaderboard.routes";
import { chatRouter } from "./routes/chat.routes";
import { adminRouter } from "./routes/admin.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { analyticsRouter } from "./routes/analytics.routes";
import { notificationsRouter } from "./routes/notifications.routes";

import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/error";
import { env } from "./config/env";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(requestId);

  if (env.NODE_ENV !== "test") {
    app.use(
      pino({
        autoLogging: {
          ignore: (req) => req.url === "/v1/health",
        },
        customSuccessMessage(req, res) {
          const start: number = (res as any).locals?.__startTime ?? Date.now();
          appendRequestLog({
            requestId: (req as any).id ?? null,
            method: req.method,
            path: req.url ?? "/",
            status: res.statusCode,
            durationMs: Date.now() - start,
            ip: req.socket?.remoteAddress ?? null,
            userAgent: req.headers?.["user-agent"] ?? null,
            timestamp: new Date().toISOString(),
          });
          return `${req.method} ${req.url} ${res.statusCode}`;
        },
        customErrorMessage(req, res, err) {
          appendRequestLog({
            requestId: (req as any).id ?? null,
            method: req.method,
            path: req.url ?? "/",
            status: res.statusCode,
            durationMs: 0,
            ip: req.socket?.remoteAddress ?? null,
            userAgent: req.headers?.["user-agent"] ?? null,
            timestamp: new Date().toISOString(),
          });
          return err.message;
        },
      })
    );
  }

  app.use(helmet());

  app.use(corsMiddleware);

  app.use(cookieParser());

  app.use(express.json({ limit: "1mb" }));

  app.use("/v1", healthRouter);
  app.use("/v1", authRouter);
  app.use("/v1", userRouter);
  app.use("/v1", curriculumRouter);
  app.use("/v1", attemptRouter);
  app.use("/v1", leaderboardRouter);
  app.use("/v1", chatRouter);
  app.use("/v1/admin", adminRouter);
  app.use("/v1", dashboardRouter);
  app.use("/v1", analyticsRouter);
  app.use("/v1", notificationsRouter);

  app.use(notFound);
  app.use(errorHandler as any);

  return app;
}