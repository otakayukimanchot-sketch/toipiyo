import React from "react";
import { Flame } from "lucide-react";

interface StreakDisplayProps {
  streak: number;
  compact?: boolean;
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({ streak, compact = false }) => {
  const isActive = streak > 0;

  if (compact) {
    return (
      <div className="flex items-center space-x-1.5 font-mono">
        <Flame
          size={16}
          className={`shrink-0 ${
            isActive ? "text-orange-500 fill-orange-500" : "text-gray-300 dark:text-slate-700"
          }`}
        />
        <span className="text-sm font-bold text-gray-950 dark:text-white">
          {streak}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-sans">
          日連続
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-1.5">
        <Flame
          size={24}
          className={`transition-colors duration-300 shrink-0 ${
            isActive ? "text-orange-500 fill-orange-500" : "text-gray-300 dark:text-slate-700"
          }`}
        />
        <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-950 dark:text-white font-mono">
          {streak}
        </span>
      </div>
      <div className="flex flex-col text-left">
        <span className="text-[10px] uppercase tracking-widest font-mono font-semibold text-gray-400 dark:text-gray-500">
          DAILY STREAK
        </span>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {streak <= 1 ? "1日連続で演習中" : `${streak}日連続で演習中`}
        </span>
      </div>
    </div>
  );
};

export default StreakDisplay;
