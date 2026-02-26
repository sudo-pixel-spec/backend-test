export function calculateXP(score: number, total: number, difficulty: string) {
  const accuracy = score / total;

  let baseXP = 50;
  if (difficulty === "hard") baseXP = 100;
  if (difficulty === "easy") baseXP = 30;

  const xp = Math.round(baseXP * accuracy);
  return xp;
}

export function calculateLevel(totalXP: number) {
  return Math.floor(totalXP / 500) + 1;
}

export function calculateCoins(score: number, total: number) {
  if (score === total) return 20;
  return 10;
}

export function calculateDiamonds(score: number, total: number, difficulty: string) {
  if (difficulty === "hard" && score === total) return 5;
  return 0;
}

export function updateStreak(lastActiveDate: string | null) {
  const today = new Date().toISOString().slice(0, 10);

  if (!lastActiveDate) return { newStreak: 1, today };

  if (lastActiveDate === today) {
    return { newStreak: null, today };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (lastActiveDate === yesterday) {
    return { increment: true, today };
  }

  return { reset: true, today };
}
