from datetime import time

from app.utils.tracking_metrics import adherence_percentage, midpoint_deviation_minutes


def test_adherence_is_100_when_exact_match():
    planned_sleep = time(23, 0)
    planned_wake = time(7, 0)
    assert adherence_percentage(planned_sleep, planned_wake, time(23, 0), time(7, 0)) == 100.0


def test_adherence_decays_linearly():
    planned_sleep = time(23, 0)
    planned_wake = time(7, 0)

    # 90 min deviation on both sleep + wake => avg deviation 90 => 50%
    score = adherence_percentage(planned_sleep, planned_wake, time(0, 30), time(8, 30))
    assert score == 50.0


def test_midpoint_deviation_minutes_handles_cross_midnight():
    # Planned sleep midpoint: (23:00 -> 07:00) => 03:00
    # Actual: (00:00 -> 08:00) => 04:00 => deviation 60 min
    planned_sleep = time(23, 0)
    planned_wake = time(7, 0)
    actual_sleep = time(0, 0)
    actual_wake = time(8, 0)

    assert midpoint_deviation_minutes(planned_sleep, planned_wake, actual_sleep, actual_wake) == 60
