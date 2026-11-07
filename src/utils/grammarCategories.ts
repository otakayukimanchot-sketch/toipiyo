import { Question } from "../types";

export interface GrammarCategoryInfo {
  id: string;
  name: string;
  shortName: string;
  description: string;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
    darkBg: string;
    darkText: string;
    darkBorder: string;
  };
}

export const GRAMMAR_CATEGORIES: Record<string, GrammarCategoryInfo> = {
  pos: {
    id: "pos",
    name: "品詞識別 (名詞・形容詞・副詞・動詞)",
    shortName: "品詞識別",
    description: "文構造から空欄に必要な品詞（-ly, -tion, -able等）を見抜く",
    badgeColor: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      darkBg: "dark:bg-blue-950/40",
      darkText: "dark:text-blue-300",
      darkBorder: "dark:border-blue-800",
    },
  },
  verb_tense: {
    id: "verb_tense",
    name: "動詞の時制・態 (現在完了/過去/受動態/一致)",
    shortName: "動詞・時制",
    description: "主語と動詞の一致や時制、能動態・受動態の判定問題",
    badgeColor: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      border: "border-indigo-200",
      darkBg: "dark:bg-indigo-950/40",
      darkText: "dark:text-indigo-300",
      darkBorder: "dark:border-indigo-800",
    },
  },
  verbals: {
    id: "verbals",
    name: "準動詞 (不定詞・動名詞・分詞構文)",
    shortName: "準動詞",
    description: "to不定詞、動名詞(-ing)、過去分詞、分詞の修飾用法",
    badgeColor: {
      bg: "bg-violet-50",
      text: "text-violet-700",
      border: "border-violet-200",
      darkBg: "dark:bg-violet-950/40",
      darkText: "dark:text-violet-300",
      darkBorder: "dark:border-violet-800",
    },
  },
  conjunction_prep: {
    id: "conjunction_prep",
    name: "接続詞 vs 前置詞 (節と句の識別)",
    shortName: "接続詞・前置詞",
    description: "後ろにSV（節）が続くか名詞（句）が続くかの識別（although vs despiteなど）",
    badgeColor: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
      darkBg: "dark:bg-amber-950/40",
      darkText: "dark:text-amber-300",
      darkBorder: "dark:border-amber-800",
    },
  },
  pronoun: {
    id: "pronoun",
    name: "代名詞 (主格・所有格・目的格・再帰代名詞)",
    shortName: "代名詞",
    description: "their, them, theirs, themselves 等の格変化と先行詞一致",
    badgeColor: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      darkBg: "dark:bg-emerald-950/40",
      darkText: "dark:text-emerald-300",
      darkBorder: "dark:border-emerald-800",
    },
  },
  relative: {
    id: "relative",
    name: "関係詞・疑問詞 (who / which / whose / where)",
    shortName: "関係詞",
    description: "先行詞の有無や節内の不足要素に応じた関係代名詞・関係副詞",
    badgeColor: {
      bg: "bg-teal-50",
      text: "text-teal-700",
      border: "border-teal-200",
      darkBg: "dark:bg-teal-950/40",
      darkText: "dark:text-teal-300",
      darkBorder: "dark:border-teal-800",
    },
  },
  comparison: {
    id: "comparison",
    name: "比較 (原級・比較級・最上級・修飾)",
    shortName: "比較構文",
    description: "more, most, than, as...as, much等による比較表現",
    badgeColor: {
      bg: "bg-cyan-50",
      text: "text-cyan-700",
      border: "border-cyan-200",
      darkBg: "dark:bg-cyan-950/40",
      darkText: "dark:text-cyan-300",
      darkBorder: "dark:border-cyan-800",
    },
  },
  prep_idiom: {
    id: "prep_idiom",
    name: "前置詞・イディオム (on / in / with / by / for)",
    shortName: "前置詞・語法",
    description: "動詞・形容詞と前置詞のコロケーション（provide with, subject to等）",
    badgeColor: {
      bg: "bg-orange-50",
      text: "text-orange-800",
      border: "border-orange-200",
      darkBg: "dark:bg-orange-950/40",
      darkText: "dark:text-orange-300",
      darkBorder: "dark:border-orange-800",
    },
  },
  subjunctive: {
    id: "subjunctive",
    name: "仮定法・倒置・助動詞",
    shortName: "仮定法・倒置",
    description: "Should you need..., would have p.p., 要求提案動詞のthat節など",
    badgeColor: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      darkBg: "dark:bg-rose-950/40",
      darkText: "dark:text-rose-300",
      darkBorder: "dark:border-rose-800",
    },
  },
  vocab: {
    id: "vocab",
    name: "語彙・コロケーション (ビジネス語彙・文脈判断)",
    shortName: "語彙・文脈",
    description: "文脈に適した動詞・名詞・形容詞を選択するビジネス語彙問題",
    badgeColor: {
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-300",
      darkBg: "dark:bg-slate-800",
      darkText: "dark:text-slate-300",
      darkBorder: "dark:border-slate-700",
    },
  },
};

