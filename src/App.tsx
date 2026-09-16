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
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { 
  Volume2, 
  VolumeX, 
  Menu, 
  X, 
  ChevronRight, 
  Check, 
  Sun, 
  Moon, 
  Trash2, 
  Play,
  Layers,
  RotateCcw,
  Sparkles,
  BookOpen,
  Battery,
  Zap
} from "lucide-react";

const PART_INFO: Record<Part, { name: string; type: "Listening" | "Reading"; time: number; optionsCount: number; summary: string }> = {
  1: { name: "写真描写問題", type: "Listening", time: 20, optionsCount: 4, summary: "1枚の写真について4つの短い英語説明文が放送されます。最も的確に描写している選択肢を選びます。" },
  2: { name: "応答問題", type: "Listening", time: 20, optionsCount: 3, summary: "1つの質問や発話に対して3つの応答が放送されます。自然な会話の受け答えとなるものを即座に選択します。" },
  3: { name: "会話問題", type: "Listening", time: 40, optionsCount: 4, summary: "2〜3人の人物による職場・日常生活の対話を聞き、設問に対して適切な選択肢を選びます。" },
  4: { name: "説明文問題", type: "Listening", time: 40, optionsCount: 4, summary: "アナウンスや電話メッセージなどのモノローグ（1人のトーク）を聞き、概要や詳細を把握して解答します。" },
  5: { name: "短文穴埋め問題", type: "Reading", time: 30, optionsCount: 4, summary: "文法や語彙力を問う短文の空所補充問題。品詞の判別やコロケーションを素早く見抜くのが肝要です。" },
  6: { name: "長文穴埋め問題", type: "Reading", time: 45, optionsCount: 4, summary: "メールや記事などのまとまった文書内の空所に、適切な語句や文を前後の文脈から判断して補います。" },
  7: { name: "読解問題", type: "Reading", time: 60, optionsCount: 4, summary: "各種ビジネス文書（チラシ、Eメール、チャット、複合文書）を精読・速読し、設問の答えを導き出します。" },
};

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
  const [showRadar, setShowRadar] = useState(false);
  const [homeTab, setHomeTab] = useState<"matrix" | "review">("matrix");

  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [simulatedBattery, setSimulatedBattery] = useState<number | null>(null);

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      }).catch(() => {});
    }
  }, []);

  const currentBattery = simulatedBattery !== null ? simulatedBattery : batteryLevel;

  useEffect(() => {
    const initialProgress = getInitialProgress();
    setProgress(initialProgress);
    
    if (initialProgress.completedPartsToday.length === 7) {
      setIsAllDone(true);
    }

    const timer = setTimeout(() => {
      setIsLoading(false);
      setReviewItems(getReviewItems());
    }, 400);

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

    const randomIndex = Math.floor(Math.random() * partQuestions.length);
    const rawQuestion = partQuestions[randomIndex];
    const question = JSON.parse(JSON.stringify(rawQuestion));

    // Shuffle options
    question.subQuestions = question.subQuestions.map((sq: any) => {
      const originalOptions = [...sq.options];
      const correctOption = originalOptions[sq.correctIndex];
      
      for (let i = originalOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [originalOptions[i], originalOptions[j]] = [originalOptions[j], originalOptions[i]];
      }
      
      sq.options = originalOptions;
      sq.correctIndex = originalOptions.indexOf(correctOption);
      return sq;
    });

    if (part === 1) {
      question.audioTexts = [...question.subQuestions[0].options];
    } else if (part === 2) {
      const questionText = rawQuestion.audioTexts?.[0] || "";
      question.audioTexts = [questionText, ...question.subQuestions[0].options];
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

      if (allDoneStatus && isCorrect) {
        setActivePart(null);
        setCurrentQuestion(null);
      } else {
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
    const root = window.document.documentElement;
    if (settings.isDarkMode) {
      root.classList.add('dark');
      root.style.backgroundColor = '#000000';
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#ffffff';
      root.style.colorScheme = 'light';
    }

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', settings.isDarkMode ? '#000000' : '#ffffff');
  }, [settings.isDarkMode]);

  if (!progress || isLoading) {
    return (
      <div className={`w-full h-[100dvh] flex flex-col items-center justify-center p-6 ${settings.isDarkMode ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
        <div className="space-y-2 text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold block">
            TOEIC 7-PART DAILY ENGINE
          </span>
          <h1 className="text-2xl font-light tracking-tight">
            といぴよ
          </h1>
          <p className="text-[11px] font-mono tracking-wider text-gray-400 dark:text-gray-600 uppercase">
            LOADING...
          </p>
        </div>
      </div>
    );
  }

  const firstIncompletePart = ([1, 2, 3, 4, 5, 6, 7] as Part[]).find(p => !progress.completedPartsToday.includes(p)) || 1;

  return (
    <MotionConfig reducedMotion={settings.isBatterySaverEnabled ? "always" : "never"}>
      <div className={`w-full min-h-[100dvh] font-sans selection:bg-blue-100 transition-colors duration-200 ${settings.isDarkMode ? 'bg-black text-gray-100 dark' : 'bg-white text-gray-900'}`}>
        <AnimatePresence mode="wait">
          {!activePart ? (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full min-h-[100dvh] flex flex-col justify-between"
            >
            {/* Top Navigation Bar - Ultra-Compact & Safe-Area Aware */}
            <header className="w-full pt-[max(0.5rem,env(safe-area-inset-top))] px-4 py-2 border-b border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-black/95 backdrop-blur-md sticky top-0 z-30 shrink-0">
              <div className="max-w-xl mx-auto flex items-center justify-between">
                <div className="flex items-baseline space-x-2">
                  <span className="text-base font-bold tracking-tight text-gray-950 dark:text-white">
                    といぴよ
                  </span>
                  <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 hidden sm:inline">
                    / 7-Part Engine
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <StreakDisplay streak={progress.streak} compact={true} />

                  {/* Audio quick toggle */}
                  <button 
                    onClick={() => {
                      const newSettings = { ...settings, isAudioEnabled: !settings.isAudioEnabled };
                      setSettings(newSettings);
                      saveSettings(newSettings);
                    }}
                    className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                    title={settings.isAudioEnabled ? "音声ON" : "音声OFF"}
                    aria-label="Toggle Audio"
                  >
                    {settings.isAudioEnabled ? <Volume2 size={15} className="text-blue-600 dark:text-blue-400" /> : <VolumeX size={15} className="text-gray-400" />}
                  </button>

                  {/* Battery Saver quick toggle */}
                  <button
                    onClick={() => {
                      const newSaver = !settings.isBatterySaverEnabled;
                      const newSettings = { 
                        ...settings, 
                        isBatterySaverEnabled: newSaver,
                        isDarkMode: newSaver ? true : settings.isDarkMode 
                      };
                      setSettings(newSettings);
                      saveSettings(newSettings);
                    }}
                    className={`px-2 py-1 flex items-center space-x-1 text-xs font-mono font-bold transition-colors cursor-pointer border ${settings.isBatterySaverEnabled ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-gray-200 dark:border-slate-800 text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}
                    title="バッテリーセーバーモード"
                  >
                    <Battery size={14} className={settings.isBatterySaverEnabled ? 'text-emerald-500 animate-pulse' : ''} />
                    <span className="text-[11px]">{currentBattery}%</span>
                  </button>

                  {/* Dark Mode toggle */}
                  <button
                    onClick={() => {
                      const newSettings = { ...settings, isDarkMode: !settings.isDarkMode };
                      setSettings(newSettings);
                      saveSettings(newSettings);
                    }}
                    className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                    title="Toggle Theme"
                    aria-label="Toggle Theme"
                  >
                    {settings.isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                  </button>

                  {/* Menu Button */}
                  <button 
                    onClick={() => {
                      setIsMenuOpen(true);
                      setMenuTab("main");
                    }}
                    className="p-1.5 text-gray-700 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white transition-colors cursor-pointer"
                    aria-label="Open menu"
                  >
                    <Menu size={18} />
                  </button>
                </div>
              </div>
            </header>

            {/* Mobile Viewport Main Content */}
            <main className="max-w-xl mx-auto px-4 py-2.5 flex-1 w-full flex flex-col justify-between space-y-2">
              {/* Daily Progress & Quick Start Banner */}
              <div className="border border-gray-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase">
                    DAILY PROGRESS
                  </span>
                  <div className="flex items-baseline space-x-1 font-mono">
                    <span className="text-base font-bold text-gray-950 dark:text-white">
                      {progress.completedPartsToday.length}
                    </span>
                    <span className="text-xs text-gray-400">/ 7 完了</span>
                  </div>
                </div>

                {/* 7-Segment Progress Visualizer */}
                <div className="grid grid-cols-7 gap-1 h-1.5 mb-2.5">
                  {([1, 2, 3, 4, 5, 6, 7] as Part[]).map(p => {
                    const done = progress.completedPartsToday.includes(p);
                    return (
                      <div 
                        key={p} 
                        className={`h-full transition-colors ${done ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-slate-800'}`}
                        title={`Part ${p}: ${done ? '完了' : '未完了'}`}
                      />
                    );
                  })}
                </div>

                {/* 1-Tap Quick Action */}
                {!isAllDone ? (
                  <button
                    onClick={() => handleStartQuiz(firstIncompletePart)}
                    className="w-full h-11 bg-gray-950 dark:bg-white text-white dark:text-black font-semibold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 transition-opacity hover:opacity-90 cursor-pointer"
                  >
                    <Play size={14} className="fill-current" />
                    <span>Part {firstIncompletePart} を開始 ({PART_INFO[firstIncompletePart].name})</span>
                  </button>
                ) : (
                  <div className="w-full py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center justify-center space-x-1.5">
                    <Check size={14} className="shrink-0" />
                    <span>本日の全7パート演習完了！明日また更新されます</span>
                  </div>
                )}
              </div>

              {/* Segmented Tab Switcher (Matrix vs Review) */}
              <div className="grid grid-cols-2 border border-gray-200 dark:border-slate-800 text-xs font-mono shrink-0">
                <button
                  onClick={() => setHomeTab("matrix")}
                  className={`py-1.5 transition-colors cursor-pointer ${
                    homeTab === "matrix" 
                      ? "bg-gray-950 dark:bg-white text-white dark:text-black font-bold" 
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  演習 (7Part)
                </button>
                <button
                  onClick={() => setHomeTab("review")}
                  className={`py-1.5 transition-colors cursor-pointer flex items-center justify-center space-x-1 ${
                    homeTab === "review" 
                      ? "bg-gray-950 dark:bg-white text-white dark:text-black font-bold" 
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <span>復習</span>
                  {reviewItems.length > 0 && (
                    <span className="text-[10px] px-1 bg-rose-500 text-white rounded-full">
                      {reviewItems.length}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: 7-PART PRACTICE MATRIX (Optimized for Mobile Viewport - Fits on Screen!) */}
              {homeTab === "matrix" && (
                <div className="border-t border-b border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800/80 flex-1 flex flex-col justify-between">
                  {([1, 2, 3, 4, 5, 6, 7] as Part[]).map((p) => {
                    const isCompleted = progress.completedPartsToday.includes(p);
                    const info = PART_INFO[p];
                    return (
                      <button
                        key={p}
                        onClick={() => handleStartQuiz(p)}
                        className="w-full min-h-[44px] py-2 px-2 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className={`font-mono text-xs font-bold w-6 shrink-0 ${
                            isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                          }`}>
                            P0{p}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate block">
                              {info.name}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 block">
                              {info.type === "Listening" ? "リスニング" : "リーディング"} · {info.time}秒
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {isCompleted ? (
                            <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 flex items-center space-x-0.5">
                              <Check size={13} />
                              <span>完了</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-gray-400">
                              未完了
                            </span>
                          )}

                          <span className="text-xs font-semibold uppercase text-gray-950 dark:text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform pl-1">
                            <span>{isCompleted ? "再演習" : "解く"}</span>
                            <ChevronRight size={13} />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: REVIEW QUEUE */}
              {homeTab === "review" && (
                <div className="flex-1 min-h-0 overflow-y-auto py-1">
                  {reviewItems.length === 0 ? (
                    <div className="py-12 text-center text-xs font-mono text-gray-400 space-y-2">
                      <p>復習アイテムはありません</p>
                      <p className="text-[11px]">ミスした問題は自動的にストックされます</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
                      {reviewItems.map((item) => (
                        <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              unlockAudio();
                              setActivePart(item.question.part);
                              setCurrentQuestion(item.question);
                            }}
                            className="flex-1 text-left min-w-0 group cursor-pointer"
                          >
                            <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold block">
                              PART {item.question.part} · {PART_INFO[item.question.part].name}
                            </span>
                            <p className="text-xs text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600">
                              {item.question.text || item.question.imageDescriptionJa || "音声リスニング問題"}
                            </p>
                          </button>
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => {
                                unlockAudio();
                                setActivePart(item.question.part);
                                setCurrentQuestion(item.question);
                              }}
                              className="text-xs font-mono text-blue-600 hover:underline cursor-pointer"
                            >
                              解く →
                            </button>
                            <button
                              onClick={() => {
                                removeReviewItem(item.id);
                                setReviewItems(getReviewItems());
                              }}
                              className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                              aria-label="削除"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </main>

            {/* Ultra-Compact Footer */}
            <footer className="w-full py-2 px-4 border-t border-gray-100 dark:border-slate-850 bg-white/90 dark:bg-black/90 text-gray-400 dark:text-gray-600 text-[10px] font-mono shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <div className="max-w-xl mx-auto flex items-center justify-between">
                <span>といぴよ / DAILY TOEIC</span>
                <span>{getJSTDate().replace(/-/g, ".")}</span>
              </div>
            </footer>
          </motion.div>
        ) : (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-[100dvh] bg-white dark:bg-black overflow-hidden"
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

      {/* Slide-Out Drawer Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end"
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className={`w-full max-w-sm h-full border-l border-gray-200 dark:border-slate-800 flex flex-col pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] ${settings.isDarkMode ? 'bg-black text-gray-100' : 'bg-white text-gray-900'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {menuTab !== "main" && (
                    <button 
                      onClick={() => setMenuTab("main")} 
                      className="text-xs font-mono text-gray-400 hover:text-gray-900 dark:hover:text-white mr-2 cursor-pointer"
                    >
                      ← 戻る
                    </button>
                  )}
                  <h2 className="text-sm font-semibold tracking-tight">
                    {menuTab === "main" ? "メニュー" : 
                     menuTab === "howto" ? "使い方" : 
                     menuTab === "audio" ? "音声設定" : "復習リスト"}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)} 
                  className="p-1 text-gray-400 hover:text-gray-950 dark:hover:text-white cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {menuTab === "main" && (
                  <div className="space-y-4">
                    {/* Theme switcher */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono text-gray-400 uppercase">THEME</span>
                      <div className="grid grid-cols-2 gap-2 border border-gray-200 dark:border-slate-800 p-1">
                        <button 
                          onClick={() => {
                            const newSettings = { ...settings, isDarkMode: false };
                            setSettings(newSettings);
                            saveSettings(newSettings);
                          }}
                          className={`py-2 text-xs font-medium transition-colors cursor-pointer ${!settings.isDarkMode ? 'bg-gray-950 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                          ライト
                        </button>
                        <button 
                          onClick={() => {
                            const newSettings = { ...settings, isDarkMode: true };
                            setSettings(newSettings);
                            saveSettings(newSettings);
                          }}
                          className={`py-2 text-xs font-medium transition-colors cursor-pointer ${settings.isDarkMode ? 'bg-white text-black' : 'text-gray-600 hover:text-black'}`}
                        >
                          ダーク
                        </button>
                      </div>
                    </div>

                    {/* Battery Saver section */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono text-gray-400 uppercase">POWER MANAGEMENT</span>
                      <div className="border border-gray-200 dark:border-slate-800 p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Battery size={16} className={settings.isBatterySaverEnabled ? 'text-emerald-500' : 'text-gray-400'} />
                            <div>
                              <span className="text-xs font-semibold block">バッテリーセーバーモード</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {currentBattery}% · {isCharging ? '充電中' : '放電中'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const newSaver = !settings.isBatterySaverEnabled;
                              const newSettings = { 
                                ...settings, 
                                isBatterySaverEnabled: newSaver,
                                isDarkMode: newSaver ? true : settings.isDarkMode 
                              };
                              setSettings(newSettings);
                              saveSettings(newSettings);
                            }}
                            className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer ${settings.isBatterySaverEnabled ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-500'}`}
                          >
                            {settings.isBatterySaverEnabled ? "ON" : "OFF"}
                          </button>
                        </div>

                        {settings.isBatterySaverEnabled && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 space-y-1 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 border border-emerald-200 dark:border-emerald-900/50">
                            <p className="font-bold flex items-center space-x-1">
                              <Zap size={12} />
                              <span>省電力最適化作動中</span>
                            </p>
                            <p className="text-gray-600 dark:text-gray-300 leading-snug">
                              • OLED純黒テーマで消費電力軽減<br />
                              • アニメーション負荷抑制による省電力化<br />
                              • 推定バッテリー駆動時間を約35%延長
                            </p>
                          </div>
                        )}

                        <div className="pt-2 border-t border-gray-200 dark:border-slate-800 space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-gray-400">
                            <span>バッテリー残量シミュレーター</span>
                            <span>{currentBattery}%</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="100"
                            value={currentBattery}
                            onChange={(e) => setSimulatedBattery(Number(e.target.value))}
                            className="w-full accent-emerald-500 cursor-pointer"
                          />
                          {currentBattery <= 20 && !settings.isBatterySaverEnabled && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-1.5 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                              <span>残量20%未満: セーバー推奨</span>
                              <button
                                onClick={() => {
                                  const newSettings = { ...settings, isBatterySaverEnabled: true, isDarkMode: true };
                                  setSettings(newSettings);
                                  saveSettings(newSettings);
                                }}
                                className="underline font-bold cursor-pointer"
                              >
                                有効化
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation items */}
                    <div className="border-t border-b border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800">
                      <button 
                        onClick={() => setMenuTab("howto")}
                        className="w-full py-3 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-medium">学習の進め方・各パート</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </button>
                      <button 
                        onClick={() => setMenuTab("audio")}
                        className="w-full py-3 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-medium">音声設定</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </button>
                      <button 
                        onClick={() => setMenuTab("review")}
                        className="w-full py-3 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-medium">復習キュー ({reviewItems.length})</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                )}

                {menuTab === "howto" && (
                  <div className="space-y-4 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    <p>
                      といぴよは、スマホの1画面でサクサクTOEIC全7パートを1問ずつ解き、英語への即応力とペース配分を維持するデイリー学習ツールです。
                    </p>
                    <div className="border-t border-b border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800 py-1">
                      {([1, 2, 3, 4, 5, 6, 7] as Part[]).map(p => (
                        <div key={p} className="py-2">
                          <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 block">PART {p}: {PART_INFO[p].name}</span>
                          <p className="text-[11px]">{PART_INFO[p].summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {menuTab === "audio" && (
                  <div className="space-y-4">
                    <div className="border border-gray-200 dark:border-slate-800 p-3 flex items-center justify-between">
                      <span className="text-xs font-medium">リスニング音声</span>
                      <button 
                        onClick={() => {
                          const newSettings = { ...settings, isAudioEnabled: !settings.isAudioEnabled };
                          setSettings(newSettings);
                          saveSettings(newSettings);
                        }}
                        className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer ${settings.isAudioEnabled ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-500'}`}
                      >
                        {settings.isAudioEnabled ? "ON" : "OFF"}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      ※ Part 1〜4はリスニング問題です。音声を有効にして解くことで、本番同様のスピード感を体感できます。
                    </p>
                  </div>
                )}

                {menuTab === "review" && (
                  <div className="space-y-3">
                    {reviewItems.length === 0 ? (
                      <p className="text-xs text-gray-400 font-mono py-8 text-center">
                        復習リストは空です
                      </p>
                    ) : (
                      <div className="border-t border-b border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800">
                        {reviewItems.map((item) => (
                          <div key={item.id} className="py-3 space-y-1.5">
                            <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 block font-bold">
                              PART {item.question.part}
                            </span>
                            <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-2">
                              {item.question.text || item.question.imageDescriptionJa || "音声問題"}
                            </p>
                            <div className="flex items-center justify-between pt-1">
                              <button 
                                onClick={() => {
                                  setIsMenuOpen(false);
                                  setActivePart(item.question.part);
                                  setCurrentQuestion(item.question);
                                }}
                                className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                解く →
                              </button>
                              <button 
                                onClick={() => {
                                  removeReviewItem(item.id);
                                  setReviewItems(getReviewItems());
                                }}
                                className="text-xs text-gray-400 hover:text-rose-600 cursor-pointer"
                                aria-label="削除"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </MotionConfig>
  );
}
