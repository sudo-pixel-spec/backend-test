import type { Job } from "agenda";
import { writeAiLog } from "../tasks/writeAiLog";

export async function aiLogJob(job: Job) {
  await writeAiLog(job.attrs.data);
}
