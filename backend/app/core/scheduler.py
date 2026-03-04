from datetime import datetime, timedelta
import logging
import asyncio
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.redis import RedisJobStore
from urllib.parse import urlparse
from sqlalchemy import select

from app.db.session import async_session
from app.models.user import User
from app.models.notification import Notification, NotificationType, NotificationSettings
from app.models.plan import DailySchedule, ScheduleItem, SleepPlan, ActivityType
from app.models.refresh_token import RefreshToken
from app.config import settings
from app.repositories.device_repository import DeviceRepository
from app.services.notification_service import get_notification_service


device_repo = DeviceRepository()
onesignal = get_notification_service()
logger = logging.getLogger("app.scheduler")


async def _should_send_tracking_reminder(db, user: User, settings_row: NotificationSettings):
    if not settings_row.tracking_reminder_enabled or not settings_row.tracking_reminder_time:
        return False
    tz = ZoneInfo(user.timezone or "UTC")
    now_local = datetime.now(tz)
    target = settings_row.tracking_reminder_time
    window_start = datetime.combine(now_local.date(), target, tzinfo=tz)
    window_end = window_start + timedelta(minutes=15)
    if not (window_start <= now_local <= window_end):
        return False
    start_utc = window_start.astimezone(ZoneInfo("UTC"))
    end_utc = window_end.astimezone(ZoneInfo("UTC"))
    res = await db.execute(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.type == NotificationType.TRACKING_REMINDER,
            Notification.scheduled_for >= start_utc,
            Notification.scheduled_for <= end_utc,
        )
    )
    return res.scalar_one_or_none() is None


def _in_quiet_hours(now_local: datetime, settings_row: NotificationSettings) -> bool:
    if not settings_row.quiet_hours_start or not settings_row.quiet_hours_end:
        return False
    start = settings_row.quiet_hours_start
    end = settings_row.quiet_hours_end
    now_t = now_local.time()
    if start <= end:
        return start <= now_t <= end
    return now_t >= start or now_t <= end


async def _count_sent_today(db, user: User) -> int:
    tz = ZoneInfo(user.timezone or "UTC")
    now_local = datetime.now(tz)
    start_local = datetime.combine(now_local.date(), datetime.min.time(), tzinfo=tz)
    end_local = start_local + timedelta(days=1)
    start_utc = start_local.astimezone(ZoneInfo("UTC"))
    end_utc = end_local.astimezone(ZoneInfo("UTC"))
    res = await db.execute(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.scheduled_for >= start_utc,
            Notification.scheduled_for < end_utc,
        )
    )
    return len(res.scalars().all())


async def _has_recent_notification(
    db, user: User, ntype: NotificationType, window_start, window_end
):
    res = await db.execute(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.type == ntype,
            Notification.scheduled_for >= window_start,
            Notification.scheduled_for <= window_end,
        )
    )
    return res.scalar_one_or_none() is not None


async def _send_notification(db, user: User, title: str, body: str, ntype: NotificationType):
    notif = Notification(
        user_id=user.id,
        type=ntype,
        title=title,
        body=body,
        scheduled_for=datetime.utcnow(),
    )
    db.add(notif)
    await db.commit()
    devices = await device_repo.list_by_user(db, user.id)
    player_ids = [d.player_id for d in devices]
    if player_ids:
        for attempt in range(1, 4):
            try:
                await onesignal.send_notification(
                    player_ids=player_ids,
                    title=notif.title,
                    body=notif.body,
                    data={"type": notif.type.value},
                )
                return
            except Exception as e:
                logger.warning(
                    "onesignal_send_failed",
                    extra={"attempt": attempt, "error": str(e), "user_id": str(user.id)},
                )
                await asyncio.sleep(attempt)


async def _maybe_send_wind_down(db, user: User, settings_row: NotificationSettings):
    if not settings_row.wind_down_enabled:
        return
    tz = ZoneInfo(user.timezone or "UTC")
    now_local = datetime.now(tz)
    if _in_quiet_hours(now_local, settings_row):
        return
    res = await db.execute(
        select(DailySchedule)
        .join(SleepPlan, SleepPlan.id == DailySchedule.plan_id)
        .where(
            SleepPlan.user_id == user.id,
            DailySchedule.date == now_local.date(),
        )
    )
    schedule = res.scalar_one_or_none()
    if not schedule:
        return
    wind_down_time = datetime.combine(now_local.date(), schedule.sleep_time, tzinfo=tz) - timedelta(
        minutes=settings_row.wind_down_minutes_before
    )
    window_start = wind_down_time
    window_end = wind_down_time + timedelta(minutes=15)
    if not (window_start <= now_local <= window_end):
        return
    if await _has_recent_notification(
        db,
        user,
        NotificationType.WIND_DOWN,
        window_start.astimezone(ZoneInfo("UTC")),
        window_end.astimezone(ZoneInfo("UTC")),
    ):
        return
    await _send_notification(
        db, user, "Wind down", "Start your wind‑down routine.", NotificationType.WIND_DOWN
    )


