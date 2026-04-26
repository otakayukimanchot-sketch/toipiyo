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
  const [prepTimeLeft, setPrepTimeLeft] = useState(5);
  const [isPreReading, setIsPreReading] = useState(part === 1);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioStarted = useRef(false);

  useEffect(() => {
    setIsPreReading(part === 1);
    setPrepTimeLeft(5);
    audioStarted.current = false;
    setIsAudioFinished(![1, 2, 3, 4].includes(part) || !isAudioEnabled);
  }, [part, question, isAudioEnabled]);

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
    
    // Prep countdown for Part 1
    if (phase === "quiz" && part === 1 && isPreReading) {
      const prepTimer = setInterval(() => {
        setPrepTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(prepTimer);
            setIsPreReading(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(prepTimer);
    }
    
    if (phase === "quiz" && [1, 2, 3, 4].includes(part) && !audioStarted.current && isAudioEnabled && !isPreReading) {
      audioStarted.current = true;
      const playAudio = async () => {
        try {
          if (isCancelled) return;
          
          if (part === 1 && question.audioTexts) {
            // Speak options A, B, C, D
            for (let i = 0; i < question.audioTexts.length; i++) {
              if (isCancelled) break;
              // Chime only for the very first option (A)
              await speak(`${String.fromCharCode(65 + i)}`, i === 0);
              if (isCancelled) break;
              await new Promise(r => setTimeout(r, 200));
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
              // No chime for every option B, C
              await speak(`${String.fromCharCode(64 + i)}`, false);
              if (isCancelled) break;
              await new Promise(r => setTimeout(r, 200));
              if (isCancelled) break;
              await speak(question.audioTexts[i]);
              if (i < question.audioTexts.length - 1 && !isCancelled) {
                await new Promise(r => setTimeout(r, 1000));
              }
            }
          } else if ((part === 3 || part === 4) && question.audioText) {
            // Speak conversation/talk sentence by sentence with a small delay
            let sentences: string[] = [];
            if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
              const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
              sentences = Array.from(segmenter.segment(question.audioText), s => s.segment.trim());
            } else {
              // Fallback for environments without Intl.Segmenter
              sentences = question.audioText.match(/[^.!?]+[.!?]+(?:\s|$)/g)?.map(s => s.trim()) || [question.audioText];
            }
            
            for (let i = 0; i < sentences.length; i++) {
              if (isCancelled) break;
              // Only play chime on the first sentence
              await speak(sentences[i].trim(), i === 0);
              if (i < sentences.length - 1 && !isCancelled) {
                // Add a small pause between sentences (0.5 seconds)
                await new Promise(r => setTimeout(r, 500));
              }
            }
            
            if (isCancelled) return;
            // Short pause before reading questions
            await new Promise(r => setTimeout(r, 1500));
            
            // Speak questions and their options
            for (let i = 0; i < question.subQuestions.length; i++) {
              if (isCancelled) break;
              
              const sq = question.subQuestions[i];
              if (sq.questionText) {
                // Chime for the first sub-question
                await speak(`${i + 1}`, i === 0);
                if (isCancelled) break;
                await new Promise(r => setTimeout(r, 200));
                if (isCancelled) break;
                await speak(sq.questionText);
              }
              
              for (let j = 0; j < sq.options.length; j++) {
                if (isCancelled) break;
                await speak(`${String.fromCharCode(65 + j)}`, false);
                if (isCancelled) break;
                await new Promise(r => setTimeout(r, 200));
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
  }, [phase, part, question, isPreReading, isAudioEnabled]);

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-center"
        >
          <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black uppercase tracking-widest mb-2">
            Part {part}
          </span>
          <h2 className="text-2xl font-black text-gray-800 dark:text-slate-100 tracking-tight">
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
      <div className="flex flex-col min-h-full p-4 pb-24 bg-slate-50 dark:bg-slate-900">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={handleCancel} 
            className="px-4 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-full font-bold text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1"
          >
            <ArrowLeft size={16} />
            <span>中断</span>
          </button>
          <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-1 rounded-full">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className={`font-mono font-bold ${timeLeft <= 5 && isAudioFinished ? "text-red-500" : "text-blue-500"}`}>
              {!isAudioFinished ? "--" : timeLeft}s
            </span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Preparation Countdown for Part 1 */}
          {part === 1 && isPreReading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-blue-500 text-white rounded-2xl shadow-xl flex flex-col items-center justify-center space-y-4 text-center"
            >
              <Volume2 className="w-12 h-12 animate-pulse" />
              <div>
                <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Preparation</p>
                <h3 className="text-2xl font-black">音声再生まで {prepTimeLeft}...</h3>
              </div>
              <div className="w-full bg-blue-400 h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  className="h-full bg-white"
                />
              </div>
            </motion.div>
          )}

          {/* Audio Status Overlay during Quiz */}
          {[1, 2, 3, 4].includes(part) && (
            <div className={`flex items-center justify-center space-x-3 p-3 rounded-xl border ${!isAudioEnabled ? "bg-gray-50 border-gray-100 dark:bg-slate-800/50 dark:border-slate-700" : "bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30"}`}>
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
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Audio Playing...</span>
                  <button
                    onClick={() => {
                      cancelAudio();
                      setTimeout(() => {
                        audioStarted.current = false;
                        setIsAudioFinished(false);
                      }, 100);
                    }}
                    className="ml-auto p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
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
                      cancelAudio();
                      setTimeout(() => {
                        audioStarted.current = false;
                        setIsAudioFinished(false);
                      }, 100);
                    }}
                    className="ml-auto p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
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
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300 font-medium">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Scene Description</p>
              {question.imageDescriptionJa}
            </div>
          )}
          
          {question.text && (
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 text-gray-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {question.text}
            </div>
          )}

          {/* Sub Questions */}
          {question.subQuestions.map((sq, sqIdx) => (
            <div key={sq.id} className="space-y-3">
              {sq.questionText && (
                <p className="font-bold text-lg text-gray-800 dark:text-slate-100">
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
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400 font-bold"
                          : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-900"
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
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={handleConfirm}
            disabled={Object.keys(selectedAnswers).length < question.subQuestions.length}
            className="w-full py-4 bg-blue-500 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
          >
            回答を確定する
          </button>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50 dark:bg-slate-900">
        <h2 className={`text-5xl font-black mb-2 font-cute ${isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {isCorrect ? "正解！" : "不正解..."}
        </h2>
        <p className="text-gray-500 dark:text-slate-400 mb-6 font-medium">
          {isCorrect ? "素晴らしい！その調子です。" : "残念。次は頑張りましょう。"}
        </p>

        <div className="w-full max-w-sm mb-10 space-y-3 text-left">
          {question.text && (
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 text-gray-800 dark:text-slate-200 mb-4 text-xs whitespace-pre-wrap leading-relaxed">
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 pb-1 border-b dark:border-slate-700">Problem Text</p>
              {question.text}
            </div>
          )}
          
          {question.subQuestions.map((sq, i) => {
            const userChoice = selectedAnswers[sq.id];
            const isSubCorrect = userChoice === sq.correctIndex;
            return (
              <div key={sq.id} className={`p-4 rounded-2xl border-2 transition-all ${isSubCorrect ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30" : "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30"}`}>
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
                  <p className={`text-sm font-bold mb-2 ${isSubCorrect ? "text-green-900 dark:text-green-300" : "text-red-900 dark:text-red-300"}`}>
                    {sq.questionText}
                  </p>
                )}

                <div className="space-y-1">
                  <div className="flex items-start">
                    <span className={`font-bold mr-2 shrink-0 ${isSubCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                      正解:
                    </span>
                    <span className={`font-bold mr-2 shrink-0 ${isSubCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                      ({String.fromCharCode(65 + sq.correctIndex)})
                    </span>
                    <span className={`text-sm ${isSubCorrect ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
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

        <div className="w-full max-w-xs space-y-4 pb-12">
          {!isCorrect && (
            <button
              onClick={() => {
                setPhase("countdown");
                setTimeLeft(PART_TIMERS[part]);
                setSelectedAnswers({});
                setIsConfirmed(false);
                audioStarted.current = false;
                setPrepTimeLeft(5);
                setIsPreReading(part === 1);
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
            onClick={() => {
              setPrepTimeLeft(5);
              setIsPreReading(part === 1);
              onRetry();
            }}
            className="w-full py-4 bg-blue-50 dark:bg-blue-900/10 text-blue-500 dark:text-blue-400 rounded-2xl font-bold text-lg shadow-sm border border-blue-100 dark:border-blue-900/30 flex items-center justify-center space-x-2"
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
              isSaved ? "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500" : "bg-white dark:bg-slate-800 border-2 border-blue-500 text-blue-500"
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
            className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2"
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
