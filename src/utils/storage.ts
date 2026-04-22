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

  let progress: UserProgress;

  if (stored) {
    try {
      progress = JSON.parse(stored);
    } catch (e) {
      progress = createNewProgress(today);
    }
    
    const lastActive = progress.lastActiveDate;
    const lastCompleted = progress.lastCompletedDate;

    if (lastActive && lastActive !== today) {
      // It's a new day! Reset today's parts
      progress.completedPartsToday = [];
      
      // Calculate yesterday in JST
      const todayDate = new Date(today);
      const yesterdayDate = new Date(todayDate.getTime() - (24 * 60 * 60 * 1000));
      const yesterday = yesterdayDate.toISOString().split("T")[0];
      
      // If last COMPLETED was not yesterday or today, reset streak
      if (lastCompleted && lastCompleted !== yesterday && lastCompleted !== today) {
        progress.streak = 0;
      }
    }
  } else {
    progress = createNewProgress(today);
  }
  
  progress.lastActiveDate = today;
  saveProgress(progress);
  return progress;
}

function createNewProgress(today: string): UserProgress {
  return {
    userId: Math.random().toString(36).substring(2, 15),
    lastCompletedDate: null,
    lastActiveDate: today,
    streak: 0,
    completedPartsToday: [],
  };
}

export function saveProgress(progress: UserProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function completePart(part: Part): UserProgress {
  const progress = getInitialProgress();
  // Ensure part is treated as a number
  const partNum = Number(part) as Part;
  
  if (!progress.completedPartsToday.includes(partNum)) {
    progress.completedPartsToday.push(partNum);
    
    // Check if all parts 1-7 are completed today
    if (progress.completedPartsToday.length === 7) {
      const today = getJSTDate();
      progress.streak += 1;
      progress.lastCompletedDate = today;
    }
    
    saveProgress(progress);
  }
  return progress;
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
  if (!stored) return [];
  
  let reviews: ReviewItem[] = JSON.parse(stored);
  
  // Filter out items older than 3 days
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  const filteredReviews = reviews.filter(item => (now - item.timestamp) < THREE_DAYS_MS);
  
  // If we filtered some out, update storage
  if (filteredReviews.length !== reviews.length) {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(filteredReviews));
  }
  
  return filteredReviews;
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
