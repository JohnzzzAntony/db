// Subjects of the two-year Post Basic B.Sc. Nursing course (Indian Nursing Council scheme).
// Confirm against your university's current syllabus.
export const SUBJECTS = [
  { name: "Nursing Foundation", year: 1 },
  { name: "Nutrition and Dietetics", year: 1 },
  { name: "Biochemistry and Biophysics", year: 1 },
  { name: "Psychology", year: 1 },
  { name: "Microbiology", year: 1 },
  { name: "Maternal Nursing", year: 1 },
  { name: "Child Health Nursing", year: 1 },
  { name: "Medical-Surgical Nursing", year: 1 },
  { name: "English", year: 1 },
  { name: "Sociology", year: 2 },
  { name: "Community Health Nursing", year: 2 },
  { name: "Mental Health Nursing", year: 2 },
  { name: "Introduction to Nursing Education", year: 2 },
  { name: "Introduction to Nursing Administration", year: 2 },
  { name: "Introduction to Nursing Research and Statistics", year: 2 },
] as const;

export type SubjectName = (typeof SUBJECTS)[number]["name"];
export const SUBJECT_NAMES = SUBJECTS.map((s) => s.name) as [SubjectName, ...SubjectName[]];
