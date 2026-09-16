import React from "react";
import { Part } from "../types";
import { Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { unlockAudio } from "../utils/audio";

interface HeptagonNavProps {
  completedParts: Part[];
  onPartSelect: (part: Part) => void;
  selectedPart: Part | null;
  onStartQuiz: (part: Part) => void;
  onCancelSelect: () => void;
}

const PART_NAMES: Record<Part, string> = {
  1: "写真描写問題",
  2: "応答問題",
  3: "会話問題",
  4: "説明文問題",
  5: "短文穴埋め問題",
  6: "長文穴埋め問題",
  7: "読解問題",
};

const HeptagonNav: React.FC<HeptagonNavProps> = ({ 
  completedParts, 
  onPartSelect,
  selectedPart,
  onStartQuiz,
  onCancelSelect
}) => {
  const size = 300;
  const center = size / 2;
  const radius = size * 0.4;
  const vertices = 6; // Hexagon for Parts 1-6

  const getPoint = (i: number) => {
    const angle = (2 * Math.PI * i) / vertices - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const points = Array.from({ length: vertices }, (_, i) => getPoint(i));
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  const getPopupPosition = (part: Part) => {
    let x, y;
    if (part === 7) {
      x = center;
      y = center;
    } else {
      const p = points[part - 1];
      x = p.x;
      y = p.y;
    }
    return { x, y };
  };

  return (
    <div className="relative w-full max-w-[300px] aspect-square mx-auto">
      {/* Click overlay to cancel selection */}
      {selectedPart && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={onCancelSelect}
        />
      )}

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full overflow-visible"
      >
        {/* The Hexagon Path (P1 to P6) */}
        <polyline
          points={polylinePoints}
          fill="none"
          className="stroke-gray-300 dark:stroke-slate-700 stroke-[1.5]"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        
        {/* Connection Line from P6 to P7 */}
        <line
          x1={points[5].x}
          y1={points[5].y}
          x2={center}
          y2={center}
          className="stroke-gray-300 dark:stroke-slate-700 stroke-[1.5]"
          strokeLinecap="round"
        />

        {/* Vertices (Part 1-6 Buttons) */}
        {points.map((p, i) => {
          const part = (i + 1) as Part;
          const isCompleted = completedParts.includes(part);
          const isSelected = selectedPart === part;
          
          return (
            <g
              key={`part-${part}`}
              onClick={(e) => {
                e.stopPropagation();
                onPartSelect(part);
              }}
              className="cursor-pointer group"
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={22}
                className={`transition-colors duration-200 ${
                  isCompleted
                    ? "fill-emerald-600 stroke-emerald-700"
                    : isSelected
                      ? "fill-blue-600 stroke-blue-700"
                      : "fill-gray-900 dark:fill-slate-800 stroke-gray-700 dark:stroke-slate-600 group-hover:fill-blue-600 group-hover:stroke-blue-700"
                } stroke-1 origin-center`}
              />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-mono font-medium text-xs pointer-events-none"
              >
                P{part}
              </text>
            </g>
          );
        })}

        {/* Center Button (Part 7) */}
        {(() => {
          const part = 7 as Part;
          const isCompleted = completedParts.includes(part);
          const isSelected = selectedPart === part;
          return (
            <g
              onClick={(e) => {
                e.stopPropagation();
                onPartSelect(part);
              }}
              className="cursor-pointer group"
            >
              <circle
                cx={center}
                cy={center}
                r={26}
                className={`transition-colors duration-200 ${
                  isCompleted
                    ? "fill-emerald-600 stroke-emerald-700"
                    : isSelected
                      ? "fill-blue-600 stroke-blue-700"
                      : "fill-gray-900 dark:fill-slate-800 stroke-gray-700 dark:stroke-slate-600 group-hover:fill-blue-600 group-hover:stroke-blue-700"
                } stroke-1 origin-center`}
              />
              <text
                x={center}
                y={center}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-mono font-medium text-xs pointer-events-none"
              >
                P7
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Flat Status & Start Strip (No cards, no shadows) */}
      <AnimatePresence>
        {selectedPart && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-800 text-center"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold block">
                  PART {selectedPart}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {PART_NAMES[selectedPart]}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  unlockAudio();
                  onStartQuiz(selectedPart);
                }}
                className="px-5 py-2 bg-gray-950 dark:bg-white text-white dark:text-black text-xs font-semibold tracking-wider uppercase hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center space-x-1.5"
              >
                <span>開始</span>
                <Play size={10} fill="currentColor" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeptagonNav;
