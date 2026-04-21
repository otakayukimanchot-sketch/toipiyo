import React, { useState, useEffect } from "react";
import { Part, Question, UserProgress, AppSettings, ReviewItem } from "./types";
import { getInitialProgress, completePart, getJSTDate, saveIncorrectQuestion, getSettings, saveSettings, getReviewItems, removeReviewItem } from "./utils/storage";
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
import { Trophy, Info, Settings, User, Bird, RotateCcw, Loader2, Menu, X, BookOpen, Volume2, VolumeX, HelpCircle, Trash2, ChevronLeft } from "lucide-react";

export default function App() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [activePart, setActivePart] = useState<Part | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isAllDone, setIsAllDone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuTab, setMenuTab] = useState<"main" | "howto" | "audio" | "review">("main");
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);

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

  useEffect(() => {
    if (isMenuOpen && menuTab === "review") {
      setReviewItems(getReviewItems());
    }
  }, [isMenuOpen, menuTab]);

  const handlePartSelect = (part: Part) => {
    setSelectedPart(part);
  };

  const handleStartQuiz = (part: Part) => {
    setSelectedPart(null);
    // Select questions based on the part
    let partQuestions: Question[] = [];
    switch (part) {
      case 1: 
        partQuestions = (part1Data.questions as any[]).map(q => ({
          id: q.id,
          part: 1 as Part,
          audioTexts: q.audioTexts,
          imageDescriptionJa: q.imageDescriptionJa,
          subQuestions: [{
            id: `${q.id}-q1`,
            options: q.audioTexts,
            correctIndex: q.correctIndex
          }]
        }));
        break;
      case 2: partQuestions = part2Data as Question[]; break;
      case 3: partQuestions = part3Data as Question[]; break;
      case 4: partQuestions = part4Data as Question[]; break;
      case 5: partQuestions = part5Data as Question[]; break;
      case 6: partQuestions = part6Data as Question[]; break;
      case 7: partQuestions = (part7Data as any).questions as Question[]; break;
    }

    if (partQuestions.length === 0) return;

    // Pick a random question
    const randomIndex = Math.floor(Math.random() * partQuestions.length);
    const rawQuestion = partQuestions[randomIndex];
    
    // Create a deep copy to shuffle
    const question = JSON.parse(JSON.stringify(rawQuestion));

    // Shuffle options for each subquestion
    question.subQuestions = question.subQuestions.map((sq: any) => {
      const originalOptions = [...sq.options];
      const correctOption = originalOptions[sq.correctIndex];
      
      // Fisher-Yates shuffle
      for (let i = originalOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [originalOptions[i], originalOptions[j]] = [originalOptions[j], originalOptions[i]];
      }
      
      sq.options = originalOptions;
      sq.correctIndex = originalOptions.indexOf(correctOption);
      return sq;
    });

    // Sync audioTexts if necessary (e.g., Part 1 and Part 2 where audioTexts are the options)
    if (part === 1) {
      question.audioTexts = question.subQuestions[0].options;
    } else if (part === 2) {
      // In Part 2, audioTexts[0] is the question, [1:] are the options
      question.audioTexts = [rawQuestion.audioTexts[0], ...question.subQuestions[0].options];
    }
    
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
      handleStartQuiz(nextPart);
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
          <p className="text-sm font-bold text-blue-400 mt-2">
            スコアアップ特化のウェブ対策アプリ
          </p>
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
                <div className="flex flex-col">
                  <h1 className="text-2xl font-black tracking-tight text-blue-600 font-cute">といぴよ</h1>
                  <p className="text-[10px] font-bold text-blue-400 leading-none">スコアアップ特化のウェブ対策アプリ</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-400">
                    {getJSTDate().replace(/-/g, "/")}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsMenuOpen(true);
                    setMenuTab("main");
                  }}
                  className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <Menu size={24} />
                </button>
              </div>
            </header>

            {/* Streak */}
            <StreakDisplay streak={progress.streak} />

            {/* Main Nav */}
            <div className="flex-1 flex flex-col justify-center py-4">
              <HeptagonNav
                completedParts={progress.completedPartsToday}
                onPartSelect={handlePartSelect}
                selectedPart={selectedPart}
                onStartQuiz={handleStartQuiz}
                onCancelSelect={() => setSelectedPart(null)}
              />
              <p className="text-center mt-8 text-gray-500 font-medium">
                {isAllDone 
                  ? "今日の学習はすべて完了しました！" 
                  : "Partをタップして学習を始めましょう"}
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
                isAudioEnabled={settings.isAudioEnabled}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-xs bg-white h-full shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Menu Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {menuTab !== "main" && (
                    <button onClick={() => setMenuTab("main")} className="p-1 -ml-1 text-gray-400 hover:text-blue-500">
                      <ChevronLeft size={24} />
                    </button>
                  )}
                  <h2 className="text-xl font-black text-gray-800">
                    {menuTab === "main" ? "メニュー" : 
                     menuTab === "howto" ? "使い方" : 
                     menuTab === "audio" ? "音声設定" : "復習リスト"}
                  </h2>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-gray-400 hover:text-red-500">
                  <X size={24} />
                </button>
              </div>

              {/* Menu Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {menuTab === "main" && (
                  <div className="space-y-4">
                    <button 
                      onClick={() => setMenuTab("howto")}
                      className="w-full p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl flex items-center space-x-4 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:text-blue-500">
                        <HelpCircle size={20} />
                      </div>
                      <span className="font-bold text-gray-700">使い方</span>
                    </button>
                    <button 
                      onClick={() => setMenuTab("audio")}
                      className="w-full p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl flex items-center space-x-4 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:text-blue-500">
                        {settings.isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                      </div>
                      <span className="font-bold text-gray-700">音声設定</span>
                    </button>
                    <button 
                      onClick={() => setMenuTab("review")}
                      className="w-full p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl flex items-center space-x-4 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:text-blue-500">
                        <BookOpen size={20} />
                      </div>
                      <span className="font-bold text-gray-700">復習</span>
                    </button>
                  </div>
                )}

                {menuTab === "howto" && (
                  <div className="space-y-6 text-gray-600">
                    <div className="space-y-2">
                      <h3 className="font-black text-gray-800">といぴよとは？</h3>
                      <p className="text-sm leading-relaxed">
                        TOEICの各パートを1日1問ずつ解いて、スコアアップを目指すアプリです。
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-black text-gray-800">学習の流れ</h3>
                      <ol className="text-sm space-y-2 list-decimal list-inside">
                        <li>ホーム画面のパートを選択</li>
                        <li>「始める」ボタンで演習開始</li>
                        <li>全7パート完了で1日クリア！</li>
                      </ol>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <p className="text-xs font-bold text-blue-600 leading-relaxed">
                        毎日続けることで、TOEIC特有の形式に慣れ、解答スピードと正確性を向上させることができます。
                      </p>
                    </div>
                  </div>
                )}

                {menuTab === "audio" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center space-x-3">
                        <Volume2 className="text-gray-400" />
                        <span className="font-bold text-gray-700">音声再生</span>
                      </div>
                      <button 
                        onClick={() => {
                          const newSettings = { ...settings, isAudioEnabled: !settings.isAudioEnabled };
                          setSettings(newSettings);
                          saveSettings(newSettings);
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.isAudioEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                        <motion.div 
                          animate={{ x: settings.isAudioEnabled ? 24 : 2 }}
                          className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <div className="flex items-center space-x-2 text-orange-600 mb-2">
                        <Info size={16} />
                        <span className="text-xs font-black uppercase">Attention</span>
                      </div>
                      <p className="text-xs text-orange-700 leading-relaxed font-bold">
                        Part 1〜4はリスニング問題です。音声をオフにすると演習が非常に難しくなるため、可能な限りオンでの学習を推奨します。
                      </p>
                    </div>
                  </div>
                )}

                {menuTab === "review" && (
                  <div className="space-y-4">
                    {reviewItems.length === 0 ? (
                      <div className="text-center py-12">
                        <BookOpen className="mx-auto w-12 h-12 text-gray-200 mb-4" />
                        <p className="text-gray-400 font-bold">復習する問題はありません</p>
                      </div>
                    ) : (
                      reviewItems.map((item) => (
                        <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                          <div className="text-[10px] font-black text-blue-400 uppercase mb-1">Part {item.question.part}</div>
                          <p className="text-sm text-gray-800 font-bold mb-3 line-clamp-2">
                            {item.question.text || item.question.imageDescriptionJa || "音声問題"}
                          </p>
                          <div className="flex items-center justify-between">
                            <button 
                              onClick={() => {
                                setIsMenuOpen(false);
                                setActivePart(item.question.part);
                                setCurrentQuestion(item.question);
                              }}
                              className="text-xs font-black text-blue-500 hover:text-blue-600"
                            >
                              この問題を解く
                            </button>
                            <button 
                              onClick={() => {
                                removeReviewItem(item.id);
                                setReviewItems(getReviewItems());
                              }}
                              className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
