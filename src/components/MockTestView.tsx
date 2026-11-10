import React, { useState, useEffect, useRef } from "react";
import { Part, Question, MockTestResult, MockTestQuestionRecord } from "../types";
import { speak, unlockAudio, cancelAudio, startAudioSession, isAudioSessionActive, playChime } from "../utils/audio";
import { calculateMockTestScore } from "../utils/scoreCalculator";
import { saveMockTestResult, saveIncorrectQuestion, getJSTDate } from "../utils/storage";
import DifficultyBadge from "./DifficultyBadge";
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Check, 
  CheckCircle, 
  XCircle, 
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react";

interface MockTestViewProps {
  questions: Question[];
  onExit: () => void;
  onRestart: () => void;
  isAudioEnabled: boolean;
}

const PART_NAMES: Record<Part, string> = {
  1: "Part 1 (写真描写)",
  2: "Part 2 (応答問題)",
  3: "Part 3 (会話問題)",
  4: "Part 4 (説明文問題)",
  5: "Part 5 (短文穴埋め)",
  6: "Part 6 (長文穴埋め)",
  7: "Part 7 (読解問題)",
};

export default function MockTestView({
  questions,
  onExit,
  onRestart,
  isAudioEnabled: initialAudioEnabled,
}: MockTestViewProps) {
  const [phase, setPhase] = useState<"testing" | "result">("testing");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, Record<string, number>>>({});
  const [activeSubIdx, setActiveSubIdx] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudioEnabled);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [result, setResult] = useState<MockTestResult | null>(null);

  const currentQuestion = questions[currentIndex];
  const isListening = currentQuestion ? [1, 2, 3, 4].includes(currentQuestion.part) : false;

  // Reset activeSubIdx and audio on question change
  useEffect(() => {
    setActiveSubIdx(0);
    cancelAudio();
    setIsPlayingAudio(false);

    if (phase === "testing" && isListening && isAudioEnabled) {
      const timer = setTimeout(() => {
        playCurrentQuestionAudio();
      }, 350);
      return () => {
        clearTimeout(timer);
        cancelAudio();
      };
    } else {
      cancelAudio();
    }
  }, [currentIndex, phase]);

  const playCurrentQuestionAudio = async () => {
    if (!currentQuestion) return;
    const part = currentQuestion.part;
    if (![1, 2, 3, 4].includes(part)) return;

    cancelAudio();
    unlockAudio();
    const sessionId = startAudioSession();
    setIsPlayingAudio(true);

    try {
      if (part === 1 && currentQuestion.audioTexts) {
        for (let i = 0; i < currentQuestion.audioTexts.length; i++) {
          if (!isAudioSessionActive(sessionId)) break;
          await speak(String.fromCharCode(65 + i), i === 0, sessionId);
          if (!isAudioSessionActive(sessionId)) break;
          await new Promise((r) => setTimeout(r, 200));
          if (!isAudioSessionActive(sessionId)) break;
          await speak(currentQuestion.audioTexts[i], false, sessionId);
          if (i < currentQuestion.audioTexts.length - 1 && isAudioSessionActive(sessionId)) {
            await new Promise((r) => setTimeout(r, 800));
          }
        }
      } else if (part === 2 && currentQuestion.audioTexts) {
        // Question prompt
        if (currentQuestion.audioTexts[0]) {
          await speak(currentQuestion.audioTexts[0], true, sessionId);
          await new Promise((r) => setTimeout(r, 900));
        }
        // 3 Options
        const options = currentQuestion.subQuestions[0]?.options || [];
        for (let i = 0; i < options.length; i++) {
          if (!isAudioSessionActive(sessionId)) break;
          await speak(String.fromCharCode(65 + i), false, sessionId);
          await new Promise((r) => setTimeout(r, 150));
          await speak(options[i], false, sessionId);
          if (i < options.length - 1 && isAudioSessionActive(sessionId)) {
            await new Promise((r) => setTimeout(r, 800));
          }
        }
      } else if ((part === 3 || part === 4) && currentQuestion.audioText) {
        await speak(currentQuestion.audioText, true, sessionId);
      }
    } catch (e) {
      console.warn("Audio error in mock test", e);
    } finally {
      if (isAudioSessionActive(sessionId)) {
        setIsPlayingAudio(false);
      }
    }
  };

  const handleSelectOption = (subQuestionId: string, optionIndex: number) => {
    if (!currentQuestion) return;
    setUserAnswers((prev) => {
      const qAns = prev[currentQuestion.id] || {};
      return {
        ...prev,
        [currentQuestion.id]: {
          ...qAns,
          [subQuestionId]: optionIndex,
        },
      };
    });

    // Auto-advance subQuestion tab if multi-question
    if (currentQuestion.subQuestions.length > 1) {
      const nextUnanswered = currentQuestion.subQuestions.findIndex(
        (sq, idx) =>
          idx > activeSubIdx &&
          (userAnswers[currentQuestion.id]?.[sq.id] === undefined ||
            sq.id === subQuestionId)
      );
      if (nextUnanswered !== -1 && nextUnanswered !== activeSubIdx) {
        setTimeout(() => {
          setActiveSubIdx(nextUnanswered);
        }, 200);
      }
    }
  };

  const isCurrentQuestionFullyAnswered = () => {
    if (!currentQuestion) return false;
    const qAns = userAnswers[currentQuestion.id] || {};
    return currentQuestion.subQuestions.every((sq) => qAns[sq.id] !== undefined);
  };

  const handleNext = () => {
    cancelAudio();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishTestAndScore();
    }
  };

  const handlePrev = () => {
    cancelAudio();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const finishTestAndScore = () => {
    cancelAudio();

    let listeningCorrect = 0;
    let listeningTotal = 0;
    let readingCorrect = 0;
    let readingTotal = 0;
    let totalSubQuestions = 0;
    let correctSubQuestions = 0;

    const partBreakdown: Record<Part, { correct: number; total: number }> = {
      1: { correct: 0, total: 0 },
      2: { correct: 0, total: 0 },
      3: { correct: 0, total: 0 },
      4: { correct: 0, total: 0 },
      5: { correct: 0, total: 0 },
      6: { correct: 0, total: 0 },
      7: { correct: 0, total: 0 },
    };

    const records: MockTestQuestionRecord[] = [];

    questions.forEach((q) => {
      const qAns = userAnswers[q.id] || {};
      const isL = [1, 2, 3, 4].includes(q.part);

      let isAllCorrect = true;
      const subResults = q.subQuestions.map((sq) => {
        totalSubQuestions++;
        const chosen = qAns[sq.id];
        const isCorrect = chosen !== undefined && chosen === sq.correctIndex;

        if (isCorrect) {
          correctSubQuestions++;
          partBreakdown[q.part].correct++;
          if (isL) listeningCorrect++;
          else readingCorrect++;
        } else {
          isAllCorrect = false;
        }

        partBreakdown[q.part].total++;
        if (isL) listeningTotal++;
        else readingTotal++;

        return {
          subId: sq.id,
          selectedIndex: chosen,
          correctIndex: sq.correctIndex,
          isCorrect,
        };
      });

      if (!isAllCorrect) {
        saveIncorrectQuestion(q);
      }

      records.push({
        question: q,
        selectedAnswers: qAns,
        isAllCorrect,
        subResults,
      });
    });

    const calculated = calculateMockTestScore(
      listeningCorrect,
      listeningTotal,
      readingCorrect,
      readingTotal
    );

    const newResult: MockTestResult = {
      id: "mock-" + Date.now(),
      date: getJSTDate(),
      timestamp: Date.now(),
      totalQuestions: questions.length,
      totalSubQuestions,
      correctSubQuestions,
      listeningCorrect,
      listeningTotal,
      readingCorrect,
      readingTotal,
      scoreRange: calculated.scoreRange,
      listeningRange: calculated.listeningRange,
      readingRange: calculated.readingRange,
      partBreakdown,
      records,
    };

    saveMockTestResult(newResult);
    setResult(newResult);
    setPhase("result");
  };

  // -------------------------------------------------------------
  // RESULT VIEW - Minimal, clean, no AI, no fluff
  // -------------------------------------------------------------
  if (phase === "result" && result) {
    return (
      <div className="w-full min-h-[100dvh] bg-white dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col justify-between">
        {/* Top Minimal Bar */}
        <header className="w-full pt-[max(0.75rem,env(safe-area-inset-top))] px-4 py-3 border-b border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-black/95 sticky top-0 z-30">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div className="flex items-baseline space-x-2">
              <span className="text-base font-bold tracking-tight text-gray-950 dark:text-white">
                といぴよ
              </span>
              <span className="text-xs font-mono text-gray-400">/ 模擬テスト判定結果</span>
            </div>
            <button
              onClick={onExit}
              className="text-xs font-mono text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white cursor-pointer px-2 py-1"
            >
              ホームへ戻る
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="max-w-xl mx-auto px-4 py-6 w-full flex-1 space-y-6">
          {/* Main Minimum Predicted Score Card */}
          <div className="border border-gray-300 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/70 p-6 text-center space-y-3">
            <span className="text-xs font-mono tracking-widest text-blue-600 dark:text-blue-400 uppercase font-semibold block">
              ESTIMATED TOEIC SCORE
            </span>
            
            <div className="space-y-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                最低予想スコア
              </span>
              <div className="flex items-baseline justify-center space-x-1.5 font-mono">
                <span className="text-6xl font-black text-gray-950 dark:text-white tracking-tight">
                  {result.scoreRange.min}
                </span>
                <span className="text-xl font-medium text-gray-500 dark:text-gray-400">
                  点
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex items-center justify-center space-x-2 font-mono text-xs text-gray-600 dark:text-gray-400">
              <span>予想スコア範囲:</span>
              <span className="font-bold text-gray-950 dark:text-white text-sm">
                {result.scoreRange.min} 〜 {result.scoreRange.max} 点
              </span>
            </div>
          </div>

          {/* Listening & Reading Sections */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            {/* Listening Section */}
            <div className="border border-gray-200 dark:border-slate-800 p-3.5 space-y-1.5 bg-white dark:bg-slate-900">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                リスニング (P1〜4)
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-gray-950 dark:text-white">
                  {result.listeningRange.min}
                </span>
                <span className="text-xs text-gray-400">
                  〜 {result.listeningRange.max} 点
                </span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-slate-800/80 flex justify-between">
                <span>正答数</span>
                <span className="font-semibold text-gray-900 dark:text-gray-200">
                  {result.listeningCorrect} / {result.listeningTotal} 問
                </span>
              </div>
            </div>

            {/* Reading Section */}
            <div className="border border-gray-200 dark:border-slate-800 p-3.5 space-y-1.5 bg-white dark:bg-slate-900">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                リーディング (P5〜7)
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-gray-950 dark:text-white">
                  {result.readingRange.min}
                </span>
                <span className="text-xs text-gray-400">
                  〜 {result.readingRange.max} 点
                </span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-slate-800/80 flex justify-between">
                <span>正答数</span>
                <span className="font-semibold text-gray-900 dark:text-gray-200">
                  {result.readingCorrect} / {result.readingTotal} 問
                </span>
              </div>
            </div>
          </div>

          {/* Part-by-Part Quiet Summary */}
          <div className="border border-gray-200 dark:border-slate-800 p-3 bg-gray-50/40 dark:bg-slate-950/40">
            <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 mb-2">
              パート別正答数 (各3題出題)
            </div>
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
              {([1, 2, 3, 4, 5, 6, 7] as Part[]).map((p) => {
                const b = result.partBreakdown[p];
                const isFull = b.correct === b.total && b.total > 0;
                return (
                  <div key={p} className="p-1 border border-gray-200 dark:border-slate-800/80 bg-white dark:bg-slate-900">
                    <div className="text-[10px] text-gray-400">P{p}</div>
                    <div className={`font-semibold ${isFull ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-gray-100"}`}>
                      {b.correct}/{b.total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question Breakdown Accordion */}
          <div className="border border-gray-200 dark:border-slate-800">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="w-full py-2.5 px-3 flex items-center justify-between text-left text-xs font-mono text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-900 cursor-pointer"
            >
              <span>出題全21問の正誤を確認 ({result.correctSubQuestions} / {result.totalSubQuestions} 正解)</span>
              {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showBreakdown && result.records && (
              <div className="border-t border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto">
                {result.records.map((rec, idx) => (
                  <div key={rec.question.id} className="p-3 text-xs space-y-1.5 font-mono">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-200">
                          問{idx + 1} · {PART_NAMES[rec.question.part]}
                        </span>
                        <DifficultyBadge difficulty={rec.question.difficulty} compact={true} />
                      </div>
                      {rec.isAllCorrect ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 text-[11px]">
                          <Check size={12} />
                          <span>全正解</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 text-[11px]">
                          不正解あり
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 pl-2 border-l border-gray-200 dark:border-slate-800">
                      {rec.subResults.map((sr, sIdx) => {
                        const sq = rec.question.subQuestions[sIdx];
                        return (
                          <div key={sr.subId} className="text-[11px] flex items-center justify-between text-gray-600 dark:text-gray-400">
                            <span className="truncate max-w-[240px]">
                              {sq?.questionText ? sq.questionText : `設問 ${sIdx + 1}`}
                            </span>
                            <span className="shrink-0 font-bold">
                              {sr.isCorrect ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {sr.selectedIndex !== undefined ? String.fromCharCode(65 + sr.selectedIndex) : "-"} (正解)
                                </span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400">
                                  選択:{sr.selectedIndex !== undefined ? String.fromCharCode(65 + sr.selectedIndex) : "未"} / 正解:{String.fromCharCode(65 + sr.correctIndex)}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Bottom Actions */}
        <div className="w-full border-t border-gray-200 dark:border-slate-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/95 dark:bg-black/95 shrink-0">
          <div className="max-w-xl mx-auto grid grid-cols-2 gap-3">
            <button
              onClick={onRestart}
              className="h-12 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-semibold text-xs tracking-wider uppercase flex items-center justify-center space-x-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw size={14} />
              <span>もう一度受ける</span>
            </button>

            <button
              onClick={onExit}
              className="h-12 bg-gray-950 dark:bg-white text-white dark:text-black font-semibold text-xs tracking-wider uppercase flex items-center justify-center space-x-1.5 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <span>ホームに戻る</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TESTING VIEW - Sequential Flow Question by Question
  // -------------------------------------------------------------
  if (!currentQuestion) {
    return null;
  }

  const currentAnswers = userAnswers[currentQuestion.id] || {};
  const currentSubQuestion = currentQuestion.subQuestions[activeSubIdx] || currentQuestion.subQuestions[0];
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="w-full h-[100dvh] bg-white dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col justify-between overflow-hidden">
      {/* Top Header */}
      <header className="w-full pt-[max(0.5rem,env(safe-area-inset-top))] px-4 py-2 border-b border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-black/95 backdrop-blur-md sticky top-0 z-30 shrink-0">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="p-1.5 -ml-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white cursor-pointer"
              title="模擬テストを中断"
            >
              <X size={18} />
            </button>
            <div className="flex items-baseline space-x-2">
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                問 {currentIndex + 1} / {questions.length}
              </span>
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                {PART_NAMES[currentQuestion.part]}
              </span>
              <DifficultyBadge difficulty={currentQuestion.difficulty} compact={true} />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isListening && (
              <button
                onClick={() => {
                  const nextState = !isAudioEnabled;
                  setIsAudioEnabled(nextState);
                  if (!nextState) {
                    cancelAudio();
                    setIsPlayingAudio(false);
                  }
                }}
                className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white cursor-pointer"
                title={isAudioEnabled ? "音声ON" : "音声OFF"}
              >
                {isAudioEnabled ? (
                  <Volume2 size={16} className="text-blue-600 dark:text-blue-400" />
                ) : (
                  <VolumeX size={16} className="text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* 21-Question Segmented Progress Bar */}
        <div className="max-w-xl mx-auto grid grid-cols-[repeat(21,minmax(0,1fr))] gap-0.5 h-1 mt-2">
          {questions.map((q, idx) => {
            const isDone = userAnswers[q.id] && q.subQuestions.every((sq) => userAnswers[q.id][sq.id] !== undefined);
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={q.id}
                className={`h-full transition-colors ${
                  isCurrent
                    ? "bg-blue-600 dark:bg-blue-400"
                    : isDone
                    ? "bg-emerald-500 dark:bg-emerald-400"
                    : "bg-gray-200 dark:bg-slate-800"
                }`}
                title={`問${idx + 1} (Part ${q.part})`}
              />
            );
          })}
        </div>
      </header>

      {/* Main Question Scrollable Body */}
      <main className="max-w-xl mx-auto px-4 py-3 w-full flex-1 overflow-y-auto space-y-3">
        {/* Audio Controls for Listening Parts */}
        {isListening && (
          <div className="border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60 p-2.5 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isPlayingAudio
                    ? "bg-emerald-500 animate-ping"
                    : "bg-gray-400 dark:bg-gray-600"
                }`}
              />
              <span className="text-gray-700 dark:text-gray-300">
                {isPlayingAudio ? "音声再生中..." : "音声停止中"}
              </span>
            </div>

            <button
              onClick={playCurrentQuestionAudio}
              className="py-1 px-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs flex items-center space-x-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw size={12} />
              <span>もう一度聞く</span>
            </button>
          </div>
        )}

        {/* Part 1: Japanese Scene Description */}
        {currentQuestion.part === 1 && currentQuestion.imageDescriptionJa && (
          <div className="border border-gray-200 dark:border-slate-800 p-3 bg-gray-50/60 dark:bg-slate-900/40 text-xs text-gray-700 dark:text-gray-300">
            <span className="font-mono text-[10px] text-gray-400 uppercase block mb-1">
              [写真描写シーン]
            </span>
            <span>{currentQuestion.imageDescriptionJa}</span>
          </div>
        )}

        {/* Part 6 & 7: Reading Passage Text */}
        {(currentQuestion.part === 6 || currentQuestion.part === 7) && currentQuestion.text && (
          <div className="border border-gray-200 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-900/40 p-3.5 text-xs sm:text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-56 overflow-y-auto font-sans select-text border-l-2 border-l-blue-600 dark:border-l-blue-400">
            {currentQuestion.text}
          </div>
        )}

        {/* Part 5: Short Sentence */}
        {currentQuestion.part === 5 && currentQuestion.text && (
          <div className="p-4 border border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30 text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed font-sans">
            {currentQuestion.text}
          </div>
        )}

        {/* Multi-subQuestions Tabs (Parts 3, 4, 6, 7) */}
        {currentQuestion.subQuestions.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-1 font-mono text-xs border-b border-gray-200 dark:border-slate-800 pb-1">
              {currentQuestion.subQuestions.map((sq, idx) => {
                const isAnswered = currentAnswers[sq.id] !== undefined;
                const isActive = idx === activeSubIdx;
                return (
                  <button
                    key={sq.id}
                    onClick={() => setActiveSubIdx(idx)}
                    className={`py-1 px-3 text-xs font-semibold cursor-pointer transition-colors border ${
                      isActive
                        ? "border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                        : isAnswered
                        ? "border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                        : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    <span>設問 {idx + 1}</span>
                    {isAnswered && <Check size={11} className="inline ml-1 text-emerald-600" />}
                  </button>
                );
              })}
            </div>

            {currentSubQuestion.questionText && (
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 py-1">
                {currentSubQuestion.questionText}
              </div>
            )}
          </div>
        )}

        {/* Options Selection (A, B, C, D) */}
        <div className="space-y-2 pt-1">
          {currentSubQuestion.options.map((option, optIdx) => {
            const isSelected = currentAnswers[currentSubQuestion.id] === optIdx;
            const letter = String.fromCharCode(65 + optIdx);

            return (
              <button
                key={optIdx}
                onClick={() => handleSelectOption(currentSubQuestion.id, optIdx)}
                className={`w-full min-h-[46px] p-3 border text-left flex items-center space-x-3 transition-colors cursor-pointer ${
                  isSelected
                    ? "border-gray-950 dark:border-white bg-gray-950 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
                    : "border-gray-200 dark:border-slate-800 hover:border-gray-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200"
                }`}
              >
                <span
                  className={`w-6 h-6 shrink-0 flex items-center justify-center font-mono text-xs font-bold border ${
                    isSelected
                      ? "border-current bg-transparent text-current"
                      : "border-gray-300 dark:border-slate-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {letter}
                </span>

                <span className="text-xs sm:text-sm leading-snug break-words flex-1">
                  {currentQuestion.part === 1 || currentQuestion.part === 2
                    ? `選択肢 (${letter})`
                    : option}
                </span>
              </button>
            );
          })}
        </div>
      </main>

      {/* Bottom Sticky Navigation */}
      <footer className="w-full border-t border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-black/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 z-20">
        <div className="max-w-xl mx-auto flex items-center justify-between space-x-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`h-11 px-3 border border-gray-200 dark:border-slate-800 font-mono text-xs flex items-center space-x-1 ${
              currentIndex === 0
                ? "opacity-30 cursor-not-allowed text-gray-400"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-900 cursor-pointer"
            }`}
          >
            <ChevronLeft size={14} />
            <span>前へ</span>
          </button>

          <button
            onClick={handleNext}
            className={`h-11 flex-1 font-semibold text-xs tracking-wider uppercase flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
              isLastQuestion
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-gray-950 dark:bg-white text-white dark:text-black hover:opacity-90"
            }`}
          >
            <span>
              {isLastQuestion
                ? "テストを終了してスコア判定"
                : `次の問題へ (問 ${currentIndex + 2}/${questions.length})`}
            </span>
            <ChevronRight size={15} />
          </button>
        </div>
      </footer>

      {/* Modal: Confirm Abort / Exit */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
              <AlertCircle size={20} />
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                模擬テストを中断しますか？
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-sans">
              テストを中断してホームに戻ると、現在の回答進捗（問{currentIndex + 1}/21）は破棄されます。よろしいですか？
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="py-2.5 px-3 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer text-center"
              >
                テストを継続
              </button>
              <button
                onClick={() => {
                  cancelAudio();
                  setShowExitConfirm(false);
                  onExit();
                }}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer text-center"
              >
                中断して戻る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
