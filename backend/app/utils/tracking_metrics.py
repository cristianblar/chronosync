from __future__ import annotations

from datetime import time


def time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def circular_diff_minutes(a: int, b: int) -> int:
    """Smallest absolute difference between two minute-of-day values."""
    diff = (a - b) % 1440
    if diff > 720:
        diff = 1440 - diff
    return int(diff)


def midpoint_minutes(sleep_time: time, wake_time: time) -> int:
    """Midpoint of sleep interval in minutes-of-day.

    Assumes sleep may cross midnight.
    """
    s = time_to_minutes(sleep_time)
    w = time_to_minutes(wake_time)
    duration = (w - s) % 1440
    return int((s + duration / 2) % 1440)


def adherence_percentage(
    planned_sleep: time,
    planned_wake: time,
    actual_sleep: time,
    actual_wake: time,
    max_deviation_minutes: int = 180,
) -> float:
    """Simple adherence score (0–100) based on sleep+wake deviation vs. plan.

    - 100 when both sleep and wake match the plan exactly.
    - Linearly decays to 0 when average deviation reaches max_deviation_minutes.

    Nota: esta es la implementación actual (documentable en el reporte).
    """
    ps = time_to_minutes(planned_sleep)
    pw = time_to_minutes(planned_wake)
    a_s = time_to_minutes(actual_sleep)
    a_w = time_to_minutes(actual_wake)

    sleep_diff = circular_diff_minutes(a_s, ps)
    wake_diff = circular_diff_minutes(a_w, pw)

    avg_diff = (sleep_diff + wake_diff) / 2
    score = 100.0 - (avg_diff / max_deviation_minutes) * 100.0
    return max(0.0, min(100.0, score))


def midpoint_deviation_minutes(
    planned_sleep: time,
    planned_wake: time,
    actual_sleep: time,
    actual_wake: time,
) -> int:
    """Deviation between actual and planned sleep midpoint (proxy for jet lag)."""
    planned_mid = midpoint_minutes(planned_sleep, planned_wake)
    actual_mid = midpoint_minutes(actual_sleep, actual_wake)
    return circular_diff_minutes(actual_mid, planned_mid)
