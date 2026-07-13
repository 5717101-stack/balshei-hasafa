from datetime import date

import pytest

from app.progression import (
    GAME_IDS,
    Progress,
    RoundResult,
    apply_round,
    rank_for_xp,
    stars_for_round,
    update_streak,
    xp_for_round,
)


class TestXP:
    def test_xp_per_correct(self):
        assert xp_for_round(5, 10) == 50

    def test_perfect_bonus(self):
        assert xp_for_round(10, 10) == 100 + 20

    def test_zero(self):
        assert xp_for_round(0, 10) == 0


class TestStars:
    @pytest.mark.parametrize("correct,total,expected", [
        (10, 10, 3),
        (9, 10, 3),
        (8, 10, 2),
        (7, 10, 2),
        (5, 10, 1),
        (4, 10, 1),
        (3, 10, 0),
        (0, 10, 0),
    ])
    def test_thresholds(self, correct, total, expected):
        assert stars_for_round(correct, total) == expected

    def test_zero_total(self):
        assert stars_for_round(0, 0) == 0


class TestRanks:
    def test_rookie(self):
        rank = rank_for_xp(0)
        assert rank["id"] == "rookie"
        assert rank["next_min_xp"] == 250

    def test_top_rank_has_no_next(self):
        rank = rank_for_xp(99999)
        assert rank["id"] == "chief"
        assert rank["next_label"] is None

    def test_ranks_never_drop_by_design(self):
        # rank is a pure function of xp, and xp only ever grows in apply_round
        p = Progress(xp=700)
        apply_round(p, RoundResult("roots", 0, 10, date(2026, 7, 13)))
        assert p.xp == 700  # zero correct adds zero xp, never subtracts


class TestStreak:
    def test_first_play(self):
        assert update_streak(None, 0, date(2026, 7, 13)) == 1

    def test_same_day_keeps(self):
        assert update_streak(date(2026, 7, 13), 4, date(2026, 7, 13)) == 4

    def test_consecutive_grows(self):
        assert update_streak(date(2026, 7, 12), 4, date(2026, 7, 13)) == 5

    def test_gap_restarts_at_one_not_zero(self):
        assert update_streak(date(2026, 7, 1), 9, date(2026, 7, 13)) == 1


class TestApplyRound:
    def test_happy_path(self):
        p = Progress()
        summary = apply_round(p, RoundResult("roots", 9, 10, date(2026, 7, 13)))
        assert summary["xp_earned"] == 90
        assert summary["round_stars"] == 3
        assert p.stars["roots"] == 3
        assert p.streak == 1
        assert "first_case" in p.badges

    def test_stars_only_go_up(self):
        p = Progress()
        apply_round(p, RoundResult("roots", 10, 10, date(2026, 7, 13)))
        assert p.stars["roots"] == 3
        summary = apply_round(p, RoundResult("roots", 4, 10, date(2026, 7, 13)))
        assert p.stars["roots"] == 3  # kept the max
        assert summary["round_stars"] == 1
        assert summary["stars_improved"] is False

    def test_perfect_round_badge_once(self):
        p = Progress()
        apply_round(p, RoundResult("roots", 10, 10, date(2026, 7, 13)))
        apply_round(p, RoundResult("wordsort", 10, 10, date(2026, 7, 13)))
        assert p.badges.count("perfect_round") == 1

    def test_all_games_badge(self):
        p = Progress()
        for g in GAME_IDS:
            apply_round(p, RoundResult(g, 5, 10, date(2026, 7, 13)))
        assert "all_games" in p.badges

    def test_unknown_game_rejected(self):
        with pytest.raises(ValueError):
            apply_round(Progress(), RoundResult("nope", 1, 10, date(2026, 7, 13)))

    def test_correct_clamped_to_total(self):
        p = Progress()
        summary = apply_round(p, RoundResult("roots", 15, 10, date(2026, 7, 13)))
        assert summary["xp_earned"] == 120  # 10 correct + perfect bonus
        assert p.total_correct == 10

    def test_streak_badges(self):
        p = Progress()
        for day in range(1, 8):
            apply_round(p, RoundResult("roots", 5, 10, date(2026, 7, day)))
        assert "streak_3" in p.badges
        assert "streak_7" in p.badges

    def test_xp_badges(self):
        p = Progress()
        for _ in range(5):
            apply_round(p, RoundResult("roots", 10, 10, date(2026, 7, 13)))
        assert p.xp == 600
        assert "xp_500" in p.badges
