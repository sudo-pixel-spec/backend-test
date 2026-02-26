import { Standard } from "../../src/models/Standard";
import { Subject } from "../../src/models/Subject";
import { Unit } from "../../src/models/Unit";
import { Chapter } from "../../src/models/Chapter";
import { Lesson } from "../../src/models/Lesson";

export async function seedCurriculumStd8() {
  const std8 = await Standard.create({ code: "CBSE_STD_8", name: "Std 8", active: true });
  const std9 = await Standard.create({ code: "CBSE_STD_9", name: "Std 9", active: false });
  const std10 = await Standard.create({ code: "CBSE_STD_10", name: "Std 10", active: false });

  const subject = await Subject.create({
    standardId: std8._id,
    name: "Science",
    orderIndex: 1
  });

  const unit = await Unit.create({
    subjectId: subject._id,
    name: "Biology Basics",
    orderIndex: 1
  });

  const chapter = await Chapter.create({
    unitId: unit._id,
    name: "Photosynthesis",
    orderIndex: 1
  });

  const lessons = await Lesson.create([
    {
      chapterId: chapter._id,
      title: "Lesson 1: Introduction",
      orderIndex: 1,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      bullets: ["What is photosynthesis?", "Why plants need sunlight"],
      contentText: "Photosynthesis is the process by which plants make food using sunlight, water, and carbon dioxide."
    },
    {
      chapterId: chapter._id,
      title: "Lesson 2: Process",
      orderIndex: 2,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      bullets: ["Inputs", "Outputs"],
      contentText: "Plants take in CO2 and water and produce glucose and oxygen."
    },
    {
      chapterId: chapter._id,
      title: "Lesson 3: Factors",
      orderIndex: 3,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      bullets: ["Light intensity", "CO2 concentration", "Temperature"],
      contentText: "Photosynthesis rate depends on light, CO2, and temperature."
    }
  ]);

  return {
    standards: { std8, std9, std10 },
    subject,
    unit,
    chapter,
    lessons
  };
}
