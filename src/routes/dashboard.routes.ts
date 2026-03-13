import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDashboardHome } from "../controllers/dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard/home", requireAuth, getDashboardHome);