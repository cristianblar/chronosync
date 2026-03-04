from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.notification import Notification, NotificationSettings
from app.schemas.notification import (
    RegisterDeviceRequest,
    NotificationSettings as NotificationSettingsSchema,
)
from app.repositories.device_repository import DeviceRepository

router = APIRouter()
device_repo = DeviceRepository()


@router.get("/settings")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings_row = await db.execute(
        NotificationSettings.__table__.select().where(
            NotificationSettings.user_id == current_user.id
        )
    )
    row = settings_row.mappings().first()
    if row:
        return {"settings": jsonable_encoder(row)}
    settings_obj = NotificationSettings(user_id=current_user.id)
    db.add(settings_obj)
    await db.commit()
    await db.refresh(settings_obj)
    return {"settings": jsonable_encoder(settings_obj)}


@router.put("/settings")
async def update_settings(
    payload: NotificationSettingsSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings_obj = await db.execute(
        NotificationSettings.__table__.select().where(
            NotificationSettings.user_id == current_user.id
        )
    )
    row = settings_obj.mappings().first()
    if not row:
        ns = NotificationSettings(user_id=current_user.id, **payload.model_dump())
        db.add(ns)
        await db.commit()
        await db.refresh(ns)
        return {"settings": jsonable_encoder(ns)}
    await db.execute(
        NotificationSettings.__table__.update()
        .where(NotificationSettings.user_id == current_user.id)
        .values(**payload.model_dump())
    )
    await db.commit()
    updated = await db.execute(
        NotificationSettings.__table__.select().where(
            NotificationSettings.user_id == current_user.id
        )
    )
    return {"settings": jsonable_encoder(updated.mappings().first())}


@router.post("/register-device")
async def register_device(
    payload: RegisterDeviceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await device_repo.upsert(db, current_user.id, payload.player_id, payload.device_type)
    return {"status": "registered"}


@router.get("/history")
async def history(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(
        Notification.__table__.select()
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.scheduled_for.desc())
        .limit(limit)
    )
    rows = res.mappings().all()
    return {"notifications": jsonable_encoder(rows)}
