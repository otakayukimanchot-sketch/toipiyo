import React from "react";
import { ReviewItem } from "../types";
import { motion } from "motion/react";
import { Newspaper, ChevronRight } from "lucide-react";

interface ReviewNewsProps {
  items: ReviewItem[];
  onItemClick: (item: ReviewItem) => void;
}

const ReviewNews: React.FC<ReviewNewsProps> = ({ items, onItemClick }) => {
  if (items.length === 0) return null;

  return (
    <div className="mt-8 w-full max-w-md mx-auto">
      <div className="flex items-center space-x-2 mb-3 px-2">
        <div className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center space-x-1">
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          NEWS
        </div>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
          <Newspaper size={12} className="mr-1" />
          弱点補強セクション
        </h3>
      </div>

      <div className="bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
        {items.slice(0, 3).map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onItemClick(item)}
            className="w-full p-4 flex items-start text-left hover:bg-gray-100 transition-colors group"
          >
            <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black mr-3 ${
              item.question.part <= 4 ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
            }`}>
              P{item.question.part}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-blue-600">
                {item.question.text || item.question.imageDescriptionJa || "リスニング問題の復習"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {new Date(item.timestamp).toLocaleDateString("ja-JP")} にミス
              </p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors self-center ml-2" />
          </motion.button>
        ))}
        {items.length > 3 && (
          <div className="p-3 bg-gray-100/50 text-center">
            <p className="text-[10px] font-bold text-gray-400">
              他にも {items.length - 3} 件の復習項目があります
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewNews;
