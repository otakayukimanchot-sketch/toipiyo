import React from "react";
import { ReviewItem } from "../types";
import { ArrowUpRight } from "lucide-react";

interface ReviewNewsProps {
  items: ReviewItem[];
  onItemClick: (item: ReviewItem) => void;
}

const ReviewNews: React.FC<ReviewNewsProps> = ({ items, onItemClick }) => {
  if (items.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
          <span className="text-xs font-mono font-semibold tracking-widest uppercase text-gray-500 dark:text-gray-400">
            Review Queue ({items.length})
          </span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
          RECENT MISTAKES
        </span>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
        {items.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className="w-full py-4 flex items-baseline justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
          >
            <div className="flex items-baseline space-x-4 min-w-0 pr-4">
              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                PART {item.question.part}
              </span>
              <p className="text-sm font-normal text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {item.question.text || item.question.imageDescriptionJa || "リスニング問題の復習"}
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500 hidden sm:inline">
                {new Date(item.timestamp).toLocaleDateString("ja-JP")}
              </span>
              <ArrowUpRight size={14} className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReviewNews;
