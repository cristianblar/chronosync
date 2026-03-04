from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, verify_password, hash_password
from app.dependencies import get_db
from app.models.user import User
from app.schemas.user import (
    UserOut,
    UserUpdate,
    ChangePasswordRequest,
    ConsentUpdate,
    DeleteAccountRequest,
)
from app.services.user_service import export_user_data, delete_user_account
from app.services.auth_service import AuthService

router = APIRouter()
auth_service = AuthService()


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = await db.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/me/password")
async def change_password(
    payload: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = await db.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.password_hash or not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid current password")
    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    await auth_service.revoke_all_refresh_tokens(db, user.id)
    return {"status": "updated"}


@router.get("/me/export")
async def export_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await export_user_data(current_user.id, db)
    return jsonable_encoder(data)


@router.delete("/me", status_code=204)
async def delete_me(
    payload: DeleteAccountRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = await db.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.password_hash:
        if not payload or not payload.current_password:
            raise HTTPException(status_code=400, detail="Invalid password")
        if not verify_password(payload.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Invalid password")
    ok = await delete_user_account(user.id, db)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
    return None


@router.put("/me/consent")
async def update_consent(
    payload: ConsentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = await db.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.analytics_consent = payload.analytics_consent
    user.marketing_consent = payload.marketing_consent
    user.research_consent = payload.research_consent
    await db.commit()
    return {"status": "updated"}
