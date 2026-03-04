from app.models.chronotype import ChronotypeCategory


def _minutes_to_str(total_minutes: int) -> str:
    total_minutes = total_minutes % 1440
    return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"


def calculate_chronotype(responses: dict[str, int]) -> dict:
    if len(responses) != 19:
        raise ValueError("19 questions required")
    score = sum(responses.values())
    if score >= 70:
        chronotype = ChronotypeCategory.EXTREME_MORNING
    elif score >= 59:
        chronotype = ChronotypeCategory.MODERATE_MORNING
    elif score >= 42:
        chronotype = ChronotypeCategory.INTERMEDIATE
    elif score >= 31:
        chronotype = ChronotypeCategory.MODERATE_EVENING
    else:
        chronotype = ChronotypeCategory.EXTREME_EVENING
    ideal_midpoint_hours = 4.0 + (86 - score) * 0.11
    ideal_midpoint_minutes = int(round(ideal_midpoint_hours * 60))
    ideal_sleep_minutes = ideal_midpoint_minutes - 240
    ideal_wake_minutes = ideal_midpoint_minutes + 240
    return {
        "score": score,
        "chronotype": chronotype,
        "ideal_wake_time": _minutes_to_str(ideal_wake_minutes),
        "ideal_sleep_time": _minutes_to_str(ideal_sleep_minutes),
        "midpoint_of_sleep": _minutes_to_str(ideal_midpoint_minutes),
    }
