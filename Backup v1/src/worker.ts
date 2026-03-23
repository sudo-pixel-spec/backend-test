import "./config/env";
import mongoose from "mongoose";
import { env } from "./config/env";
import { getAgenda } from "./jobs/agendaDriver";

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const { agendaManager } = require("./jobs/agendaManager");
  await agendaManager.initialize();
  console.log("[worker] agenda initialized and started");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});