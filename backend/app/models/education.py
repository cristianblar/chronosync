import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB, TSVECTOR
from sqlalchemy.sql import func

from app.db.base import Base


class EducationalContent(Base):
    __tablename__ = "educational_contents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    excerpt = Column(String(500), nullable=True)
    body = Column(Text, nullable=False)

    category = Column(String(50), nullable=False, index=True)
    tags = Column(ARRAY(String), nullable=True)

    reading_time_minutes = Column(Integer, nullable=True)

    citations = Column(JSONB, nullable=True)
    target_chronotypes = Column(ARRAY(String), nullable=True)

    search_vector = Column(TSVECTOR, nullable=True)

    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (Index("idx_education_search", "search_vector", postgresql_using="gin"),)


class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    question = Column(String(500), nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)

    order = Column(Integer, default=0)
    is_published = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
