"""בלשי השפה — FastAPI backend + static frontend host."""
from __future__ import annotations

import logging
import os
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.progression import BADGES, GAME_IDS, Progress, RoundResult, apply_round, rank_for_xp
from app.store import get_store

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="בלשי השפה", version=Path(__file__).resolve().parent.parent.joinpath("VERSION").read_text().strip()
              if Path(__file__).resolve().parent.parent.joinpath("VERSION").exists() else "0.0.0")

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


def _today_il() -> date:
    if ZoneInfo is not None:
        return datetime.now(ZoneInfo("Asia/Jerusalem")).date()
    return datetime.now(timezone.utc).date()


class ProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=30)
    avatar: str = Field(min_length=1, max_length=8)


class RoundSubmit(BaseModel):
    game_id: str
    correct: int = Field(ge=0)
    total: int = Field(gt=0)


def _progress_payload(progress: Progress) -> dict:
    return {
        "xp": progress.xp,
        "rank": rank_for_xp(progress.xp),
        "stars": progress.stars,
        "streak": progress.streak,
        "last_played": progress.last_played.isoformat() if progress.last_played else None,
        "played_today": progress.last_played == _today_il(),
        "badges": [{"id": b, **BADGES[b]} for b in progress.badges if b in BADGES],
        "games_played": progress.games_played,
        "total_rounds": progress.total_rounds,
        "total_correct": progress.total_correct,
        "total_questions": progress.total_questions,
    }


@app.get("/health")
def health() -> PlainTextResponse:
    return PlainTextResponse("ok")


@app.get("/version")
def version() -> dict:
    return {"version": app.version}


@app.get("/api/profiles")
def list_profiles(store=Depends(get_store)) -> dict:
    return {"profiles": store.list_profiles()}


@app.post("/api/profiles")
def create_profile(body: ProfileCreate, store=Depends(get_store)) -> dict:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="שם ריק")
    existing = [p for p in store.list_profiles() if p["name"] == name]
    if existing:
        raise HTTPException(status_code=409, detail="כבר יש בלש עם השם הזה")
    profile = store.create_profile(name, body.avatar)
    logger.info("Created profile %s (%s)", profile["id"], name)
    return profile


@app.get("/api/profiles/{profile_id}/progress")
def get_progress(profile_id: str, store=Depends(get_store)) -> dict:
    if store.get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="פרופיל לא נמצא")
    return _progress_payload(store.get_progress(profile_id))


@app.post("/api/profiles/{profile_id}/rounds")
def submit_round(profile_id: str, body: RoundSubmit, store=Depends(get_store)) -> dict:
    if store.get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="פרופיל לא נמצא")
    if body.game_id not in GAME_IDS:
        raise HTTPException(status_code=400, detail=f"משחק לא מוכר: {body.game_id}")
    if body.correct > body.total:
        raise HTTPException(status_code=400, detail="correct > total")

    progress = store.get_progress(profile_id)
    result = RoundResult(game_id=body.game_id, correct=body.correct, total=body.total, played_on=_today_il())
    summary = apply_round(progress, result)

    round_entry = {
        "game_id": body.game_id,
        "correct": body.correct,
        "total": body.total,
        "xp_earned": summary["xp_earned"],
        "stars": summary["round_stars"],
        "at": datetime.now(timezone.utc).isoformat(),
    }
    store.save_progress(profile_id, progress, round_entry)
    return {"summary": summary, "progress": _progress_payload(progress)}


@app.get("/api/profiles/{profile_id}/history")
def get_history(profile_id: str, store=Depends(get_store)) -> dict:
    if store.get_profile(profile_id) is None:
        raise HTTPException(status_code=404, detail="פרופיל לא נמצא")
    return {"history": store.get_history(profile_id)}


@app.get("/api/leaderboard")
def leaderboard(store=Depends(get_store)) -> dict:
    rows = []
    for profile in store.list_profiles():
        progress = store.get_progress(profile["id"])
        rows.append({
            "id": profile["id"],
            "name": profile["name"],
            "avatar": profile["avatar"],
            "xp": progress.xp,
            "rank": rank_for_xp(progress.xp),
            "streak": progress.streak,
            "badges_count": len(progress.badges),
            "total_stars": sum(progress.stars.values()),
        })
    rows.sort(key=lambda r: r["xp"], reverse=True)
    return {"leaderboard": rows}


# --- Static frontend (built by Vite into frontend/dist) ---
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8090")))
