import enum
import uuid
from sqlalchemy import Column, String, Date, Time, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class EventType(str, enum.Enum):
    EXAM = "exam"
    PRESENTATION = "presentation"
    INTERVIEW = "interview"
    TRAVEL = "travel"
    OTHER = "other"


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    name = Column(String(100), nullable=False)
    type = Column(Enum(EventType), nullable=False)
    event_date = Column(Date, nullable=False)
    event_time = Column(Time, nullable=True)

    importance = Column(Integer, default=3)
    preparation_days = Column(Integer, default=5)

    notes = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="events")
