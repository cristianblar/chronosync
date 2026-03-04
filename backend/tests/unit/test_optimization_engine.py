from datetime import date, time

from app.models.chronotype import ChronotypeCategory
from app.models.obligation import Obligation
from app.services.optimization.engine import SleepOptimizationEngine


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _time_to_min(t) -> int:
    return t.hour * 60 + t.minute


def _timeline_minutes(tval, wake_minutes: int) -> int:
    minutes = _time_to_min(tval)
    if minutes < wake_minutes:
        minutes += 1440
    return minutes


def _meal_minutes_sorted(schedule) -> list[int]:
    wake_min = _time_to_min(schedule.wake_time)
    return sorted(
        _timeline_minutes(i.scheduled_time, wake_min)
        for i in schedule.items
        if getattr(i.activity_type, "value", i.activity_type) == "meal"
    )


def _activity_minutes(schedule, activity_type: str) -> int | None:
    wake_min = _time_to_min(schedule.wake_time)
    items = [
        i
        for i in schedule.items
        if getattr(i.activity_type, "value", i.activity_type) == activity_type
    ]
    return _timeline_minutes(items[0].scheduled_time, wake_min) if items else None


# ---------------------------------------------------------------------------
# Core schedule structure
# ---------------------------------------------------------------------------


def test_generates_7_day_schedule():
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.INTERMEDIATE,
        ideal_wake_time="07:00",
        ideal_sleep_time="23:00",
        obligations=[],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)
    assert len(result.schedules) == 7
    assert result.optimization_score > 0
    assert result.solver_status in ("OPTIMAL", "FEASIBLE")
    for schedule in result.schedules:
        wake_min = _time_to_min(schedule.wake_time)
        sleep_min = _activity_minutes(schedule, "sleep")
        light_min = _activity_minutes(schedule, "light_exposure")
        meal_mins = _meal_minutes_sorted(schedule)
        wind_min = _activity_minutes(schedule, "wind_down")

        # Wake is earliest; light follows wake; meals are ordered; wind-down then sleep.
        assert wake_min < light_min
        assert wake_min < meal_mins[0] < meal_mins[1] < meal_mins[2]
        assert wake_min < wind_min < sleep_min

        # Caffeine cutoff is ≥6h before sleep
        caffeine_items = [
            i
            for i in schedule.items
            if getattr(i.activity_type, "value", i.activity_type) == "caffeine"
        ]
        if caffeine_items:
            caff_raw = _time_to_min(caffeine_items[0].scheduled_time)
            sleep_raw = _time_to_min(schedule.sleep_time)
            # Use raw minute values; sleep may be on extended day scale
            # but the hard constraint caffeine <= sleep - 360 is on the same CP scale.
            # Test on the timeline-adjusted values.
            assert caff_raw <= sleep_raw - 360 or caff_raw + 1440 <= sleep_raw + 1440 - 360


def test_sleep_duration_within_bounds():
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.INTERMEDIATE,
        ideal_wake_time="07:00",
        ideal_sleep_time="23:00",
        obligations=[],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)
    for schedule in result.schedules:
        sleep_min = _time_to_min(schedule.sleep_time)
        wake_min = _time_to_min(schedule.wake_time)
        duration = (1440 - sleep_min) + wake_min if sleep_min > wake_min else wake_min - sleep_min
        assert 420 <= duration <= 540


def test_no_obligations_produces_valid_plan():
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.INTERMEDIATE,
        ideal_wake_time="07:30",
        ideal_sleep_time="23:30",
        obligations=[],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)
    assert len(result.schedules) == 7
    assert result.optimization_score > 0
    for schedule in result.schedules:
        wake_min = _time_to_min(schedule.wake_time)
        sleep_min = _time_to_min(schedule.sleep_time)
        duration = (1440 - sleep_min) + wake_min if sleep_min > wake_min else wake_min - sleep_min
        assert 420 <= duration <= 540


