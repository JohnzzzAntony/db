import type { SubjectName } from "./subjects";

// Links returned by a web search on 30 Oct 2026, kept exactly as found. Not opened or verified.
export type PaperLink = { name: string; url: string; source: string; kind: "pdf" | "index" };

const FR1 = "https://firstranker.com/p-b-b-sc-nursing/rguhs-b-sc-nursing-pc-b-sc-nursing-post-basic-1st-year-last-10-years-2009-2019-previous-question-papers-p-b-b-sc-rajiv-gandhi-university-of-health-sciences/";
const FR2 = "https://firstranker.com/p-b-b-sc-nursing/rguhs-b-sc-nursing-pc-b-sc-nursing-post-basic-2nd-year-last-10-years-2009-2019-previous-question-papers-p-b-b-sc-rajiv-gandhi-university-of-health-sciences/";
const FRB = "https://firstranker.com/p-b-b-sc-nursing/post-basic-b-sc-nursing-last-10-years-2010-2020-question-papers/";
const V = "https://vimscon.edu.in/media/Pdf/Student%20Corner/Useful%20Links/Question%20Paper/Post%20B.Sc.Nursing/1st%20Year/1st%20PB.Bsc%20";
const SV = "https://svpconpravara.in/wp-content/themes/nursing/essentials/pdf/Question_Paper/";
const VIMS = "vimscon.edu.in (college site; university not stated)";
const SVP = "svpconpravara.in (college site; MUHS syllabus)";

export const RGUHS_INDEXES: PaperLink[] = [
  { name: "RGUHS P.B.B.Sc 1st Year papers, 2009–2019", url: FR1, source: "FirstRanker (third-party)", kind: "index" },
  { name: "RGUHS P.B.B.Sc 2nd Year papers, 2009–2019", url: FR2, source: "FirstRanker (third-party)", kind: "index" },
  { name: "Post Basic question bank, 2012–2025", url: FRB, source: "FirstRanker (third-party); check each paper's university", kind: "index" },
];

export const PDF_PAPERS: Partial<Record<SubjectName, PaperLink[]>> = {
  "Nursing Foundation": [{ name: "First P.B.B.Sc. Winter 2022 — Nursing Foundation", url: `${V}Nursing%20Foundation.pdf`, source: VIMS, kind: "pdf" }],
  "Nutrition and Dietetics": [{ name: "1st PB.Bsc Nutrition & Dietetics", url: `${V}Nutrition%20&%20Dietetics.pdf`, source: VIMS, kind: "pdf" }],
  "Biochemistry and Biophysics": [{ name: "First P.B.B.Sc. Biochemistry & Biophysics (2011, 2014–2016)", url: `${SV}FYPostB.Sc/Biochemistry_Biophysics.pdf`, source: SVP, kind: "pdf" }],
  Psychology: [
    { name: "1st PB.Bsc Psychology", url: `${V}Psychology.pdf`, source: VIMS, kind: "pdf" },
    { name: "First P.B.B.Sc. Psychology (2012–2013)", url: `${SV}FYPostB.Sc/Psychology.pdf`, source: SVP, kind: "pdf" },
  ],
  Microbiology: [{ name: "First P.B.B.Sc. Winter 2022 — Microbiology", url: `${V}Microbiology.pdf`, source: VIMS, kind: "pdf" }],
  "Maternal Nursing": [{ name: "First P.B.B.Sc. Winter 2022 — Maternal Nursing", url: `${V}Maternal%20Nursing.pdf`, source: VIMS, kind: "pdf" }],
  "Child Health Nursing": [{ name: "1st PB.Bsc Child Health Nursing", url: `${V}Child%20Health%20Nursing.pdf`, source: VIMS, kind: "pdf" }],
  "Medical-Surgical Nursing": [{ name: "First P.B.B.Sc. Medical-Surgical Nursing (2011–2015)", url: `${SV}FYPostB.Sc/Medical_Surgical_Nursing.pdf`, source: SVP, kind: "pdf" }],
  "Mental Health Nursing": [{ name: "Second P.B.B.Sc. Mental Health Nursing (2018–2022)", url: `${SV}sypost/Mental_Health_Nursing.pdf`, source: SVP, kind: "pdf" }],
};

export const searchFor = (subject: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`RGUHS "Post Basic" OR "P.B.B.Sc" "${subject}" question paper filetype:pdf`)}`;
