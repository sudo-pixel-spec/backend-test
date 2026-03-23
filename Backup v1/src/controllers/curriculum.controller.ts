import { Request, Response } from "express";
import { ok } from "../utils/apiResponse";
import { Standard } from "../models/Standard";
import { Subject } from "../models/Subject";
import { Unit } from "../models/Unit";
import { Chapter } from "../models/Chapter";
import { Lesson } from "../models/Lesson";
import { Attempt } from "../models/Attempt";
import { AuthRequest } from "../middleware/auth";

export async function getStandards(_req: Request, res: Response) {
  const standards = await Standard.find().lean();
  res.json(ok(standards));
}

export async function getSubjects(req: Request, res: Response) {
  const { standardId } = req.query;
  if (!standardId) return res.status(400).json(ok([]));

  const subjects = await Subject.find({ standardId: String(standardId) }).sort({ orderIndex: 1 }).lean();
  res.json(ok(subjects));
}

export async function getUnits(req: Request, res: Response) {
  const { subjectId } = req.query;
  if (!subjectId) return res.status(400).json(ok([]));

  const units = await Unit.find({ subjectId: String(subjectId) }).sort({ orderIndex: 1 }).lean();
  res.json(ok(units));
}

export async function getChapters(req: Request, res: Response) {
  const { unitId } = req.query;
  if (!unitId) return res.status(400).json(ok([]));

  const chapters = await Chapter.find({ unitId: String(unitId) }).sort({ orderIndex: 1 }).lean();
  res.json(ok(chapters));
}

export async function getLessons(req: AuthRequest, res: Response) {
  const { chapterId } = req.query;

  if (!chapterId) {
    return res.status(400).json(ok([]));
  }

  const lessons = await Lesson.find({ chapterId: String(chapterId) })
    .sort({ orderIndex: 1 })
    .lean();

  if (!req.user?.id) {
    return res.status(401).json(ok([]));
  }

  const attempts = await Attempt.find({
    userId: req.user.id,
    lessonId: { $in: lessons.map((l) => l._id) }
  }).lean();

  const completedLessonIds = new Set(attempts.map((a) => String(a.lessonId)));

  const result = lessons.map((lesson, index) => {
    const completed = completedLessonIds.has(String(lesson._id));
    const unlocked =
      index === 0 || completedLessonIds.has(String(lessons[index - 1]?._id));

    return {
      ...lesson,
      completed,
      unlocked
    };
  });

  res.json(ok(result));
}
