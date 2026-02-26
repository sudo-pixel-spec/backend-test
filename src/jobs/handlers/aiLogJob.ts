import type { Job } from "agenda";
import { ChatMessage } from "../../models/ChatMessage";

export async function aiLogJob(job: Job) {
  const { sessionId, userMsg, assistantMsg, requestId } = job.attrs.data as any;
  if (!sessionId) throw new Error("Missing sessionId");

  await ChatMessage.create([
    { sessionId, role: "user", content: userMsg, meta: { requestId } },
    { sessionId, role: "assistant", content: assistantMsg, meta: { requestId } }
  ]);
}
