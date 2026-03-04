from datetime import date, timedelta, time
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.plan_repository import PlanRepository
from app.repositories.obligation_repository import ObligationRepository
from app.repositories.chronotype_repository import ChronotypeRepository
from app.services.optimization.engine import SleepOptimizationEngine
from app.models.plan import SleepPlan, DailySchedule, ScheduleItem, ActivityType


class PlanService:
    def __init__(self):
        self.plans = PlanRepository()
        self.obligations = ObligationRepository()
        self.chronotypes = ChronotypeRepository()

    async def generate_plan(self, db: AsyncSession, user_id, start_date: date | None):
        start = start_date or (date.today() + timedelta(days=1))
        # Deactivate all existing active plans before creating a new one
        await db.execute(
            update(SleepPlan)
            .where(SleepPlan.user_id == user_id, SleepPlan.is_active.is_(True))
            .values(is_active=False)
        )
        await db.commit()
        assessment = await self.chronotypes.get_current(db, user_id)
        if not assessment:
            raise ValueError("Chronotype assessment required")
        obligations = await self.obligations.list(db, user_id, active_only=True)
        engine = SleepOptimizationEngine(
            chronotype=assessment.chronotype,
            ideal_wake_time=assessment.ideal_wake_time,
            ideal_sleep_time=assessment.ideal_sleep_time,
            obligations=obligations,
        )
        result = engine.optimize(start_date=start, days=7)

        plan = SleepPlan(
            user_id=user_id,
            valid_from=start,
            valid_until=start + timedelta(days=6),
            target_sleep_time=result.schedules[0].sleep_time,
            target_wake_time=result.schedules[0].wake_time,
            optimization_score=result.optimization_score,
        )
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        for schedule in result.schedules:
            ds = DailySchedule(
                plan_id=plan.id,
                date=schedule.date,
                day_of_week=schedule.day_of_week,
                sleep_time=schedule.sleep_time,
                wake_time=schedule.wake_time,
            )
            db.add(ds)
            await db.commit()
            await db.refresh(ds)
            for item in schedule.items:
                si = ScheduleItem(
                    daily_schedule_id=ds.id,
                    activity_type=item.activity_type,
                    scheduled_time=item.scheduled_time,
                    duration_minutes=item.duration_minutes,
                    notes=item.notes,
                    scientific_rationale=item.scientific_rationale,
                )
                db.add(si)
            # Add user obligations that apply to this day as schedule items
            day_of_week = schedule.day_of_week
            for obligation in obligations:
                if day_of_week in (obligation.days_of_week or []):
                    obl_start = obligation.start_time
                    obl_end = obligation.end_time
                    duration = (obl_end.hour * 60 + obl_end.minute) - (
                        obl_start.hour * 60 + obl_start.minute
                    )
                    ob_item = ScheduleItem(
                        daily_schedule_id=ds.id,
                        activity_type=ActivityType.OBLIGATION,
                        scheduled_time=obl_start,
                        duration_minutes=duration if duration > 0 else None,
                        notes=obligation.name,
                    )
                    db.add(ob_item)
            await db.commit()
        return result, plan

    async def get_current(self, db: AsyncSession, user_id):
        return await self.plans.get_active(db, user_id)

    async def generate_transition_plan(
        self,
        db: AsyncSession,
        user_id,
        target_wake_time,
        target_sleep_time,
        max_daily_shift_minutes: int = 30,
    ):
        current = await self.plans.get_active(db, user_id)
        if not current:
            raise ValueError("Current plan required for transition")
        start_wake = current.target_wake_time
        start_sleep = current.target_sleep_time

        def minutes(tval: time) -> int:
            return tval.hour * 60 + tval.minute

        def to_time(m: int) -> time:
            m = m % 1440
            return time(m // 60, m % 60)

        start_w = minutes(start_wake)
        start_s = minutes(start_sleep)
        target_w = minutes(target_wake_time)
        target_s = minutes(target_sleep_time)

        def step(current_val, target_val):
            if current_val == target_val:
                return current_val
            diff = target_val - current_val
            if abs(diff) <= max_daily_shift_minutes:
                return target_val
            return current_val + (max_daily_shift_minutes if diff > 0 else -max_daily_shift_minutes)

        schedules = []
        day = 0
        start_date = date.today() + timedelta(days=1)
        curr_w, curr_s = start_w, start_s
        while curr_w != target_w or curr_s != target_s:
            curr_w = step(curr_w, target_w)
            curr_s = step(curr_s, target_s)
            schedules.append(
                {
                    "date": start_date + timedelta(days=day),
                    "day_of_week": (start_date + timedelta(days=day)).weekday(),
                    "wake_time": to_time(curr_w),
                    "sleep_time": to_time(curr_s),
                }
            )
            day += 1

        plan = SleepPlan(
            user_id=user_id,
            valid_from=start_date,
            valid_until=start_date + timedelta(days=len(schedules) - 1),
            target_sleep_time=target_sleep_time,
            target_wake_time=target_wake_time,
            is_transition_plan=True,
        )
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        for s in schedules:
            ds = DailySchedule(
                plan_id=plan.id,
                date=s["date"],
                day_of_week=s["day_of_week"],
                sleep_time=s["sleep_time"],
                wake_time=s["wake_time"],
            )
            db.add(ds)
        await db.commit()
        return plan, schedules
