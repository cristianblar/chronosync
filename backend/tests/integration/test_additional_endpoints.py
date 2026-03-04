import asyncio
import uuid
from datetime import date, timedelta, datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.education import EducationalContent, FAQ
from app.models.notification import Notification, NotificationType, NotificationSettings
from app.models.user import User
from app.models.chronotype import ChronotypeAssessment
from app.models.obligation import Obligation
from app.models.plan import SleepPlan, DailySchedule, ScheduleItem
from app.models.tracking import DailyTracking, EnergyLog
from app.models.event import Event
from app.models.refresh_token import RefreshToken
from app.models.device import DeviceRegistration
from app.models.user_article_progress import UserArticleProgress
from app.services.auth_service import AuthService
import app.services.auth_service as auth_service_module


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _register_and_token(client, sample_user_data):
    r = client.post("/api/v1/auth/register", json=sample_user_data)
    assert r.status_code == 201
    data = r.json()
    return data["access_token"], data["refresh_token"], data["user"]["id"]


async def _seed_education(engine):
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        slug = f"sleep-basics-{uuid.uuid4().hex}"
        content = EducationalContent(
            title="Sleep Basics",
            slug=slug,
            excerpt="Basics of sleep",
            body="Content",
            category="basics",
            tags=["sleep", "basics"],
            target_chronotypes=["intermediate"],
            is_published=True,
        )
        faq = FAQ(question="Q1?", answer="A1", category="general")
        db.add(content)
        db.add(faq)
        await db.commit()
        await db.refresh(content)
        await db.refresh(faq)
        return {"id": str(content.id), "slug": slug}


async def _count_user_rows(engine, user_id):
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:

        async def _count(stmt):
            res = await db.execute(stmt)
            return res.scalar() or 0

        return {
            "users": await _count(select(func.count()).select_from(User).where(User.id == user_id)),
            "assessments": await _count(
                select(func.count())
                .select_from(ChronotypeAssessment)
                .where(ChronotypeAssessment.user_id == user_id)
            ),
            "obligations": await _count(
                select(func.count()).select_from(Obligation).where(Obligation.user_id == user_id)
            ),
            "plans": await _count(
                select(func.count()).select_from(SleepPlan).where(SleepPlan.user_id == user_id)
            ),
            "daily_schedules": await _count(
                select(func.count())
                .select_from(DailySchedule)
                .join(SleepPlan)
                .where(SleepPlan.user_id == user_id)
            ),
            "schedule_items": await _count(
                select(func.count())
                .select_from(ScheduleItem)
                .join(DailySchedule)
                .join(SleepPlan)
                .where(SleepPlan.user_id == user_id)
            ),
            "trackings": await _count(
                select(func.count())
                .select_from(DailyTracking)
                .where(DailyTracking.user_id == user_id)
            ),
            "energy_logs": await _count(
                select(func.count()).select_from(EnergyLog).where(EnergyLog.user_id == user_id)
            ),
            "notifications": await _count(
                select(func.count())
                .select_from(Notification)
                .where(Notification.user_id == user_id)
            ),
            "notification_settings": await _count(
                select(func.count())
                .select_from(NotificationSettings)
                .where(NotificationSettings.user_id == user_id)
            ),
            "events": await _count(
                select(func.count()).select_from(Event).where(Event.user_id == user_id)
            ),
            "refresh_tokens": await _count(
                select(func.count())
                .select_from(RefreshToken)
                .where(RefreshToken.user_id == user_id)
            ),
            "devices": await _count(
                select(func.count())
                .select_from(DeviceRegistration)
                .where(DeviceRegistration.user_id == user_id)
            ),
            "article_progress": await _count(
                select(func.count())
                .select_from(UserArticleProgress)
                .where(UserArticleProgress.user_id == user_id)
            ),
        }


async def _seed_notification(engine, user_id):
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        row = Notification(
            user_id=user_id,
            type=NotificationType.WIND_DOWN,
            title="Wind down",
            body="Time to wind down",
            scheduled_for=datetime.utcnow(),
        )
        db.add(row)
        await db.commit()


