from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.refresh_token import RefreshToken


class RefreshTokenRepository:
    async def create(self, db: AsyncSession, token: RefreshToken):
        db.add(token)
        await db.commit()
        await db.refresh(token)
        return token

    async def get_by_hash(self, db: AsyncSession, token_hash: str):
        res = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        return res.scalar_one_or_none()

    async def revoke(self, db: AsyncSession, token_hash: str, replaced_by: str | None = None):
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .values(revoked_at=datetime.utcnow(), replaced_by=replaced_by)
        )
        await db.commit()

    async def revoke_all_for_user(self, db: AsyncSession, user_id):
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.utcnow())
        )
        await db.commit()
