"""
Unit tests for scheduler background jobs.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_cleanup_expired_refresh_tokens_deletes_expired():
    """Expired refresh tokens are deleted and committed."""
    from app.core.scheduler import cleanup_expired_refresh_tokens

    expired_token = MagicMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [expired_token]

    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_result
    mock_db.__aenter__ = AsyncMock(return_value=mock_db)
    mock_db.__aexit__ = AsyncMock(return_value=False)

    with patch("app.core.scheduler.async_session", return_value=mock_db):
        await cleanup_expired_refresh_tokens()

    mock_db.delete.assert_called_once_with(expired_token)
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_cleanup_expired_refresh_tokens_no_expired_tokens():
    """When no tokens are expired, delete and commit are not called."""
    from app.core.scheduler import cleanup_expired_refresh_tokens

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []

    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_result
    mock_db.__aenter__ = AsyncMock(return_value=mock_db)
    mock_db.__aexit__ = AsyncMock(return_value=False)

    with patch("app.core.scheduler.async_session", return_value=mock_db):
        await cleanup_expired_refresh_tokens()

    mock_db.delete.assert_not_called()
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_cleanup_expired_refresh_tokens_filters_by_expiry():
    """The WHERE clause filters tokens whose expires_at is before now."""
    from app.core.scheduler import cleanup_expired_refresh_tokens

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []

    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_result
    mock_db.__aenter__ = AsyncMock(return_value=mock_db)
    mock_db.__aexit__ = AsyncMock(return_value=False)

    with patch("app.core.scheduler.async_session", return_value=mock_db):
        await cleanup_expired_refresh_tokens()

    call_args = mock_db.execute.call_args
    query = call_args[0][0]
    compiled = str(query.compile())
    assert "expires_at" in compiled.lower()
