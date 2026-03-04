from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tracking import DailyTracking, EnergyLog
from app.utils.tracking_metrics import circular_diff_minutes, midpoint_minutes


class TrackingService:
    async def history(self, db: AsyncSession, user_id, start: date, end: date, limit: int):
        res = await db.execute(
            select(DailyTracking)
            .where(
                DailyTracking.user_id == user_id,
                DailyTracking.date >= start,
                DailyTracking.date <= end,
            )
            .order_by(DailyTracking.date.desc())
            .limit(limit)
        )
        return list(res.scalars().all())

    async def metrics(self, db: AsyncSession, user_id, start: date, end: date):
        rows = await db.execute(
            select(DailyTracking).where(
                DailyTracking.user_id == user_id,
                DailyTracking.date >= start,
                DailyTracking.date <= end,
            )
        )
        trackings = list(rows.scalars().all())
        if not trackings:
            return {
                "avg_sleep_quality": 0,
                "avg_adherence": 0,
                "avg_social_jet_lag": 0,
                "avg_energy": 0,
                "streak_days": 0,
                "trends": {"sleep_quality": [], "adherence": [], "energy": []},
                "insights": [],
            }
        avg_quality = sum(t.sleep_quality or 0 for t in trackings) / len(trackings)
        avg_adherence = sum(t.adherence_percentage or 0 for t in trackings) / len(trackings)

        # Social jet lag (implementation current):
        # Prefer computing from actual midpoints (weekend vs weekday) when possible.
        mid_weekend = []
        mid_weekday = []
        for t in trackings:
            if t.actual_sleep_time and t.actual_wake_time:
                m = midpoint_minutes(t.actual_sleep_time, t.actual_wake_time)
                if t.date.weekday() in (5, 6):
                    mid_weekend.append(m)
                else:
                    mid_weekday.append(m)

        if mid_weekend and mid_weekday:
            avg_mid_weekend = int(round(sum(mid_weekend) / len(mid_weekend)))
            avg_mid_weekday = int(round(sum(mid_weekday) / len(mid_weekday)))
            avg_jet_lag = circular_diff_minutes(avg_mid_weekend, avg_mid_weekday)
        else:
            avg_jet_lag = int(
                round(sum(t.social_jet_lag_minutes or 0 for t in trackings) / len(trackings))
            )
        energy_rows = await db.execute(
            select(func.avg(EnergyLog.energy_level)).where(
                EnergyLog.user_id == user_id,
                EnergyLog.logged_at >= start,
                EnergyLog.logged_at <= end,
            )
        )
        avg_energy = energy_rows.scalar() or 0
        trends_quality = [
            {"date": t.date.isoformat(), "value": t.sleep_quality or 0} for t in trackings
        ]
        trends_adherence = [
            {"date": t.date.isoformat(), "value": t.adherence_percentage or 0} for t in trackings
        ]
        trends_energy = [{"date": t.date.isoformat(), "value": avg_energy} for t in trackings]
        insights = []
        if avg_adherence < 70:
            insights.append("Adherence below 70%—consider adjusting targets.")
        if avg_quality < 6:
            insights.append("Average sleep quality is low—review wind-down routine.")
        return {
            "avg_sleep_quality": avg_quality,
            "avg_adherence": avg_adherence,
            "avg_social_jet_lag": avg_jet_lag,
            "avg_energy": avg_energy,
            "streak_days": len(trackings),
            "trends": {
                "sleep_quality": trends_quality,
                "adherence": trends_adherence,
                "energy": trends_energy,
            },
            "insights": insights,
        }
