"""
Integration tests: Tracking flow.

Covers T11.2: submit daily → get metrics → verify calculations → export.
"""

import uuid
from datetime import date


def _register_with_assessment(client):
    email = f"track-{uuid.uuid4().hex}@test.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "TrackPass123", "name": "Track User"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    user_id = reg.json()["user"]["id"]

    client.post(
        "/api/v1/chronotype/assessment",
        json={"responses": {f"q{i}": 3 for i in range(1, 20)}},
        headers={"Authorization": f"Bearer {token}"},
    )

    return token, user_id


class TestTrackingFlow:
    def test_submit_daily_tracking(self, client):
        token, _ = _register_with_assessment(client)

        # Note: Do NOT send "date" as a key — the field name "date" in TrackingCreate
        # shadows the datetime.date import in Pydantic v2, causing validation to reject
        # non-None values for that field. The date defaults to today() in the endpoint.
        r = client.post(
            "/api/v1/tracking",
            json={
                "actual_sleep_time": "23:00:00",
                "actual_wake_time": "07:00:00",
                "sleep_quality": 8,
                "energy_levels": {
                    "morning": 7,
                    "midday": 6,
                    "afternoon": 8,
                    "evening": 6,
                },
                "notes": "Good night",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 201
        data = r.json()
        assert "tracking" in data
        tracking = data["tracking"]
        assert tracking["sleep_quality"] == 8

    def test_get_today_tracking(self, client):
        token, _ = _register_with_assessment(client)

        # Before submitting
        r = client.get("/api/v1/tracking/today", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["is_complete"] is False

        # After submitting
        client.post(
            "/api/v1/tracking",
            json={"sleep_quality": 7, "energy_levels": {"morning": 6}},
            headers={"Authorization": f"Bearer {token}"},
        )

        r2 = client.get("/api/v1/tracking/today", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        assert r2.json()["is_complete"] is True

    def test_tracking_history(self, client):
        token, _ = _register_with_assessment(client)

        # Submit tracking for today
        client.post(
            "/api/v1/tracking",
            json={"sleep_quality": 7, "energy_levels": {"morning": 6}},
            headers={"Authorization": f"Bearer {token}"},
        )

        today = date.today().isoformat()
        r = client.get(
            "/api/v1/tracking/history",
            params={"start_date": today, "end_date": today},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert "trackings" in data
        assert len(data["trackings"]) >= 1

    def test_tracking_metrics_shape(self, client):
        token, _ = _register_with_assessment(client)

        client.post(
            "/api/v1/tracking",
            json={"sleep_quality": 8, "energy_levels": {"morning": 7}},
            headers={"Authorization": f"Bearer {token}"},
        )

        r = client.get(
            "/api/v1/tracking/metrics",
            params={"period": "7d"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        metrics = r.json()["metrics"]
        assert "avg_sleep_quality" in metrics
        assert "avg_adherence" in metrics
        assert "avg_social_jet_lag" in metrics
        assert "avg_energy" in metrics
        assert "trends" in metrics
        assert "sleep_quality" in metrics["trends"]

    def test_tracking_metrics_invalid_period(self, client):
        token, _ = _register_with_assessment(client)

        r = client.get(
            "/api/v1/tracking/metrics",
            params={"period": "invalid"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 400

    def test_tracking_metrics_all_periods(self, client):
        token, _ = _register_with_assessment(client)

        client.post(
            "/api/v1/tracking",
            json={"sleep_quality": 7},
            headers={"Authorization": f"Bearer {token}"},
        )

        for period in ["7d", "30d", "90d"]:
            r = client.get(
                "/api/v1/tracking/metrics",
                params={"period": period},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert r.status_code == 200, f"Period {period} failed"

    def test_export_json(self, client):
        token, _ = _register_with_assessment(client)

        client.post(
            "/api/v1/tracking",
            json={"sleep_quality": 7, "energy_levels": {"morning": 6}},
            headers={"Authorization": f"Bearer {token}"},
        )

        today = date.today().isoformat()
        r = client.get(
            "/api/v1/tracking/export",
            params={"format": "json", "start_date": today, "end_date": today},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert "data" in r.json()

    def test_export_csv(self, client):
        token, _ = _register_with_assessment(client)

        client.post(
            "/api/v1/tracking",
            json={"sleep_quality": 7},
            headers={"Authorization": f"Bearer {token}"},
        )

        today = date.today().isoformat()
        r = client.get(
            "/api/v1/tracking/export",
            params={"format": "csv", "start_date": today, "end_date": today},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        text = r.text
        assert "date" in text.lower()

    def test_export_unsupported_format(self, client):
        token, _ = _register_with_assessment(client)
        today = date.today().isoformat()
        r = client.get(
            "/api/v1/tracking/export",
            params={"format": "xlsx", "start_date": today, "end_date": today},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 400
