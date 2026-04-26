export type Part = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Question {
  id: string;
  part: Part;
  audioText?: string; // For Part 1-4
  audioTexts?: string[]; // For Part 1-4 (multiple parts)
  image?: string; // For Part 1, 3, 4 (charts)
  imageDescriptionJa?: string; // For Part 1 replacement of image
  text?: string; // For Part 5, 6, 7
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

export interface ReviewItem {
  id: string;
  question: Question;
  timestamp: number;
}

export interface AppSettings {
  isAudioEnabled: boolean;
  isDarkMode: boolean;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  completedParts: Part[];
}
