import React from "react";
import { Part } from "../types";
import { Check } from "lucide-react";

interface HeptagonNavProps {
  completedParts: Part[];
  onPartSelect: (part: Part) => void;
}

const HeptagonNav: React.FC<HeptagonNavProps> = ({ completedParts, onPartSelect }) => {
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

  return (
    <div className="relative w-full max-w-[300px] aspect-square mx-auto">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full drop-shadow-lg"
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
          
          return (
            <g
              key={`part-${part}`}
              onClick={() => onPartSelect(part)}
              className="cursor-pointer group"
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={24}
                className={`transition-all duration-300 ${
                  isCompleted
                    ? "fill-green-500 stroke-green-600"
                    : "fill-blue-500 stroke-blue-600 group-hover:fill-blue-400"
                } stroke-2`}
              />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-bold text-sm pointer-events-none"
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
          return (
            <g
              onClick={() => onPartSelect(part)}
              className="cursor-pointer group"
            >
              <circle
                cx={center}
                cy={center}
                r={28}
                className={`transition-all duration-300 ${
                  isCompleted
                    ? "fill-green-600 stroke-green-700"
                    : "fill-orange-500 stroke-orange-600 group-hover:fill-orange-400"
                } stroke-2`}
              />
              <text
                x={center}
                y={center}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-bold text-base pointer-events-none"
              >
                P7
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

export default HeptagonNav;
