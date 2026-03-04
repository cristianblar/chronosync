import os
import asyncio

from sqlalchemy import select

from app.db.session import async_session
from app.models.user import User
from app.core.security import hash_password


async def _run():
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    name = os.getenv("ADMIN_NAME", "Admin")
    if not email or not password:
        print("ADMIN_EMAIL and ADMIN_PASSWORD required")
        return
    async with async_session() as session:
        res = await session.execute(select(User).where(User.email == email))
        existing = res.scalar_one_or_none()
        if existing:
            print("Admin already exists")
            return
        user = User(
            email=email,
            password_hash=hash_password(password),
            name=name,
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        await session.commit()
        print("Admin created")


def main():
    asyncio.run(_run())


if __name__ == "__main__":
    main()
