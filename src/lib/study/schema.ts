import { z } from "zod";

export const SECTION_KEYS = [
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
  "KEY_POINTS",
  "OTHER",
] as const;

export const SECTION_LABELS: Record<(typeof SECTION_KEYS)[number], string> = {
  INTRODUCTION: "A. Introduction",
  ANATOMY_PHYSIOLOGY: "B. Anatomy and Physiology",
  CAUSES_RISK_FACTORS: "C. Causes and Risk Factors",
  PATHOPHYSIOLOGY: "D. Pathophysiology",
  CLINICAL_MANIFESTATIONS: "E. Clinical Manifestations",
  DIAGNOSTIC_INVESTIGATIONS: "F. Diagnostic Investigations",
  MEDICAL_MANAGEMENT: "G. Medical Management",
  NURSING_MANAGEMENT: "H. Nursing Management",
  PREVENTION_HEALTH_EDUCATION: "I. Prevention and Health Education",
  CONCLUSION: "J. Conclusion",
  KEY_POINTS: "Key Points",
  OTHER: "Additional Section",
};

/**
 * - SOURCE_SUPPORTED: backed by the cited library excerpts.
 * - STANDARD_TEXTBOOK: standard nursing curriculum content, not tied to an uploaded source.
 * - NEEDS_VERIFICATION: values, doses, guideline specifics or anything the model is unsure of.
 */
export const EVIDENCE_LEVELS = ["SOURCE_SUPPORTED", "STANDARD_TEXTBOOK", "NEEDS_VERIFICATION"] as const;

/** What the model returns. References are ids only; the server renders them from the database. */
export const studyOutputSchema = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      key: z.enum(SECTION_KEYS),
      heading: z.string(),
      markdown: z.string().describe("Section body in Markdown (lists and tables allowed)"),
      evidence: z.enum(EVIDENCE_LEVELS),
      sourceIds: z.array(z.string()).describe("Ids like S1 of library excerpts that support this section"),
      verificationNote: z.string().nullable().describe("What a student must check, when evidence is NEEDS_VERIFICATION"),
    }),
  ),
  flowchart: z
    .object({ title: z.string(), steps: z.array(z.string()) })
    .nullable()
    .describe("Step-by-step pathophysiology or process flow, when applicable"),
  memoryAids: z.array(z.string()),
  vivaQuestions: z.array(z.object({ question: z.string(), answer: z.string() })),
  textbookIds: z.array(z.string()).describe("Ids like T1 of recommended textbooks relevant to this topic"),
  caveats: z.array(z.string()).describe("Limitations of this answer a student should know about"),
});

export type StudyOutput = z.infer<typeof studyOutputSchema>;

export type ResolvedReference =
  | {
      kind: "LIBRARY";
      id: string;
      title: string;
      authors: string | null;
      publisher: string | null;
      edition: string | null;
      year: number | null;
      url: string | null;
      pages: number[];
    }
  | {
      kind: "TEXTBOOK";
      id: string;
      title: string;
      authors: string;
      edition: string | null;
      publisher: string | null;
      year: number | null;
    };

/** Stored in StudyDocument.content. */
export type StudyContent = Omit<StudyOutput, "textbookIds" | "sections"> & {
  sections: (StudyOutput["sections"][number] & { references: number[] })[];
  references: ResolvedReference[];
  plan: { wordTarget: string; mode: string; marks: number };
};
