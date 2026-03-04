from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.tracking import DailyTracking


class TrackingRepository:
    async def get_by_date(self, db: AsyncSession, user_id, date):
        res = await db.execute(
            select(DailyTracking).where(
                DailyTracking.user_id == user_id, DailyTracking.date == date
            )
        )
        return res.scalar_one_or_none()
