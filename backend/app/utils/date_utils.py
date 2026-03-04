from datetime import datetime


def now_utc_iso() -> str:
    return datetime.utcnow().isoformat()
