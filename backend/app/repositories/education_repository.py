from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.education import EducationalContent, FAQ


class EducationRepository:
    async def list_articles(
        self,
        db: AsyncSession,
        limit: int,
        offset: int,
        category: str | None = None,
        tags: list[str] | None = None,
        search: str | None = None,
        chronotype: str | None = None,
    ):
        q = select(EducationalContent).where(EducationalContent.is_published.is_(True))
        if category:
            q = q.where(EducationalContent.category == category)
        if tags:
            q = q.where(EducationalContent.tags.overlap(tags))
        if chronotype:
            q = q.where(EducationalContent.target_chronotypes.overlap([chronotype]))
        if search:
            q = q.where(
                func.coalesce(EducationalContent.search_vector, func.to_tsvector("english", "")).op(  # noqa
                    "@@"
                )(func.plainto_tsquery("english", search))
            )
        total_res = await db.execute(select(func.count()).select_from(q.subquery()))
        total = total_res.scalar() or 0
        res = await db.execute(q.limit(limit).offset(offset))
        return list(res.scalars().all()), total

    async def list_faqs(
        self, db: AsyncSession, limit: int, offset: int, category=None, search=None
    ):
        q = select(FAQ)
        if category:
            q = q.where(FAQ.category == category)
        if search:
            q = q.where(
                func.to_tsvector("english", FAQ.question + " " + FAQ.answer).op("@@")(
                    func.plainto_tsquery("english", search)
                )
            )
        res = await db.execute(q.limit(limit).offset(offset))
        return list(res.scalars().all())

    async def recommended(self, db: AsyncSession, chronotype: str | None, limit: int):
        q = select(EducationalContent).where(EducationalContent.is_published.is_(True))
        if chronotype:
            q = q.where(EducationalContent.target_chronotypes.overlap([chronotype]))
        res = await db.execute(q.limit(limit))
        return list(res.scalars().all())
