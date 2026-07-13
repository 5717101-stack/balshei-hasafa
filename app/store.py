"""Profile + progress persistence.

Firestore in production (Cloud Run default credentials), with a process-local
in-memory fallback for local dev and tests. Collections:
- safa_profiles/{id}:  {name, avatar, created_at}
- safa_progress/{id}:  serialized Progress + rounds history (last 50)
"""
from __future__ import annotations

import logging
import random
import threading
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from app.progression import Progress

logger = logging.getLogger(__name__)

PROFILES_COLLECTION = "safa_profiles"
PROGRESS_COLLECTION = "safa_progress"
HISTORY_CAP = 50


def _new_link_code() -> str:
    """6-digit join code a kid can read off one device and type on another."""
    return f"{random.randint(0, 999999):06d}"


def _progress_to_doc(p: Progress) -> dict:
    return {
        "xp": p.xp,
        "stars": dict(p.stars),
        "streak": p.streak,
        "last_played": p.last_played.isoformat() if p.last_played else None,
        "badges": list(p.badges),
        "games_played": list(p.games_played),
        "total_rounds": p.total_rounds,
        "total_correct": p.total_correct,
        "total_questions": p.total_questions,
    }


def _progress_from_doc(doc: Optional[dict]) -> Progress:
    if not doc:
        return Progress()
    last_played = None
    raw = doc.get("last_played")
    if raw:
        try:
            last_played = date.fromisoformat(raw)
        except ValueError:
            last_played = None
    return Progress(
        xp=int(doc.get("xp", 0)),
        stars={k: int(v) for k, v in (doc.get("stars") or {}).items()},
        streak=int(doc.get("streak", 0)),
        last_played=last_played,
        badges=list(doc.get("badges") or []),
        games_played=list(doc.get("games_played") or []),
        total_rounds=int(doc.get("total_rounds", 0)),
        total_correct=int(doc.get("total_correct", 0)),
        total_questions=int(doc.get("total_questions", 0)),
    )


class MemoryStore:
    """Dict-backed store for local dev and tests."""

    def __init__(self):
        self._profiles: dict = {}
        self._progress: dict = {}
        self._history: dict = {}
        self._lock = threading.Lock()

    def list_profiles(self, device_id: Optional[str] = None) -> list:
        with self._lock:
            profiles = sorted(self._profiles.values(), key=lambda p: p["created_at"])
        if device_id is not None:
            profiles = [p for p in profiles if device_id in (p.get("device_ids") or [])]
        return profiles

    def get_profile(self, profile_id: str) -> Optional[dict]:
        with self._lock:
            return self._profiles.get(profile_id)

    def create_profile(self, name: str, avatar: str, device_id: str) -> dict:
        profile = {
            "id": uuid.uuid4().hex[:12],
            "name": name,
            "avatar": avatar,
            "device_ids": [device_id],
            "link_code": _new_link_code(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        with self._lock:
            self._profiles[profile["id"]] = profile
        return profile

    def link_device(self, link_code: str, device_id: str) -> Optional[dict]:
        with self._lock:
            for profile in self._profiles.values():
                if profile.get("link_code") == link_code:
                    devices = profile.setdefault("device_ids", [])
                    if device_id not in devices:
                        devices.append(device_id)
                    return profile
        return None

    def get_progress(self, profile_id: str) -> Progress:
        with self._lock:
            return _progress_from_doc(self._progress.get(profile_id))

    def save_progress(self, profile_id: str, progress: Progress, round_entry: Optional[dict] = None):
        with self._lock:
            self._progress[profile_id] = _progress_to_doc(progress)
            if round_entry:
                history = self._history.setdefault(profile_id, [])
                history.append(round_entry)
                del history[:-HISTORY_CAP]

    def get_history(self, profile_id: str) -> list:
        with self._lock:
            return list(self._history.get(profile_id, []))


class FirestoreStore:
    """Firestore-backed store. Raises on construction if Firestore is unreachable."""

    def __init__(self):
        from google.cloud import firestore  # deferred import

        self._db = firestore.Client()
        # Probe the connection early so callers can fall back cleanly.
        next(iter(self._db.collection(PROFILES_COLLECTION).limit(1).stream()), None)

    def list_profiles(self, device_id: Optional[str] = None) -> list:
        collection = self._db.collection(PROFILES_COLLECTION)
        if device_id is not None:
            from google.cloud.firestore_v1 import FieldFilter

            docs = collection.where(filter=FieldFilter("device_ids", "array_contains", device_id)).stream()
        else:
            docs = collection.stream()
        profiles = [{"id": d.id, **(d.to_dict() or {})} for d in docs]
        return sorted(profiles, key=lambda p: p.get("created_at") or "")

    def get_profile(self, profile_id: str) -> Optional[dict]:
        snap = self._db.collection(PROFILES_COLLECTION).document(profile_id).get()
        if not snap.exists:
            return None
        return {"id": snap.id, **(snap.to_dict() or {})}

    def create_profile(self, name: str, avatar: str, device_id: str) -> dict:
        profile_id = uuid.uuid4().hex[:12]
        data = {
            "name": name,
            "avatar": avatar,
            "device_ids": [device_id],
            "link_code": _new_link_code(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._db.collection(PROFILES_COLLECTION).document(profile_id).set(data)
        return {"id": profile_id, **data}

    def link_device(self, link_code: str, device_id: str) -> Optional[dict]:
        from google.cloud.firestore_v1 import ArrayUnion, FieldFilter

        docs = list(
            self._db.collection(PROFILES_COLLECTION)
            .where(filter=FieldFilter("link_code", "==", link_code))
            .limit(1)
            .stream()
        )
        if not docs:
            return None
        doc = docs[0]
        doc.reference.update({"device_ids": ArrayUnion([device_id])})
        data = doc.to_dict() or {}
        devices = data.get("device_ids") or []
        if device_id not in devices:
            devices.append(device_id)
        data["device_ids"] = devices
        return {"id": doc.id, **data}

    def get_progress(self, profile_id: str) -> Progress:
        snap = self._db.collection(PROGRESS_COLLECTION).document(profile_id).get()
        return _progress_from_doc(snap.to_dict() if snap.exists else None)

    def save_progress(self, profile_id: str, progress: Progress, round_entry: Optional[dict] = None):
        doc_ref = self._db.collection(PROGRESS_COLLECTION).document(profile_id)
        data = _progress_to_doc(progress)
        if round_entry:
            snap = doc_ref.get()
            history = (snap.to_dict() or {}).get("history", []) if snap.exists else []
            history.append(round_entry)
            data["history"] = history[-HISTORY_CAP:]
        else:
            snap = doc_ref.get()
            if snap.exists:
                data["history"] = (snap.to_dict() or {}).get("history", [])
        doc_ref.set(data)

    def get_history(self, profile_id: str) -> list:
        snap = self._db.collection(PROGRESS_COLLECTION).document(profile_id).get()
        if not snap.exists:
            return []
        return (snap.to_dict() or {}).get("history", [])


_store = None
_store_lock = threading.Lock()


def get_store():
    """Singleton store: Firestore when reachable, memory otherwise."""
    global _store
    if _store is not None:
        return _store
    with _store_lock:
        if _store is not None:
            return _store
        try:
            _store = FirestoreStore()
            logger.info("Using Firestore store")
        except Exception as exc:  # noqa: BLE001 — any failure means local mode
            logger.warning("Firestore unavailable (%s) — using in-memory store", exc)
            _store = MemoryStore()
        return _store


def reset_store_for_tests(store=None):
    global _store
    _store = store
