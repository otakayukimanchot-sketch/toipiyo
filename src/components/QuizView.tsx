import React, { useState, useEffect, useRef } from "react";
import { Part, Question, SubQuestion } from "../types";
import { speak, speakMultiple } from "../utils/audio";
import { motion, AnimatePresence } from "motion/react";
import { Clock, CheckCircle, XCircle, ChevronRight, Home, ArrowLeft, RotateCcw, Volume2 } from "lucide-react";

interface QuizViewProps {
  part: Part;
  question: Question;
  onComplete: (isCorrect: boolean) => void;
  onCancel: () => void;
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

const QuizView: React.FC<QuizViewProps> = ({ part, question, onComplete, onCancel }) => {
  const [phase, setPhase] = useState<"countdown" | "quiz" | "result">("countdown");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(PART_TIMERS[part]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isAudioFinished, setIsAudioFinished] = useState(![1, 2, 3, 4].includes(part));
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioStarted = useRef(false);

  // Countdown logic
  useEffect(() => {
    if (phase === "countdown") {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setPhase("quiz");
      }
    }
  }, [countdown, phase]);

  // Audio logic
  useEffect(() => {
    if (phase === "quiz" && [1, 2, 3, 4].includes(part) && !audioStarted.current) {
      audioStarted.current = true;
      const playAudio = async () => {
        try {
          if (part === 1 && question.audioTexts) {
            // Speak options A, B, C, D
            const textsToSpeak = question.audioTexts.map((t, i) => `Option ${String.fromCharCode(65 + i)}. ${t}`);
            await speakMultiple(textsToSpeak);
          } else if (part === 2 && question.audioTexts) {
            // Speak question, then options A, B, C
            await speak(question.audioTexts[0]);
            await new Promise(r => setTimeout(r, 500));
            const optionsToSpeak = question.audioTexts.slice(1).map((t, i) => `Option ${String.fromCharCode(65 + i)}. ${t}`);
            await speakMultiple(optionsToSpeak);
          } else if ((part === 3 || part === 4) && question.audioText) {
            // Speak conversation/talk
            await speak(question.audioText);
            
            // Speak questions and their options
            for (let i = 0; i < question.subQuestions.length; i++) {
              const sq = question.subQuestions[i];
              if (sq.questionText) {
                await speak(`Question ${i + 1}. ${sq.questionText}`);
              }
              const optionsToSpeak = sq.options.map((opt, j) => `Option ${String.fromCharCode(65 + j)}. ${opt}`);
              await speakMultiple(optionsToSpeak);
            }
          }
          
          // Wait 1 second after audio ends before starting timer
          setTimeout(() => setIsAudioFinished(true), 1000);
        } catch (err) {
          console.error(err);
          setError("音声の再生に失敗しました");
        }
      };
      playAudio();
    }
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
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    setIsConfirmed(true);
    
    // Check if all answers are correct
    const allCorrect = question.subQuestions.every(
      (sq) => selectedAnswers[sq.id] === sq.correctIndex
    );
    
    setIsCorrect(allCorrect);
    setPhase("result");
  };

  const handleCancel = () => {
    window.speechSynthesis.cancel();
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
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          key={countdown}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          className="text-8xl font-black text-blue-500"
        >
          {countdown}
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
          {[1, 2, 3, 4].includes(part) && !isAudioFinished && (
            <div className="flex items-center justify-center space-x-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
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
                      {opt}
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

        <div className={`w-full max-w-xs mb-10 p-4 rounded-2xl border text-left ${isCorrect ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isCorrect ? "text-green-400" : "text-red-400"}`}>
            {isCorrect ? "Review" : "Correct Answer"}
          </p>
          {question.text && (
            <p className={`text-xs font-bold mb-3 pb-2 border-b ${isCorrect ? "text-green-800 border-green-100" : "text-red-800 border-red-100"}`}>
              {question.text}
            </p>
          )}
          {question.subQuestions.map((sq, i) => (
            <div key={sq.id} className="mb-3 last:mb-0">
              {sq.questionText && (
                <p className={`text-xs font-bold mb-1 ${isCorrect ? "text-green-800" : "text-red-800"}`}>
                  Q{i+1}: {sq.questionText}
                </p>
              )}
              <div className="flex items-start">
                <span className={`font-bold mr-2 shrink-0 ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                  ({String.fromCharCode(65 + sq.correctIndex)})
                </span>
                <span className={`text-sm ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                  {sq.options[sq.correctIndex]}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full max-w-xs space-y-4">
          {!isCorrect && (
            <button
              onClick={() => {
                setPhase("countdown");
                setCountdown(3);
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
            onClick={handleCancel}
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
