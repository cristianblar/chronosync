from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from pydantic import ConfigDict


class EducationalContentOut(BaseModel):
    id: UUID
    title: str
    slug: str
    excerpt: str | None = None
    body: str
    category: str
    tags: list[str] | None = None
    reading_time_minutes: int | None = None
    model_config = ConfigDict(from_attributes=True)


class FAQOut(BaseModel):
    id: UUID
    question: str
    answer: str
    category: str
    model_config = ConfigDict(from_attributes=True)


class ArticleProgressUpdate(BaseModel):
    content_id: str
    progress_percent: int


class ArticleProgressOut(BaseModel):
    content_id: UUID
    progress_percent: int
    is_completed: bool
    last_read_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)
