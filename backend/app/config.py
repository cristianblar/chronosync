from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "ChronoSync API"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    DATABASE_URL: str
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    REDIS_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    RESET_TOKEN_EXPIRE_MINUTES: int = 60
    VERIFY_TOKEN_EXPIRE_MINUTES: int = 1440
    BCRYPT_ROUNDS: int = 12

    CORS_ORIGINS: list[str] = ["https://chronosync.app", "http://localhost:3000"]

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    ONESIGNAL_APP_ID: str = ""
    ONESIGNAL_API_KEY: str = ""

    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@chronosync.local"

    # Local SMTP (Mailhog). Used when SENDGRID_API_KEY is empty.
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025

    SENTRY_DSN: str | None = None

    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_OVERRIDES: dict[str, int] = {
        "/api/v1/auth": 20,
        "/api/v1/tracking": 60,
        "/api/v1/plans": 30,
    }
    DISABLE_RATE_LIMIT: bool = False

    ENABLE_SCHEDULER: bool = True
    NOTIFICATION_RETENTION_DAYS: int = 30
    CSP_MARGIN_PRE_OBLIGATION_MINUTES: int = 60
    CSP_MAX_DAILY_SHIFT_MINUTES: int = 30
    CSP_MIN_SLEEP_DURATION_MINUTES: int = 420
    CSP_MAX_SLEEP_DURATION_MINUTES: int = 540
    CSP_WEIGHT_SLEEP_DEV: float = 1.0
    CSP_WEIGHT_WAKE_DEV: float = 1.0
    CSP_WEIGHT_JET_LAG: float = 2.0
    CSP_WEIGHT_TRANSITION: float = 1.5
    CSP_WEIGHT_SOFT: float = 0.5

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
