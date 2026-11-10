import { Part, Question, DifficultyLevel } from "../types";

type PartImporter = () => Promise<any>;

const PART_IMPORTERS: Record<Part, PartImporter> = {
  1: () => import("../data/part1.json"),
  2: () => import("../data/part2.json"),
  3: () => import("../data/part3.json"),
  4: () => import("../data/part4.json"),
  5: () => import("../data/part5.json"),
  6: () => import("../data/part6.json"),
  7: () => import("../data/part7.json"),
};

// In-memory cache for loaded questions per part
const questionCache = new Map<Part, Question[]>();
const loadingPromises = new Map<Part, Promise<Question[]>>();

type ProgressListener = (status: {
  loadedParts: Part[];
  totalParts: number;
  isComplete: boolean;
}) => void;

const progressListeners = new Set<ProgressListener>();

function notifyProgress() {
  const loadedParts = Array.from(questionCache.keys()).sort((a, b) => a - b);
  const status = {
    loadedParts,
    totalParts: 7,
    isComplete: loadedParts.length === 7,
  };
  progressListeners.forEach((listener) => {
    try {
      listener(status);
    } catch (e) {
      console.warn("Error in progressListener", e);
    }
  });
}

export function subscribeToLoadingProgress(listener: ProgressListener): () => void {
  progressListeners.add(listener);
  // Send current state immediately
  const loadedParts = Array.from(questionCache.keys()).sort((a, b) => a - b);
  listener({
    loadedParts,
    totalParts: 7,
    isComplete: loadedParts.length === 7,
  });
  return () => {
    progressListeners.delete(listener);
  };
}

export function isPartLoaded(part: Part): boolean {
  return questionCache.has(part);
}

export function areAllPartsLoaded(): boolean {
  return questionCache.size === 7;
}

export function getLoadedParts(): Part[] {
  return Array.from(questionCache.keys()).sort((a, b) => a - b);
}

function normalizeQuestions(part: Part, rawData: any): Question[] {
  let rawList: any[] = [];
  if (part === 1 || part === 7) {
    rawList = rawData.default ? rawData.default.questions : rawData.questions;
  } else {
    rawList = rawData.default ? rawData.default : rawData;
  }

  if (!Array.isArray(rawList)) {
    return [];
  }

  if (part === 1) {
    return rawList.map((q: any) => ({
      id: q.id,
      part: 1,
      difficulty: q.difficulty || 1,
      audioTexts: q.audioTexts,
      imageDescriptionJa: q.imageDescriptionJa,
      subQuestions: [
        {
          id: `${q.id}-q1`,
          options: q.audioTexts,
          correctIndex: q.correctIndex,
        },
      ],
    }));
  }

  return rawList.map((q: any) => ({
    ...q,
    part,
    difficulty: q.difficulty || 1,
  }));
}

export async function loadPart(part: Part): Promise<Question[]> {
  if (questionCache.has(part)) {
    return questionCache.get(part)!;
  }

  if (loadingPromises.has(part)) {
    return loadingPromises.get(part)!;
  }

  const promise = (async () => {
    try {
      const importer = PART_IMPORTERS[part];
      const rawData = await importer();
      const normalized = normalizeQuestions(part, rawData);
      questionCache.set(part, normalized);
      notifyProgress();
      return normalized;
    } catch (err) {
      console.error(`Failed to load Part ${part} questions:`, err);
      return [];
    } finally {
      loadingPromises.delete(part);
    }
  })();

  loadingPromises.set(part, promise);
  return promise;
}

/**
 * Starts non-blocking background progressive preloading of all parts
 * Scheduled in idle chunks so the main thread and UI remain 100% fluid.
 */
let isBackgroundLoadingStarted = false;

export function startBackgroundLoading(): void {
  if (isBackgroundLoadingStarted) return;
  isBackgroundLoadingStarted = true;

  const partsToLoad: Part[] = [1, 2, 3, 4, 5, 6, 7];

  const loadNext = async (index: number) => {
    if (index >= partsToLoad.length) return;
    const p = partsToLoad[index];
    if (!questionCache.has(p)) {
      await loadPart(p);
    }
    // Yield to browser main thread
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => loadNext(index + 1), { timeout: 300 });
    } else {
      setTimeout(() => loadNext(index + 1), 60);
    }
  };

  // Kick off after current paint
  setTimeout(() => loadNext(0), 10);
}

function shuffleOptions<T extends Question>(rawQuestion: T): T {
  const question = JSON.parse(JSON.stringify(rawQuestion)) as T;
  question.subQuestions = question.subQuestions.map((sq: any) => {
    const originalOptions = [...sq.options];
    const correctOption = originalOptions[sq.correctIndex];
    for (let i = originalOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [originalOptions[i], originalOptions[j]] = [originalOptions[j], originalOptions[i]];
    }
    sq.options = originalOptions;
    sq.correctIndex = originalOptions.indexOf(correctOption);
    return sq;
  });

  if (question.part === 1) {
    question.audioTexts = [...question.subQuestions[0].options];
  } else if (question.part === 2) {
    const questionText = rawQuestion.audioTexts?.[0] || "";
    question.audioTexts = [questionText, ...question.subQuestions[0].options];
  }

  return question;
}

export async function getRandomQuestion(
  part: Part,
  difficultyFilter?: DifficultyLevel | "all"
): Promise<Question | null> {
  const allQuestions = await loadPart(part);
  if (!allQuestions || allQuestions.length === 0) return null;

  let candidateQuestions = allQuestions;
  if (difficultyFilter && difficultyFilter !== "all") {
    const filtered = allQuestions.filter((q) => q.difficulty === difficultyFilter);
    if (filtered.length > 0) {
      candidateQuestions = filtered;
    }
  }

  const randomIndex = Math.floor(Math.random() * candidateQuestions.length);
  const raw = candidateQuestions[randomIndex];
  return shuffleOptions(raw);
}

export async function getQuestionsForMockTest(): Promise<Question[]> {
  const parts: Part[] = [1, 2, 3, 4, 5, 6, 7];
  const allLoaded = await Promise.all(parts.map((p) => loadPart(p)));

  const selectedQuestions: Question[] = [];

  parts.forEach((p, idx) => {
    const partQuestions = allLoaded[idx];
    if (!partQuestions || partQuestions.length === 0) return;

    // Pick 3 distinct random questions from this part
    const copy = [...partQuestions];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    const picked = copy.slice(0, 3).map(shuffleOptions);
    selectedQuestions.push(...picked);
  });

  return selectedQuestions;
}
