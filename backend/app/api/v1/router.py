from fastapi import APIRouter

from app.api.v1 import (
    auth,
    users,
    chronotype,
    obligations,
    plans,
    tracking,
    education,
    notifications,
    events,
    health,
)

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(chronotype.router, prefix="/chronotype", tags=["chronotype"])
router.include_router(obligations.router, prefix="/obligations", tags=["obligations"])
router.include_router(plans.router, prefix="/plans", tags=["plans"])
router.include_router(tracking.router, prefix="/tracking", tags=["tracking"])
router.include_router(education.router, prefix="/education", tags=["education"])
router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
router.include_router(events.router, prefix="/events", tags=["events"])
router.include_router(health.router, tags=["health"])
