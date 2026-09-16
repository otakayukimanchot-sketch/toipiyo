import React, { useState, useEffect, useRef } from "react";
import { Part, Question, SubQuestion } from "../types";
import { speak, unlockAudio, cancelAudio, startAudioSession, isAudioSessionActive } from "../utils/audio";
import { saveIncorrectQuestion } from "../utils/storage";
import { motion, AnimatePresence } from "motion/react";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  Home, 
  ArrowLeft, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  BookmarkPlus,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface QuizViewProps {
  part: Part;
  question: Question;
  onComplete: (isCorrect: boolean) => void;
  onRetry: () => void;
  onCancel: () => void;
  isAudioEnabled: boolean;
}

const PART_TIMERS: Record<Part, number> = {
  1: 20,
  2: 20,
  3: 40,
  4: 40,
  5: 30,
  6: 45,
  7: 60,
};

const PART_LABELS: Record<Part, string> = {
  1: "写真描写問題",
  2: "応答問題",
  3: "会話問題",
  4: "説明文問題",
  5: "短文穴埋め問題",
  6: "長文穴埋め問題",
  7: "読解問題",
};

const QuizView: React.FC<QuizViewProps> = ({ 
  part, 
  question, 
  onComplete, 
  onRetry, 
  onCancel, 
  isAudioEnabled 
}) => {
  const [phase, setPhase] = useState<"countdown" | "quiz" | "result">("countdown");
  const [timeLeft, setTimeLeft] = useState(PART_TIMERS[part]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isAudioFinished, setIsAudioFinished] = useState(![1, 2, 3, 4].includes(part) || !isAudioEnabled);
  const [isSaved, setIsSaved] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const [activeSubIdx, setActiveSubIdx] = useState(0);
  const [showScriptModal, setShowScriptModal] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state on question or part change
  useEffect(() => {
    setTimeLeft(PART_TIMERS[part]);
    setSelectedAnswers({});
    setIsConfirmed(false);
    setIsCorrect(false);
    setIsAudioFinished(![1, 2, 3, 4].includes(part) || !isAudioEnabled);
    setIsSaved(false);
    setActiveSubIdx(0);
    setShowScriptModal(false);
  }, [part, question.id, isAudioEnabled]);

  // Countdown logic
  useEffect(() => {
    if (phase === "countdown") {
      unlockAudio();
      const timer = setTimeout(() => {
        setPhase("quiz");
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Audio playback logic
  useEffect(() => {
    if (phase !== "quiz" || ![1, 2, 3, 4].includes(part) || !isAudioEnabled) {
      return;
    }

    const sessionId = startAudioSession();
    setIsAudioFinished(false);

    const playAudio = async () => {
      try {
        if (!isAudioSessionActive(sessionId)) return;

        if (part === 1 && question.audioTexts) {
          for (let i = 0; i < question.audioTexts.length; i++) {
            if (!isAudioSessionActive(sessionId)) return;
            await speak(`${String.fromCharCode(65 + i)}`, i === 0, sessionId);
            if (!isAudioSessionActive(sessionId)) return;
            await new Promise(r => setTimeout(r, 200));
            if (!isAudioSessionActive(sessionId)) return;
            await speak(question.audioTexts[i], false, sessionId);
            if (i < question.audioTexts.length - 1 && isAudioSessionActive(sessionId)) {
              await new Promise(r => setTimeout(r, 800));
            }
          }
        } else if (part === 2) {
          if (question.audioTexts && question.audioTexts.length > 0) {
            await speak(question.audioTexts[0], true, sessionId);
            if (!isAudioSessionActive(sessionId)) return;
            await new Promise(r => setTimeout(r, 1000));

            for (let i = 1; i < question.audioTexts.length; i++) {
              if (!isAudioSessionActive(sessionId)) return;
              await speak(`${String.fromCharCode(64 + i)}`, false, sessionId);
              if (!isAudioSessionActive(sessionId)) return;
              await new Promise(r => setTimeout(r, 200));
              if (!isAudioSessionActive(sessionId)) return;
              await speak(question.audioTexts[i], false, sessionId);
              if (i < question.audioTexts.length - 1 && isAudioSessionActive(sessionId)) {
                await new Promise(r => setTimeout(r, 800));
              }
            }
          }
        } else if ((part === 3 || part === 4) && question.audioText) {
          let sentences: string[] = [];
          if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
            const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
            sentences = Array.from(segmenter.segment(question.audioText), s => s.segment.trim());
          } else {
            sentences = question.audioText.match(/[^.!?]+[.!?]+(?:\s|$)/g)?.map(s => s.trim()) || [question.audioText];
          }

          for (let i = 0; i < sentences.length; i++) {
            if (!isAudioSessionActive(sessionId)) return;
            await speak(sentences[i].trim(), i === 0, sessionId);
            if (i < sentences.length - 1 && isAudioSessionActive(sessionId)) {
              await new Promise(r => setTimeout(r, 400));
            }
          }

          if (!isAudioSessionActive(sessionId)) return;
          await new Promise(r => setTimeout(r, 1000));

          for (let i = 0; i < question.subQuestions.length; i++) {
            if (!isAudioSessionActive(sessionId)) return;
            const sq = question.subQuestions[i];
            if (sq.questionText) {
              const questionPrompt = question.subQuestions.length > 1
                ? `Number ${i + 1}. ${sq.questionText}`
                : sq.questionText;
              await speak(questionPrompt, false, sessionId);
            }
            if (i < question.subQuestions.length - 1 && isAudioSessionActive(sessionId)) {
              await new Promise(r => setTimeout(r, 1200));
            }
          }
        }

        if (isAudioSessionActive(sessionId)) {
          setIsAudioFinished(true);
        }
      } catch (err) {
        console.error("Audio playback error:", err);
        if (isAudioSessionActive(sessionId)) {
          setIsAudioFinished(true);
        }
      }
    };

    playAudio();

    return () => {
      cancelAudio();
    };
  }, [phase, part, question.id, isAudioEnabled, replayCount]);

  // Practice Timer logic
  useEffect(() => {
    if (phase !== "quiz" || isConfirmed) return;

    const canCountDown = isAudioFinished || ![1, 2, 3, 4].includes(part) || !isAudioEnabled;

    if (canCountDown) {
      if (timeLeft > 0) {
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) return 0;
            return prev - 1;
          });
        }, 1000);

        return () => {
          if (timerRef.current) clearInterval(timerRef.current);
        };
      } else {
        handleConfirm();
      }
    }
  }, [phase, isAudioFinished, timeLeft, isConfirmed, part, isAudioEnabled]);

  const handleSelect = (subQuestionId: string, index: number) => {
    if (isConfirmed) return;
    setSelectedAnswers((prev) => ({ ...prev, [subQuestionId]: index }));

    // If multi-question and there's a next question that is unanswered, auto-advance tab smoothly
    if (question.subQuestions.length > 1) {
      const nextUnanswered = question.subQuestions.findIndex((sq, idx) => 
        idx > activeSubIdx && selectedAnswers[sq.id] === undefined
      );
      if (nextUnanswered !== -1) {
        setTimeout(() => {
          setActiveSubIdx(nextUnanswered);
        }, 250);
      }
    }
  };

  const handleConfirm = () => {
    if (isConfirmed) return;
    if (timerRef.current) clearInterval(timerRef.current);
    cancelAudio();
    
    setIsConfirmed(true);
    
    const allCorrect = question.subQuestions.every(
      (sq) => selectedAnswers[sq.id] === sq.correctIndex
    );
    
    setIsCorrect(allCorrect);
    setPhase("result");
  };

  const handleReplay = () => {
    cancelAudio();
    setIsAudioFinished(false);
    setTimeLeft(PART_TIMERS[part]);
    setReplayCount((c) => c + 1);
  };

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    cancelAudio();
    onCancel();
  };

  const isTimerActive = isAudioFinished || ![1, 2, 3, 4].includes(part) || !isAudioEnabled;
  const isTimeCritical = timeLeft <= 5 && isTimerActive;
  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = answeredCount === question.subQuestions.length;

  // 1. COUNTDOWN PHASE
  if (phase === "countdown") {
    return (
      <div className="w-full h-[100dvh] max-h-[100dvh] flex flex-col items-center justify-center bg-white dark:bg-black p-6 text-center select-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-3"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-bold block">
            PART {part}
          </span>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-gray-950 dark:text-white">
            {PART_LABELS[part]}
          </h2>
          <div className="pt-4 font-mono text-xs tracking-widest uppercase text-gray-400 dark:text-gray-500 animate-pulse">
            STARTING PRACTICE...
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. QUIZ PHASE (Optimized for Mobile Viewport - NO VERTICAL SCROLL)
  if (phase === "quiz") {
    const currentSub = question.subQuestions[activeSubIdx] || question.subQuestions[0];

    return (
      <div className="w-full h-[100dvh] max-h-[100dvh] bg-white dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col overflow-hidden select-none">
        {/* Top Header Bar - Compact & Safe-Area Aware */}
        <header className="w-full pt-[max(0.5rem,env(safe-area-inset-top))] px-3 pb-2 border-b border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-black/95 backdrop-blur-sm shrink-0 z-20 flex items-center justify-between">
          <button 
            onClick={handleCancel} 
            className="h-8 px-2 -ml-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center space-x-1 text-xs font-mono transition-colors cursor-pointer"
            aria-label="中断"
          >
            <ArrowLeft size={16} />
            <span className="tracking-wider">中断</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold tracking-wider text-blue-600 dark:text-blue-400">
              PART {part}
            </span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
              {PART_LABELS[part]}
            </span>
            {question.subQuestions.length > 1 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                Q{activeSubIdx + 1}/{question.subQuestions.length}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1.5 font-mono">
            <Clock size={14} className={isTimeCritical ? "text-rose-500 animate-bounce" : "text-gray-400 dark:text-gray-500"} />
            <span className={`text-xs font-bold ${
              isTimeCritical
                ? "text-rose-500 animate-pulse font-mono"
                : "text-gray-900 dark:text-white"
            }`}>
              {timeLeft}s
            </span>
          </div>
        </header>

        {/* Audio Status Banner - Ultra Compact (~28px) */}
        {[1, 2, 3, 4].includes(part) && (
          <div className="w-full px-3 py-1.5 border-b border-gray-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 shrink-0 flex items-center justify-between text-xs">
            {!isAudioEnabled ? (
              <div className="flex items-center space-x-1.5 text-gray-400 text-[11px] font-mono">
                <VolumeX size={13} />
                <span>音声OFF（タイマー作動中）</span>
              </div>
            ) : !isAudioFinished ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <div className="flex items-end space-x-0.5 h-3">
                    <motion.div animate={{ height: [2, 10, 2] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-blue-600 rounded-full" />
                    <motion.div animate={{ height: [4, 12, 3] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.12 }} className="w-0.5 bg-blue-600 rounded-full" />
                    <motion.div animate={{ height: [3, 8, 2] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.25 }} className="w-0.5 bg-blue-600 rounded-full" />
                  </div>
                  <span className="text-[11px] font-medium text-gray-800 dark:text-gray-200">
                    音声再生中 <span className="text-gray-400 hidden sm:inline">（再生後に{timeLeft}秒開始）</span>
                  </span>
                </div>
                <button
                  onClick={handleReplay}
                  className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer py-0.5 px-1"
                >
                  <RotateCcw size={11} />
                  <span>最初から</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                  <Volume2 size={13} />
                  <span>再生完了 · 回答タイマー作動中</span>
                </div>
                <button
                  onClick={handleReplay}
                  className="text-[11px] font-mono text-gray-500 dark:text-gray-400 hover:text-blue-600 flex items-center space-x-1 cursor-pointer py-0.5 px-1"
                >
                  <RotateCcw size={11} />
                  <span>もう一度聴く</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Quiz Content - Fully Responsive & Scroll-Free */}
        <main className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 max-w-xl mx-auto w-full overflow-hidden">
          {/* PART 1: Photo Description (Scene + 2x2 Audio Buttons) */}
          {part === 1 && (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <div className="space-y-2">
                {question.image && (
                  <div className="w-full h-32 sm:h-44 border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                    <img 
                      src={question.image} 
                      alt="Part 1 question" 
                      className="h-full w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                {question.imageDescriptionJa && (
                  <div className="p-2.5 sm:p-3 border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/50 text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-snug line-clamp-3 sm:line-clamp-4">
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold block uppercase tracking-wider mb-0.5">
                      場面描写
                    </span>
                    {question.imageDescriptionJa}
                  </div>
                )}
                <div className="text-[11px] font-mono text-gray-400 text-center">
                  最も的確に描写している選択肢を1つ選んでください
                </div>
              </div>

              {/* 2x2 Compact Choice Matrix */}
              <div className="grid grid-cols-2 gap-2.5 w-full my-auto py-2">
                {[0, 1, 2, 3].map((optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isSelected = selectedAnswers[currentSub.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelect(currentSub.id, optIdx)}
                      className={`h-14 sm:h-16 rounded-none border flex flex-col items-center justify-center font-mono transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 font-bold"
                          : "bg-white dark:bg-black border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <span className="text-lg">({letter})</span>
                      <span className="text-[10px] font-sans font-normal opacity-70">
                        選択肢 {letter}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PART 2: Question-Response (Audio Prompt + 3 Options) */}
          {part === 2 && (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <div className="p-3 border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/50 text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-snug text-center space-y-1">
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold block uppercase tracking-wider">
                  QUESTION & RESPONSE
                </span>
                <p>放送される質問または発話に対して、最も適切な応答を選んでください。</p>
              </div>

              {/* 3 Large Tap Targets in a row */}
              <div className="grid grid-cols-3 gap-2.5 w-full my-auto py-4">
                {[0, 1, 2].map((optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isSelected = selectedAnswers[currentSub.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelect(currentSub.id, optIdx)}
                      className={`h-20 sm:h-24 rounded-none border flex flex-col items-center justify-center font-mono transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
                          : "bg-white dark:bg-black border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <span className="text-2xl">({letter})</span>
                      <span className="text-xs font-sans font-normal opacity-75 mt-1">
                        選択肢 {letter}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PART 5: Incomplete Sentences (Sentence text + 4 Options) */}
          {part === 5 && (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <div className="p-3 sm:p-4 border border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-950/60 text-sm sm:text-base leading-relaxed text-gray-900 dark:text-gray-100 font-normal shrink-0">
                {question.text}
              </div>

              {/* 4 Choices */}
              <div className="space-y-2 w-full my-auto py-2">
                {currentSub.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isSelected = selectedAnswers[currentSub.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelect(currentSub.id, optIdx)}
                      className={`w-full min-h-[46px] py-2 px-3.5 border flex items-center text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 font-medium"
                          : "bg-white dark:bg-black border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      <span className={`font-mono text-xs font-bold mr-3 ${isSelected ? "text-white" : "text-gray-400"}`}>
                        ({letter})
                      </span>
                      <span className="text-sm font-sans flex-1">
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PART 3 & 4: Conversations / Talks */}
          {(part === 3 || part === 4) && (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              {/* Stepper if multiple questions */}
              {question.subQuestions.length > 1 && (
                <div className="flex items-center space-x-2 pb-2 shrink-0 border-b border-gray-100 dark:border-slate-800/80">
                  <span className="text-[11px] font-mono text-gray-400">設問切替:</span>
                  <div className="flex space-x-1.5 flex-1">
                    {question.subQuestions.map((sq, idx) => {
                      const isDone = selectedAnswers[sq.id] !== undefined;
                      const isActive = idx === activeSubIdx;
                      return (
                        <button
                          key={sq.id}
                          onClick={() => setActiveSubIdx(idx)}
                          className={`flex-1 py-1 text-xs font-mono transition-colors cursor-pointer border ${
                            isActive
                              ? "bg-gray-950 dark:bg-white text-white dark:text-black border-transparent font-bold"
                              : isDone
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : "bg-gray-100 dark:bg-slate-900 text-gray-500 border-transparent"
                          }`}
                        >
                          Q{idx + 1} {isDone ? "✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Subquestion text */}
              <div className="pt-2 shrink-0">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-950 dark:text-white leading-snug line-clamp-2">
                  {question.subQuestions.length > 1 ? `${activeSubIdx + 1}. ` : ""}{currentSub.questionText}
                </h3>
              </div>

              {/* 4 Choices */}
              <div className="space-y-2 w-full my-auto py-2">
                {currentSub.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isSelected = selectedAnswers[currentSub.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelect(currentSub.id, optIdx)}
                      className={`w-full min-h-[46px] py-2 px-3 border flex items-center text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 font-medium"
                          : "bg-white dark:bg-black border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      <span className={`font-mono text-xs font-bold mr-2.5 ${isSelected ? "text-white" : "text-gray-400"}`}>
                        ({letter})
                      </span>
                      <span className="text-xs sm:text-sm font-sans flex-1 line-clamp-2">
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PART 6 & 7: Reading Comprehension (Split Reader & Question Panel) */}
          {(part === 6 || part === 7) && (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              {/* Upper Section: Compact Reading Document (~36vh) */}
              <div className="flex-[4] min-h-0 flex flex-col mb-2 border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-950/70 overflow-hidden">
                <div className="px-2.5 py-1 border-b border-gray-200 dark:border-slate-800 bg-gray-100/70 dark:bg-slate-900/70 flex items-center justify-between text-[11px] font-mono text-gray-500 shrink-0">
                  <span>DOCUMENT / 本文</span>
                  <span className="text-[10px]">縦スクロールで全文閲覧可</span>
                </div>
                <div className="flex-1 p-2.5 overflow-y-auto text-xs leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans scrollbar-none select-text">
                  {question.text}
                </div>
              </div>

              {/* Lower Section: Active Question & Choices (~45vh) */}
              <div className="flex-[5] min-h-0 flex flex-col justify-between">
                {/* Stepper if multiple questions */}
                {question.subQuestions.length > 1 && (
                  <div className="flex items-center space-x-1.5 pb-1 shrink-0">
                    {question.subQuestions.map((sq, idx) => {
                      const isDone = selectedAnswers[sq.id] !== undefined;
                      const isActive = idx === activeSubIdx;
                      return (
                        <button
                          key={sq.id}
                          onClick={() => setActiveSubIdx(idx)}
                          className={`flex-1 py-1 text-[11px] font-mono border transition-colors cursor-pointer ${
                            isActive
                              ? "bg-gray-950 dark:bg-white text-white dark:text-black border-transparent font-bold"
                              : isDone
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : "bg-gray-100 dark:bg-slate-900 text-gray-500 border-transparent"
                          }`}
                        >
                          設問 {idx + 1} {isDone ? "✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentSub.questionText && (
                  <div className="py-1 shrink-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-950 dark:text-white leading-tight line-clamp-2">
                      {question.subQuestions.length > 1 ? `Q${activeSubIdx + 1}. ` : ""}{currentSub.questionText}
                    </h3>
                  </div>
                )}

                {/* 4 Compact Options */}
                <div className="space-y-1.5 w-full my-auto py-1">
                  {currentSub.options.map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const isSelected = selectedAnswers[currentSub.id] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelect(currentSub.id, optIdx)}
                        className={`w-full min-h-[40px] py-1.5 px-2.5 border flex items-center text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 font-medium"
                            : "bg-white dark:bg-black border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        <span className={`font-mono text-xs font-bold mr-2 shrink-0 ${isSelected ? "text-white" : "text-gray-400"}`}>
                          ({letter})
                        </span>
                        <span className="text-xs font-sans flex-1 line-clamp-2 leading-snug">
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Fixed Footer Confirm Bar - Safe-Area Aware */}
        <footer className="w-full border-t border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-black/95 backdrop-blur-md px-4 py-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shrink-0 z-20">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 shrink-0">
              {answeredCount}/{question.subQuestions.length} 回答
            </div>
            <button
              onClick={handleConfirm}
              disabled={!isAllAnswered}
              className="flex-1 h-11 bg-gray-950 dark:bg-white text-white dark:text-black font-semibold text-xs tracking-wider uppercase disabled:opacity-25 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <span>回答を確定する</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // 3. RESULT PHASE (Optimized for Mobile Viewport - NO VERTICAL SCROLL)
  if (phase === "result") {
    return (
      <div className="w-full h-[100dvh] max-h-[100dvh] bg-white dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col justify-between overflow-hidden select-none">
        {/* Top Result Banner - Compact (~60px) */}
        <div className={`w-full pt-[max(0.5rem,env(safe-area-inset-top))] px-4 py-2.5 border-b shrink-0 flex items-center justify-between ${
          isCorrect 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" 
            : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
        }`}>
          <div className="flex items-center space-x-2">
            {isCorrect ? (
              <CheckCircle size={22} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle size={22} className="text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <div>
              <div className="text-base font-bold tracking-tight">
                {isCorrect ? "正解！" : "不正解"}
              </div>
              <div className="text-[10px] font-mono opacity-80 uppercase tracking-wider">
                PART {part} · {PART_LABELS[part]}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              saveIncorrectQuestion(question);
              setIsSaved(true);
            }}
            disabled={isSaved}
            className="px-2.5 py-1 border border-current text-[11px] font-mono tracking-wider uppercase flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
          >
            <BookmarkPlus size={12} />
            <span>{isSaved ? "保存済" : "復習保存"}</span>
          </button>
        </div>

        {/* Middle Answer Key & Breakdown Container - Scrollable only if user wants extra reading */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 max-w-xl mx-auto w-full space-y-3">
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-gray-400 font-bold block">
              ANSWER KEY & DETAILS
            </span>

            {question.subQuestions.map((sq, i) => {
              const userChoice = selectedAnswers[sq.id];
              const isSubCorrect = userChoice === sq.correctIndex;
              return (
                <div key={sq.id} className="p-3 border border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-950/60 space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {sq.questionText ? `Q${i + 1}. ${sq.questionText}` : `問題 ${i + 1}`}
                    </span>
                    <span className={`font-mono font-bold text-[10px] ${
                      isSubCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}>
                      {isSubCorrect ? "CORRECT" : "MISSED"}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-baseline space-x-2 text-emerald-700 dark:text-emerald-400 font-medium">
                      <span className="font-mono text-[10px] shrink-0 font-bold">正解:</span>
                      <span className="font-mono font-bold">({String.fromCharCode(65 + sq.correctIndex)})</span>
                      <span>{sq.options[sq.correctIndex]}</span>
                    </div>

                    {!isSubCorrect && (
                      <div className="flex items-baseline space-x-2 text-rose-600 dark:text-rose-400">
                        <span className="font-mono text-[10px] shrink-0 font-bold">あなたの回答:</span>
                        <span className="font-mono font-bold">({String.fromCharCode(65 + userChoice)})</span>
                        <span>{sq.options[userChoice] || "未選択"}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Script / Reading text accordion toggle */}
          {(question.text || question.audioText || (question.audioTexts && question.audioTexts.length > 0)) && (
            <div className="border border-gray-200 dark:border-slate-800">
              <button
                onClick={() => setShowScriptModal(!showScriptModal)}
                className="w-full py-2 px-3 flex items-center justify-between text-left text-xs font-mono text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-900 cursor-pointer"
              >
                <div className="flex items-center space-x-1.5">
                  <FileText size={13} />
                  <span>英文テキスト / スクリプトを確認</span>
                </div>
                {showScriptModal ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showScriptModal && (
                <div className="p-3 border-t border-gray-200 dark:border-slate-800 text-xs leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-gray-50/50 dark:bg-slate-900/50 max-h-48 overflow-y-auto select-text">
                  {question.text || question.audioText || question.audioTexts?.join("\n")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Action Area - Fixed & Always Visible in Initial Viewport */}
        <div className="w-full border-t border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-black/95 backdrop-blur-md p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2 shrink-0 z-20">
          <div className="max-w-xl mx-auto space-y-2">
            {/* Primary Action Button */}
            {isCorrect ? (
              part < 7 ? (
                <button
                  onClick={() => onComplete(true)}
                  className="w-full h-12 bg-gray-950 dark:bg-white text-white dark:text-black font-semibold text-xs tracking-wider uppercase flex items-center justify-center space-x-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <span>次のPartに進む (Part {part + 1})</span>
                  <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  onClick={() => onComplete(true)}
                  className="w-full h-12 bg-emerald-600 text-white font-semibold text-xs tracking-wider uppercase flex items-center justify-center space-x-1.5 cursor-pointer hover:bg-emerald-700 transition-colors"
                >
                  <span>本日の全7パート達成！(ホームへ)</span>
                  <ChevronRight size={15} />
                </button>
              )
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setPhase("countdown");
                    setTimeLeft(PART_TIMERS[part]);
                    setSelectedAnswers({});
                    setIsConfirmed(false);
                    setIsCorrect(false);
                    setReplayCount((c) => c + 1);
                  }}
                  className="h-12 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs tracking-wider uppercase flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                >
                  <RotateCcw size={14} />
                  <span>もう一度解く</span>
                </button>

                <button
                  onClick={() => onComplete(false)}
                  className="h-12 bg-gray-950 dark:bg-white text-white dark:text-black font-semibold text-xs tracking-wider uppercase flex items-center justify-center space-x-1 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <span>次のPartへ (Part {part < 7 ? part + 1 : 1})</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Secondary Home Button */}
            <button
              onClick={() => {
                if (isCorrect) onComplete(true);
                else handleCancel();
              }}
              className="w-full h-9 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-900 text-xs font-mono tracking-wider uppercase flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
            >
              <Home size={13} />
              <span>演習を終了してホームに戻る</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QuizView;
