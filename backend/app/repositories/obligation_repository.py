from datetime import date
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.obligation import Obligation


class ObligationRepository:
    async def list(
        self, db: AsyncSession, user_id, active_only: bool = True, include_expired: bool = False
    ):
        q = select(Obligation).where(Obligation.user_id == user_id)
        if active_only:
            q = q.where(Obligation.is_active.is_(True))
        if not include_expired:
            today = date.today()
            q = q.where(or_(Obligation.valid_until.is_(None), Obligation.valid_until >= today))
        res = await db.execute(q)
        return list(res.scalars().all())
