"""Pure gamification logic — XP, ranks, stars, streaks, badges.

No I/O here. Everything is deterministic and unit-testable.
Design constraints (kid-safe, per the research notes in the plan):
- No punishment: a broken streak silently restarts at 1, ranks never drop.
- Stars per game only ever go UP (stored as max of all attempts).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional

GAME_IDS = [
    "roots",        # בלש השורשים
    "wordsort",     # מי אני?
    "imposter",     # המילה המתחזה
    "wordchain",    # שרשרת מילים
    "connectives",  # מילות קישור
    "adjectives",   # שם התואר המתאים
]

XP_PER_CORRECT = 10
XP_PERFECT_BONUS = 20

# (min_xp, rank_id, Hebrew label, emoji)
RANKS = [
    (0, "rookie", "בלש מתחיל", "🔍"),
    (250, "junior", "חוקר צעיר", "🕵️"),
    (700, "expert", "חוקר מומחה", "🧠"),
    (1400, "super", "בלש-על", "🌟"),
    (2500, "chief", "המפקח הראשי", "🏆"),
]

BADGES = {
    "first_case": {"name": "התיק הראשון", "emoji": "📂", "desc": "סיימת את הסבב הראשון שלך"},
    "perfect_round": {"name": "פענוח מושלם", "emoji": "💯", "desc": "סבב שלם בלי אף טעות"},
    "streak_3": {"name": "3 ימים ברצף", "emoji": "🔥", "desc": "שיחקת שלושה ימים ברציפות"},
    "streak_7": {"name": "שבוע שלם!", "emoji": "🚀", "desc": "שיחקת שבעה ימים ברציפות"},
    "star_collector": {"name": "אספן כוכבים", "emoji": "⭐", "desc": "השגת 3 כוכבים בתיק כלשהו"},
    "all_games": {"name": "בלש רב-תחומי", "emoji": "🗂️", "desc": "שיחקת בכל ששת התיקים"},
    "xp_500": {"name": "500 נקודות", "emoji": "🎖️", "desc": "צברת 500 נקודות חקירה"},
    "xp_1500": {"name": "1,500 נקודות", "emoji": "🏅", "desc": "צברת 1,500 נקודות חקירה"},
    "all_stars": {"name": "שמיים מלאי כוכבים", "emoji": "🌌", "desc": "3 כוכבים בכל התיקים"},
    "hundred_correct": {"name": "100 תשובות נכונות", "emoji": "🎯", "desc": "ענית נכון על 100 שאלות"},
}


@dataclass
class RoundResult:
    game_id: str
    correct: int
    total: int
    played_on: date


@dataclass
class Progress:
    """Mutable progress snapshot for one profile."""
    xp: int = 0
    stars: dict = field(default_factory=dict)          # game_id -> 0..3 (max ever)
    streak: int = 0
    last_played: Optional[date] = None
    badges: list = field(default_factory=list)          # badge ids, insertion order
    games_played: list = field(default_factory=list)    # distinct game ids
    total_rounds: int = 0
    total_correct: int = 0
    total_questions: int = 0


def xp_for_round(correct: int, total: int) -> int:
    xp = correct * XP_PER_CORRECT
    if total > 0 and correct == total:
        xp += XP_PERFECT_BONUS
    return xp


def stars_for_round(correct: int, total: int) -> int:
    if total <= 0:
        return 0
    ratio = correct / total
    if ratio >= 0.9:
        return 3
    if ratio >= 0.7:
        return 2
    if ratio >= 0.4:
        return 1
    return 0


def rank_for_xp(xp: int) -> dict:
    current = RANKS[0]
    next_rank = None
    for i, r in enumerate(RANKS):
        if xp >= r[0]:
            current = r
            next_rank = RANKS[i + 1] if i + 1 < len(RANKS) else None
    return {
        "id": current[1],
        "label": current[2],
        "emoji": current[3],
        "min_xp": current[0],
        "next_label": next_rank[2] if next_rank else None,
        "next_min_xp": next_rank[0] if next_rank else None,
    }


def update_streak(last_played: Optional[date], streak: int, today: date) -> int:
    """Gentle streak: same-day play keeps it, consecutive-day play grows it,
    any gap just restarts at 1 (never zero, never a penalty message)."""
    if last_played is None:
        return 1
    if last_played == today:
        return max(streak, 1)
    if last_played == today - timedelta(days=1):
        return max(streak, 0) + 1
    return 1


def compute_new_badges(progress: Progress) -> list:
    """Return badge ids earned by the current state that aren't held yet."""
    earned = []

    def check(badge_id: str, condition: bool):
        if condition and badge_id not in progress.badges and badge_id not in earned:
            earned.append(badge_id)

    check("first_case", progress.total_rounds >= 1)
    check("streak_3", progress.streak >= 3)
    check("streak_7", progress.streak >= 7)
    check("star_collector", any(s >= 3 for s in progress.stars.values()))
    check("all_games", set(GAME_IDS).issubset(set(progress.games_played)))
    check("xp_500", progress.xp >= 500)
    check("xp_1500", progress.xp >= 1500)
    check("all_stars", all(progress.stars.get(g, 0) >= 3 for g in GAME_IDS))
    check("hundred_correct", progress.total_correct >= 100)
    return earned


def apply_round(progress: Progress, result: RoundResult) -> dict:
    """Apply a finished round to the progress snapshot (mutates it).

    Returns a summary dict: xp earned, stars, rank, newly earned badges.
    """
    if result.game_id not in GAME_IDS:
        raise ValueError(f"unknown game_id: {result.game_id}")
    correct = max(0, min(result.correct, result.total))

    earned_xp = xp_for_round(correct, result.total)
    round_stars = stars_for_round(correct, result.total)

    progress.xp += earned_xp
    prev_stars = progress.stars.get(result.game_id, 0)
    progress.stars[result.game_id] = max(prev_stars, round_stars)
    progress.streak = update_streak(progress.last_played, progress.streak, result.played_on)
    progress.last_played = result.played_on
    if result.game_id not in progress.games_played:
        progress.games_played.append(result.game_id)
    progress.total_rounds += 1
    progress.total_correct += correct
    progress.total_questions += result.total

    new_badges = []
    if result.total > 0 and correct == result.total and "perfect_round" not in progress.badges:
        new_badges.append("perfect_round")
    new_badges.extend(compute_new_badges(progress))
    progress.badges.extend(new_badges)

    return {
        "xp_earned": earned_xp,
        "round_stars": round_stars,
        "game_stars": progress.stars[result.game_id],
        "stars_improved": progress.stars[result.game_id] > prev_stars,
        "rank": rank_for_xp(progress.xp),
        "streak": progress.streak,
        "new_badges": [{"id": b, **BADGES[b]} for b in new_badges],
    }
