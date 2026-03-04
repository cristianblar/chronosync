from fastapi import HTTPException, status
import httpx
from google.auth import jwt

from app.config import settings

GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"]
GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v1/certs"


async def verify_google_token(token: str) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(GOOGLE_CERTS_URL)
            resp.raise_for_status()
            certs = resp.json()
        idinfo = jwt.decode(token, certs=certs, audience=settings.GOOGLE_CLIENT_ID)
        if idinfo.get("iss") not in GOOGLE_ISSUERS:
            raise ValueError("Invalid issuer")
        return {
            "email": idinfo["email"],
            "name": idinfo.get("name", ""),
            "oauth_id": idinfo["sub"],
            "picture": idinfo.get("picture"),
            "email_verified": idinfo.get("email_verified", False),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid Google token: {e}"
        )
