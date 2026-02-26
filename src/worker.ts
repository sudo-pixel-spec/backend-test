import "./config/env";
import mongoose from "mongoose";
import { env } from "./config/env";
import { getAgenda } from "./jobs/agenda";

async function main() {
  await mongoose.connect(env.MONGO_URI);
  const agenda = await getAgenda();
  await agenda.start();
  console.log("[worker] agenda started");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});