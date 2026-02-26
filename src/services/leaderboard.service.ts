import { UserWeeklyStats } from "../models/UserWeeklyStats";

export function getWeekStartISO(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

export function getDayISO(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString().slice(0, 10);
}






export function computeWeeklyGrowthScore(s: {
  eligibleXP: number;
  questionsAttempted: number;
  questionsCorrect: number;
  activeDays: number;
  hardPerfectCount: number;
}) {
  const attempted = s.questionsAttempted;
  const accuracy = attempted > 0 ? s.questionsCorrect / attempted : 0;

  let score = s.eligibleXP;

  if (accuracy >= 0.9) score = Math.round(score * 1.15);
  else if (accuracy >= 0.75) score = Math.round(score * 1.08);

  score += Math.min(s.activeDays, 5) * 5;
  score += s.hardPerfectCount * 20;

  return score;
}




export function computeMasteryScore(s: {
  lessonsCompleted: number;
  questionsAttempted: number;
  questionsCorrect: number;
  activeDays: number;
  hardPerfectCount: number;
}) {
  const attempted = s.questionsAttempted;
  const accuracy = attempted > 0 ? s.questionsCorrect / attempted : 0;

  let score = Math.round(accuracy * 1000);
  score += s.lessonsCompleted * 30;
  score += s.hardPerfectCount * 25;
  score += Math.min(s.activeDays, 5) * 10;

  return score;
}

export async function getWeeklyLeaderboard(weekStart: string, type: "growth" | "mastery", limit = 50) {
  const stats = await UserWeeklyStats.find({ weekStart }).lean();

  const ranked = stats
    .map((s) => {
      const score =
        type === "growth"
          ? computeWeeklyGrowthScore({
              eligibleXP: s.eligibleXP,
              questionsAttempted: s.questionsAttempted,
              questionsCorrect: s.questionsCorrect,
              activeDays: s.activeDays,
              hardPerfectCount: s.hardPerfectCount
            })
          : computeMasteryScore({
              lessonsCompleted: s.lessonsCompleted,
              questionsAttempted: s.questionsAttempted,
              questionsCorrect: s.questionsCorrect,
              activeDays: s.activeDays,
              hardPerfectCount: s.hardPerfectCount
            });

      const accuracy = s.questionsAttempted > 0 ? s.questionsCorrect / s.questionsAttempted : 0;

      return {
        userId: String(s.userId),
        score,
        lessonsCompleted: s.lessonsCompleted,
        eligibleXP: s.eligibleXP,
        accuracy,
        activeDays: s.activeDays,
        hardPerfectCount: s.hardPerfectCount
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
}
