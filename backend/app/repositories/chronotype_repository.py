from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.chronotype import ChronotypeAssessment


class ChronotypeRepository:
    async def create(self, db: AsyncSession, assessment: ChronotypeAssessment):
        db.add(assessment)
        await db.commit()
        await db.refresh(assessment)
        return assessment

    async def get_current(self, db: AsyncSession, user_id):
        res = await db.execute(
            select(ChronotypeAssessment).where(
                ChronotypeAssessment.user_id == user_id,
                ChronotypeAssessment.is_current.is_(True),
            )
        )
        return res.scalar_one_or_none()

    async def list_by_user(self, db: AsyncSession, user_id):
        res = await db.execute(
            select(ChronotypeAssessment).where(ChronotypeAssessment.user_id == user_id)
        )
        return list(res.scalars().all())

    async def set_all_inactive(self, db: AsyncSession, user_id):
        await db.execute(
            update(ChronotypeAssessment)
            .where(ChronotypeAssessment.user_id == user_id)
            .values(is_current=False)
        )
        await db.commit()
