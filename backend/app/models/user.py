import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(100), nullable=False)
    timezone = Column(String(50), default="UTC")
    language = Column(String(5), default="es")

    oauth_provider = Column(String(20), nullable=True)
    oauth_id = Column(String(255), nullable=True)

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    analytics_consent = Column(Boolean, default=False)
    marketing_consent = Column(Boolean, default=False)
    research_consent = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    assessments = relationship("ChronotypeAssessment", back_populates="user")
    obligations = relationship("Obligation", back_populates="user")
    plans = relationship("SleepPlan", back_populates="user")
    trackings = relationship("DailyTracking", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    events = relationship("Event", back_populates="user")
