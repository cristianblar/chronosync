"""
Notification service with dual transport:
- OneSignal when ONESIGNAL_APP_ID is set (production)
- Local logging to stdout when ONESIGNAL_APP_ID is empty (development)
"""

import logging
from datetime import datetime
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class LocalNotificationTransport:
    """Logs notifications to stdout; used in development / when OneSignal is not configured."""

    async def send_notification(
        self,
        player_ids: list[str],
        title: str,
        body: str,
        data: Optional[dict] = None,
        scheduled_time: Optional[datetime] = None,
    ) -> dict:
        logger.info(
            "LOCAL_NOTIFICATION player_ids=%s title=%r body=%r data=%s scheduled_time=%s",
            player_ids,
            title,
            body,
            data,
            scheduled_time,
        )
        return {"status": "local", "player_ids": player_ids}


class OneSignalService:
    BASE_URL = "https://onesignal.com/api/v1"

    def __init__(self):
        self.app_id = settings.ONESIGNAL_APP_ID
        self.api_key = settings.ONESIGNAL_API_KEY
        self.headers = {
            "Authorization": f"Basic {self.api_key}",
            "Content-Type": "application/json",
        }

    async def send_notification(
        self,
        player_ids: list[str],
        title: str,
        body: str,
        data: Optional[dict] = None,
        scheduled_time: Optional[datetime] = None,
    ) -> dict:
        import httpx

        payload = {
            "app_id": self.app_id,
            "include_player_ids": player_ids,
            "headings": {"en": title},
            "contents": {"en": body},
        }
        if data:
            payload["data"] = data
        if scheduled_time:
            payload["send_after"] = scheduled_time.isoformat()
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/notifications", json=payload, headers=self.headers
            )
            response.raise_for_status()
            return response.json()


def get_notification_service():
    """Return the appropriate notification transport based on configuration."""
    if settings.ONESIGNAL_APP_ID:
        return OneSignalService()
    return LocalNotificationTransport()
