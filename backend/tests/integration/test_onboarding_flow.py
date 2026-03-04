"""
Integration tests: Complete onboarding flow.

Covers T11.1: register → verify email → login → submit MEQ → create obligations
              → generate plan (full end-to-end via API with real DB).
"""

import asyncio
import uuid
from datetime import date

from app.config import settings
from app.services.auth_service import AuthService


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _register(client, email: str | None = None):
    email = email or f"flow-{uuid.uuid4().hex}@test.com"
    r = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "FlowPass123", "name": "Flow User", "timezone": "UTC"},
    )
    assert r.status_code == 201
    data = r.json()
    return data["access_token"], data["user"]["id"], email


def _meq_responses():
    """Balanced MEQ responses (intermediate chronotype, score ~42-58)."""
    return {f"q{i}": 3 for i in range(1, 20)}


class TestCompleteOnboardingFlow:
    """Tests the complete new-user onboarding journey end-to-end."""

    def test_register_and_profile(self, client):
        token, user_id, email = _register(client)

        # Can fetch own profile — UserOut is returned directly (not wrapped in {"user": ...})
        me = client.get("/api/v1/users/me", headers=_auth_headers(token))
        assert me.status_code == 200
        me_data = me.json()
        # Response_model=UserOut returns the object directly
        assert me_data.get("email") == email

        # Chronotype not yet set → returns null assessment
        current = client.get("/api/v1/chronotype/current", headers=_auth_headers(token))
        assert current.status_code == 200
        assert current.json()["assessment"] is None

    def test_email_verification_flow(self, client):
        token, user_id, _ = _register(client)
        svc = AuthService()

        # Create a verification token
        verify_token = asyncio.run(
            svc.tokens.create_one_time_token(
                user_id, "verify", settings.VERIFY_TOKEN_EXPIRE_MINUTES
            )
        )

        # Verify using the token
        r = client.post("/api/v1/auth/verify-email", json={"token": verify_token})
        assert r.status_code == 200

        # Using it again should fail (one-time use)
        r2 = client.post("/api/v1/auth/verify-email", json={"token": verify_token})
        assert r2.status_code in (400, 422)

    def test_submit_meq_and_get_chronotype(self, client):
        token, _, _ = _register(client)
        responses = _meq_responses()

        r = client.post(
            "/api/v1/chronotype/assessment",
            json={"responses": responses},
            headers=_auth_headers(token),
        )
        assert r.status_code == 201
        data = r.json()
        assert "chronotype" in data
        assert data["chronotype"] in (
            "extreme_morning",
            "moderate_morning",
            "intermediate",
            "moderate_evening",
            "extreme_evening",
        )
        assert 16 <= data["score"] <= 86

        # Can now fetch assessment
        current = client.get("/api/v1/chronotype/current", headers=_auth_headers(token))
        assert current.status_code == 200
        assert current.json()["assessment"] is not None

        # Can get ideal times
        times = client.get("/api/v1/chronotype/ideal-times", headers=_auth_headers(token))
        assert times.status_code == 200
        times_data = times.json()
        assert "wake_time" in times_data
        assert "sleep_time" in times_data

    def test_create_obligations_and_conflict_check(self, client):
        token, _, _ = _register(client)
        today = date.today().isoformat()

        # Create first obligation
        r1 = client.post(
            "/api/v1/obligations",
            json={
                "name": "Morning Work",
                "type": "work",
                "start_time": "09:00:00",
                "end_time": "13:00:00",
                "days_of_week": [0, 1, 2, 3, 4],
                "is_recurring": True,
                "valid_from": today,
                "valid_until": None,
            },
            headers=_auth_headers(token),
        )
        assert r1.status_code == 201

        # Create second obligation (no conflict)
        r2 = client.post(
            "/api/v1/obligations",
            json={
                "name": "Afternoon Study",
                "type": "class",
                "start_time": "15:00:00",
                "end_time": "17:00:00",
                "days_of_week": [1, 3],
                "is_recurring": True,
                "valid_from": today,
                "valid_until": None,
            },
            headers=_auth_headers(token),
        )
        assert r2.status_code == 201

        # List obligations
        lst = client.get("/api/v1/obligations", headers=_auth_headers(token))
        assert lst.status_code == 200
        assert len(lst.json()["obligations"]) == 2

        # Check conflicts with overlapping range
        conflict = client.post(
            "/api/v1/obligations/check-conflicts",
            params={
                "start_time": "10:00:00",
                "end_time": "12:00:00",
                "days_of_week": [0],
            },
            headers=_auth_headers(token),
        )
        assert conflict.status_code == 200
        assert conflict.json()["has_conflicts"] is True

        # No conflict with a non-overlapping range
        no_conflict = client.post(
            "/api/v1/obligations/check-conflicts",
            params={
                "start_time": "18:00:00",
                "end_time": "20:00:00",
                "days_of_week": [0],
            },
            headers=_auth_headers(token),
        )
        assert no_conflict.status_code == 200
        assert no_conflict.json()["has_conflicts"] is False

    def test_generate_plan_requires_assessment(self, client):
        token, _, _ = _register(client)

        # Without MEQ, plan generation should fail (400)
        r = client.post(
            "/api/v1/plans/generate",
            json={"start_date": date.today().isoformat()},
            headers=_auth_headers(token),
        )
        assert r.status_code == 400

    def test_full_onboarding_to_plan(self, client):
        """Full onboarding flow: register → MEQ → obligation → generate plan."""
        token, _, _ = _register(client)
        today = date.today().isoformat()

        # 1. Submit MEQ
        assess = client.post(
            "/api/v1/chronotype/assessment",
            json={"responses": _meq_responses()},
            headers=_auth_headers(token),
        )
        assert assess.status_code == 201

        # 2. Add obligation
        obl = client.post(
            "/api/v1/obligations",
            json={
                "name": "Work",
                "type": "work",
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "days_of_week": [0, 1, 2, 3, 4],
                "is_recurring": True,
                "valid_from": today,
                "valid_until": None,
            },
            headers=_auth_headers(token),
        )
        assert obl.status_code == 201

        # 3. Generate plan
        plan = client.post(
            "/api/v1/plans/generate",
            json={"start_date": today},
            headers=_auth_headers(token),
        )
        assert plan.status_code == 201
        plan_data = plan.json()
        assert "plan" in plan_data
        assert "schedules" in plan_data
        assert len(plan_data["schedules"]) == 7

        # 4. Fetch today's schedule
        today_schedule = client.get("/api/v1/plans/today", headers=_auth_headers(token))
        assert today_schedule.status_code == 200
        today_data = today_schedule.json()
        assert "schedule" in today_data
        assert "items" in today_data

        # 5. View plan history
        hist = client.get("/api/v1/plans/history", headers=_auth_headers(token))
        assert hist.status_code == 200
        assert len(hist.json()["plans"]) >= 1

    def test_full_onboarding_with_transition_plan(self, client):
        """Test that a transition plan is generated when current sleep differs significantly.

        The transition plan endpoint requires an existing (active) plan to determine
        the current sleep/wake times to transition FROM.
        """
        token, _, _ = _register(client)
        today = date.today().isoformat()

        # Step 1: Submit MEQ (required for plan generation)
        client.post(
            "/api/v1/chronotype/assessment",
            json={"responses": _meq_responses()},
            headers=_auth_headers(token),
        )

        # Step 2: Generate a regular plan first (transition plan requires an active plan)
        gen = client.post(
            "/api/v1/plans/generate",
            json={"start_date": today},
            headers=_auth_headers(token),
        )
        assert gen.status_code == 201

        # Step 3: Generate transition plan toward an earlier schedule
        trans = client.post(
            "/api/v1/plans/transition",
            json={
                "target_wake_time": "06:00:00",
                "target_sleep_time": "22:00:00",
                "max_daily_shift_minutes": 30,
            },
            headers=_auth_headers(token),
        )
        assert trans.status_code == 201
        trans_data = trans.json()
        assert "plan" in trans_data
        assert "schedules" in trans_data

    def test_login_after_registration(self, client):
        """Test that a registered user can log in and receive tokens."""
        email = f"login-{uuid.uuid4().hex}@test.com"
        password = "LoginPass123"

        reg = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "name": "Login User"},
        )
        assert reg.status_code == 201

        login = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert login.status_code == 200
        data = login.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == email

    def test_password_reset_flow(self, client):
        token, user_id, _ = _register(client)
        svc = AuthService()

        # Create reset token
        reset_token = asyncio.run(
            svc.tokens.create_one_time_token(user_id, "reset", settings.RESET_TOKEN_EXPIRE_MINUTES)
        )

        # Reset password
        r = client.post(
            "/api/v1/auth/reset-password",
            json={"token": reset_token, "password": "NewPass456"},
        )
        assert r.status_code == 200

        # Old token is consumed; second use should fail
        r2 = client.post(
            "/api/v1/auth/reset-password",
            json={"token": reset_token, "password": "AnotherPass789"},
        )
        assert r2.status_code in (400, 422)
