import Link from "next/link";

const FEATURES = [
  {
    title: "Exam-ready study material",
    body: "University exam, quick revision, detailed research and viva modes, scaled from 2 to 20 marks. Each section is labelled source-supported, standard textbook content, or needs verification.",
  },
  {
    title: "Previous-year question research",
    body: "Upload or import papers, extract questions automatically (scanned papers included), and see which questions repeat, with year-by-year evidence.",
  },
  {
    title: "Your syllabus, not a guess",
    body: "Faculty configure the university, regulation, subjects, units and textbooks. Nothing is marked verified until someone checks it.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="font-serif text-lg font-semibold text-brand-strong">Koshys Nursing Academic Intelligence</span>
        <nav className="flex gap-2" aria-label="Account">
          <Link href="/login" className="btn-secondary">Sign in</Link>
          <Link href="/register" className="btn">Create account</Link>
        </nav>
      </header>
      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-accent">Koshys College of Nursing · Bangalore</p>
          <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Study smarter for your Post Basic B.Sc. Nursing examinations.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            An academic platform that writes answers like an experienced nursing tutor, shows where every fact comes from,
            and tells you which previous-year questions really repeat.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn px-6 py-3 text-base">Get started</Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">I already have an account</Link>
          </div>
        </section>
        <section className="border-t border-border bg-surface" aria-labelledby="features">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="features" className="sr-only">Features</h2>
            <ul className="grid gap-8 md:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title}>
                  <h3 className="mb-2 font-serif text-xl font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted">
        AI-generated content is a study aid. Predictions and model answers are not official university material; always confirm clinical details with your textbooks and faculty.
      </footer>
    </div>
  );
}
