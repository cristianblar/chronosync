from datetime import datetime, timedelta
import hashlib
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.google_oauth import verify_google_token
from app.services.token_service import TokenService
from app.utils.email import EmailService
from app.config import settings
from app.models.refresh_token import RefreshToken
from app.repositories.refresh_token_repository import RefreshTokenRepository


class AuthService:
    def __init__(self):
        self.users = UserRepository()
        self.tokens = TokenService()
        self.email = EmailService()
        self.refresh_tokens = RefreshTokenRepository()

    def _hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    async def persist_refresh_token(self, db: AsyncSession, user_id, refresh_token: str):
        expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        token_hash = self._hash_token(refresh_token)
        rt = RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        await self.refresh_tokens.create(db, rt)

    async def rotate_refresh_token(self, db: AsyncSession, user_id, old_token: str, new_token: str):
        old_hash = self._hash_token(old_token)
        new_hash = self._hash_token(new_token)
        existing = await self.refresh_tokens.get_by_hash(db, old_hash)
        if not existing:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        if existing.revoked_at is not None:
            await self.refresh_tokens.revoke_all_for_user(db, user_id)
            raise HTTPException(status_code=401, detail="Refresh token reuse detected")
        await self.refresh_tokens.revoke(db, old_hash, replaced_by=new_hash)
        await self.persist_refresh_token(db, user_id, new_token)

    async def revoke_all_refresh_tokens(self, db: AsyncSession, user_id):
        await self.refresh_tokens.revoke_all_for_user(db, user_id)

    async def register(self, db: AsyncSession, email: str, password: str, name: str, timezone: str):
        existing = await self.users.get_by_email(db, email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user = User(
            email=email, password_hash=hash_password(password), name=name, timezone=timezone
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    async def login(self, db: AsyncSession, email: str, password: str):
        user = await self.users.get_by_email(db, email)
        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        user.last_login_at = datetime.utcnow()
        await db.commit()
        return user

    async def google_login(self, db: AsyncSession, id_token_str: str):
        info = await verify_google_token(id_token_str)
        user = await self.users.get_by_email(db, info["email"])
        if not user:
            user = User(
                email=info["email"],
                name=info.get("name") or "Google User",
                oauth_provider="google",
                oauth_id=info["oauth_id"],
                is_verified=info.get("email_verified", False),
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            return user, True
        return user, False

    async def request_password_reset(self, db: AsyncSession, email: str) -> bool:
        user = await self.users.get_by_email(db, email)
        if not user:
            return True
        token = await self.tokens.create_one_time_token(
            str(user.id), "reset", settings.RESET_TOKEN_EXPIRE_MINUTES
        )
        await self.email.send_password_reset_email(email, token)
        return True

    async def reset_password(self, db: AsyncSession, token: str, new_password: str) -> bool:
        user_id = await self.tokens.consume_one_time_token(token, "reset")
        if not user_id:
            return False
        user = await db.get(User, user_id)
        if not user:
            return False
        user.password_hash = hash_password(new_password)
        await db.commit()
        return True

    async def request_email_verification(self, user: User) -> bool:
        token = await self.tokens.create_one_time_token(
            str(user.id), "verify", settings.VERIFY_TOKEN_EXPIRE_MINUTES
        )
        await self.email.send_verification_email(user.email, token)
        return True

    async def verify_email(self, db: AsyncSession, token: str) -> bool:
        user_id = await self.tokens.consume_one_time_token(token, "verify")
        if not user_id:
            return False
        user = await db.get(User, user_id)
        if not user:
            return False
        user.is_verified = True
        await db.commit()
        return True
