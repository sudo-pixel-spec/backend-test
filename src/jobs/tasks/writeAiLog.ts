import { aiLogJob } from "../handlers/aiLogJob";

export async function writeAiLog(payload: any) {
  const fakeJob: any = { attrs: { data: payload } };
  await aiLogJob(fakeJob);
}