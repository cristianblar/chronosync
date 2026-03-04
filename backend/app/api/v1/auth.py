from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, decode_token
from app.dependencies import get_db
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    GoogleLoginRequest,
    RefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    AuthResponse,
    GoogleAuthResponse,
)
from app.schemas.user import UserOut
from app.core.security import get_current_user
from app.models.user import User
from app.services.auth_service import AuthService

router = APIRouter()
service = AuthService()


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await service.register(
        db, payload.email, payload.password, payload.name, payload.timezone
    )
    await service.request_email_verification(user)
    refresh_token = create_refresh_token(str(user.id))
    await service.persist_refresh_token(db, user.id, refresh_token)
    return AuthResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await service.login(db, payload.email, payload.password)
    refresh_token = create_refresh_token(str(user.id))
    await service.persist_refresh_token(db, user.id, refresh_token)
    return AuthResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


@router.post("/google", response_model=GoogleAuthResponse)
async def google_login(payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    user, is_new = await service.google_login(db, payload.id_token)
    refresh_token = create_refresh_token(str(user.id))
    await service.persist_refresh_token(db, user.id, refresh_token)
    return {
        "user": UserOut.model_validate(user),
        "access_token": create_access_token(str(user.id)),
        "refresh_token": refresh_token,
        "is_new_user": is_new,
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = data.get("sub")
    new_refresh = create_refresh_token(str(user_id))
    await service.rotate_refresh_token(db, user_id, payload.refresh_token, new_refresh)
    return TokenResponse(
        access_token=create_access_token(str(user_id)),
        refresh_token=new_refresh,
    )


@router.post("/logout", status_code=204)
async def logout(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await service.revoke_all_refresh_tokens(db, current_user.id)
    return None


@router.post("/forgot-password", status_code=202)
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    await service.request_password_reset(db, payload.email)
    return {"status": "accepted"}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    ok = await service.reset_password(db, payload.token, payload.password)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    return {"status": "reset"}


@router.post("/verify-email")
async def verify_email(payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    ok = await service.verify_email(db, payload.token)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    return {"status": "verified"}
