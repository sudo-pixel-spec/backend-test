import { aiProvider } from "../../services/ai.service";
import { Lesson } from "../../models/Lesson";
import { Quiz } from "../../models/Quiz";
import { nanoid } from "nanoid";

export async function generateQuizQuestions(payload: { lessonId: string; count?: number }) {
  const { lessonId, count = 5 } = payload;
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new Error(`Lesson ${lessonId} not found`);
  }

  const prompt = `Generate ${count} multiple choice questions for a lesson titled "${lesson.title}".
Content: ${lesson.contentText || "General knowledge"}
Format as a raw JSON array where each object has:
- prompt: string (the question)
- options: array of exactly 4 strings
- answerIndex: number (0 to 3)
- explanation: string (why it is correct)
Do not use markdown formatting like \`\`\`json.`;

  const response = await aiProvider.chat([{ role: "user", content: prompt }]);
  const responseText = response.content;
  
  let questions = [];
  try {
    questions = JSON.parse(responseText);
  } catch (e) {
    console.error("AI response was not valid JSON", responseText);
    throw new Error("Failed to parse AI response as JSON");
  }

  const latestQuiz = await Quiz.findOne({ lessonId }).sort({ version: -1 });
  const newVersion = latestQuiz ? latestQuiz.version + 1 : 1;

  const formattedQuestions = questions.map((q: any) => ({
    qid: nanoid(10),
    prompt: q.prompt,
    options: q.options,
    answerIndex: q.answerIndex,
    explanation: q.explanation
  }));

  const quiz = await Quiz.create({
    lessonId,
    version: newVersion,
    source: "ai",
    published: false,
    questions: formattedQuestions
  });

  return quiz._id;
}
