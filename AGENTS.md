# AGENTS.md — בלשי השפה (balshei-hasafa)

This file extends `~/Projects/Bachar_Israeli_Lab/Itzik_Lab/AGENTS.md` (the lab brief).
Per-project rules win on conflict.

---

## What this is

"בלשי השפה" — an interactive Hebrew-language practice game for a 4th grader,
built from the July 2026 summer language worksheets (word families / roots,
parts of speech, odd-one-out, connectives, adjectives). Detective theme: the
kid is a detective solving "cases" (one case per topic).

- Multi-profile (name + emoji avatar, no password), shared across devices.
- Progress (XP, detective ranks, stars per case, gentle streak, badges)
  persisted in **Firestore** (collections `safa_profiles`, `safa_progress`)
  in GCP project `gen-lang-client-0376839322`.
- Game content is **static JSON** in `frontend/src/content/` — no AI at runtime.

## Build / Test / Run

| Task | Command |
|------|---------|
| Install (Python) | `pip install -r requirements.txt` (use a venv) |
| Install (frontend) | `cd frontend && npm install` |
| Run server locally | `uvicorn app.main:app --reload --port 8090` |
| Run frontend dev | `cd frontend && npm run dev` (proxies /api to :8090) |
| Build frontend | `cd frontend && npm run build` (output `frontend/dist`, served by FastAPI) |
| Tests | `pytest -x` |
| Smoke `/health` | `curl http://localhost:8090/health` |

## Structure

```
app/
  main.py          FastAPI app — API + serves frontend/dist
  store.py         Firestore access (profiles + progress), in-memory fallback
  progression.py   Pure logic: XP, ranks, stars, streak, badges
frontend/          Vite + React + TypeScript, RTL Hebrew
  src/content/     Static game content JSON (derived from the worksheets)
  src/games/       The 6 mini-games
  src/screens/     Profile picker, case map, progress, leaderboard
tests/             pytest — progression logic + API contract
Dockerfile         Node build stage → Python runtime stage
cloudbuild.yaml    build → push → deploy Cloud Run `balshei-hasafa` (europe-west1)
```

## Rules

- **RTL + logical CSS only** (`text-start` / `padding-inline-start` — never raw left/right).
- **No secrets** — Firestore via Cloud Run default credentials. Local dev falls
  back to an in-memory store when Firestore is unreachable.
- **Kid-safe gamification**: no hearts/lives, no punishing timers, no rank
  demotion, streak breaks are never punished. Don't add these.
- Bump `VERSION` before any deploy (Cloud Build convention).
- Tests ship with every change (`pytest -x` green before push).
- `/health` returns bare 200 with no auth — Cloud Run probe depends on it.