def test_obligations_crud_and_conflicts(client, sample_user_data):
    token, _, _ = _register_and_token(client, sample_user_data)
    payload = {
        "name": "Work",
        "type": "work",
        "start_time": "08:00:00",
        "end_time": "10:00:00",
        "days_of_week": [0, 2],
        "is_recurring": True,
        "valid_from": date.today().isoformat(),
        "valid_until": None,
    }
    r = client.post("/api/v1/obligations", json=payload, headers=_auth_headers(token))
    assert r.status_code == 201
    oid = r.json()["obligation"]["id"]
    r2 = client.get(f"/api/v1/obligations/{oid}", headers=_auth_headers(token))
    assert r2.status_code == 200
    payload["name"] = "Work Updated"
    r3 = client.put(f"/api/v1/obligations/{oid}", json=payload, headers=_auth_headers(token))
    assert r3.status_code == 200
    conflict = client.post(
        "/api/v1/obligations/check-conflicts",
        params={"start_time": "09:00:00", "end_time": "09:30:00", "days_of_week": [0]},
        headers=_auth_headers(token),
    )
    assert conflict.status_code == 200
    assert conflict.json()["has_conflicts"] is True
    r4 = client.delete(f"/api/v1/obligations/{oid}", headers=_auth_headers(token))
    assert r4.status_code == 204


def test_obligations_import_google_calendar(client, sample_user_data):
    """Test Google Calendar import.

    When GOOGLE_CLIENT_ID is not set (test environment), the endpoint returns 501.
    We can use the X-Mock-Calendar header to get sample data without a real Google token.
    """
    token, _, _ = _register_and_token(client, sample_user_data)

    # Use X-Mock-Calendar header to bypass real Google OAuth in development/test
    r = client.post(
        "/api/v1/obligations/import-google-calendar",
        json={
            "access_token": "mock-token",
            "calendar_id": "primary",
            "start_date": "2026-02-01",
            "end_date": "2026-02-02",
        },
        headers={**_auth_headers(token), "X-Mock-Calendar": "1"},
    )
    # Should return 200 with mock obligations when X-Mock-Calendar is set
    assert r.status_code == 200
    data = r.json()
    assert "imported" in data
    assert data["imported"] > 0
    assert data.get("mock") is True


def test_plans_and_events_flow(client, sample_user_data, sample_meq_responses):
    token, _, _ = _register_and_token(client, sample_user_data)
    r = client.post(
        "/api/v1/chronotype/assessment",
        json={"responses": sample_meq_responses},
        headers=_auth_headers(token),
    )
    assert r.status_code == 201
    gen = client.post(
        "/api/v1/plans/generate",
        json={"start_date": date.today().isoformat()},
        headers=_auth_headers(token),
    )
    assert gen.status_code == 201
    plan_id = gen.json()["plan"]["id"]
    cur = client.get("/api/v1/plans/current", headers=_auth_headers(token))
    assert cur.status_code == 200
    by_id = client.get(f"/api/v1/plans/{plan_id}", headers=_auth_headers(token))
    assert by_id.status_code == 200
    hist = client.get("/api/v1/plans/history", headers=_auth_headers(token))
    assert hist.status_code == 200
    today = client.get("/api/v1/plans/today", headers=_auth_headers(token))
    assert today.status_code == 200
    trans = client.post(
        "/api/v1/plans/transition",
        json={"target_wake_time": "06:30:00", "target_sleep_time": "22:30:00"},
        headers=_auth_headers(token),
    )
    assert trans.status_code == 201

    ev = client.post(
        "/api/v1/events",
        json={
            "name": "Exam",
            "type": "exam",
            "event_date": (date.today() + timedelta(days=3)).isoformat(),
            "importance": 4,
        },
        headers=_auth_headers(token),
    )
    assert ev.status_code == 201
    event_id = ev.json()["event"]["id"]
    upd = client.put(
        f"/api/v1/events/{event_id}",
        json={
            "name": "Exam Updated",
            "type": "exam",
            "event_date": (date.today() + timedelta(days=3)).isoformat(),
            "importance": 4,
        },
        headers=_auth_headers(token),
    )
    assert upd.status_code == 200
    dele = client.delete(f"/api/v1/events/{event_id}", headers=_auth_headers(token))
    assert dele.status_code == 204


