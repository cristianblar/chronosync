import pytest
from app.utils.meq_scoring import calculate_chronotype
from app.models.chronotype import ChronotypeCategory


def _minutes_to_str(total_minutes: int) -> str:
    total_minutes = total_minutes % 1440
    return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"


def _expected_times(score: int) -> tuple[str, str, str]:
    midpoint_hours = 4.0 + (86 - score) * 0.11
    midpoint_minutes = int(round(midpoint_hours * 60))
    sleep_minutes = midpoint_minutes - 240
    wake_minutes = midpoint_minutes + 240
    return (
        _minutes_to_str(wake_minutes),
        _minutes_to_str(sleep_minutes),
        _minutes_to_str(midpoint_minutes),
    )


def test_extreme_morning_classification():
    responses = {f"q{i}": 4 for i in range(1, 20)}
    result = calculate_chronotype(responses)
    assert result["score"] >= 70
    assert result["chronotype"] == ChronotypeCategory.EXTREME_MORNING
    exp_wake, exp_sleep, exp_mid = _expected_times(result["score"])
    assert result["ideal_wake_time"] == exp_wake
    assert result["ideal_sleep_time"] == exp_sleep
    assert result["midpoint_of_sleep"] == exp_mid


def test_extreme_evening_classification():
    responses = {f"q{i}": 1 for i in range(1, 20)}
    result = calculate_chronotype(responses)
    assert result["score"] <= 30
    assert result["chronotype"] == ChronotypeCategory.EXTREME_EVENING


def test_intermediate_classification():
    responses = {f"q{i}": 3 for i in range(1, 20)}
    result = calculate_chronotype(responses)
    assert 42 <= result["score"] <= 58
    assert result["chronotype"] == ChronotypeCategory.INTERMEDIATE


def test_invalid_responses_raises_error():
    responses = {f"q{i}": 3 for i in range(1, 10)}
    with pytest.raises(ValueError, match="19 questions required"):
        calculate_chronotype(responses)
