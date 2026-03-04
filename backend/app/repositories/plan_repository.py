from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.plan import SleepPlan


class PlanRepository:
    async def get_active(self, db: AsyncSession, user_id):
        res = await db.execute(
            select(SleepPlan)
            .where(SleepPlan.user_id == user_id, SleepPlan.is_active.is_(True))
            .order_by(SleepPlan.valid_from.desc(), SleepPlan.created_at.desc())
        )
        return res.scalars().first()