def test_tracking_metrics_export_notifications(client, sample_user_data, engine):
    token, _, user_id = _register_and_token(client, sample_user_data)
    r = client.post(
        "/api/v1/tracking",
        json={"sleep_quality": 5, "energy_levels": {"morning": 6}},
        headers=_auth_headers(token),
    )
    assert r.status_code == 201
    today = client.get("/api/v1/tracking/today", headers=_auth_headers(token))
    assert today.status_code == 200
    hist = client.get(
        "/api/v1/tracking/history",
        params={"start_date": date.today().isoformat(), "end_date": date.today().isoformat()},
        headers=_auth_headers(token),
    )
    assert hist.status_code == 200
    metrics = client.get(
        "/api/v1/tracking/metrics",
        params={"period": "7d"},
        headers=_auth_headers(token),
    )
    assert metrics.status_code == 200
    invalid = client.get(
        "/api/v1/tracking/metrics",
        params={"period": "bad"},
        headers=_auth_headers(token),
    )
    assert invalid.status_code == 400
    export_json = client.get(
        "/api/v1/tracking/export",
        params={
            "format": "json",
            "start_date": date.today().isoformat(),
            "end_date": date.today().isoformat(),
        },
        headers=_auth_headers(token),
    )
    assert export_json.status_code == 200
    export_csv = client.get(
        "/api/v1/tracking/export",
        params={
            "format": "csv",
            "start_date": date.today().isoformat(),
            "end_date": date.today().isoformat(),
        },
        headers=_auth_headers(token),
    )
    assert export_csv.status_code == 200

    s = client.get("/api/v1/notifications/settings", headers=_auth_headers(token))
    assert s.status_code == 200
    upd = client.put(
        "/api/v1/notifications/settings",
        json={
            "wind_down_enabled": True,
            "wind_down_minutes_before": 30,
            "tracking_reminder_enabled": True,
            "tracking_reminder_time": "09:00:00",
            "activity_reminders_enabled": True,
            "max_per_day": 3,
            "quiet_hours_start": "22:00:00",
            "quiet_hours_end": "06:00:00",
        },
        headers=_auth_headers(token),
    )
    assert upd.status_code == 200
    reg = client.post(
        "/api/v1/notifications/register-device",
        json={"player_id": f"player-{uuid.uuid4().hex}", "device_type": "web"},
        headers=_auth_headers(token),
    )
    assert reg.status_code == 200

    asyncio.run(_seed_notification(engine, user_id))
    hist_n = client.get("/api/v1/notifications/history", headers=_auth_headers(token))
    assert hist_n.status_code == 200
    assert len(hist_n.json()["notifications"]) >= 1


def test_education_and_user_endpoints(client, sample_user_data, engine):
    token, _, _ = _register_and_token(client, sample_user_data)
    content = asyncio.run(_seed_education(engine))

    articles = client.get("/api/v1/education/articles", params={"category": "basics"})
    assert articles.status_code == 200
    article = client.get(f"/api/v1/education/articles/{content['slug']}")
    assert article.status_code == 200
    recommended = client.get(
        "/api/v1/education/articles/recommended",
        params={"chronotype": "intermediate"},
        headers=_auth_headers(token),
    )
    assert recommended.status_code == 200
    assert "articles" in recommended.json()
    faqs = client.get("/api/v1/education/faq", params={"category": "general"})
    assert faqs.status_code == 200
    cats = client.get("/api/v1/education/categories")
    assert cats.status_code == 200
    progress = client.post(
        "/api/v1/education/progress",
        json={"content_id": content["id"], "progress_percent": 50},
        headers=_auth_headers(token),
    )
    assert progress.status_code == 200
    progress2 = client.post(
        "/api/v1/education/progress",
        json={"content_id": content["id"], "progress_percent": 100},
        headers=_auth_headers(token),
    )
    assert progress2.status_code == 200

    profile = client.put(
        "/api/v1/users/me",
        json={"name": "Updated", "timezone": "UTC", "language": "es"},
        headers=_auth_headers(token),
    )
    assert profile.status_code == 200
    consent = client.put(
        "/api/v1/users/me/consent",
        json={"analytics_consent": True, "marketing_consent": False, "research_consent": True},
        headers=_auth_headers(token),
    )
    assert consent.status_code == 200
    pwd = client.put(
        "/api/v1/users/me/password",
        json={"current_password": sample_user_data["password"], "new_password": "NewPass123"},
        headers=_auth_headers(token),
    )
    assert pwd.status_code == 200
    export = client.get("/api/v1/users/me/export", headers=_auth_headers(token))
    assert export.status_code == 200


