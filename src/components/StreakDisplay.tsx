import React from "react";
import { Flame } from "lucide-react";

interface StreakDisplayProps {
  streak: number;
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({ streak }) => {
  const isActive = streak > 0;

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <Flame
        size={48}
        className={`transition-colors duration-500 ${
          isActive ? "text-red-500 fill-red-500" : "text-gray-400"
        }`}
      />
      <div className="mt-1 text-center">
        <span className="text-2xl font-bold text-gray-800">{streak}</span>
        <span className="ml-1 text-sm text-gray-500">{streak === 1 ? "day" : "days"}</span>
      </div>
    </div>
  );
};

export default StreakDisplay;
