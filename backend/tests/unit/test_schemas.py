"""
Unit tests for Pydantic schema correctness.

These tests guard against Python 3.12 annotation evaluation bugs where a field
name can shadow an imported type in the class body, causing Pydantic v2 to
resolve the type as NoneType and reject any non-None value with 'none_required'.
"""

import datetime

from app.schemas.tracking import TrackingCreate, TrackingOut


class TestTrackingCreateSchema:
    """
    Regression tests for the 422 'none_required' bug.

    Root cause: `date: Optional[date] = None` — the field name 'date' shadowed
    the imported 'date' type. Python 3.12 evaluates the assignment first, so
    when the annotation Optional[date] was resolved, 'date' was already None in
    the class namespace, making the type Optional[NoneType].

    Fix: use `import datetime` and reference `datetime.date` / `datetime.time`.
    """

    def test_date_field_accepts_iso_string(self):
        """POST /tracking sends date as 'YYYY-MM-DD' string; must not raise 422."""
        record = TrackingCreate(date="2026-03-03")
        assert record.date == datetime.date(2026, 3, 3)

    def test_date_field_accepts_date_object(self):
        record = TrackingCreate(date=datetime.date(2026, 3, 3))
        assert record.date == datetime.date(2026, 3, 3)

    def test_date_field_accepts_none(self):
        record = TrackingCreate(date=None)
        assert record.date is None

    def test_date_field_defaults_to_none(self):
        record = TrackingCreate()
        assert record.date is None

    def test_actual_sleep_time_accepts_time_string(self):
        record = TrackingCreate(actual_sleep_time="22:30")
        assert record.actual_sleep_time == datetime.time(22, 30)

    def test_actual_wake_time_accepts_time_string(self):
        record = TrackingCreate(actual_wake_time="06:15")
        assert record.actual_wake_time == datetime.time(6, 15)

    def test_full_payload_as_sent_by_offline_sync(self):
        """Mirrors the exact payload the frontend offline sync queue sends."""
        record = TrackingCreate(
            date="2026-03-03",
            actual_sleep_time="22:00",
            actual_wake_time="05:30",
            sleep_quality=8,
            energy_levels={"morning": 7, "afternoon": 6, "evening": 5},
            notes="Slept well",
        )
        assert record.date == datetime.date(2026, 3, 3)
        assert record.actual_sleep_time == datetime.time(22, 0)
        assert record.actual_wake_time == datetime.time(5, 30)
        assert record.sleep_quality == 8

    def test_date_annotation_is_not_nonetype(self):
        """
        Guard against regression: the annotation must resolve to Optional[datetime.date],
        NOT Optional[NoneType]. If this fails, the Python shadow bug has returned.
        """
        import typing

        hints = typing.get_type_hints(TrackingCreate)
        # Unwrap Optional[X] → X
        args = typing.get_args(hints["date"])
        non_none = [a for a in args if a is not type(None)]
        assert len(non_none) == 1 and non_none[0] is datetime.date, (
            f"date field resolved to wrong type: {hints['date']}. "
            "Field name 'date' may be shadowing the datetime.date type again."
        )

    def test_sleep_time_annotation_is_not_nonetype(self):
        import typing

        hints = typing.get_type_hints(TrackingCreate)
        args = typing.get_args(hints["actual_sleep_time"])
        non_none = [a for a in args if a is not type(None)]
        assert len(non_none) == 1 and non_none[0] is datetime.time, (
            f"actual_sleep_time field resolved to wrong type: {hints['actual_sleep_time']}"
        )


class TestTrackingOutSchema:
    def test_from_attributes(self):
        """TrackingOut must be constructable from ORM-like attribute access."""

        class FakeOrm:
            id = "abc-123"
            date = datetime.date(2026, 3, 3)
            actual_sleep_time = datetime.time(22, 0)
            actual_wake_time = datetime.time(5, 30)
            sleep_quality = 8
            adherence_percentage = 92.5
            social_jet_lag_minutes = 15
            notes = "Good night"

        out = TrackingOut.model_validate(FakeOrm(), from_attributes=True)
        assert out.id == "abc-123"
        assert out.date == datetime.date(2026, 3, 3)