def test_gdpr_export_and_delete(client, sample_user_data, sample_meq_responses, engine):
    token, _, user_id = _register_and_token(client, sample_user_data)
    content = asyncio.run(_seed_education(engine))
    prog = client.post(
        "/api/v1/education/progress",
        json={"content_id": content["id"], "progress_percent": 25},
        headers=_auth_headers(token),
    )
    assert prog.status_code == 200
    assess = client.post(
        "/api/v1/chronotype/assessment",
        json={"responses": sample_meq_responses},
        headers=_auth_headers(token),
    )
    assert assess.status_code == 201
    plan = client.post(
        "/api/v1/plans/generate",
        json={"start_date": date.today().isoformat()},
        headers=_auth_headers(token),
    )
    assert plan.status_code == 201
    obl = client.post(
        "/api/v1/obligations",
        json={
            "name": "Work",
            "type": "work",
            "start_time": "08:00:00",
            "end_time": "10:00:00",
            "days_of_week": [0, 2],
            "is_recurring": True,
            "valid_from": date.today().isoformat(),
            "valid_until": None,
        },
        headers=_auth_headers(token),
    )
    assert obl.status_code == 201
    track = client.post(
        "/api/v1/tracking",
        json={"sleep_quality": 5, "energy_levels": {"morning": 6}},
        headers=_auth_headers(token),
    )
    assert track.status_code == 201
    settings = client.put(
        "/api/v1/notifications/settings",
        json={
            "wind_down_enabled": True,
            "wind_down_minutes_before": 30,
            "tracking_reminder_enabled": True,
            "tracking_reminder_time": "09:00:00",
            "activity_reminders_enabled": True,
            "max_per_day": 3,
            "quiet_hours_start": "22:00:00",
            "quiet_hours_end": "06:00:00",
        },
        headers=_auth_headers(token),
    )
    assert settings.status_code == 200
    device = client.post(
        "/api/v1/notifications/register-device",
        json={"player_id": f"player-{uuid.uuid4().hex}", "device_type": "web"},
        headers=_auth_headers(token),
    )
    assert device.status_code == 200
    event = client.post(
        "/api/v1/events",
        json={
            "name": "Exam",
            "type": "exam",
            "event_date": (date.today() + timedelta(days=3)).isoformat(),
            "importance": 4,
        },
        headers=_auth_headers(token),
    )
    assert event.status_code == 201
    asyncio.run(_seed_notification(engine, user_id))

    export = client.get("/api/v1/users/me/export", headers=_auth_headers(token))
    assert export.status_code == 200
    assert export.json()["user"]["email"] == sample_user_data["email"]

    counts_before = asyncio.run(_count_user_rows(engine, user_id))
    assert counts_before["users"] == 1
    assert counts_before["plans"] >= 1
    assert counts_before["schedule_items"] >= 1
    assert counts_before["refresh_tokens"] >= 1

    dele = client.request(
        "DELETE",
        "/api/v1/users/me",
        json={"current_password": sample_user_data["password"]},
        headers=_auth_headers(token),
    )
    assert dele.status_code == 204
    counts_after = asyncio.run(_count_user_rows(engine, user_id))
    assert all(v == 0 for v in counts_after.values())
    me = client.get("/api/v1/users/me", headers=_auth_headers(token))
    assert me.status_code == 401


def test_auth_refresh_reuse_and_google_login(client, sample_user_data, monkeypatch):
    _, refresh_token, user_id = _register_and_token(client, sample_user_data)

    r = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 200
    r2 = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r2.status_code == 401

    svc = AuthService()
    reset_token = asyncio.run(
        svc.tokens.create_one_time_token(user_id, "reset", settings.RESET_TOKEN_EXPIRE_MINUTES)
    )
    reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "ResetPass123"},
    )
    assert reset.status_code == 200

    verify_token = asyncio.run(
        svc.tokens.create_one_time_token(user_id, "verify", settings.VERIFY_TOKEN_EXPIRE_MINUTES)
    )
    verify = client.post("/api/v1/auth/verify-email", json={"token": verify_token})
    assert verify.status_code == 200

    google_email = f"google-{uuid.uuid4().hex}@example.com"

    async def fake_verify(token):
        return {
            "email": google_email,
            "name": "Google User",
            "oauth_id": "sub",
            "email_verified": True,
        }

    monkeypatch.setattr(auth_service_module, "verify_google_token", fake_verify)
    g1 = client.post("/api/v1/auth/google", json={"id_token": "token"})
    assert g1.status_code == 200
    assert g1.json()["is_new_user"] is True
    g2 = client.post("/api/v1/auth/google", json={"id_token": "token"})
    assert g2.status_code == 200
    assert g2.json()["is_new_user"] is False
