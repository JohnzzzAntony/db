# Koshys Nursing Academic Intelligence

An AI-assisted study and exam-preparation platform for **Post Basic B.Sc. Nursing** students at Koshys College of Nursing, Bangalore. Every university, syllabus and requirement detail can be configured, so the platform can also serve other Indian nursing colleges.

This repository contains **Phase 1–3** of the roadmap:

| # | Module | Status |
|---|--------|--------|
| 1 | Academic configuration & syllabus (universities, regulations, years/semesters, subjects, units, topics, textbooks, clinical requirements) | ✅ |
| 2 | AI study material generator (4 modes × 2/5/10/15/20 marks, source-grounded) | ✅ |
| 3 | Previous-year paper library, AI extraction (incl. scanned papers), verification workflow, repeated-question analysis, web discovery | ✅ |
| 4+ | Exam prediction, care plans, case studies/presentations, drug studies, mock exams, tutor, clinical record tracking | Planned. The data model is already in place for them. |

## Accuracy model

The spec forbids invented facts and references. The platform enforces that in code; it doesn't rely on the prompt alone:

- **References can't be fabricated.** The model may cite only ids (`S1`, `T2`) of library excerpts and admin-entered textbooks it was given. The server maps those ids back to database records and drops any it doesn't recognise (`src/lib/study/references.ts`).
- **Evidence labels on every section:** *Source-supported* (backed by cited excerpts; downgraded automatically if no valid source is cited), *Standard textbook content*, or *Needs verification* (doses, ranges, guideline targets, schedules).
- **Only verified library sources are retrieved.** Admin uploads are verified on upload; faculty uploads wait for an admin.
- **Verified paper appearances count only papers a faculty member has verified**, and verification needs a source URL or a written note. A year with no verified paper shows as *No paper available*, never as *Not found*.
- **Discovery stores only URLs returned by the search engine**, never URLs the model wrote. Nothing is imported automatically.
- The seeded RGUHS affiliation and the subject list are marked **Unverified** until an admin confirms them against the current syllabus. Marks, codes and units are deliberately left blank.

## Stack

Next.js 16 (App Router, server actions), TypeScript, Tailwind CSS 4, PostgreSQL + Prisma 7 (`@prisma/adapter-pg`), Claude API (`@anthropic-ai/sdk`) with structured outputs, server-side refusal fallback and web search. Study material can instead be written by an NVIDIA-hosted model (`NVIDIA_API_KEY`, default `nvidia/nemotron-3.5-bolt-e4b`). The same reference checks apply to its output, which is validated against the schema with one corrective retry. Retrieval uses PostgreSQL full-text search (GIN index), so no separate vector store or embedding key is needed.

## Getting started

```bash
cp .env.example .env              # fill DATABASE_URL, ANTHROPIC_API_KEY, SEED_ADMIN_*
npm install                       # also runs `prisma generate`
npx prisma migrate deploy         # or `npx prisma migrate dev` while developing
npm run db:seed                   # RGUHS default (unverified), subjects, Koshys requirements, first admin
npm run dev                       # http://localhost:3000
```

After the first sign-in as admin:

1. **Admin → Universities & syllabus**: confirm the university and regulation, then add subject codes, marks, units and topics. Mark items *Verified* only after checking the official syllabus.
2. **Admin → Reference library**: upload text-based PDFs/notes the college is licensed to use. Study documents cite only these.
3. **Admin → Users**: promote faculty.
4. **Admin → Paper review & discovery**: import and verify previous-year papers.

## Roles

| Role | Can |
|------|-----|
| Student | Generate study material, browse subjects and papers, upload papers (unverified) |
| Faculty | + verify/reject papers, edit paper metadata, re-run extraction, edit units/topics/textbooks, upload library sources (pending admin), web discovery |
| Admin | + universities, regulations, subjects, clinical requirements, library verification, roles, delete papers |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests plus Postgres integration tests (needs `DATABASE_URL`) |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm run db:migrate` / `db:seed` | Apply migrations / seed defaults |

## Project layout

```
prisma/schema.prisma        data model (config, library, study docs, papers, clusters)
prisma/seed.ts              unverified defaults + Koshys clinical requirements
src/lib/auth/               DB-backed sessions (hashed tokens, httpOnly cookies), role checks
src/lib/ai/client.ts        structured-output Claude calls with refusal fallback and validation
src/lib/study/              mode/marks planning, grounded generation, reference resolution
src/lib/library/            chunking, full-text retrieval, PDF text extraction
src/lib/papers/             extraction, clustering, repetition analysis, SSRF-safe import, discovery
src/app/(app)/              student pages; admin/ for faculty & admin
tests/                      unit + integration tests
```

## Production notes

- **Long requests:** study generation and paper extraction run inside the request (up to a few minutes; pages export `maxDuration = 300`). On serverless hosts, make sure the plan allows this. Move to a job queue if volume grows.
- **File storage:** papers are stored in Postgres (`bytea`, deduplicated by SHA-256, type checked by magic bytes). Move them to object storage if the archive grows large.
- **Cost control:** each user is limited to `AI_HOURLY_LIMIT` generations per hour. Paper extraction runs at `medium` effort; study generation runs at `AI_EFFORT`.
- **Not yet implemented:** login rate limiting / lockout (put the app behind a WAF or add a limiter before public launch), email verification, password reset.
- **Copyright:** upload only material the college may use. Uploaded question papers are visible to all signed-in users.
- **AI output is a study aid, not official university material.** The UI says so wherever AI content appears.
