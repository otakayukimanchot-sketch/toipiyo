import React, { useState, useEffect, useRef } from "react";
import { Part, Question, SubQuestion } from "../types";
import { speak, speakMultiple, unlockAudio, cancelAudio, playChime } from "../utils/audio";
import { saveIncorrectQuestion } from "../utils/storage";
import { motion, AnimatePresence } from "motion/react";
import { Clock, CheckCircle, XCircle, ChevronRight, Home, ArrowLeft, RotateCcw, Volume2, VolumeX, Save } from "lucide-react";

interface QuizViewProps {
  part: Part;
  question: Question;
  onComplete: (isCorrect: boolean) => void;
  onRetry: () => void;
  onCancel: () => void;
  isAudioEnabled: boolean;
}

const PART_TIMERS: Record<Part, number> = {
  1: 5,
  2: 5,
  3: 8,
  4: 8,
  5: 20,
  6: 40,
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

const QuizView: React.FC<QuizViewProps> = ({ part, question, onComplete, onRetry, onCancel, isAudioEnabled }) => {
  const [phase, setPhase] = useState<"countdown" | "quiz" | "result">("countdown");
  const [timeLeft, setTimeLeft] = useState(PART_TIMERS[part]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isAudioFinished, setIsAudioFinished] = useState(![1, 2, 3, 4].includes(part) || !isAudioEnabled);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioStarted = useRef(false);

  // Countdown logic
  useEffect(() => {
    if (phase === "countdown") {
      // Small unlock attempt during countdown in case the initial one failed
      const unlock = () => unlockAudio();
      window.addEventListener('touchstart', unlock, { once: true });
      window.addEventListener('click', unlock, { once: true });

      const timer = setTimeout(() => {
        setPhase("quiz");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Audio logic
  useEffect(() => {
    let isCancelled = false;
    
    if (phase === "quiz" && [1, 2, 3, 4].includes(part) && !audioStarted.current && isAudioEnabled) {
      audioStarted.current = true;
      const playAudio = async () => {
        try {
          if (isCancelled) return;
          
          if (part === 1 && question.audioTexts) {
            // Speak options A, B, C, D
            for (let i = 0; i < question.audioTexts.length; i++) {
              if (isCancelled) break;
              await speak(`${String.fromCharCode(65 + i)}`, true);
              if (isCancelled) break;
              await new Promise(r => setTimeout(r, 2500));
              if (isCancelled) break;
              await speak(question.audioTexts[i]);
              if (i < question.audioTexts.length - 1 && !isCancelled) {
                await new Promise(r => setTimeout(r, 1000));
              }
            }
          } else if (part === 2 && question.audioTexts) {
            // Speak question, then options A, B, C
            await speak(question.audioTexts[0], true);
            if (isCancelled) return;
            await new Promise(r => setTimeout(r, 1000));
            
            for (let i = 1; i < question.audioTexts.length; i++) {
              if (isCancelled) break;
              await speak(`${String.fromCharCode(64 + i)}`, true);
              if (isCancelled) break;
              await new Promise(r => setTimeout(r, 2500));
              if (isCancelled) break;
              await speak(question.audioTexts[i]);
              if (i < question.audioTexts.length - 1 && !isCancelled) {
                await new Promise(r => setTimeout(r, 1000));
              }
            }
          } else if ((part === 3 || part === 4) && question.audioText) {
            // Speak conversation/talk
            await speak(question.audioText, true);
            
            // Speak questions and their options
            for (let i = 0; i < question.subQuestions.length; i++) {
              if (isCancelled) break;
              
              // Chime before each new question
              // (Removed duplicate call here as it's handled by speak withChime: true below)
              
              const sq = question.subQuestions[i];
              if (sq.questionText) {
                await speak(`${i + 1}`, true);
                if (isCancelled) break;
                await new Promise(r => setTimeout(r, 2500));
                if (isCancelled) break;
                await speak(sq.questionText);
              }
              
              for (let j = 0; j < sq.options.length; j++) {
                if (isCancelled) break;
                await speak(`${String.fromCharCode(65 + j)}`, true);
                if (isCancelled) break;
                await new Promise(r => setTimeout(r, 2500));
                if (isCancelled) break;
                await speak(sq.options[j]);
                if (j < sq.options.length - 1 && !isCancelled) {
                  await new Promise(r => setTimeout(r, 1000));
                }
              }
              if (i < question.subQuestions.length - 1 && !isCancelled) {
                await new Promise(r => setTimeout(r, 1000));
              }
            }
          }
          
          if (!isCancelled) {
            setTimeout(() => {
              if (!isCancelled) setIsAudioFinished(true);
            }, 1000);
          }
        } catch (err) {
          console.error(err);
          if (!isCancelled) setIsAudioFinished(true);
        }
      };
      playAudio();
    }

    return () => {
      isCancelled = true;
      cancelAudio();
    };
  }, [phase, part, question]);

  // Timer logic
  useEffect(() => {
    if (phase === "quiz" && isAudioFinished && !isConfirmed) {
      if (timeLeft > 0) {
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => {
          if (timerRef.current) clearInterval(timerRef.current);
        };
      } else {
        // Time's up
        handleConfirm();
      }
    }
  }, [phase, isAudioFinished, timeLeft, isConfirmed]);

  const handleSelect = (subQuestionId: string, index: number) => {
    if (isConfirmed) return;
    setSelectedAnswers((prev) => ({ ...prev, [subQuestionId]: index }));
  };

  const handleConfirm = () => {
    if (isConfirmed) return;
    if (timerRef.current) clearInterval(timerRef.current);
    // Stop all ongoing audio playback
    cancelAudio();
    
    setIsConfirmed(true);
    
    // Check if all answers are correct
    const allCorrect = question.subQuestions.every(
      (sq) => selectedAnswers[sq.id] === sq.correctIndex
    );
    
    setIsCorrect(allCorrect);
    setPhase("result");
  };

  const handleCancel = () => {
    cancelAudio();
    onCancel();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <XCircle className="text-red-500 w-16 h-16 mb-4" />
        <p className="text-xl font-bold text-gray-800 mb-4">{error}</p>
        <button
          onClick={handleCancel}
          className="px-6 py-2 bg-blue-500 text-white rounded-full font-bold shadow-lg"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  if (phase === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-center"
        >
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest mb-2">
            Part {part}
          </span>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">
            {PART_LABELS[part]}
          </h2>
        </motion.div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.1, opacity: 1 }}
          exit={{ scale: 1.3, opacity: 0 }}
          className="text-6xl font-black text-blue-500 italic tracking-wider"
        >
          READY...
        </motion.div>
      </div>
    );
  }

  if (phase === "quiz") {
    return (
      <div className="flex flex-col min-h-full p-4 pb-24">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={handleCancel} 
            className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors flex items-center space-x-1"
          >
            <ArrowLeft size={16} />
            <span>中断</span>
          </button>
          <div className="flex items-center space-x-2 bg-blue-50 px-4 py-1 rounded-full">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className={`font-mono font-bold ${timeLeft <= 5 && isAudioFinished ? "text-red-500" : "text-blue-500"}`}>
              {!isAudioFinished ? "--" : timeLeft}s
            </span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Audio Status Overlay during Quiz */}
          {[1, 2, 3, 4].includes(part) && (
            <div className={`flex items-center justify-center space-x-3 p-3 rounded-xl border ${!isAudioEnabled ? "bg-gray-50 border-gray-100" : "bg-blue-50 border-blue-100"}`}>
              {!isAudioEnabled ? (
                <>
                  <VolumeX size={16} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Audio Disabled</span>
                </>
              ) : !isAudioFinished ? (
                <>
                  <div className="flex space-x-1">
                    <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-blue-500 rounded-full" />
                    <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-1 bg-blue-500 rounded-full" />
                    <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1 bg-blue-500 rounded-full" />
                  </div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Audio Playing...</span>
                  <button
                    onClick={() => {
                      audioStarted.current = false;
                      setIsAudioFinished(false);
                    }}
                    className="ml-auto p-1 text-blue-400 hover:text-blue-600"
                    title="Replay"
                  >
                    <Volume2 size={16} />
                  </button>
                </>
              ) : (
                <>
                  <Volume2 size={16} className="text-blue-500" />
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Audio Finished</span>
                  <button
                    onClick={() => {
                      audioStarted.current = false;
                      setIsAudioFinished(false);
                    }}
                    className="ml-auto p-1 text-blue-400 hover:text-blue-600"
                    title="Replay"
                  >
                    <Volume2 size={16} />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Question Content */}
          {question.image && (
            <img
              src={question.image}
              alt="Question"
              className="w-full rounded-xl shadow-md object-cover max-h-64"
              referrerPolicy="no-referrer"
            />
          )}

          {question.imageDescriptionJa && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-800 font-medium">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Scene Description</p>
              {question.imageDescriptionJa}
            </div>
          )}
          
          {question.text && (
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-800 whitespace-pre-wrap leading-relaxed">
              {question.text}
            </div>
          )}

          {/* Sub Questions */}
          {question.subQuestions.map((sq, sqIdx) => (
            <div key={sq.id} className="space-y-3">
              {sq.questionText && (
                <p className="font-bold text-lg text-gray-800">
                  {question.subQuestions.length > 1 ? `${sqIdx + 1}. ` : ""}{sq.questionText}
                </p>
              )}
              <div className="grid gap-2">
                {sq.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[sq.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelect(sq.id, optIdx)}
                      className={`p-4 text-left rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? "bg-blue-50 border-blue-500 text-blue-700 font-bold"
                          : "bg-white border-gray-100 text-gray-600 hover:border-blue-200"
                      }`}
                    >
                      <span className="inline-block w-8 font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                      {part === 1 ? "" : opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Action */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100">
          <button
            onClick={handleConfirm}
            disabled={Object.keys(selectedAnswers).length < question.subQuestions.length}
            className="w-full py-4 bg-blue-500 disabled:bg-gray-300 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
          >
            回答を確定する
          </button>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <h2 className={`text-5xl font-black mb-2 font-cute ${isCorrect ? "text-green-600" : "text-red-600"}`}>
          {isCorrect ? "正解！" : "不正解..."}
        </h2>
        <p className="text-gray-500 mb-6 font-medium">
          {isCorrect ? "素晴らしい！その調子です。" : "残念。次は頑張りましょう。"}
        </p>

        <div className="w-full max-w-sm mb-10 space-y-3 text-left">
          {question.text && (
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-800 mb-4 text-xs whitespace-pre-wrap leading-relaxed">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 pb-1 border-b">Problem Text</p>
              {question.text}
            </div>
          )}
          
          {question.subQuestions.map((sq, i) => {
            const userChoice = selectedAnswers[sq.id];
            const isSubCorrect = userChoice === sq.correctIndex;
            return (
              <div key={sq.id} className={`p-4 rounded-2xl border-2 transition-all ${isSubCorrect ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    {isSubCorrect ? (
                      <CheckCircle size={18} className="text-green-500" />
                    ) : (
                      <XCircle size={18} className="text-red-500" />
                    )}
                    <span className={`text-xs font-black px-2 py-0.5 rounded-md ${isSubCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                      {isSubCorrect ? "正解" : "不正解"}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">Q{i + 1}</span>
                </div>

                {sq.questionText && (
                  <p className={`text-sm font-bold mb-2 ${isSubCorrect ? "text-green-900" : "text-red-900"}`}>
                    {sq.questionText}
                  </p>
                )}

                <div className="space-y-1">
                  <div className="flex items-start">
                    <span className={`font-bold mr-2 shrink-0 ${isSubCorrect ? "text-green-700" : "text-red-700"}`}>
                      正解:
                    </span>
                    <span className={`font-bold mr-2 shrink-0 ${isSubCorrect ? "text-green-700" : "text-red-700"}`}>
                      ({String.fromCharCode(65 + sq.correctIndex)})
                    </span>
                    <span className={`text-sm ${isSubCorrect ? "text-green-600" : "text-red-600"}`}>
                      {sq.options[sq.correctIndex]}
                    </span>
                  </div>

                  {!isSubCorrect && (
                    <div className="flex items-start opacity-70">
                      <span className="text-red-400 font-bold mr-2 shrink-0">あなたの回答:</span>
                      <span className="text-red-400 font-bold mr-2 shrink-0">({String.fromCharCode(65 + userChoice)})</span>
                      <span className="text-sm text-red-400">
                        {sq.options[userChoice] || "未回答"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="w-full max-w-xs space-y-4">
          {!isCorrect && (
            <button
              onClick={() => {
                setPhase("countdown");
                setTimeLeft(PART_TIMERS[part]);
                setSelectedAnswers({});
                setIsConfirmed(false);
                audioStarted.current = false;
              }}
              className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>もう一度挑戦する</span>
            </button>
          )}
          {part < 7 ? (
            <button
              onClick={() => onComplete(isCorrect)}
              className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2"
            >
              <span>次のPartに進む</span>
              <ChevronRight />
            </button>
          ) : (
            <button
              onClick={() => onComplete(isCorrect)}
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2"
            >
              <span>次のPartに進む (Part 1)</span>
              <ChevronRight />
            </button>
          )}

          <button
            onClick={onRetry}
            className="w-full py-4 bg-blue-50 text-blue-500 rounded-2xl font-bold text-lg shadow-sm border border-blue-100 flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>同じパートを練習する</span>
          </button>
          
          <button
            onClick={() => {
              saveIncorrectQuestion(question);
              setIsSaved(true);
            }}
            disabled={isSaved}
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2 transition-colors ${
              isSaved ? "bg-gray-200 text-gray-400" : "bg-white border-2 border-blue-500 text-blue-500"
            }`}
          >
            <Save className="w-5 h-5" />
            <span>{isSaved ? "保存済み" : "復習リストに保存"}</span>
          </button>
          
          <button
            onClick={() => {
              if (isCorrect) {
                onComplete(true);
              } else {
                handleCancel();
              }
            }}
            className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2"
          >
            <Home className="w-5 h-5" />
            <span>ホームに戻る</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default QuizView;
