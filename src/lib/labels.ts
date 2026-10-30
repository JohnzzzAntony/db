import type { ExamType, QuestionType, RequirementGroup, SourceKind, SubjectCategory } from "@/generated/prisma/enums";

export const SUBJECT_CATEGORY_LABELS: Record<SubjectCategory, string> = {
  NURSING_FOUNDATION_EDUCATION: "Nursing Foundation & Education",
  MEDICAL_SURGICAL: "Medical-Surgical Nursing",
  CHILD_HEALTH: "Child Health Nursing",
  MATERNAL_MIDWIFERY: "Maternal & Midwifery Nursing",
  COMMUNITY_HEALTH: "Community Health Nursing",
  MENTAL_HEALTH: "Mental Health Nursing",
  NURSING_ADMINISTRATION: "Nursing Administration",
  NURSING_RESEARCH_STATISTICS: "Nursing Research & Statistics",
  BASIC_SCIENCES: "Basic Sciences",
  BEHAVIOURAL_SCIENCES: "Behavioural Sciences",
  OTHER: "Other",
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  LONG_ESSAY: "Long essay",
  SHORT_ESSAY: "Short essay",
  SHORT_ANSWER: "Short answer",
  VERY_SHORT_ANSWER: "Very short answer",
  MCQ: "MCQ",
  FILL_IN_BLANK: "Fill in the blank",
  CASE_BASED: "Case-based",
  OTHER: "Other",
};

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  REGULAR: "Regular",
  SUPPLEMENTARY: "Supplementary",
  UNKNOWN: "Not stated",
};

export const REQUIREMENT_GROUP_LABELS: Record<RequirementGroup, string> = {
  CARE_PLAN: "Care plan",
  CASE_STUDY: "Case study",
  CASE_PRESENTATION: "Case presentation",
  HEALTH_EDUCATION: "Health education",
  DRUG_PRESENTATION: "Drug presentation",
  PROCEDURE: "Procedure",
  ASSESSMENT: "Assessment",
  ASSIGNMENT: "Assignment",
  CLINICAL_FILE: "Clinical file",
  OTHER: "Other",
};

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  TEXTBOOK_EXCERPT: "Textbook excerpt",
  CLINICAL_GUIDELINE: "Clinical guideline",
  GOVERNMENT_PROGRAMME: "Government programme",
  JOURNAL_ARTICLE: "Journal article",
  LECTURE_NOTES: "Lecture notes",
  SYLLABUS: "Syllabus",
  OTHER: "Other",
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function examSession(month: number | null, year: number | null) {
  if (!year) return "Year not stated";
  return month ? `${MONTHS[month - 1]} ${year}` : String(year);
}
