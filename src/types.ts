export type Part = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type DifficultyLevel = 1 | 2 | 3;

export interface Question {
  id: string;
  part: Part;
  difficulty?: DifficultyLevel; // 1: ★☆☆ Easy, 2: ★★☆ Intermediate, 3: ★★★ Advanced
  audioText?: string; // For Part 1-4
  audioTexts?: string[]; // For Part 1-4 (multiple parts)
  image?: string; // For Part 1, 3, 4 (charts)
  imageDescriptionJa?: string; // For Part 1 replacement of image
  text?: string; // For Part 5, 6, 7
  grammarCategory?: string; // Grammatical category tag (e.g., 'pos', 'verb_tense', 'verbals', etc.)
  subQuestions: SubQuestion[];
}

export interface SubQuestion {
  id: string;
  questionText?: string;
  options: string[];
  correctIndex: number;
}

export interface UserProgress {
  userId: string;
  lastCompletedDate: string | null; // YYYY-MM-DD
  lastActiveDate: string | null; // YYYY-MM-DD
  streak: number;
  completedPartsToday: Part[];
}

export interface GrammarCategoryStat {
  incorrectCount: number;
  totalAttempts: number;
  lastMistakeDate?: string;
}

export type GrammarStatsMap = Record<string, GrammarCategoryStat>;

export interface ReviewItem {
  id: string;
  question: Question;
  timestamp: number;
}

export interface AppSettings {
  isAudioEnabled: boolean;
  isDarkMode: boolean;
  isBatterySaverEnabled: boolean;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  completedParts: Part[];
}

export interface MockTestQuestionRecord {
  question: Question;
  selectedAnswers: Record<string, number>;
  isAllCorrect: boolean;
  subResults: {
    subId: string;
    selectedIndex?: number;
    correctIndex: number;
    isCorrect: boolean;
  }[];
}

export interface MockTestResult {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  totalQuestions: number;
  totalSubQuestions: number;
  correctSubQuestions: number;
  listeningCorrect: number;
  listeningTotal: number;
  readingCorrect: number;
  readingTotal: number;
  scoreRange: {
    min: number;
    max: number;
    mid: number;
  };
  listeningRange: {
    min: number;
    max: number;
    mid: number;
  };
  readingRange: {
    min: number;
    max: number;
    mid: number;
  };
  partBreakdown: Record<Part, { correct: number; total: number }>;
  records?: MockTestQuestionRecord[];
}
