from typing import Generic, TypeVar, Type
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T]):
        self.model = model

    async def get(self, db: AsyncSession, obj_id):
        return await db.get(self.model, obj_id)

    async def add(self, db: AsyncSession, obj: T):
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj
