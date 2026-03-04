from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import DeviceRegistration


class DeviceRepository:
    async def upsert(self, db: AsyncSession, user_id, player_id: str, device_type: str):
        res = await db.execute(
            select(DeviceRegistration).where(DeviceRegistration.player_id == player_id)
        )
        existing = res.scalar_one_or_none()
        if existing:
            await db.execute(
                update(DeviceRegistration)
                .where(DeviceRegistration.player_id == player_id)
                .values(user_id=user_id, device_type=device_type, last_seen_at=datetime.utcnow())
            )
            await db.commit()
            return existing
        device = DeviceRegistration(
            user_id=user_id,
            player_id=player_id,
            device_type=device_type,
            last_seen_at=datetime.utcnow(),
        )
        db.add(device)
        await db.commit()
        await db.refresh(device)
        return device

    async def list_by_user(self, db: AsyncSession, user_id):
        res = await db.execute(
            select(DeviceRegistration).where(DeviceRegistration.user_id == user_id)
        )
        return list(res.scalars().all())
