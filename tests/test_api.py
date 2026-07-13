import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import MemoryStore, get_store


@pytest.fixture()
def client():
    store = MemoryStore()
    app.dependency_overrides[get_store] = lambda: store
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _create_profile(client, name="נועם", avatar="🕵️"):
    resp = client.post("/api/profiles", json={"name": name, "avatar": avatar})
    assert resp.status_code == 200
    return resp.json()


class TestHealth:
    def test_health_bare_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.text == "ok"


class TestProfiles:
    def test_create_and_list(self, client):
        profile = _create_profile(client)
        assert profile["name"] == "נועם"
        resp = client.get("/api/profiles")
        assert [p["id"] for p in resp.json()["profiles"]] == [profile["id"]]

    def test_duplicate_name_rejected(self, client):
        _create_profile(client)
        resp = client.post("/api/profiles", json={"name": "נועם", "avatar": "🦊"})
        assert resp.status_code == 409

    def test_blank_name_rejected(self, client):
        resp = client.post("/api/profiles", json={"name": "   ", "avatar": "🦊"})
        assert resp.status_code == 400


class TestRounds:
    def test_submit_round_updates_progress(self, client):
        profile = _create_profile(client)
        resp = client.post(
            f"/api/profiles/{profile['id']}/rounds",
            json={"game_id": "roots", "correct": 9, "total": 10},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["summary"]["xp_earned"] == 90
        assert body["progress"]["xp"] == 90
        assert body["progress"]["stars"]["roots"] == 3
        assert body["progress"]["streak"] == 1
        assert body["progress"]["played_today"] is True

        # Progress persists across requests
        resp2 = client.get(f"/api/profiles/{profile['id']}/progress")
        assert resp2.json()["xp"] == 90

    def test_unknown_game_400(self, client):
        profile = _create_profile(client)
        resp = client.post(
            f"/api/profiles/{profile['id']}/rounds",
            json={"game_id": "tetris", "correct": 1, "total": 10},
        )
        assert resp.status_code == 400

    def test_correct_gt_total_400(self, client):
        profile = _create_profile(client)
        resp = client.post(
            f"/api/profiles/{profile['id']}/rounds",
            json={"game_id": "roots", "correct": 11, "total": 10},
        )
        assert resp.status_code == 400

    def test_missing_profile_404(self, client):
        resp = client.post(
            "/api/profiles/none/rounds",
            json={"game_id": "roots", "correct": 1, "total": 10},
        )
        assert resp.status_code == 404

    def test_history_recorded(self, client):
        profile = _create_profile(client)
        client.post(
            f"/api/profiles/{profile['id']}/rounds",
            json={"game_id": "wordsort", "correct": 7, "total": 10},
        )
        resp = client.get(f"/api/profiles/{profile['id']}/history")
        history = resp.json()["history"]
        assert len(history) == 1
        assert history[0]["game_id"] == "wordsort"
        assert history[0]["xp_earned"] == 70


class TestLeaderboard:
    def test_sorted_by_xp(self, client):
        p1 = _create_profile(client, "נועם", "🕵️")
        p2 = _create_profile(client, "דנה", "🦊")
        client.post(f"/api/profiles/{p1['id']}/rounds", json={"game_id": "roots", "correct": 5, "total": 10})
        client.post(f"/api/profiles/{p2['id']}/rounds", json={"game_id": "roots", "correct": 10, "total": 10})
        rows = client.get("/api/leaderboard").json()["leaderboard"]
        assert [r["name"] for r in rows] == ["דנה", "נועם"]
        assert rows[0]["xp"] == 120
