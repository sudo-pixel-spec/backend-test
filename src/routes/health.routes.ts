import { Router } from "express";
import { ok, fail } from "../utils/apiResponse";
import { isDbReady } from "../config/db";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  return res.json(ok({ status: "ok" }));
});

healthRouter.get("/ready", (_req, res) => {
  if (!isDbReady()) {
    return res.status(503).json(fail("NOT_READY", "Database not connected"));
  }
  return res.json(ok({ status: "ready" }));
});