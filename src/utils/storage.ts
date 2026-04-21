import { Part, UserProgress, ReviewItem, AppSettings } from "../types";

const STORAGE_KEY = "toipiyo_user_progress";
const REVIEW_KEY = "toipiyo_review_items";
const SETTINGS_KEY = "toipiyo_app_settings";

export function getJSTDate(): string {
  const now = new Date();
  // JST is UTC+9
  const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return jstNow.toISOString().split("T")[0];
}

export function getInitialProgress(): UserProgress {
  const stored = localStorage.getItem(STORAGE_KEY);
  const today = getJSTDate();

  if (stored) {
    const progress: UserProgress = JSON.parse(stored);
    
    // If it's a new day, reset today's completed parts
    // and check if streak should be reset
    const lastActive = progress.lastActiveDate;
    const lastCompleted = progress.lastCompletedDate;

    if (lastActive && lastActive !== today) {
      // It's a new day! Reset today's parts
      progress.completedPartsToday = [];
      
      const yesterday = new Date(new Date(today).getTime() - (24 * 60 * 60 * 1000)).toISOString().split("T")[0];
      
      // If last COMPLETED was not yesterday or today, reset streak
      if (lastCompleted && lastCompleted !== yesterday && lastCompleted !== today) {
        progress.streak = 0;
      }
    }
    
    progress.lastActiveDate = today;
    saveProgress(progress);
    return progress;
  }

  const newProgress: UserProgress = {
    userId: Math.random().toString(36).substring(2, 15),
    lastCompletedDate: null,
    lastActiveDate: today,
    streak: 0,
    completedPartsToday: [],
  };
  saveProgress(newProgress);
  return newProgress;
}

export function saveProgress(progress: UserProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function completePart(part: Part) {
  const progress = getInitialProgress();
  if (!progress.completedPartsToday.includes(part)) {
    progress.completedPartsToday.push(part);
    
    // Check if all parts 1-7 are completed today
    if (progress.completedPartsToday.length === 7) {
      const today = getJSTDate();
      progress.streak += 1;
      progress.lastCompletedDate = today;
    }
    
    saveProgress(progress);
  }
}

export function saveIncorrectQuestion(question: any) {
  const stored = localStorage.getItem(REVIEW_KEY);
  let reviews: ReviewItem[] = stored ? JSON.parse(stored) : [];
  
  // Check if already exists
  if (reviews.some(r => r.id === question.id)) return;

  const newItem: ReviewItem = {
    id: question.id,
    question,
    timestamp: Date.now()
  };

  reviews.unshift(newItem); // Add to beginning
  
  // Keep only last 30 items
  if (reviews.length > 30) {
    reviews = reviews.slice(0, 30);
  }

  localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));
}

export function getReviewItems(): ReviewItem[] {
  const stored = localStorage.getItem(REVIEW_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function removeReviewItem(id: string) {
  const stored = localStorage.getItem(REVIEW_KEY);
  if (!stored) return;
  let reviews: ReviewItem[] = JSON.parse(stored);
  reviews = reviews.filter(r => r.id !== id);
  localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));
}

export function getSettings(): AppSettings {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) return JSON.parse(stored);
  
  const defaultSettings: AppSettings = {
    isAudioEnabled: true
  };
  saveSettings(defaultSettings);
  return defaultSettings;
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