# ---------------------------------------------------------------------------
# Activity distribution — regressions for "all activities crammed in first hour"
# ---------------------------------------------------------------------------


def test_meals_are_distributed_throughout_day():
    """Meals must be spread out via soft targets, not all in the first hour after wake."""
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.INTERMEDIATE,
        ideal_wake_time="07:00",
        ideal_sleep_time="23:00",
        obligations=[],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)
    for schedule in result.schedules:
        wake_min = _time_to_min(schedule.wake_time)
        meal_mins = _meal_minutes_sorted(schedule)

        breakfast, lunch, dinner = meal_mins[0], meal_mins[1], meal_mins[2]

        # Breakfast should be at least 30 min after wake (not immediately)
        # and no later than 4h after wake (chrononutrition window).
        assert breakfast >= wake_min + 30, (
            f"Breakfast too early: {breakfast - wake_min} min after wake"
        )
        assert breakfast <= wake_min + 240, (
            f"Breakfast too late: {breakfast - wake_min} min after wake"
        )

        # Lunch should be at least 4h after wake (not crammed within first hour).
        assert lunch >= wake_min + 240, f"Lunch too early: {lunch - wake_min} min after wake"

        # Dinner should be at least 8h after wake.
        assert dinner >= wake_min + 480, f"Dinner too early: {dinner - wake_min} min after wake"

        # Meals must maintain at least 3h spacing (hard constraint verification).
        assert lunch - breakfast >= 180, "Breakfast→lunch gap < 3h"
        assert dinner - lunch >= 180, "Lunch→dinner gap < 3h"


def test_caffeine_not_placed_at_minimum():
    """
    Without soft targets caffeine would be placed at wake+30 (the minimum).
    With the objective function it should be placed ~2h after wake (at least 90min).
    """
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.INTERMEDIATE,
        ideal_wake_time="07:00",
        ideal_sleep_time="23:00",
        obligations=[],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)
    for schedule in result.schedules:
        wake_min = _time_to_min(schedule.wake_time)
        caff_items = [
            i
            for i in schedule.items
            if getattr(i.activity_type, "value", i.activity_type) == "caffeine"
        ]
        assert caff_items, "No caffeine item found"
        caff_min = _timeline_minutes(caff_items[0].scheduled_time, wake_min)
        # Caffeine should be at least 60min after wake (not crammed at the 30min minimum).
        assert caff_min >= wake_min + 60, (
            f"Caffeine placed at wake+{caff_min - wake_min} min — too close to wake time"
        )


def test_exercise_not_placed_at_wake_time():
    """
    Without soft targets exercise would be placed immediately at wake time.
    With the objective function it should be pulled to mid-morning (~wake+180).
    """
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.INTERMEDIATE,
        ideal_wake_time="07:00",
        ideal_sleep_time="23:00",
        obligations=[],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)
    for schedule in result.schedules:
        wake_min = _time_to_min(schedule.wake_time)
        ex_items = [
            i
            for i in schedule.items
            if getattr(i.activity_type, "value", i.activity_type) == "exercise"
        ]
        assert ex_items, "No exercise item found"
        ex_min = _timeline_minutes(ex_items[0].scheduled_time, wake_min)
        # Exercise should be at least 30 min after wake (not placed immediately).
        assert ex_min >= wake_min + 30, (
            f"Exercise placed at wake+{ex_min - wake_min} min — too close to wake time"
        )


def test_winddown_not_placed_immediately_after_dinner():
    """
    Wind-down should be pulled toward sleep-90, not immediately after the last meal.
    """
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.INTERMEDIATE,
        ideal_wake_time="07:00",
        ideal_sleep_time="23:00",
        obligations=[],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)
    for schedule in result.schedules:
        wind_min = _activity_minutes(schedule, "wind_down")
        sleep_min = _activity_minutes(schedule, "sleep")

        # Wind-down must be within the 3h window before sleep (hard constraint).
        assert wind_min <= sleep_min
        assert wind_min >= sleep_min - 180

        # Wind-down should NOT be placed trivially (more than 3h before sleep would violate
        # the hard constraint; check it's at least 30min before sleep — meaningful buffer).
        assert sleep_min - wind_min >= 30, (
            f"Wind-down is only {sleep_min - wind_min} min before sleep"
        )


