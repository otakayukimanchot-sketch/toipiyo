import React from "react";
import { Part } from "../types";
import { Check, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
        className="w-full h-full drop-shadow-lg overflow-visible"
      >
        {/* The Hexagon Path (P1 to P6) */}
        <polyline
          points={polylinePoints}
          fill="none"
          className="stroke-blue-500 stroke-2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        
        {/* Connection Line from P6 to P7 */}
        <line
          x1={points[5].x}
          y1={points[5].y}
          x2={center}
          y2={center}
          className="stroke-blue-500 stroke-2"
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
                r={24}
                className={`transition-all duration-300 ${
                  isCompleted
                    ? "fill-green-500 stroke-green-600"
                    : isSelected
                      ? "fill-blue-600 stroke-blue-700 scale-110"
                      : "fill-blue-500 stroke-blue-600 group-hover:fill-blue-400"
                } stroke-2 origin-center`}
                style={{ transformBox: 'fill-box' }}
              />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-bold text-sm pointer-events-none"
              >
                {isCompleted ? "✓" : `P${part}`}
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
                r={28}
                className={`transition-all duration-300 ${
                  isCompleted
                    ? "fill-green-600 stroke-green-700"
                    : isSelected
                      ? "fill-orange-600 stroke-orange-700 scale-110"
                      : "fill-orange-500 stroke-orange-600 group-hover:fill-orange-400"
                } stroke-2 origin-center`}
                style={{ transformBox: 'fill-box' }}
              />
              <text
                x={center}
                y={center}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-bold text-base pointer-events-none"
              >
                {isCompleted ? "✓" : "P7"}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Popup */}
      <AnimatePresence>
        {selectedPart && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 10, scale: 0.9, x: "-50%" }}
            className="absolute z-20 bg-white border-2 border-gray-100 rounded-2xl shadow-2xl p-4 w-48 text-center"
            style={{
              left: `${(getPopupPosition(selectedPart).x / size) * 100}%`,
              top: `${(getPopupPosition(selectedPart).y / size) * 100 - 45}%`,
              transform: "translateX(-50%)",
            }}
          >
            {/* Arrow */}
            <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-100 rotate-45 shadow-sm" />
            
            <div className="relative z-10">
              <div className="text-xs font-black text-blue-500 uppercase tracking-tighter mb-1">
                Part {selectedPart}
              </div>
              <div className="text-sm font-bold text-gray-800 mb-3 leading-tight">
                {PART_NAMES[selectedPart]}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartQuiz(selectedPart);
                }}
                className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center space-x-2"
              >
                <Play size={14} fill="currentColor" />
                <span>始める</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeptagonNav;
