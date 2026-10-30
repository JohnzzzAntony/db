import type { SECTION_KEYS } from "./schema";

export const STUDY_MODES = ["UNIVERSITY_EXAM", "QUICK_REVISION", "DETAILED_RESEARCH", "VIVA"] as const;
export type StudyModeKey = (typeof STUDY_MODES)[number];
export const MARKS_OPTIONS = [2, 5, 10, 15, 20] as const;
export type Marks = (typeof MARKS_OPTIONS)[number];

export const MODE_LABELS: Record<StudyModeKey, string> = {
  UNIVERSITY_EXAM: "University Exam",
  QUICK_REVISION: "Quick Revision",
  DETAILED_RESEARCH: "Detailed Research",
  VIVA: "Viva",
};

type SectionKey = (typeof SECTION_KEYS)[number];

const FULL: SectionKey[] = [
  "INTRODUCTION",
  "ANATOMY_PHYSIOLOGY",
  "CAUSES_RISK_FACTORS",
  "PATHOPHYSIOLOGY",
  "CLINICAL_MANIFESTATIONS",
  "DIAGNOSTIC_INVESTIGATIONS",
  "MEDICAL_MANAGEMENT",
  "NURSING_MANAGEMENT",
  "PREVENTION_HEALTH_EDUCATION",
  "CONCLUSION",
];

// What examiners expect at each mark value in Indian nursing university papers.
const EXAM_PLAN: Record<Marks, { words: [number, number]; sections: SectionKey[] }> = {
  2: { words: [50, 100], sections: ["INTRODUCTION", "KEY_POINTS"] },
  5: { words: [250, 400], sections: ["INTRODUCTION", "CAUSES_RISK_FACTORS", "CLINICAL_MANIFESTATIONS", "NURSING_MANAGEMENT"] },
  10: {
    words: [600, 900],
    sections: [
      "INTRODUCTION",
      "CAUSES_RISK_FACTORS",
      "PATHOPHYSIOLOGY",
      "CLINICAL_MANIFESTATIONS",
      "DIAGNOSTIC_INVESTIGATIONS",
      "MEDICAL_MANAGEMENT",
      "NURSING_MANAGEMENT",
      "CONCLUSION",
    ],
  },
  15: { words: [1000, 1400], sections: FULL },
  20: { words: [1400, 2000], sections: FULL },
};

const VIVA_COUNT: Record<Marks, number> = { 2: 5, 5: 8, 10: 12, 15: 15, 20: 20 };

export type StudyPlan = {
  wordTarget: string;
  sections: SectionKey[];
  vivaQuestions: number;
  flowchart: boolean;
  memoryAids: boolean;
  style: string;
};

export function buildStudyPlan(mode: StudyModeKey, marks: Marks): StudyPlan {
  const exam = EXAM_PLAN[marks];
  switch (mode) {
    case "UNIVERSITY_EXAM":
      return {
        wordTarget: `${exam.words[0]}-${exam.words[1]} words`,
        sections: exam.sections,
        vivaQuestions: 0,
        flowchart: marks >= 10,
        memoryAids: false,
        style:
          "Write as a model answer a student can reproduce in a university answer script: definition first, numbered headings, short points, tables where they save words, a labelled flowchart for pathophysiology when marks allow, and a one-paragraph conclusion.",
      };
    case "QUICK_REVISION": {
      const [lo, hi] = exam.words.map((w) => Math.round(w * 0.4));
      return {
        wordTarget: `${lo}-${hi} words`,
        sections: ["KEY_POINTS", ...exam.sections.filter((s) => s !== "CONCLUSION" && s !== "KEY_POINTS")],
        vivaQuestions: 0,
        flowchart: marks >= 10,
        memoryAids: true,
        style:
          "Bullet points only: definitions, keywords in bold, classic signs, key investigations, priority nursing actions. Add mnemonics only when they are genuinely in common use or clearly marked as a memory aid you made up.",
      };
    }
    case "DETAILED_RESEARCH":
      return {
        wordTarget: `${Math.max(1500, exam.words[1])}-${Math.max(2500, exam.words[1] * 1.5)} words`,
        sections: FULL,
        vivaQuestions: 5,
        flowchart: true,
        memoryAids: false,
        style:
          "Comprehensive academic explanation in prose and structured lists, covering every applicable section in depth, with each claim tied to a library excerpt where one exists.",
      };
    case "VIVA":
      return {
        wordTarget: "short spoken answers (1-3 sentences each)",
        sections: ["INTRODUCTION"],
        vivaQuestions: VIVA_COUNT[marks],
        flowchart: false,
        memoryAids: false,
        style:
          "Oral-examination practice: a 3-4 line overview, then questions an examiner would ask in increasing difficulty, each with the answer a student should say.",
      };
  }
}
