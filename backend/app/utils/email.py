"""
Email utility with dual transport:
- Resend when RESEND_API_KEY is set (production)
- Plain SMTP via smtplib when RESEND_API_KEY is empty (local / Mailhog)
"""

import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send an email using whichever transport is configured."""
    if settings.RESEND_API_KEY:
        return await _send_via_resend(to, subject, html)
    return _send_via_smtp(to, subject, html)


async def _send_via_resend(to: str, subject: str, html: str) -> bool:
    import resend

    resend.api_key = settings.RESEND_API_KEY
    try:
        resend.Emails.send(
            {
                "from": f"ChronoSync <{settings.FROM_EMAIL}>",
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
        return True
    except Exception as exc:
        logger.error("Resend error: %s", exc)
        return False


def _send_via_smtp(to: str, subject: str, html: str) -> bool:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.FROM_EMAIL
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.sendmail(settings.FROM_EMAIL, [to], msg.as_string())
        return True
    except Exception as exc:
        logger.error("SMTP error: %s", exc)
        return False


class EmailService:
    """Thin wrapper kept for backward-compatibility with AuthService."""

    async def send_verification_email(self, to_email: str, token: str) -> bool:
        verify_url = f"http://localhost:3000/verify-email?token={token}"
        html = (
            f"<p>Verifica tu cuenta ChronoSync:</p>"
            f"<p><a href='{verify_url}'>Verificar email</a></p>"
            f"<p>O copia este enlace: {verify_url}</p>"
        )
        return await send_email(to_email, "Verifica tu cuenta ChronoSync", html)

    async def send_password_reset_email(self, to_email: str, token: str) -> bool:
        reset_url = f"http://localhost:3000/reset-password?token={token}"
        html = (
            f"<p>Restablece tu contraseña de ChronoSync:</p>"
            f"<p><a href='{reset_url}'>Restablecer contraseña</a></p>"
            f"<p>O copia este enlace: {reset_url}</p>"
            f"<p>Este enlace expira en {settings.RESET_TOKEN_EXPIRE_MINUTES} minutos.</p>"
        )
        return await send_email(to_email, "Restablece tu contraseña de ChronoSync", html)
