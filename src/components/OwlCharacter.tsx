import React from "react";
import { motion } from "motion/react";

interface OwlCharacterProps {
  state: "normal" | "cheering" | "happy";
}

const OwlCharacter: React.FC<OwlCharacterProps> = ({ state }) => {
  return (
    <motion.div
      animate={state === "cheering" ? { y: [0, -10, 0] } : {}}
      transition={{ repeat: Infinity, duration: 0.5 }}
      className="relative w-32 h-32 mx-auto"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Body */}
        <ellipse cx="50" cy="60" rx="35" ry="35" fill="#4B5563" />
        <ellipse cx="50" cy="65" rx="25" ry="25" fill="#F3F4F6" />
        
        {/* Ears */}
        <path d="M25 35 L35 25 L45 35 Z" fill="#4B5563" />
        <path d="M75 35 L65 25 L55 35 Z" fill="#4B5563" />

        {/* Eyes */}
        <circle cx="38" cy="45" r="12" fill="white" stroke="#4B5563" strokeWidth="2" />
        <circle cx="62" cy="45" r="12" fill="white" stroke="#4B5563" strokeWidth="2" />
        
        {/* Pupils */}
        <motion.circle
          cx="38"
          cy={state === "happy" ? "42" : "45"}
          r={state === "happy" ? "0" : "5"}
          fill="#1F2937"
          animate={state === "cheering" ? { scale: [1, 1.2, 1] } : {}}
        />
        <motion.circle
          cx="62"
          cy={state === "happy" ? "42" : "45"}
          r={state === "happy" ? "0" : "5"}
          fill="#1F2937"
          animate={state === "cheering" ? { scale: [1, 1.2, 1] } : {}}
        />
        
        {/* Happy Eyes (Arcs) */}
        {state === "happy" && (
          <>
            <path d="M30 45 Q38 38 46 45" fill="none" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
            <path d="M54 45 Q62 38 70 45" fill="none" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
          </>
        )}

        {/* Beak */}
        <path d="M46 55 L50 62 L54 55 Z" fill="#FBBF24" />

        {/* Wings */}
        <motion.path
          d="M15 60 Q5 50 15 40"
          fill="none"
          stroke="#4B5563"
          strokeWidth="4"
          strokeLinecap="round"
          animate={state === "cheering" ? { rotate: [-10, 10, -10] } : {}}
        />
        <motion.path
          d="M85 60 Q95 50 85 40"
          fill="none"
          stroke="#4B5563"
          strokeWidth="4"
          strokeLinecap="round"
          animate={state === "cheering" ? { rotate: [10, -10, 10] } : {}}
        />
      </svg>
    </motion.div>
  );
};

export default OwlCharacter;
