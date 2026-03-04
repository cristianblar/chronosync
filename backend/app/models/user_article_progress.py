import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


class UserArticleProgress(Base):
    __tablename__ = "user_article_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content_id = Column(UUID(as_uuid=True), ForeignKey("educational_contents.id"), nullable=False)

    progress_percent = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    last_read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "content_id", name="uniq_user_content_progress"),)
