from datetime import timedelta

import pytest
from fastapi import HTTPException
from jose import jwt

from app.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token


def test_decode_token_rejects_expired_token():
    token = create_access_token("user-123", expires_delta=timedelta(seconds=-1))
    with pytest.raises(HTTPException) as exc:
        decode_token(token)
    assert exc.value.status_code == 401


def test_decode_token_rejects_invalid_signature():
    payload = {"sub": "user-123", "type": "access"}
    token = jwt.encode(payload, "wrong-secret", algorithm=settings.JWT_ALGORITHM)
    with pytest.raises(HTTPException) as exc:
        decode_token(token)
    assert exc.value.status_code == 401


def test_refresh_token_contains_type_refresh():
    token = create_refresh_token("user-123")
    payload = decode_token(token)
    assert payload["type"] == "refresh"
