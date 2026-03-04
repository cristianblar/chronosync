import asyncio
import logging
import os
from datetime import datetime

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.core import scheduler as sched
from app.db.base import Base
from app.models.user import User
from app.models.notification import NotificationSettings
from app.models.device import DeviceRegistration


@pytest.mark.asyncio
async def test_scheduler_jobstore_uses_redis():
    settings.REDIS_URL = os.getenv("TEST_REDIS_URL", "redis://localhost:6380/0")
    scheduler = sched.start_scheduler()
    try:
        assert "default" in scheduler._jobstores
        assert scheduler._jobstores["default"].__class__.__name__ == "RedisJobStore"
    finally:
        scheduler.shutdown()


@pytest.mark.asyncio
async def test_notification_retry_logs(monkeypatch, caplog):
    engine = create_async_engine(
        os.getenv(
            "TEST_DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5433/test_db",
        ),
        echo=False,
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    sched.async_session = async_session
    settings.REDIS_URL = os.getenv("TEST_REDIS_URL", "redis://localhost:6380/0")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    user = User(email="retry@test.com", name="Retry User", timezone="UTC")
    async with async_session() as db:
        db.add(user)
        await db.commit()
        await db.refresh(user)
        db.add(
            NotificationSettings(
                user_id=user.id,
                tracking_reminder_enabled=True,
                tracking_reminder_time=datetime.utcnow().time(),
                max_per_day=5,
            )
        )
        db.add(
            DeviceRegistration(
                user_id=user.id,
                player_id="player-1",
                device_type="web",
            )
        )
        await db.commit()

    async def fail_send(*args, **kwargs):
        raise RuntimeError("fail")

    monkeypatch.setattr(sched.onesignal, "send_notification", fail_send)

    async def _noop(*args, **kwargs):
        return None

    monkeypatch.setattr(asyncio, "sleep", _noop)

    caplog.set_level(logging.WARNING, logger="app.scheduler")
    await sched.run_notification_sweep()
    failures = [r for r in caplog.records if "onesignal_send_failed" in r.message]
    assert len(failures) >= 3

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


def test_audit_log_emits(client, caplog):
    caplog.set_level(logging.INFO, logger="app.audit")
    r = client.get("/api/v1/health")
    assert r.status_code in (200, 503)
    assert any("request" in rec.message for rec in caplog.records)
