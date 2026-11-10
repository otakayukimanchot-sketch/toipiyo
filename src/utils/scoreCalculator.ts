import { Part, Question, MockTestResult } from "../types";
import { getQuestionsForMockTest } from "./questionLoader";

export interface ScoreRange {
  min: number;
  max: number;
  mid: number;
}

export function calculateListeningScoreRange(correct: number, total: number): ScoreRange {
  const pct = total > 0 ? correct / total : 0;
  let base: number;
  if (pct >= 0.96) base = 485;
  else if (pct >= 0.90) base = 445 + ((pct - 0.90) / 0.06) * 40;
  else if (pct >= 0.80) base = 395 + ((pct - 0.80) / 0.10) * 50;
  else if (pct >= 0.70) base = 345 + ((pct - 0.70) / 0.10) * 50;
  else if (pct >= 0.60) base = 295 + ((pct - 0.60) / 0.10) * 50;
  else if (pct >= 0.50) base = 245 + ((pct - 0.50) / 0.10) * 50;
  else if (pct >= 0.40) base = 195 + ((pct - 0.40) / 0.10) * 50;
  else if (pct >= 0.30) base = 145 + ((pct - 0.30) / 0.10) * 50;
  else if (pct >= 0.20) base = 95 + ((pct - 0.20) / 0.10) * 50;
  else base = Math.max(5, Math.round((pct / 0.20) * 90));

  const roundTo5 = (val: number) => Math.round(val / 5) * 5;
  const min = Math.max(5, Math.min(495, roundTo5(base - 25)));
  const max = Math.max(5, Math.min(495, roundTo5(base + 25)));
  const mid = roundTo5(base);
  return { min, max, mid };
}

export function calculateReadingScoreRange(correct: number, total: number): ScoreRange {
  const pct = total > 0 ? correct / total : 0;
  let base: number;
  if (pct >= 0.96) base = 475;
  else if (pct >= 0.90) base = 425 + ((pct - 0.90) / 0.06) * 50;
  else if (pct >= 0.80) base = 370 + ((pct - 0.80) / 0.10) * 55;
  else if (pct >= 0.70) base = 315 + ((pct - 0.70) / 0.10) * 55;
  else if (pct >= 0.60) base = 260 + ((pct - 0.60) / 0.10) * 55;
  else if (pct >= 0.50) base = 210 + ((pct - 0.50) / 0.10) * 50;
  else if (pct >= 0.40) base = 160 + ((pct - 0.40) / 0.10) * 50;
  else if (pct >= 0.30) base = 115 + ((pct - 0.30) / 0.10) * 45;
  else if (pct >= 0.20) base = 70 + ((pct - 0.20) / 0.10) * 45;
  else base = Math.max(5, Math.round((pct / 0.20) * 65));

  const roundTo5 = (val: number) => Math.round(val / 5) * 5;
  const min = Math.max(5, Math.min(495, roundTo5(base - 25)));
  const max = Math.max(5, Math.min(495, roundTo5(base + 25)));
  const mid = roundTo5(base);
  return { min, max, mid };
}

export function calculateMockTestScore(
  listeningCorrect: number,
  listeningTotal: number,
  readingCorrect: number,
  readingTotal: number
): {
  scoreRange: ScoreRange;
  listeningRange: ScoreRange;
  readingRange: ScoreRange;
} {
  const listeningRange = calculateListeningScoreRange(listeningCorrect, listeningTotal);
  const readingRange = calculateReadingScoreRange(readingCorrect, readingTotal);

  const totalMin = Math.max(10, Math.min(990, listeningRange.min + readingRange.min));
  const totalMax = Math.max(10, Math.min(990, listeningRange.max + readingRange.max));
  const totalMid = Math.max(10, Math.min(990, listeningRange.mid + readingRange.mid));

  return {
    scoreRange: { min: totalMin, max: totalMax, mid: totalMid },
    listeningRange,
    readingRange,
  };
}

/**
 * Re-exports progressive async generator for mock test questions
 */
export async function generateMockTestQuestions(): Promise<Question[]> {
  return getQuestionsForMockTest();
}
