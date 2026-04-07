import { Part, UserProgress } from "../types";

const STORAGE_KEY = "toipiyo_user_progress";

export function getJSTDate(): string {
  const now = new Date();
  // JST is UTC+9
  const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return jstNow.toISOString().split("T")[0];
}

export function getInitialProgress(): UserProgress {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const progress: UserProgress = JSON.parse(stored);
    const today = getJSTDate();
    
    // If it's a new day, reset today's completed parts
    // and check if streak should be reset
    const lastDate = progress.lastCompletedDate;
    if (lastDate && lastDate !== today) {
      const yesterday = new Date(new Date(today).getTime() - (24 * 60 * 60 * 1000)).toISOString().split("T")[0];
      
      // If last completed was not yesterday, reset streak
      if (lastDate !== yesterday) {
        progress.streak = 0;
      }
      
      // Reset today's progress
      progress.completedPartsToday = [];
    }
    
    return progress;
  }

  const newProgress: UserProgress = {
    userId: Math.random().toString(36).substring(2, 15),
    lastCompletedDate: null,
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
