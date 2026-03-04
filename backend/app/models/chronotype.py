import enum
import uuid
from sqlalchemy import Column, Integer, Enum, DateTime, ForeignKey, Boolean, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class ChronotypeCategory(str, enum.Enum):
    EXTREME_MORNING = "extreme_morning"
    MODERATE_MORNING = "moderate_morning"
    INTERMEDIATE = "intermediate"
    MODERATE_EVENING = "moderate_evening"
    EXTREME_EVENING = "extreme_evening"


class ChronotypeAssessment(Base):
    __tablename__ = "chronotype_assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    responses = Column(JSONB, nullable=False)
    total_score = Column(Integer, nullable=False)
    chronotype = Column(Enum(ChronotypeCategory), nullable=False)

    ideal_wake_time = Column(String(5), nullable=False)
    ideal_sleep_time = Column(String(5), nullable=False)
    midpoint_of_sleep = Column(String(5), nullable=False)

    is_current = Column(Boolean, default=True)
    assessed_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="assessments")
