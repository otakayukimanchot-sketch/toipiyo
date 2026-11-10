import React from "react";
import { DifficultyLevel } from "../types";

interface DifficultyBadgeProps {
  difficulty?: DifficultyLevel;
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
}

export const DIFFICULTY_CONFIG: Record<
  DifficultyLevel,
  {
    stars: string;
    labelJa: string;
    labelEn: string;
    colorClass: string;
    starColor: string;
  }
> = {
  1: {
    stars: "★☆☆",
    labelJa: "基礎",
    labelEn: "Easy",
    colorClass: "text-emerald-700 dark:text-emerald-400",
    starColor: "text-emerald-600 dark:text-emerald-400",
  },
  2: {
    stars: "★★☆",
    labelJa: "標準",
    labelEn: "Intermediate",
    colorClass: "text-blue-700 dark:text-blue-400",
    starColor: "text-blue-600 dark:text-blue-400",
  },
  3: {
    stars: "★★★",
    labelJa: "難関",
    labelEn: "Advanced",
    colorClass: "text-amber-700 dark:text-amber-400",
    starColor: "text-amber-600 dark:text-amber-400",
  },
};

export default function DifficultyBadge({
  difficulty = 1,
  showLabel = true,
  compact = false,
  className = "",
}: DifficultyBadgeProps) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG[1];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center space-x-1 font-mono text-[11px] font-semibold ${config.starColor} ${className}`}
        title={`難易度: ${config.stars} (${config.labelJa} / ${config.labelEn})`}
      >
        <span>{config.stars}</span>
        {showLabel && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-sans font-normal">
            {config.labelJa}
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center space-x-1.5 font-mono text-xs ${className}`}
      title={`難易度: ${config.stars} (${config.labelJa} / ${config.labelEn})`}
    >
      <span className={`font-bold tracking-tight ${config.starColor}`}>
        {config.stars}
      </span>
      {showLabel && (
        <span className="text-gray-600 dark:text-gray-400 font-sans text-[11px]">
          {config.labelJa}
          <span className="text-gray-400 dark:text-gray-500 text-[10px] ml-1">
            ({config.labelEn})
          </span>
        </span>
      )}
    </span>
  );
}
