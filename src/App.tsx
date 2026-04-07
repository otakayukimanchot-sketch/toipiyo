import React, { useState, useEffect } from "react";
import { Part, Question, UserProgress } from "./types";
import { getInitialProgress, completePart, getJSTDate } from "./utils/storage";
import part1Data from "./data/part1.json";
import part2Data from "./data/part2.json";
import part3Data from "./data/part3.json";
import part4Data from "./data/part4.json";
import part5Data from "./data/part5.json";
import part6Data from "./data/part6.json";
import part7Data from "./data/part7.json";
import HeptagonNav from "./components/HeptagonNav";
import StreakDisplay from "./components/StreakDisplay";
import QuizView from "./components/QuizView";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Info, Settings, User, Bird, RotateCcw, Loader2 } from "lucide-react";

export default function App() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [activePart, setActivePart] = useState<Part | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isAllDone, setIsAllDone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialProgress = getInitialProgress();
    setProgress(initialProgress);
    
    if (initialProgress.completedPartsToday.length === 7) {
      setIsAllDone(true);
    }

    // Simulate loading for splash screen
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handlePartSelect = (part: Part) => {
    // Select questions based on the part
    let partQuestions: Question[] = [];
    switch (part) {
      case 1: partQuestions = part1Data as Question[]; break;
      case 2: partQuestions = part2Data as Question[]; break;
      case 3: partQuestions = part3Data as Question[]; break;
      case 4: partQuestions = part4Data as Question[]; break;
      case 5: partQuestions = part5Data as Question[]; break;
      case 6: partQuestions = part6Data as Question[]; break;
      case 7: partQuestions = part7Data as Question[]; break;
    }

    if (partQuestions.length === 0) return;

    // Pick a random question
    const randomIndex = Math.floor(Math.random() * partQuestions.length);
    const question = partQuestions[randomIndex];
    
    setActivePart(part);
    setCurrentQuestion(question);
  };

  const handleQuizComplete = (isCorrect: boolean) => {
    if (activePart) {
      if (isCorrect) {
        completePart(activePart);
      }
      const updatedProgress = getInitialProgress();
      setProgress(updatedProgress);
      
      if (updatedProgress.completedPartsToday.length === 7) {
        setIsAllDone(true);
      }

      // Automatically move to next part (1->2, ..., 7->1)
      const nextPart = (activePart % 7 + 1) as Part;
      handlePartSelect(nextPart);
    }
  };

  const handleCancel = () => {
    setActivePart(null);
    setCurrentQuestion(null);
  };

  if (!progress || isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-blue-500 rounded-3xl flex items-center justify-center shadow-2xl mb-4">
            <Bird className="text-white w-12 h-12" />
          </div>
          <h1 className="text-5xl font-black tracking-tight text-blue-600 font-cute drop-shadow-sm">
            といぴよ
          </h1>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center space-y-2"
        >
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <span className="text-xs font-bold tracking-[0.2em] text-blue-300 uppercase">Loading</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      <AnimatePresence mode="wait">
        {!activePart ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md mx-auto px-6 py-8 flex flex-col min-h-screen"
          >
            {/* Header */}
            <header className="flex justify-between items-start mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Bird className="text-white w-6 h-6" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-blue-600 font-cute">といぴよ</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today</div>
                  <div className="text-sm font-black text-gray-800">
                    {getJSTDate().replace(/-/g, "/")}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if(window.confirm("今日の進捗をリセットしますか？")) {
                      localStorage.removeItem("toipiyo_user_progress");
                      window.location.reload();
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="進捗をリセット"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </header>

            {/* Streak */}
            <StreakDisplay streak={progress.streak} />

            {/* Main Nav */}
            <div className="flex-1 flex flex-col justify-center py-12">
              <HeptagonNav
                completedParts={progress.completedPartsToday}
                onPartSelect={handlePartSelect}
              />
              <p className="text-center mt-8 text-gray-500 font-medium">
                {isAllDone 
                  ? "今日の学習はすべて完了しました！" 
                  : "Partをタップして学習を開始しましょう"}
              </p>
            </div>

            {/* Footer Stats - Removed Progress, kept layout if needed but user said PROGRESS is not needed and move date to top right */}
            <footer className="mt-auto pt-8">
              {/* Empty footer or could add something else later */}
            </footer>

            {/* Celebration Overlay */}
            {isAllDone && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 p-6 bg-green-500 text-white rounded-3xl shadow-xl text-center"
              >
                <Trophy className="mx-auto mb-2 w-12 h-12" />
                <h3 className="text-xl font-black">All Clear!</h3>
                <p className="text-sm opacity-90">今日の全パートを完了しました。明日も続けましょう！</p>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="max-w-md mx-auto min-h-screen bg-white"
          >
            {currentQuestion && (
              <QuizView
                key={currentQuestion.id}
                part={activePart}
                question={currentQuestion}
                onComplete={handleQuizComplete}
                onCancel={handleCancel}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