# ---------------------------------------------------------------------------
# Obligation: wake/sleep hard constraints
# ---------------------------------------------------------------------------


def test_respects_obligation_wake_and_sleep_bounds():
    obligation = Obligation(
        start_time=time(9, 0),
        end_time=time(17, 0),
        days_of_week=[0, 1, 2, 3, 4],
    )
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.MODERATE_EVENING,
        ideal_wake_time="08:30",
        ideal_sleep_time="00:30",
        obligations=[obligation],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)

    monday = next(s for s in result.schedules if s.day_of_week == 0)
    wake_min = _time_to_min(monday.wake_time)
    sleep_min_raw = _time_to_min(monday.sleep_time)
    # Sleep may be after midnight — use extended day scale (same as engine)
    sleep_min = sleep_min_raw if sleep_min_raw >= wake_min else sleep_min_raw + 1440

    assert wake_min <= 9 * 60 - 60, "Wake must be ≥60min before obligation start"
    assert 17 * 60 <= sleep_min, "Sleep must start after obligation end"


# ---------------------------------------------------------------------------
# Obligation: no-overlap with other activities (regression)
# ---------------------------------------------------------------------------

_ACTIVITY_DURATIONS = {
    "light_exposure": 30,
    "meal": 30,
    "exercise": 45,
    "wind_down": 60,
    "caffeine": 0,
    "wake": 0,
}


def _activities_overlap_obligation(schedule, ob_start: int, ob_end: int) -> list[str]:
    """Return names of activities whose time window overlaps [ob_start, ob_end)."""
    overlapping = []
    for item in schedule.items:
        act = getattr(item.activity_type, "value", item.activity_type)
        if act in ("sleep", "obligation"):
            continue
        act_start = _time_to_min(item.scheduled_time)
        duration = _ACTIVITY_DURATIONS.get(act, 0)
        act_end = act_start + duration
        # Overlap if act starts before ob ends AND act ends after ob starts
        if act_start < ob_end and act_end > ob_start:
            overlapping.append(f"{act}@{act_start // 60:02d}:{act_start % 60:02d}")
    return overlapping


def test_no_activity_overlaps_obligation():
    """
    Regression: activities (meals, exercise, etc.) must not be scheduled during
    obligation windows. The engine must use disjunctive no-overlap constraints.
    """
    ob_start_time = time(6, 0)
    ob_end_time = time(7, 0)
    obligation = Obligation(
        start_time=ob_start_time,
        end_time=ob_end_time,
        days_of_week=[0, 1, 2, 3, 4],
    )
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.INTERMEDIATE,
        ideal_wake_time="05:00",
        ideal_sleep_time="23:00",
        obligations=[obligation],
    )
    result = engine.optimize(start_date=date(2026, 3, 2), days=5)
    assert result.solver_status in ("OPTIMAL", "FEASIBLE")

    ob_start_min = _time_to_min(ob_start_time)  # 360
    ob_end_min = _time_to_min(ob_end_time)  # 420

    for schedule in result.schedules:
        if schedule.day_of_week not in [0, 1, 2, 3, 4]:
            continue
        overlapping = _activities_overlap_obligation(schedule, ob_start_min, ob_end_min)
        assert not overlapping, (
            f"Day {schedule.day_of_week}: activities overlap obligation {ob_start_time}-{ob_end_time}: "
            f"{overlapping}"
        )