/**
 * Determines the grammar category tag for any question.
 * If question.grammarCategory is set, uses it.
 * Otherwise uses heuristic detection based on options and text.
 */
export function getQuestionGrammarCategory(question: Question): GrammarCategoryInfo {
  if (question.grammarCategory && GRAMMAR_CATEGORIES[question.grammarCategory]) {
    return GRAMMAR_CATEGORIES[question.grammarCategory];
  }

  const sub = question.subQuestions?.[0];
  const opts = sub?.options || [];
  const text = (question.text || "").toLowerCase();

  // 1. Pronoun Check
  const pronounRegex = /^(they|them|their|theirs|themselves|he|him|his|himself|she|her|hers|herself|we|us|our|ours|ourselves|i|me|my|mine|myself|it|its|itself)$/i;
  if (opts.some(o => pronounRegex.test(o.trim()))) {
    return GRAMMAR_CATEGORIES.pronoun;
  }

  // 2. Relative Pronoun / Adverb Check
  const relativeRegex = /^(who|whom|whose|which|where|when|why)$/i;
  if (opts.some(o => relativeRegex.test(o.trim()))) {
    return GRAMMAR_CATEGORIES.relative;
  }

  // 3. Conjunction vs Preposition Check
  const conjPrepWords = /^(although|because|despite|due to|in spite of|even though|since|unless|while|whereas|provided|even if|in order that|as if)$/i;
  if (opts.some(o => conjPrepWords.test(o.trim()))) {
    return GRAMMAR_CATEGORIES.conjunction_prep;
  }

  // 4. Subjunctive / Inversion Check
  const subInvertWords = /^(should|would|could|might|had|were)$/i;
  if (opts.some(o => subInvertWords.test(o.trim())) && 
      (text.startsWith("should ") || text.startsWith("had ") || text.startsWith("were ") || text.includes("would have"))) {
    return GRAMMAR_CATEGORIES.subjunctive;
  }

  // 5. Comparison Check
  const compWords = /^(more|most|better|best|faster|fastest|harder|hardest|easier|easiest|higher|highest|lower|lowest|greater|greatest)$/i;
  if (opts.some(o => compWords.test(o.trim())) || text.includes("than ") || text.includes("as _______ as")) {
    return GRAMMAR_CATEGORIES.comparison;
  }

  // 6. Prepositions
  const purePrepRegex = /^(in|on|at|by|for|with|from|to|about|into|through|between|among|under|over|without|off|against|toward)$/i;
  if (opts.length > 0 && opts.every(o => purePrepRegex.test(o.trim()))) {
    return GRAMMAR_CATEGORIES.prep_idiom;
  }

  // 7. Part of Speech check (Derivatives sharing common root)
  const roots = opts.map(o => o.toLowerCase().slice(0, 4));
  const hasCommonRoot = roots.filter(r => r === roots[0]).length >= 3;
  const hasAdverb = opts.some(o => o.toLowerCase().endsWith("ly"));
  const hasNounSuffix = opts.some(o => /(tion|ment|ence|ance|ity|ness|sion|cy)$/.test(o.toLowerCase()));
  const hasAdjSuffix = opts.some(o => /(able|ible|ive|ful|al|ic|ous)$/.test(o.toLowerCase()));

  if (hasCommonRoot && (hasAdverb || hasNounSuffix || hasAdjSuffix)) {
    return GRAMMAR_CATEGORIES.pos;
  }

  // 8. Tense & Voice vs Verbals
  const hasVerbAux = opts.some(o => /^(has|have|had|is|are|was|were|will|would)\s+/i.test(o.trim()));
  const hasVerbTenseForms = opts.some(o => /^(has|have|had|is|are|was|were)$/i.test(o.trim()));
  if (hasVerbAux || hasVerbTenseForms) {
    return GRAMMAR_CATEGORIES.verb_tense;
  }

  const hasToInf = opts.some(o => /^to\s+[a-z]+/i.test(o.trim()));
  const hasIng = opts.some(o => /[a-z]+ing$/i.test(o.trim()));
  const hasEd = opts.some(o => /[a-z]+ed$/i.test(o.trim()));
  if ((hasToInf && hasIng) || (hasToInf && hasEd) || (hasIng && hasEd && hasCommonRoot)) {
    return GRAMMAR_CATEGORIES.verbals;
  }

  if (hasCommonRoot) {
    return GRAMMAR_CATEGORIES.pos;
  }

  // Fallback default
  return GRAMMAR_CATEGORIES.vocab;
}
