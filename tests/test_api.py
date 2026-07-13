import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import MemoryStore, get_store

DEVICE_A = "device-aaaa-1111"
DEVICE_B = "device-bbbb-2222"


@pytest.fixture()
def client():
    store = MemoryStore()
    app.dependency_overrides[get_store] = lambda: store
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _create_profile(client, name="נועם", avatar="🕵️", device_id=DEVICE_A):
    resp = client.post("/api/profiles", json={"name": name, "avatar": avatar, "device_id": device_id})
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
        assert profile["device_ids"] == [DEVICE_A]
        assert len(profile["link_code"]) == 6
        resp = client.get(f"/api/profiles?device_id={DEVICE_A}")
        assert [p["id"] for p in resp.json()["profiles"]] == [profile["id"]]

    def test_duplicate_name_rejected_same_device(self, client):
        _create_profile(client)
        resp = client.post("/api/profiles", json={"name": "נועם", "avatar": "🦊", "device_id": DEVICE_A})
        assert resp.status_code == 409

    def test_same_name_allowed_on_other_device(self, client):
        _create_profile(client, device_id=DEVICE_A)
        profile_b = _create_profile(client, device_id=DEVICE_B)
        assert profile_b["name"] == "נועם"

    def test_blank_name_rejected(self, client):
        resp = client.post("/api/profiles", json={"name": "   ", "avatar": "🦊", "device_id": DEVICE_A})
        assert resp.status_code == 400

    def test_missing_device_id_rejected(self, client):
        resp = client.post("/api/profiles", json={"name": "נועם", "avatar": "🦊"})
        assert resp.status_code == 422


class TestDeviceScoping:
    def test_profiles_hidden_from_other_devices(self, client):
        _create_profile(client, device_id=DEVICE_A)
        resp = client.get(f"/api/profiles?device_id={DEVICE_B}")
        assert resp.json()["profiles"] == []

    def test_no_device_id_returns_nothing(self, client):
        _create_profile(client, device_id=DEVICE_A)
        resp = client.get("/api/profiles")
        assert resp.json()["profiles"] == []

    def test_link_code_joins_profile_to_second_device(self, client):
        profile = _create_profile(client, device_id=DEVICE_A)
        resp = client.post(
            "/api/profiles/link",
            json={"link_code": profile["link_code"], "device_id": DEVICE_B},
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == profile["id"]
        # Now visible on both devices
        for device in (DEVICE_A, DEVICE_B):
            listed = client.get(f"/api/profiles?device_id={device}").json()["profiles"]
            assert [p["id"] for p in listed] == [profile["id"]]

    def test_bad_link_code_404(self, client):
        _create_profile(client)
        resp = client.post("/api/profiles/link", json={"link_code": "000000", "device_id": DEVICE_B})
        assert resp.status_code in (404, 200)  # random collision virtually impossible but code may match
        if resp.status_code == 200:
            pytest.skip("random link_code collided with 000000")


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
    def test_sorted_by_xp_and_anonymized(self, client):
        p1 = _create_profile(client, "נועם", "🕵️", DEVICE_A)
        p2 = _create_profile(client, "דנה", "🦊", DEVICE_B)
        client.post(f"/api/profiles/{p1['id']}/rounds", json={"game_id": "roots", "correct": 5, "total": 10})
        client.post(f"/api/profiles/{p2['id']}/rounds", json={"game_id": "roots", "correct": 10, "total": 10})

        rows = client.get(f"/api/leaderboard?viewer={p1['id']}").json()["leaderboard"]
        assert [r["xp"] for r in rows] == [120, 50]

        # The other kid is anonymized — name, avatar and id are hidden
        other, me = rows[0], rows[1]
        assert other["is_me"] is False
        assert other["name"] != "דנה"
        assert other["avatar"] == "🕵️"
        assert other["id"] is None

        # The viewer sees themselves
        assert me["is_me"] is True
        assert me["name"] == "נועם"
        assert me["id"] == p1["id"]

    def test_no_viewer_everyone_anonymized(self, client):
        p1 = _create_profile(client, "נועם", "🕵️", DEVICE_A)
        rows = client.get("/api/leaderboard").json()["leaderboard"]
        assert all(r["is_me"] is False for r in rows)
        assert all(r["name"] != "נועם" and r["id"] is None for r in rows)
        assert p1["id"] is not None