def test_no_activity_overlaps_midday_obligation():
    """Activities must be scheduled around a midday obligation (9-17h), not during it."""
    obligation = Obligation(
        start_time=time(9, 0),
        end_time=time(17, 0),
        days_of_week=[0, 1, 2, 3, 4],
    )
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.INTERMEDIATE,
        ideal_wake_time="07:00",
        ideal_sleep_time="23:00",
        obligations=[obligation],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=5)
    assert result.solver_status in ("OPTIMAL", "FEASIBLE")

    ob_start_min = 9 * 60
    ob_end_min = 17 * 60

    for schedule in result.schedules:
        if schedule.day_of_week not in [0, 1, 2, 3, 4]:
            continue
        overlapping = _activities_overlap_obligation(schedule, ob_start_min, ob_end_min)
        assert not overlapping, (
            f"Day {schedule.day_of_week}: activities overlap 9:00-17:00 obligation: {overlapping}"
        )


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


def test_extreme_morning_with_late_obligation():
    obligation = Obligation(
        start_time=time(20, 0),
        end_time=time(22, 0),
        days_of_week=[0, 1, 2, 3, 4],
    )
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.EXTREME_MORNING,
        ideal_wake_time="05:30",
        ideal_sleep_time="21:00",
        obligations=[obligation],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)
    assert len(result.schedules) == 7
    for schedule in result.schedules:
        wake_min = _time_to_min(schedule.wake_time)
        sleep_min = _time_to_min(schedule.sleep_time)
        duration = (1440 - sleep_min) + wake_min if sleep_min > wake_min else wake_min - sleep_min
        assert 420 <= duration <= 540


def test_extreme_evening_with_early_obligation():
    obligation = Obligation(
        start_time=time(7, 0),
        end_time=time(9, 0),
        days_of_week=[0, 1, 2, 3, 4],
    )
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.EXTREME_EVENING,
        ideal_wake_time="10:00",
        ideal_sleep_time="02:00",
        obligations=[obligation],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)
    assert len(result.schedules) == 7
    for schedule in result.schedules:
        wake_min = _time_to_min(schedule.wake_time)
        sleep_min = _time_to_min(schedule.sleep_time)
        duration = (1440 - sleep_min) + wake_min if sleep_min > wake_min else wake_min - sleep_min
        assert 420 <= duration <= 540


def test_weekend_only_obligation():
    obligation = Obligation(
        start_time=time(10, 0),
        end_time=time(14, 0),
        days_of_week=[5, 6],
    )
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.MODERATE_EVENING,
        ideal_wake_time="08:30",
        ideal_sleep_time="00:30",
        obligations=[obligation],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)
    assert len(result.schedules) == 7
    saturday = next((s for s in result.schedules if s.day_of_week == 5), None)
    if saturday:
        wake_min = _time_to_min(saturday.wake_time)
        assert wake_min <= 10 * 60


def test_late_obligation_respected_when_sleep_is_after_midnight():
    obligation = Obligation(
        start_time=time(22, 30),
        end_time=time(23, 30),
        days_of_week=[0, 1, 2, 3, 4],
    )
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.MODERATE_EVENING,
        ideal_wake_time="08:30",
        ideal_sleep_time="00:30",
        obligations=[obligation],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)
    assert result.solver_status in ("OPTIMAL", "FEASIBLE")

    monday = next(s for s in result.schedules if s.day_of_week == 0)
    wake_min = _time_to_min(monday.wake_time)
    sleep_min_raw = _time_to_min(monday.sleep_time)
    # Sleep may be after midnight — use extended day scale
    sleep_min = sleep_min_raw if sleep_min_raw >= wake_min else sleep_min_raw + 1440

    assert wake_min <= 22 * 60 + 30 - 60
    assert 23 * 60 + 30 <= sleep_min


def test_infeasible_constraints_fall_back_to_heuristic():
    obligation = Obligation(
        start_time=time(0, 30),
        end_time=time(1, 0),
        days_of_week=[0],
    )
    engine = SleepOptimizationEngine(
        chronotype=ChronotypeCategory.INTERMEDIATE,
        ideal_wake_time="07:00",
        ideal_sleep_time="23:00",
        obligations=[obligation],
    )
    result = engine.optimize(start_date=date(2026, 1, 20), days=7)
    assert result.solver_status == "FALLBACK"
