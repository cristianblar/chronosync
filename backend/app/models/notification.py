import enum
import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Enum,
    Boolean,
    Integer,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class NotificationType(str, enum.Enum):
    WIND_DOWN = "wind_down"
    TRACKING_REMINDER = "tracking_reminder"
    ACTIVITY = "activity"
    EVENT_PREP = "event_prep"
    MILESTONE = "milestone"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(100), nullable=False)
    body = Column(String(255), nullable=False)
    deep_link = Column(String(255), nullable=True)

    content = Column(JSONB, nullable=True)

    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)

    wind_down_enabled = Column(Boolean, default=True)
    wind_down_minutes_before = Column(Integer, default=60)
    tracking_reminder_enabled = Column(Boolean, default=True)
    tracking_reminder_time = Column(Time, nullable=True)
    activity_reminders_enabled = Column(Boolean, default=True)
    max_per_day = Column(Integer, default=5)
    quiet_hours_start = Column(Time, nullable=True)
    quiet_hours_end = Column(Time, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (UniqueConstraint("user_id", name="uniq_notification_settings_user"),)
