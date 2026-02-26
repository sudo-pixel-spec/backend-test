import { Router } from "express";
import { requireAuth, profileGate } from "../middleware/auth";
import {
  getStandards,
  getSubjects,
  getUnits,
  getChapters,
  getLessons
} from "../controllers/curriculum.controller";

export const curriculumRouter = Router();

curriculumRouter.get("/curriculum/standards", getStandards);
curriculumRouter.get("/curriculum/subjects", getSubjects);
curriculumRouter.get("/units", getUnits);
curriculumRouter.get("/chapters", getChapters);
curriculumRouter.get("/lessons", requireAuth, profileGate, getLessons);
