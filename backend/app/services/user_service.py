from datetime import datetime
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from redis import asyncio as aioredis

from fastapi.encoders import jsonable_encoder
from app.models.user import User
from app.models.chronotype import ChronotypeAssessment
from app.models.obligation import Obligation
from app.models.plan import SleepPlan, DailySchedule, ScheduleItem
from app.models.tracking import DailyTracking, EnergyLog
from app.models.education import EducationalContent, FAQ
from app.models.notification import Notification, NotificationSettings
from app.models.event import Event
from app.models.device import DeviceRegistration
from app.models.refresh_token import RefreshToken
from app.config import settings
from app.schemas.chronotype import ChronotypeAssessmentOut
from app.schemas.obligation import ObligationOut
from app.schemas.plan import SleepPlanOut, DailyScheduleOut, ScheduleItemOut
from app.schemas.tracking import TrackingOut
from app.schemas.education import EducationalContentOut, FAQOut, ArticleProgressOut
from app.schemas.notification import (
    NotificationOut,
    NotificationSettings as NotificationSettingsSchema,
)
from app.schemas.event import EventOut
from app.models.user_article_progress import UserArticleProgress


def _clean_model(obj):
    data = dict(obj.__dict__)
    data.pop("_sa_instance_state", None)
    data.pop("password_hash", None)
    return data


def _serialize_list(schema_cls, items):
    return [schema_cls.model_validate(jsonable_encoder(i)).model_dump() for i in items]


async def export_user_data(user_id, db: AsyncSession) -> dict:
    user = await db.get(User, user_id)
    assessments = await db.execute(
        select(ChronotypeAssessment).where(ChronotypeAssessment.user_id == user_id)
    )
    obligations = await db.execute(select(Obligation).where(Obligation.user_id == user_id))
    plans = await db.execute(select(SleepPlan).where(SleepPlan.user_id == user_id))
    schedules = await db.execute(
        select(DailySchedule).join(SleepPlan).where(SleepPlan.user_id == user_id)
    )
    schedule_items = await db.execute(
        select(ScheduleItem).join(DailySchedule).join(SleepPlan).where(SleepPlan.user_id == user_id)
    )
    trackings = await db.execute(select(DailyTracking).where(DailyTracking.user_id == user_id))
    energy_logs = await db.execute(select(EnergyLog).where(EnergyLog.user_id == user_id))
    notifications = await db.execute(select(Notification).where(Notification.user_id == user_id))
    notification_settings = await db.execute(
        select(NotificationSettings).where(NotificationSettings.user_id == user_id)
    )
    events = await db.execute(select(Event).where(Event.user_id == user_id))
    education = await db.execute(select(EducationalContent))
    faqs = await db.execute(select(FAQ))
    progress = await db.execute(
        select(UserArticleProgress).where(UserArticleProgress.user_id == user_id)
    )
    return {
        "exported_at": datetime.utcnow().isoformat(),
        "user": {
            "email": user.email,
            "name": user.name,
            "timezone": user.timezone,
            "language": user.language,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "chronotype_assessments": _serialize_list(
            ChronotypeAssessmentOut, assessments.scalars().all()
        ),
        "obligations": _serialize_list(ObligationOut, obligations.scalars().all()),
        "sleep_plans": _serialize_list(SleepPlanOut, plans.scalars().all()),
        "daily_schedules": _serialize_list(DailyScheduleOut, schedules.scalars().all()),
        "schedule_items": _serialize_list(ScheduleItemOut, schedule_items.scalars().all()),
        "daily_trackings": _serialize_list(TrackingOut, trackings.scalars().all()),
        "energy_logs": [_clean_model(e) for e in energy_logs.scalars().all()],
        "notifications": _serialize_list(NotificationOut, notifications.scalars().all()),
        "notification_settings": _serialize_list(
            NotificationSettingsSchema, notification_settings.scalars().all()
        ),
        "events": _serialize_list(EventOut, events.scalars().all()),
        "educational_contents": _serialize_list(EducationalContentOut, education.scalars().all()),
        "faqs": _serialize_list(FAQOut, faqs.scalars().all()),
        "article_progress": _serialize_list(ArticleProgressOut, progress.scalars().all()),
    }


async def delete_user_account(user_id, db: AsyncSession) -> bool:
    user = await db.get(User, user_id)
    if not user:
        return False
    plan_ids = select(SleepPlan.id).where(SleepPlan.user_id == user_id)
    schedule_ids = select(DailySchedule.id).where(DailySchedule.plan_id.in_(plan_ids))
    await db.execute(delete(ScheduleItem).where(ScheduleItem.daily_schedule_id.in_(schedule_ids)))
    await db.execute(delete(DailySchedule).where(DailySchedule.plan_id.in_(plan_ids)))
    await db.execute(delete(SleepPlan).where(SleepPlan.user_id == user_id))
    await db.execute(delete(EnergyLog).where(EnergyLog.user_id == user_id))
    await db.execute(delete(DailyTracking).where(DailyTracking.user_id == user_id))
    await db.execute(delete(Notification).where(Notification.user_id == user_id))
    await db.execute(delete(NotificationSettings).where(NotificationSettings.user_id == user_id))
    await db.execute(delete(DeviceRegistration).where(DeviceRegistration.user_id == user_id))
    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user_id))
    await db.execute(delete(UserArticleProgress).where(UserArticleProgress.user_id == user_id))
    await db.execute(delete(ChronotypeAssessment).where(ChronotypeAssessment.user_id == user_id))
    await db.execute(delete(Obligation).where(Obligation.user_id == user_id))
    await db.execute(delete(Event).where(Event.user_id == user_id))
    await db.delete(user)
    await db.commit()
    redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    async for key in redis.scan_iter(match=f"session:{user_id}:*"):
        await redis.delete(key)
    await redis.close()
    return True
