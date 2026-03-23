import { Standard } from "../../src/models/Standard";
import { Subject } from "../../src/models/Subject";
import { Unit } from "../../src/models/Unit";
import { Chapter } from "../../src/models/Chapter";
import { Lesson } from "../../src/models/Lesson";
import { Quiz } from "../../src/models/Quiz";

export async function seedLessonWithQuiz(difficulty: "easy" | "medium" | "hard" = "medium") {
  const std8 = await Standard.create({ code: "CBSE_STD_8", name: "Std 8", active: true });

  const subject = await Subject.create({ standardId: std8._id, name: "Science", orderIndex: 1 });
  const unit = await Unit.create({ subjectId: subject._id, name: "Unit 1", orderIndex: 1 });
  const chapter = await Chapter.create({ unitId: unit._id, name: "Chapter 1", orderIndex: 1 });

  const lesson = await Lesson.create({
    chapterId: chapter._id,
    title: "Photosynthesis Basics",
    orderIndex: 1,
    videoUrl: "https://example.com/video",
    bullets: ["A", "B"],
    contentText: "Photosynthesis content"
  });

  const quiz = await Quiz.create({
    lessonId: lesson._id,
    version: 1,
    source: "seed",
    difficulty,
    published: true,
    questions: [
      { qid: "q1", prompt: "Q1", options: ["a", "b", "c", "d"], answerIndex: 0, explanation: "E1" },
      { qid: "q2", prompt: "Q2", options: ["a", "b", "c", "d"], answerIndex: 1, explanation: "E2" },
      { qid: "q3", prompt: "Q3", options: ["a", "b", "c", "d"], answerIndex: 2, explanation: "E3" }
    ]
  });

  return { std8, subject, unit, chapter, lesson, quiz };
}
