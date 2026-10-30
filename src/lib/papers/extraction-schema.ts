import { z } from "zod";

export const QUESTION_TYPES = [
  "LONG_ESSAY",
  "SHORT_ESSAY",
  "SHORT_ANSWER",
  "VERY_SHORT_ANSWER",
  "MCQ",
  "FILL_IN_BLANK",
  "CASE_BASED",
  "OTHER",
] as const;

export const paperExtractionSchema = z.object({
  isQuestionPaper: z.boolean().describe("False if the document is not an examination question paper."),
  detected: z.object({
    university: z.string().nullable(),
    course: z.string().nullable(),
    subjectName: z.string().nullable(),
    subjectCode: z.string().nullable(),
    yearOfStudy: z.string().nullable(),
    examMonth: z.number().int().nullable().describe("1-12, only if printed on the paper"),
    examYear: z.number().int().nullable().describe("Only if printed on the paper"),
    examType: z.enum(["REGULAR", "SUPPLEMENTARY", "UNKNOWN"]),
    totalMarks: z.number().nullable(),
    durationHours: z.number().nullable(),
  }),
  questions: z.array(
    z.object({
      number: z.string().describe('Question label as printed, sub-parts like "2a" or "3(ii)"'),
      text: z.string().describe("Exact wording as printed; use [illegible] for unreadable words"),
      marks: z.number().nullable(),
      type: z.enum(QUESTION_TYPES),
      topic: z.string().nullable().describe("Short nursing topic, e.g. 'Myocardial infarction'"),
      unitNumber: z.number().int().nullable().describe("Matching syllabus unit number from the list, if clear"),
    }),
  ),
  notes: z.string().nullable().describe("Legibility problems or anything a verifier should check"),
});

export type PaperExtraction = z.infer<typeof paperExtractionSchema>;