async def _maybe_send_activity_reminders(db, user: User, settings_row: NotificationSettings):
    if not settings_row.activity_reminders_enabled:
        return
    tz = ZoneInfo(user.timezone or "UTC")
    now_local = datetime.now(tz)
    if _in_quiet_hours(now_local, settings_row):
        return
    res = await db.execute(
        select(DailySchedule, ScheduleItem)
        .join(SleepPlan, SleepPlan.id == DailySchedule.plan_id)
        .join(ScheduleItem, ScheduleItem.daily_schedule_id == DailySchedule.id)
        .where(
            SleepPlan.user_id == user.id,
            DailySchedule.date == now_local.date(),
        )
    )
    for schedule, item in res.all():
        atype = getattr(item.activity_type, "value", item.activity_type)
        if atype in (
            ActivityType.SLEEP.value,
            ActivityType.WIND_DOWN.value,
            ActivityType.WAKE.value,
        ):
            continue
        window_start = datetime.combine(now_local.date(), item.scheduled_time, tzinfo=tz)
        window_end = window_start + timedelta(minutes=15)
        if not (window_start <= now_local <= window_end):
            continue
        if await _has_recent_notification(
            db,
            user,
            NotificationType.ACTIVITY,
            window_start.astimezone(ZoneInfo("UTC")),
            window_end.astimezone(ZoneInfo("UTC")),
        ):
            continue
        title = f"{atype.replace('_', ' ').title()} reminder"
        body = f"Time for {atype.replace('_', ' ')}."
        await _send_notification(db, user, title, body, NotificationType.ACTIVITY)


async def run_notification_sweep():
    async with async_session() as db:
        settings_res = await db.execute(select(NotificationSettings))
        settings_rows = list(settings_res.scalars().all())
        if not settings_rows:
            return
        user_ids = [s.user_id for s in settings_rows]
        users_res = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_by_id = {u.id: u for u in users_res.scalars().all()}
        for row in settings_rows:
            user = users_by_id.get(row.user_id)
            if not user:
                continue
            if await _count_sent_today(db, user) >= row.max_per_day:
                continue
            tz = ZoneInfo(user.timezone or "UTC")
            now_local = datetime.now(tz)
            if _in_quiet_hours(now_local, row):
                continue
            if await _should_send_tracking_reminder(db, user, row):
                await _send_notification(
                    db,
                    user,
                    "Tracking reminder",
                    "Don’t forget to log today’s sleep.",
                    NotificationType.TRACKING_REMINDER,
                )
            await _maybe_send_wind_down(db, user, row)
            await _maybe_send_activity_reminders(db, user, row)


async def cleanup_notifications():
    cutoff = datetime.utcnow() - timedelta(days=settings.NOTIFICATION_RETENTION_DAYS)
    async with async_session() as db:
        res = await db.execute(
            select(Notification).where(
                Notification.scheduled_for < cutoff,
            )
        )
        rows = res.scalars().all()
        for n in rows:
            await db.delete(n)
        await db.commit()


async def cleanup_expired_refresh_tokens():
    now = datetime.utcnow()
    async with async_session() as db:
        res = await db.execute(select(RefreshToken).where(RefreshToken.expires_at < now))
        rows = res.scalars().all()
        for token in rows:
            await db.delete(token)
        await db.commit()
        if rows:
            logger.info("refresh_tokens_purged", extra={"count": len(rows)})


def start_scheduler() -> AsyncIOScheduler:
    jobstores = {}
    redis_url = getattr(settings, "REDIS_URL", None)
    if redis_url:
        try:
            parsed = urlparse(str(redis_url))
            if parsed.scheme.startswith("redis"):
                use_ssl = parsed.scheme == "rediss"
                kwargs = {
                    "host": parsed.hostname,
                    "port": parsed.port or 6379,
                    "password": parsed.password,
                    "db": int(parsed.path.replace("/", "") or 0),
                }
                if use_ssl:
                    kwargs["ssl"] = True
                jobstores["default"] = RedisJobStore(**kwargs)
        except Exception as exc:
            logger.warning(
                "scheduler_redis_fallback",
                extra={"error": str(exc)},
            )
            jobstores = {}
    if jobstores:
        logger.info("scheduler_jobstore_enabled", extra={"backend": "redis"})
    else:
        logger.info("scheduler_jobstore_memory", extra={"backend": "memory"})
    scheduler = AsyncIOScheduler(jobstores=jobstores or None)
    scheduler.add_job(
        run_notification_sweep,
        "interval",
        minutes=15,
        id="notif_sweep",
        replace_existing=True,
    )
    scheduler.add_job(
        cleanup_notifications,
        "interval",
        hours=24,
        id="notif_cleanup",
        replace_existing=True,
    )
    scheduler.add_job(
        cleanup_expired_refresh_tokens,
        "interval",
        hours=24,
        id="refresh_token_cleanup",
        replace_existing=True,
    )
    scheduler.start()
    return scheduler
