import uuid
from datetime import date


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_tracking_persists_adherence_and_jetlag_when_plan_exists(client):
    email = f"metrics-{uuid.uuid4().hex}@test.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "MetricPass123",
            "name": "Metric User",
            "timezone": "UTC",
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]

    # MEQ assessment (required for plan generation)
    assess = client.post(
        "/api/v1/chronotype/assessment",
        json={"responses": {f"q{i}": 3 for i in range(1, 20)}},
        headers=_auth_headers(token),
    )
    assert assess.status_code == 201

    today = date.today().isoformat()

    # Generate plan for today
    gen = client.post(
        "/api/v1/plans/generate",
        json={"start_date": today},
        headers=_auth_headers(token),
    )
    assert gen.status_code == 201

    # Fetch today's planned schedule
    planned = client.get("/api/v1/plans/today", headers=_auth_headers(token))
    assert planned.status_code == 200
    sched = planned.json()["schedule"]
    assert sched is not None

    # Submit tracking with exact planned sleep/wake => adherence 100, jet lag 0
    tr = client.post(
        "/api/v1/tracking",
        json={
            "actual_sleep_time": sched["sleep_time"],
            "actual_wake_time": sched["wake_time"],
            "sleep_quality": 8,
        },
        headers=_auth_headers(token),
    )
    assert tr.status_code == 201
    tracking = tr.json()["tracking"]
    assert tracking["adherence_percentage"] == 100.0
    assert tracking["social_jet_lag_minutes"] == 0

    # Metrics endpoint should reflect adherence
    metrics = client.get(
        "/api/v1/tracking/metrics",
        params={"period": "7d"},
        headers=_auth_headers(token),
    )
    assert metrics.status_code == 200
    m = metrics.json()["metrics"]
    assert m["avg_adherence"] == 100.0
