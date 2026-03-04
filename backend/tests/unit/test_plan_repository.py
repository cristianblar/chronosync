"""
Unit tests for PlanRepository.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest


@pytest.mark.asyncio
async def test_get_active_orders_by_valid_from_then_created_at():
    """
    Regression: when two plans share the same valid_from date,
    get_active must return the one with the latest created_at.
    The ORDER BY clause must include both columns.
    """
    from app.repositories.plan_repository import PlanRepository

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None

    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_result

    repo = PlanRepository()
    await repo.get_active(mock_db, user_id=42)

    call_args = mock_db.execute.call_args
    query = call_args[0][0]
    compiled = str(query.compile()).lower()

    assert "valid_from" in compiled, "ORDER BY must include valid_from"
    assert "created_at" in compiled, "ORDER BY must include created_at as tiebreaker"
    # valid_from must sort before created_at in the ORDER BY clause
    assert compiled.index("valid_from") < compiled.index("created_at"), (
        "valid_from must be the primary sort key, created_at the tiebreaker"
    )


@pytest.mark.asyncio
async def test_get_active_filters_by_user_id_and_is_active():
    """The query must filter by user_id and is_active=True."""
    from app.repositories.plan_repository import PlanRepository

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None

    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_result

    repo = PlanRepository()
    await repo.get_active(mock_db, user_id=99)

    call_args = mock_db.execute.call_args
    query = call_args[0][0]
    compiled = str(query.compile()).lower()

    assert "user_id" in compiled
    assert "is_active" in compiled
