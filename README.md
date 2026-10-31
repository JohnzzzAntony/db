# Koshys Nursing Study

A study app for **Post Basic B.Sc. Nursing** students at Koshys College of Nursing, Bangalore. No database and no accounts: everything a student saves stays in their own browser.

## What it does

- **Study Material Generator**: type a topic and pick a mode (University Exam, Quick Revision, Detailed Research, Viva) and marks (2–20). You get an exam-ready answer with:
  - **diagrams** (mind maps and flowcharts)
  - **picture links** to real labelled images on Wikimedia Commons and Google Images
  - **flashcards** for viva practice
  - an **evidence label** on every section, and a reminder to verify drug doses and normal values
- **Ask the Tutor**: a chat that searches trusted medical sites (NCBI/StatPearls, MedlinePlus, WHO, MoHFW, NHM, INC and others) with Tavily before answering, cites them as [S1], [S2] and lists the links. It falls back to the open web when trusted sites have too little.
- **Subjects**: all 15 subjects by year, with shortcuts to study and to papers.
- **Question Papers**: PDF papers and RGUHS collections by subject, found by web search and not verified. You can also save your own papers (PDF or photo) on your device.
- **Clinical Records**: the Koshys clinical requirement checklist, with progress.
- **Settings**: access code, backup download and restore, and delete-all.

## How data is stored

| What | Where |
|------|-------|
| Study documents, saved papers, clinical progress, access code | The student's browser (IndexedDB). It never leaves the device. |
| AI requests | Sent to `/api/study` or `/api/chat`. The server researches the topic with Tavily, asks the NVIDIA model (or Claude, if configured) using server-side keys, and returns the answer with its sources. Nothing is stored on the server. |

Browser data is lost if the student clears site data, uses private mode or changes device, so the app asks students to download a backup from **Settings**.

## Run locally

```bash
cp .env.example .env     # set NVIDIA_API_KEY, TAVILY_API_KEY and ACCESS_CODE
npm install
npm run dev              # http://localhost:3000
```

## Deploy to Vercel

1. On vercel.com choose **Add New → Project**, import `JohnzzzAntony/db`, and keep the detected Next.js settings.
2. Under **Environment Variables**, add `NVIDIA_API_KEY`, `TAVILY_API_KEY` and `ACCESS_CODE`. Share the access code with students only.
3. Deploy. No database is needed.

Study generation can take 1–2 minutes. The API route allows up to 300 s, which needs Vercel's Fluid compute (on by default for new projects).

## Deploy to Railway

1. On railway.com choose **New Project → Deploy from GitHub repo** and pick `JohnzzzAntony/db`. Railway detects Next.js, runs `npm run build`, then `npm start` on the port it provides.
2. Under **Variables**, add `NVIDIA_API_KEY`, `TAVILY_API_KEY` and `ACCESS_CODE`. Add `NVIDIA_MODEL` only to use a different NVIDIA model than `z-ai/glm-5.3-flash`. Saving variables redeploys the app.
3. Under **Settings → Networking**, click **Generate Domain** to get the public link.

Every push to `main` redeploys. If generation fails, the error on screen names the setting to fix; the full error is in **Deployments → View logs**, on a line starting `Anthropic API error`.

## Security notes

- **API keys never reach the browser.** Only the server routes `/api/study` and `/api/chat` use them.
- **Without `ACCESS_CODE`, anyone with the link can use up your AI and search quota.** The code is compared in constant time.
- **The per-device limit is best effort.** `AI_HOURLY_LIMIT` is counted in memory on each server instance, so use a shared store such as Upstash Redis for a public launch.
- **Rotate any API key that has been pasted into chats, documents or screenshots.**

## Scripts

`npm run dev` · `npm run build` · `npm run start` · `npm test` · `npm run typecheck` · `npm run lint`
