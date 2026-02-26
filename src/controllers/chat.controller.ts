import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth";
import { ok, fail } from "../utils/apiResponse";
import { ChatSession } from "../models/ChatSession";
import { ChatMessage } from "../models/ChatMessage";
import { Lesson } from "../models/Lesson";
import { Attempt } from "../models/Attempt";
import { aiProvider } from "../services/ai.service";
import { UserDailyUsage } from "../models/UserDailyUsage";

const ChatSchema = z.object({
  message: z.string().min(2),
  sessionId: z.string().optional(),
  lessonId: z.string().optional(),
});

function detectCheating(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("give me answers") ||
    lower.includes("just tell me option") ||
    lower.includes("without explanation") ||
    lower.includes("answer key") ||
    lower.includes("give me the answers")
  );
}

export async function chat(req: AuthRequest, res: Response) {
  if (!req.user)
    return res.status(401).json(fail("NO_AUTH", "Not authenticated"));

  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(fail("VALIDATION", "Invalid payload", parsed.error.flatten()));
  }

  const limit = Number(process.env.AI_DAILY_LIMIT ?? 50);
  const today = new Date().toISOString().slice(0, 10);

  const usage = await UserDailyUsage.findOneAndUpdate(
    { userId: req.user.id, date: today },
    {
      $setOnInsert: { userId: req.user.id, date: today },
      $inc: { aiMessages: 1 },
    },
    { new: true, upsert: true }
  ).lean();

  const requestId = (req as any).requestId;

  if ((usage?.aiMessages ?? 0) > limit) {
    return res
      .status(429)
      .json(fail("AI_DAILY_LIMIT", "Daily AI limit reached"));
  }

  const { message, sessionId, lessonId } = parsed.data;

  if (message.length > 2000) {
    return res
      .status(400)
      .json(fail("MESSAGE_TOO_LONG", "Message exceeds allowed length"));
  }

  if (detectCheating(message)) {
    return res.json(
      ok({
        reply:
          "I can help explain concepts, but I won't provide direct quiz answers.",
      })
    );
  }

  let session = null as any;

  if (sessionId) {
    session = await ChatSession.findById(sessionId);
    if (session && String(session.userId) !== String(req.user.id)) {
      return res.status(403).json(fail("FORBIDDEN", "Invalid session"));
    }
  }

  if (!session) {
    session = await ChatSession.create({
      userId: req.user.id,
      lessonId,
      title: message.slice(0, 50),
    });
  }

  let lessonContext = "";
  if (lessonId) {
    const lesson = await Lesson.findById(lessonId).lean();
    if (lesson) {
      lessonContext = `Lesson context:\nTitle: ${lesson.title}\n\n${
        lesson.contentText ?? ""
      }`;
    }
  }

  let weaknessContext = "";
  try {
    const weakAttempts = await Attempt.find({
      userId: req.user.id,
      totalQuestions: { $gt: 0 },
      score: { $ne: null },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const weak = weakAttempts
      .filter(
        (a) =>
          (a.totalQuestions ?? 0) > 0 &&
          (a.score ?? 0) / (a.totalQuestions ?? 1) < 0.5
      )
      .slice(0, 3);

    if (weak.length) {
      const lessonIds = weak.map((a) => a.lessonId);
      const lessons = await Lesson.find({ _id: { $in: lessonIds } })
        .select({ title: 1 })
        .lean();

      const titles = lessons.map((l) => `- ${l.title}`).join("\n");
      weaknessContext = `\nStudent seems to struggle with these recent topics:\n${titles}\nFocus on clarity and step-by-step explanation.\n`;
    }
  } catch {
  }

  const systemPrompt = `
You are a CBSE Std 8 learning assistant.
Stay within CBSE Std 8 syllabus and the provided lesson context.
If the user asks outside syllabus, politely refuse and guide them back to relevant concepts.
Do not provide direct quiz/answer keys. Teach concepts and reasoning.
Be clear, step-by-step, and encourage understanding.
${weaknessContext}
`.trim();

  const history = await ChatMessage.find({ sessionId: session._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const reversedHistory = history
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }));

  const messages = [
    {
      role: "system",
      content: systemPrompt + (lessonContext ? `\n\n${lessonContext}` : ""),
    },
    ...reversedHistory,
    { role: "user", content: message },
  ];

  const ai = await aiProvider.chat(messages);

  await ChatMessage.create([
    { sessionId: session._id, role: "user", content: message, tokenCount: undefined },
    { sessionId: session._id, role: "assistant", content: ai.content, tokenCount: ai.tokenCount },
  ]);

  return res.json(ok({ reply: ai.content, sessionId: session._id }));
}
