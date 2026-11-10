import React, { useState } from "react";
import { ReviewItem, Question, Part, DifficultyLevel } from "../types";
import { GRAMMAR_CATEGORIES, getQuestionGrammarCategory, GrammarCategoryInfo } from "../utils/grammarCategories";
import { getGrammarStats, resetGrammarStats, removeReviewItem } from "../utils/storage";
import DifficultyBadge from "./DifficultyBadge";
import { 
  Tag, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Trash2, 
  ChevronRight, 
  BarChart3, 
  ListFilter, 
  Sparkles,
  Info
} from "lucide-react";

interface ReviewPageProps {
  reviewItems: ReviewItem[];
  onStartQuiz: (question: Question) => void;
  onRefreshReviewItems: () => void;
  onUnlockAudio: () => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({
  reviewItems,
  onStartQuiz,
  onRefreshReviewItems,
  onUnlockAudio,
}) => {
  const [subTab, setSubTab] = useState<"grammar_stats" | "review_list">("grammar_stats");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | "all">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | "all">("all");

  const grammarStats = getGrammarStats();

  // Aggregate stats across all known grammar categories
  // Combine both historical recorded attempts and current review queue items
  const categoryStatsList = Object.values(GRAMMAR_CATEGORIES).map((cat) => {
    const recorded = grammarStats[cat.id] || { incorrectCount: 0, totalAttempts: 0 };
    
    // Count currently queued review items matching this category
    const queuedCount = reviewItems.filter((item) => {
      const qCat = getQuestionGrammarCategory(item.question);
      return qCat.id === cat.id;
    }).length;

    // The total mistakes is the maximum of historical recorded incorrect or current queue count
    const mistakes = Math.max(recorded.incorrectCount, queuedCount);
    const attempts = Math.max(recorded.totalAttempts, mistakes);
    const accuracy = attempts > 0 ? Math.round(((attempts - mistakes) / attempts) * 100) : null;

    return {
      category: cat,
      mistakes,
      attempts,
      queuedCount,
      accuracy,
      lastMistakeDate: recorded.lastMistakeDate,
    };
  });

  // Calculate overall grammar totals
  const totalGrammarMistakes = categoryStatsList.reduce((acc, curr) => acc + curr.mistakes, 0);
  const totalGrammarAttempts = categoryStatsList.reduce((acc, curr) => acc + curr.attempts, 0);
  const overallAccuracy = totalGrammarAttempts > 0 
    ? Math.round(((totalGrammarAttempts - totalGrammarMistakes) / totalGrammarAttempts) * 100)
    : null;

  // Find weakest grammar categories (highest mistake count > 0)
  const weakCategories = [...categoryStatsList]
    .filter(c => c.mistakes > 0)
    .sort((a, b) => b.mistakes - a.mistakes);

  const maxMistakes = Math.max(1, ...categoryStatsList.map(c => c.mistakes));

  // Filter review items if user clicked a specific tag or difficulty
  const filteredReviewItems = reviewItems.filter(item => {
    const matchCategory = selectedCategoryFilter === "all" || getQuestionGrammarCategory(item.question).id === selectedCategoryFilter;
    const matchDiff = difficultyFilter === "all" || item.question.difficulty === difficultyFilter;
    return matchCategory && matchDiff;
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Sub-navigation Tabs: 文法別弱点分析 vs 復習キュー */}
      <div className="grid grid-cols-2 border-b border-gray-200 dark:border-slate-800 shrink-0 text-xs font-mono bg-gray-50/50 dark:bg-slate-900/50">
        <button
          onClick={() => setSubTab("grammar_stats")}
          className={`py-2 px-3 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
            subTab === "grammar_stats"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-black"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <BarChart3 size={13} />
          <span>文法別・弱点分析</span>
          {totalGrammarMistakes > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 bg-rose-500 text-white rounded-full">
              {totalGrammarMistakes}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab("review_list")}
          className={`py-2 px-3 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border-b-2 ${
            subTab === "review_list"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-black"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <ListFilter size={13} />
          <span>復習問題リスト</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-full font-mono">
            {reviewItems.length}
          </span>
        </button>
      </div>

      {/* SUB-VIEW 1: GRAMMAR CATEGORY STATS (文法別ミス分析) */}
      {subTab === "grammar_stats" && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
          {/* Summary Metric Header Card */}
          <div className="p-3.5 border border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-950/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold flex items-center space-x-1.5">
                <BarChart3 size={12} className="text-blue-500" />
                <span>文法別エラー分析レポート (端末内ローカル集計)</span>
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                Part 5 短文穴埋め
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-200 dark:border-slate-800 text-center font-mono">
              <div>
                <div className="text-[10px] text-gray-400">総ミス数</div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {totalGrammarMistakes} <span className="text-xs font-normal">問</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400">演習総数</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {totalGrammarAttempts} <span className="text-xs font-normal">問</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400">正答率</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {overallAccuracy !== null ? `${overallAccuracy}%` : "-"}
                </div>
              </div>
            </div>

            {/* Quick alert badge if there are weak points */}
            {weakCategories.length > 0 && (
              <div className="pt-1.5 text-xs text-rose-700 dark:text-rose-300 flex items-center space-x-1.5 font-medium">
                <AlertTriangle size={13} className="shrink-0 text-rose-500" />
                <span className="truncate">
                  最優先補強: <strong>{weakCategories[0].category.shortName}</strong> ({weakCategories[0].mistakes}回ミス)
                </span>
              </div>
            )}
          </div>

          {/* Grammar Categories Breakdown Table / Progress Bars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 px-0.5">
              <span>文法単元別・誤答数内訳</span>
              <span>ミス回数 / 割合</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800/80 border border-gray-200 dark:border-slate-800 bg-white dark:bg-black">
              {categoryStatsList.map(({ category, mistakes, attempts, queuedCount, accuracy }) => {
                const percentage = maxMistakes > 0 ? (mistakes / maxMistakes) * 100 : 0;
                const isSelected = selectedCategoryFilter === category.id;

                return (
                  <div
                    key={category.id}
                    className="p-3 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 text-[10px] font-mono border ${category.badgeColor.bg} ${category.badgeColor.text} ${category.badgeColor.border} ${category.badgeColor.darkBg} ${category.badgeColor.darkText} ${category.badgeColor.darkBorder}`}>
                            <Tag size={9} />
                            <span>{category.shortName}</span>
                          </span>
                          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {category.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 pt-0.5 line-clamp-1">
                          {category.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          {mistakes} <span className="text-[10px] font-normal text-gray-400">ミス</span>
                        </div>
                        {accuracy !== null && (
                          <div className="text-[10px] text-gray-400">
                            正答率 {accuracy}%
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visual Progress/Mistake Bar */}
                    <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          mistakes === 0 
                            ? "bg-emerald-500" 
                            : mistakes >= 3 
                            ? "bg-rose-500" 
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.max(mistakes === 0 ? 0 : 8, percentage)}%` }}
                      />
                    </div>

                    {/* Action button: filter queued items or practice */}
                    <div className="flex items-center justify-between pt-0.5 text-[11px] font-mono">
                      <span className="text-gray-400">
                        {queuedCount > 0 ? `復習キューに${queuedCount}問あります` : "ストックなし"}
                      </span>
                      {queuedCount > 0 ? (
                        <button
                          onClick={() => {
                            setSelectedCategoryFilter(category.id);
                            setSubTab("review_list");
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-0.5 cursor-pointer font-medium"
                        >
                          <span>この単元の問題を復習 ({queuedCount})</span>
                          <ChevronRight size={12} />
                        </button>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-0.5 text-[10px]">
                          <CheckCircle2 size={11} />
                          <span>安定</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guide tip box */}
          <div className="p-3 border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-300 flex items-start space-x-2">
            <Info size={14} className="shrink-0 mt-0.5 text-blue-600" />
            <div className="leading-relaxed text-[11px]">
              Part 5（短文穴埋め問題）を解くたびに、文法単元別の正誤が自動蓄積されます。ミス回数が多い単元を集中的に対策することで、スコアのボトルネックを最短で解消できます。
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: REVIEW QUESTIONS LIST (復習問題一覧) */}
      {subTab === "review_list" && (
        <div className="flex-1 min-h-0 flex flex-col p-3 space-y-2.5">
          {/* Difficulty Filter Bar */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0 text-xs font-mono">
            <span className="text-[10px] text-gray-400 font-sans shrink-0">難度:</span>
            <button
              onClick={() => setDifficultyFilter("all")}
              className={`px-2 py-0.5 shrink-0 border cursor-pointer transition-colors ${
                difficultyFilter === "all"
                  ? "bg-gray-950 dark:bg-white text-white dark:text-black border-transparent font-bold"
                  : "bg-white dark:bg-black border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400"
              }`}
            >
              全難度
            </button>
            <button
              onClick={() => setDifficultyFilter(1)}
              className={`px-2 py-0.5 shrink-0 border cursor-pointer transition-colors ${
                difficultyFilter === 1
                  ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                  : "bg-white dark:bg-black border-gray-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              ★☆☆ 基礎
            </button>
            <button
              onClick={() => setDifficultyFilter(2)}
              className={`px-2 py-0.5 shrink-0 border cursor-pointer transition-colors ${
                difficultyFilter === 2
                  ? "bg-blue-600 text-white border-blue-600 font-bold"
                  : "bg-white dark:bg-black border-gray-200 dark:border-slate-800 text-blue-600 dark:text-blue-400"
              }`}
            >
              ★★☆ 標準
            </button>
            <button
              onClick={() => setDifficultyFilter(3)}
              className={`px-2 py-0.5 shrink-0 border cursor-pointer transition-colors ${
                difficultyFilter === 3
                  ? "bg-amber-600 text-white border-amber-600 font-bold"
                  : "bg-white dark:bg-black border-gray-200 dark:border-slate-800 text-amber-600 dark:text-amber-400"
              }`}
            >
              ★★★ 難関
            </button>
          </div>

          {/* Grammar Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0 text-xs font-mono">
            <span className="text-[10px] text-gray-400 font-sans shrink-0">単元:</span>
            <button
              onClick={() => setSelectedCategoryFilter("all")}
              className={`px-2.5 py-0.5 shrink-0 border cursor-pointer transition-colors ${
                selectedCategoryFilter === "all"
                  ? "bg-gray-950 dark:bg-white text-white dark:text-black border-transparent font-bold"
                  : "bg-white dark:bg-black border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400"
              }`}
            >
              すべて ({reviewItems.length})
            </button>
            {Object.values(GRAMMAR_CATEGORIES).map((cat) => {
              const count = reviewItems.filter(item => getQuestionGrammarCategory(item.question).id === cat.id).length;
              if (count === 0 && selectedCategoryFilter !== cat.id) return null;
              const isSelected = selectedCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`px-2 py-0.5 shrink-0 border cursor-pointer transition-colors flex items-center space-x-1 ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 font-bold"
                      : "bg-white dark:bg-black border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <span>{cat.shortName}</span>
                  <span className="text-[10px] px-1 bg-black/10 dark:bg-white/20 rounded-full font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* List Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filteredReviewItems.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-gray-400 space-y-2">
                <p>該当する復習問題はありません</p>
                <p className="text-[11px]">演習でミスした問題が自動的にストックされます</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800/80 border border-gray-200 dark:border-slate-800 bg-white dark:bg-black">
                {filteredReviewItems.map((item) => {
                  const cat = getQuestionGrammarCategory(item.question);
                  return (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-2.5">
                      <button
                        onClick={() => {
                          onUnlockAudio();
                          onStartQuiz(item.question);
                        }}
                        className="flex-1 text-left min-w-0 group cursor-pointer space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold shrink-0">
                            PART {item.question.part}
                          </span>
                          <DifficultyBadge difficulty={item.question.difficulty} compact={true} />
                          <span className={`inline-flex items-center space-x-1 px-1.5 py-0.2 text-[9px] font-mono border ${cat.badgeColor.bg} ${cat.badgeColor.text} ${cat.badgeColor.border} ${cat.badgeColor.darkBg} ${cat.badgeColor.darkText} ${cat.badgeColor.darkBorder}`}>
                            <Tag size={8} />
                            <span>{cat.shortName}</span>
                          </span>
                        </div>
                        <p className="text-xs text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 transition-colors">
                          {item.question.text || item.question.imageDescriptionJa || "音声リスニング問題"}
                        </p>
                      </button>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => {
                            onUnlockAudio();
                            onStartQuiz(item.question);
                          }}
                          className="px-2.5 py-1 bg-gray-950 dark:bg-white text-white dark:text-black text-xs font-mono font-medium hover:opacity-90 cursor-pointer flex items-center space-x-1"
                        >
                          <span>解く</span>
                          <ChevronRight size={12} />
                        </button>
                        <button
                          onClick={() => {
                            removeReviewItem(item.id);
                            onRefreshReviewItems();
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-600 cursor-pointer"
                          aria-label="削除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewPage;
