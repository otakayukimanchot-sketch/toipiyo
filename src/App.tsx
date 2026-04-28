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
import { unlockAudio } from "./utils/audio";
import HeptagonNav from "./components/HeptagonNav";
import StreakDisplay from "./components/StreakDisplay";
import QuizView from "./components/QuizView";
import ReviewNews from "./components/ReviewNews";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Info, Settings, User, Bird, RotateCcw, Loader2, Menu, X, BookOpen, Volume2, VolumeX, HelpCircle, Trash2, ChevronLeft, Sun, Moon } from "lucide-react";

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
      setReviewItems(getReviewItems());
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
    unlockAudio();
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
      let updatedProgress: UserProgress;
      if (isCorrect) {
        updatedProgress = completePart(activePart);
      } else {
        updatedProgress = getInitialProgress();
      }
      
      setProgress({ ...updatedProgress });
      setReviewItems(getReviewItems());
      
      const allDoneStatus = updatedProgress.completedPartsToday.length === 7;
      if (allDoneStatus) {
        setIsAllDone(true);
      }

      // If all parts are done today, return to home to show celebration
      if (allDoneStatus && isCorrect) {
        setActivePart(null);
        setCurrentQuestion(null);
      } else {
        // Automatically move to next part (1->2, ..., 7->1)
        const nextPart = (activePart % 7 + 1) as Part;
        handleStartQuiz(nextPart);
      }
    }
  };

  const handleCancel = () => {
    setActivePart(null);
    setCurrentQuestion(null);
  };

  const handleRetry = () => {
    if (activePart) {
      handleStartQuiz(activePart);
    }
  };

  useEffect(() => {
    // Sync attributes for theming
    const root = window.document.documentElement;
    if (settings.isDarkMode) {
      root.classList.add('dark');
      root.style.backgroundColor = '#020617'; // bg-slate-950
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#ffffff';
      root.style.colorScheme = 'light';
    }

    // Update theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', settings.isDarkMode ? '#020617' : '#ffffff');

    // iOS Status Bar Style
    let metaAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!metaAppleStatus) {
      metaAppleStatus = document.createElement('meta');
      metaAppleStatus.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(metaAppleStatus);
    }
    metaAppleStatus.setAttribute('content', settings.isDarkMode ? 'black-translucent' : 'default');
  }, [settings.isDarkMode]);

  if (!progress || isLoading) {
    return (
      <div className={`min-h-[100dvh] transition-colors duration-300 ${settings.isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-blue-600'} flex flex-col items-center justify-center space-y-6`}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <div className={`w-20 h-20 ${settings.isDarkMode ? 'bg-blue-600' : 'bg-blue-500'} rounded-3xl flex items-center justify-center shadow-2xl mb-4`}>
            <Bird className="text-white w-12 h-12" />
          </div>
          <h1 className={`text-5xl font-black tracking-tight ${settings.isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-cute drop-shadow-sm`}>
            といぴよ
          </h1>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center space-y-2"
        >
          <Loader2 className={`w-8 h-8 ${settings.isDarkMode ? 'text-blue-500' : 'text-blue-400'} animate-spin`} />
          <span className={`text-xs font-bold tracking-[0.2em] ${settings.isDarkMode ? 'text-blue-700' : 'text-blue-300'} uppercase`}>Loading</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] font-sans selection:bg-blue-100 transition-colors duration-300 ${settings.isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-white text-gray-900'}`}>
      <AnimatePresence mode="wait">
        {!activePart ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md mx-auto px-6 py-8 flex flex-col min-h-[100dvh]"
          >
            {/* Header */}
            <header className="flex justify-between items-start mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Bird className="text-white w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <h1 className={`text-2xl font-black tracking-tight font-cute ${settings.isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>といぴよ</h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className={`text-sm font-bold ${settings.isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    {getJSTDate().replace(/-/g, "/")}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsMenuOpen(true);
                    setMenuTab("main");
                  }}
                  className={`p-2 transition-colors ${settings.isDarkMode ? 'text-slate-400 hover:text-blue-400' : 'text-gray-400 hover:text-blue-500'}`}
                >
                  <Menu size={24} />
                </button>
              </div>
            </header>

            {/* Instruction text moved above streak for better mobile fit */}
            {!isAllDone && (
              <p className={`text-center mb-2 text-xs font-bold uppercase tracking-wider ${settings.isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                Partをタップして学習を始めましょう
              </p>
            )}

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
              {isAllDone && (
                <p className="text-center mt-8 text-gray-500 font-medium">
                  今日の学習はすべて完了しました！
                </p>
              )}

              {!activePart && !isAllDone && (
                <ReviewNews 
                  items={reviewItems} 
                  onItemClick={(item) => {
                    unlockAudio();
                    setActivePart(item.question.part);
                    setCurrentQuestion(item.question);
                  }} 
                />
              )}
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
            className={`max-w-md mx-auto min-h-[100dvh] ${settings.isDarkMode ? 'bg-slate-950' : 'bg-white'}`}
          >
            {currentQuestion && (
              <QuizView
                key={currentQuestion.id}
                part={activePart}
                question={currentQuestion}
                onComplete={handleQuizComplete}
                onRetry={handleRetry}
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
              className={`w-full max-w-xs h-full shadow-2xl flex flex-col ${settings.isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-white text-gray-900'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Menu Header */}
              <div className={`p-6 border-b flex items-center justify-between ${settings.isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                <div className="flex items-center space-x-2">
                  {menuTab !== "main" && (
                    <button onClick={() => setMenuTab("main")} className={`p-1 -ml-1 transition-colors ${settings.isDarkMode ? 'text-slate-400 hover:text-blue-400' : 'text-gray-400 hover:text-blue-500'}`}>
                      <ChevronLeft size={24} />
                    </button>
                  )}
                  <h2 className="text-xl font-black">
                    {menuTab === "main" ? "メニュー" : 
                     menuTab === "howto" ? "使い方" : 
                     menuTab === "audio" ? "音声設定" : "復習リスト"}
                  </h2>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className={`p-2 transition-colors ${settings.isDarkMode ? 'text-slate-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}>
                  <X size={24} />
                </button>
              </div>

              {/* Menu Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {menuTab === "main" && (
                  <div className="space-y-4">
                    {/* Theme Toggle section */}
                    <div className={`p-2 rounded-2xl flex items-center justify-between mb-6 ${settings.isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                      <button 
                        onClick={() => {
                          const newSettings = { ...settings, isDarkMode: false };
                          setSettings(newSettings);
                          saveSettings(newSettings);
                        }}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl transition-all ${!settings.isDarkMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        <Sun size={18} />
                        <span className="text-sm font-bold">ホワイト</span>
                      </button>
                      <button 
                        onClick={() => {
                          const newSettings = { ...settings, isDarkMode: true };
                          setSettings(newSettings);
                          saveSettings(newSettings);
                        }}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl transition-all ${settings.isDarkMode ? 'bg-slate-600 text-blue-400 shadow-sm' : 'text-gray-400'}`}
                      >
                        <Moon size={18} />
                        <span className="text-sm font-bold">ナイト</span>
                      </button>
                    </div>

                    <button 
                      onClick={() => setMenuTab("howto")}
                      className={`w-full p-4 rounded-2xl flex items-center space-x-4 transition-colors group ${settings.isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-blue-50'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${settings.isDarkMode ? 'bg-slate-600' : 'bg-white'} group-hover:text-blue-500`}>
                        <HelpCircle size={20} />
                      </div>
                      <span className="font-bold">使い方</span>
                    </button>
                    <button 
                      onClick={() => setMenuTab("audio")}
                      className={`w-full p-4 rounded-2xl flex items-center space-x-4 transition-colors group ${settings.isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-blue-50'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${settings.isDarkMode ? 'bg-slate-600' : 'bg-white'} group-hover:text-blue-500`}>
                        {settings.isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                      </div>
                      <span className="font-bold">音声設定</span>
                    </button>
                    <button 
                      onClick={() => setMenuTab("review")}
                      className={`w-full p-4 rounded-2xl flex items-center space-x-4 transition-colors group ${settings.isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-blue-50'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${settings.isDarkMode ? 'bg-slate-600' : 'bg-white'} group-hover:text-blue-500`}>
                        <BookOpen size={20} />
                      </div>
                      <span className="font-bold">復習</span>
                    </button>
                  </div>
                )}

                {menuTab === "howto" && (
                  <div className={`space-y-6 ${settings.isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    <div className="space-y-4">
                      <h3 className={`font-black ${settings.isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>各パートの進め方</h3>
                      
                      <div className="space-y-4">
                        {[
                          { part: 1, title: "写真描写問題", desc: "1枚の写真について4つの説明文が流れます。最も適切なものを選んでください。" },
                          { part: 2, title: "応答問題", desc: "1つの質問に対し3つの応答が流れます。最も適切なものを選んでください。" },
                          { part: 3, title: "会話問題", desc: "複数人の会話を聞き、問題文の質問に答えてください。" },
                          { part: 4, title: "説明文問題", desc: "1人の人物によるトークを聞き、質問に答えてください。" },
                          { part: 5, title: "短文穴埋め問題", desc: "短い文章の空所に入る最も適切な語句を4択から選んでください。" },
                          { part: 6, title: "長文穴埋め問題", desc: "長文の中の空所に入る最も適切な語句や文章を選んでください。" },
                          { part: 7, title: "読解問題", desc: "1つまたは複数の文書を読み、設問に答えてください。" }
                        ].map(item => (
                          <div key={item.part} className={`p-3 rounded-xl ${settings.isDarkMode ? 'bg-blue-900/10' : 'bg-blue-50'}`}>
                            <h4 className="text-sm font-black text-blue-500 mb-1">Part {item.part}: {item.title}</h4>
                            <p className="text-xs leading-relaxed">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className={`p-4 rounded-2xl border ${settings.isDarkMode ? 'bg-green-900/10 border-green-900/30' : 'bg-green-50 border-green-100'}`}>
                      <p className={`text-xs font-bold leading-relaxed text-center ${settings.isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                        毎日1問ずつ、全パートを完走しましょう！
                      </p>
                    </div>
                  </div>
                )}

                {menuTab === "audio" && (
                  <div className="space-y-6">
                    <div className={`flex items-center justify-between p-4 rounded-2xl ${settings.isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center space-x-3">
                        <Volume2 className={settings.isDarkMode ? 'text-slate-400' : 'text-gray-400'} />
                        <span className={`font-bold ${settings.isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>音声再生</span>
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
                    <div className={`p-4 rounded-2xl border ${settings.isDarkMode ? 'bg-orange-900/10 border-orange-900/30' : 'bg-orange-50 border-orange-100'}`}>
                      <div className="flex items-center space-x-2 text-orange-600 mb-2">
                        <Info size={16} />
                        <span className="text-xs font-black uppercase">Attention</span>
                      </div>
                      <p className={`text-xs leading-relaxed font-bold ${settings.isDarkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                        Part 1〜4はリスニング問題です。音声をオフにすると演習が非常に難しくなるため、可能な限りオンでの学習を推奨します。
                      </p>
                    </div>
                  </div>
                )}

                {menuTab === "review" && (
                  <div className="space-y-4">
                    {reviewItems.length === 0 ? (
                      <div className="text-center py-12">
                        <BookOpen className={`mx-auto w-12 h-12 mb-4 ${settings.isDarkMode ? 'text-slate-700' : 'text-gray-200'}`} />
                        <p className={`font-bold ${settings.isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>復習する問題はありません</p>
                      </div>
                    ) : (
                      reviewItems.map((item) => (
                        <div key={item.id} className={`p-4 rounded-2xl border relative group ${settings.isDarkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                          <div className={`text-[10px] font-black uppercase mb-1 ${settings.isDarkMode ? 'text-blue-400' : 'text-blue-400'}`}>Part {item.question.part}</div>
                          <p className={`text-sm font-bold mb-3 line-clamp-2 ${settings.isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
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
                              className={`p-1 transition-colors ${settings.isDarkMode ? 'text-slate-600 hover:text-red-500' : 'text-gray-300 hover:text-red-500'}`}
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
