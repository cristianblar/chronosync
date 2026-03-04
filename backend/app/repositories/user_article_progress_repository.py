from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_article_progress import UserArticleProgress


class UserArticleProgressRepository:
    async def upsert(self, db: AsyncSession, user_id, content_id, progress_percent: int):
        res = await db.execute(
            select(UserArticleProgress).where(
                UserArticleProgress.user_id == user_id,
                UserArticleProgress.content_id == content_id,
            )
        )
        existing = res.scalar_one_or_none()
        is_completed = progress_percent >= 100
        if existing:
            await db.execute(
                update(UserArticleProgress)
                .where(UserArticleProgress.id == existing.id)
                .values(
                    progress_percent=progress_percent,
                    is_completed=is_completed,
                    last_read_at=datetime.utcnow(),
                )
            )
            await db.commit()
            return existing
        row = UserArticleProgress(
            user_id=user_id,
            content_id=content_id,
            progress_percent=progress_percent,
            is_completed=is_completed,
            last_read_at=datetime.utcnow(),
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return row

    async def get_for_user(self, db: AsyncSession, user_id, content_id):
        res = await db.execute(
            select(UserArticleProgress).where(
                UserArticleProgress.user_id == user_id,
                UserArticleProgress.content_id == content_id,
            )
        )
        return res.scalar_one_or_none()

    async def list_completed_ids(self, db: AsyncSession, user_id):
        res = await db.execute(
            select(UserArticleProgress.content_id).where(
                UserArticleProgress.user_id == user_id,
                UserArticleProgress.is_completed.is_(True),
            )
        )
        return [r[0] for r in res.all()]
