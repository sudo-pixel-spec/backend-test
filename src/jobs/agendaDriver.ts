import { agendaManager } from "./agendaManager";

export async function getAgenda() {
  return agendaManager.getAgenda();
}
export async function stopAgenda() {
  return agendaManager.stop();
}