from datetime import date, time, timedelta
from typing import List
from ortools.sat.python import cp_model

from app.config import settings
from app.models.chronotype import ChronotypeCategory
from app.models.obligation import Obligation
from app.models.plan import ActivityType
from app.services.optimization.variables import ScheduleVariables


class DailyScheduleOutput:
    def __init__(self, date, day_of_week, sleep_time, wake_time, items):
        self.date = date
        self.day_of_week = day_of_week
        self.sleep_time = sleep_time
        self.wake_time = wake_time
        self.items = items


class ScheduleItemOutput:
    def __init__(
        self,
        activity_type,
        scheduled_time,
        duration_minutes=None,
        notes=None,
        scientific_rationale=None,
    ):
        self.activity_type = activity_type
        self.scheduled_time = scheduled_time
        self.duration_minutes = duration_minutes
        self.notes = notes
        self.scientific_rationale = scientific_rationale


class OptimizationResult:
    def __init__(self, schedules, optimization_score, solver_status, generation_time_ms):
        self.schedules = schedules
        self.optimization_score = optimization_score
        self.solver_status = solver_status
        self.generation_time_ms = generation_time_ms


class SleepOptimizationEngine:
    DAY_MIN = 0
    DAY_MAX = 1439
    # Sleep bedtime can extend past midnight (e.g. 02:25 = 1440+145 = 1585).
    # Allow up to 08:00 "next day" so all chronotypes fit within the activity chain.
    SLEEP_MAX = 1920

    def __init__(
        self,
        chronotype: ChronotypeCategory,
        ideal_wake_time: str,
        ideal_sleep_time: str,
        obligations: List[Obligation],
    ):
        self.chronotype = ChronotypeCategory(chronotype)
        self.ideal_wake = self._time_to_minutes(self._parse_time(ideal_wake_time))
        ideal_sleep_raw = self._time_to_minutes(self._parse_time(ideal_sleep_time))
        # The activity chain enforces wake < ... < sleep (bedtime is later in the day).
        # MEQ ideal_sleep_time is the start-of-sleep (often early morning, e.g. 02:25).
        # When it falls before ideal_wake on the 0-1439 scale, represent it as the
        # same time on the "extended day" (add 1440) so the optimizer targets a
        # late-night/early-morning bedtime that is numerically after the wake time.
        self.ideal_sleep = (
            ideal_sleep_raw if ideal_sleep_raw >= self.ideal_wake else ideal_sleep_raw + 1440
        )
        self.obligations = obligations
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.solver.parameters.max_time_in_seconds = 5.0
        self.margin_pre_obligation = settings.CSP_MARGIN_PRE_OBLIGATION_MINUTES
        self.max_daily_shift = settings.CSP_MAX_DAILY_SHIFT_MINUTES
        self.min_sleep_duration = settings.CSP_MIN_SLEEP_DURATION_MINUTES
        self.max_sleep_duration = settings.CSP_MAX_SLEEP_DURATION_MINUTES
        self.weight_scale = 10
        self.w1 = int(settings.CSP_WEIGHT_SLEEP_DEV * self.weight_scale)
        self.w2 = int(settings.CSP_WEIGHT_WAKE_DEV * self.weight_scale)
        self.w3 = int(settings.CSP_WEIGHT_JET_LAG * self.weight_scale)
        self.w4 = int(settings.CSP_WEIGHT_TRANSITION * self.weight_scale)
        self.w5 = int(settings.CSP_WEIGHT_SOFT * self.weight_scale)

    def optimize(self, start_date: date, days: int = 7) -> OptimizationResult:
        variables = self._create_variables(days)
        self._add_sleep_duration_constraints(variables, days)
        self._add_activity_constraints(variables, days)
        self._add_obligation_constraints(variables, start_date)
        self._set_objective(variables, start_date, days)

        status = self.solver.Solve(self.model)
        if status in (cp_model.CpSolverStatus.OPTIMAL, cp_model.CpSolverStatus.FEASIBLE):
            return self._extract_solution(variables, start_date, status)
        return self._fallback_solution(start_date, days)

    def _create_variables(self, days: int) -> ScheduleVariables:
        variables = ScheduleVariables()
        midpoint2x_max = self.SLEEP_MAX * 2 + self.max_sleep_duration
        for day in range(days):
            variables.sleep_times[day] = self.model.NewIntVar(
                self.DAY_MIN, self.SLEEP_MAX, f"sleep_{day}"
            )
            variables.wake_times[day] = self.model.NewIntVar(
                self.DAY_MIN, self.DAY_MAX, f"wake_{day}"
            )
            variables.durations[day] = self.model.NewIntVar(
                self.min_sleep_duration,
                self.max_sleep_duration,
                f"duration_{day}",
            )
            variables.light_times[day] = self.model.NewIntVar(
                self.DAY_MIN, self.DAY_MAX, f"light_{day}"
            )
            variables.caffeine_times[day] = self.model.NewIntVar(
                self.DAY_MIN, self.DAY_MAX, f"caffeine_{day}"
            )
            variables.exercise_times[day] = self.model.NewIntVar(
                self.DAY_MIN, self.DAY_MAX, f"exercise_{day}"
            )
            variables.meal1_times[day] = self.model.NewIntVar(
                self.DAY_MIN, self.DAY_MAX, f"meal1_{day}"
            )
            variables.meal2_times[day] = self.model.NewIntVar(
                self.DAY_MIN, self.DAY_MAX, f"meal2_{day}"
            )
            variables.meal3_times[day] = self.model.NewIntVar(
                self.DAY_MIN, self.DAY_MAX, f"meal3_{day}"
            )
            variables.winddown_times[day] = self.model.NewIntVar(
                self.DAY_MIN, self.DAY_MAX, f"winddown_{day}"
            )
            variables.midpoint2x[day] = self.model.NewIntVar(0, midpoint2x_max, f"midpoint2x_{day}")
            # Midpoint can exceed 24:00 when sleep crosses midnight.
            variables.midpoint_times[day] = self.model.NewIntVar(
                0,
                self.DAY_MAX + self.max_sleep_duration,
                f"midpoint_{day}",
            )
        return variables

    def _add_sleep_duration_constraints(self, vars: ScheduleVariables, days: int):
        for day in range(days):
            raw = self.model.NewIntVar(0, 2880, f"raw_duration_{day}")
            self.model.Add(raw == vars.wake_times[day] - vars.sleep_times[day] + 1440)
            self.model.AddModuloEquality(vars.durations[day], raw, 1440)
            self.model.Add(vars.sleep_times[day] <= vars.wake_times[day] + 1440)
            self.model.Add(vars.midpoint2x[day] == vars.sleep_times[day] * 2 + vars.durations[day])
            self.model.AddDivisionEquality(vars.midpoint_times[day], vars.midpoint2x[day], 2)

    def _add_activity_constraints(self, vars: ScheduleVariables, days: int):
        for day in range(days):
            self.model.Add(vars.wake_times[day] + 1 <= vars.light_times[day])
            # Meals are ordered by minimum spacing (no forced sequential link to light exposure)
            self.model.Add(vars.wake_times[day] + 30 <= vars.meal1_times[day])
            # Meals should be spaced at least 3 hours apart
            self.model.Add(vars.meal1_times[day] + 180 <= vars.meal2_times[day])
            self.model.Add(vars.meal2_times[day] + 180 <= vars.meal3_times[day])
            self.model.Add(vars.meal3_times[day] + 1 <= vars.winddown_times[day])
            self.model.Add(vars.winddown_times[day] + 1 <= vars.sleep_times[day])
            # Wind-down must start within 3 hours before sleep
            self.model.Add(vars.winddown_times[day] >= vars.sleep_times[day] - 180)
            # Caffeine: must be after wake and at least 6 hours before sleep
            self.model.Add(vars.wake_times[day] + 30 <= vars.caffeine_times[day])
            self.model.Add(vars.caffeine_times[day] <= vars.sleep_times[day] - 360)
            # Exercise: must be after wake and before wind-down
            self.model.Add(vars.wake_times[day] <= vars.exercise_times[day])
            self.model.Add(vars.exercise_times[day] + 1 <= vars.winddown_times[day])

    # Activity durations (minutes) used for no-overlap checks against obligations.
    _ACTIVITY_DURATIONS = {
        "light": 30,
        "meal1": 30,
        "meal2": 30,
        "meal3": 30,
        "exercise": 45,
        "winddown": 60,
        "caffeine": 0,
    }

    def _add_obligation_constraints(self, vars: ScheduleVariables, start_date: date):
        for day_idx in range(len(vars.wake_times)):
            current_date = start_date + timedelta(days=day_idx)
            day_of_week = current_date.weekday()

            for ob_idx, obligation in enumerate(self._get_obligations_for_day(day_of_week)):
                start_minutes = self._time_to_minutes(obligation.start_time)
                end_minutes = self._time_to_minutes(obligation.end_time)

                # Wake must be early enough for the obligation (hard constraint).
                self.model.Add(
                    vars.wake_times[day_idx] + self.margin_pre_obligation <= start_minutes
                )

                # Sleep must start after the obligation ends (hard constraint).
                self.model.Add(end_minutes <= vars.sleep_times[day_idx])

                # No-overlap: each activity must finish before or start after the obligation.
                activity_vars = {
                    "light": vars.light_times[day_idx],
                    "meal1": vars.meal1_times[day_idx],
                    "meal2": vars.meal2_times[day_idx],
                    "meal3": vars.meal3_times[day_idx],
                    "exercise": vars.exercise_times[day_idx],
                    "winddown": vars.winddown_times[day_idx],
                    "caffeine": vars.caffeine_times[day_idx],
                }
                for act_name, act_var in activity_vars.items():
                    duration = self._ACTIVITY_DURATIONS[act_name]
                    before = self.model.NewBoolVar(f"before_{act_name}_ob{ob_idx}_d{day_idx}")
                    # If before=True: activity ends before obligation starts
                    self.model.Add(act_var + duration <= start_minutes).OnlyEnforceIf(before)
                    # If before=False: activity starts after obligation ends
                    self.model.Add(act_var >= end_minutes).OnlyEnforceIf(before.Not())

    def _set_objective(self, vars: ScheduleVariables, start_date: date, days: int):
        terms = []
        max_diff = self.SLEEP_MAX + self.max_sleep_duration
        max_sq = max_diff * max_diff

        free_days = self._free_day_indices(start_date, days)
        if free_days:
            sum_mid = self.model.NewIntVar(0, self.SLEEP_MAX * len(free_days), "free_mid_sum")
            self.model.Add(sum_mid == sum(vars.midpoint_times[d] for d in free_days))
            free_mid = self.model.NewIntVar(0, self.SLEEP_MAX, "free_mid_avg")
            self.model.AddDivisionEquality(free_mid, sum_mid, len(free_days))
        else:
            free_mid = None

        for day in range(days):
            sleep_dev = self.model.NewIntVar(0, self.SLEEP_MAX, f"sleep_dev_{day}")
            self.model.AddAbsEquality(sleep_dev, vars.sleep_times[day] - self.ideal_sleep)
            terms.append(sleep_dev * self.w1)

            wake_dev = self.model.NewIntVar(0, self.DAY_MAX, f"wake_dev_{day}")
            self.model.AddAbsEquality(wake_dev, vars.wake_times[day] - self.ideal_wake)
            terms.append(wake_dev * self.w2)

            if free_mid is not None:
                mid_diff = self.model.NewIntVar(0, max_diff, f"mid_diff_{day}")
                self.model.AddAbsEquality(mid_diff, vars.midpoint_times[day] - free_mid)
                mid_sq = self.model.NewIntVar(0, max_sq, f"mid_sq_{day}")
                self.model.AddMultiplicationEquality(mid_sq, mid_diff, mid_diff)
                terms.append(mid_sq * self.w3)

            if day > 0:
                shift_diff = self.model.NewIntVar(0, self.SLEEP_MAX, f"shift_diff_{day}")
                self.model.AddAbsEquality(
                    shift_diff, vars.sleep_times[day] - vars.sleep_times[day - 1]
                )
                shift_violation = self.model.NewIntVar(0, self.SLEEP_MAX, f"shift_violation_{day}")
                self.model.Add(shift_violation >= shift_diff - self.max_daily_shift)
                self.model.Add(shift_violation >= 0)
                shift_sq_max = self.SLEEP_MAX * self.SLEEP_MAX
                shift_sq = self.model.NewIntVar(0, shift_sq_max, f"shift_sq_{day}")
                self.model.AddMultiplicationEquality(shift_sq, shift_violation, shift_violation)
                terms.append(shift_sq * self.w4)

            light_violation = self.model.NewIntVar(0, self.DAY_MAX, f"light_violation_{day}")
            self.model.Add(light_violation >= vars.light_times[day] - vars.wake_times[day] - 30)
            self.model.Add(light_violation >= 0)

            exercise_violation = self.model.NewIntVar(0, self.DAY_MAX, f"exercise_violation_{day}")
            self.model.Add(
                exercise_violation >= vars.exercise_times[day] - vars.sleep_times[day] + 180
            )
            self.model.Add(exercise_violation >= 0)

            soft_sum = self.model.NewIntVar(0, self.DAY_MAX * 2, f"soft_sum_{day}")
            self.model.Add(soft_sum == light_violation + exercise_violation)
            terms.append(soft_sum * self.w5)

            # Meal soft targets (chrononutrition-based)
            # Breakfast: ~1h after wake
            breakfast_diff = self.model.NewIntVar(
                -self.DAY_MAX, self.DAY_MAX, f"breakfast_diff_{day}"
            )
            self.model.Add(breakfast_diff == vars.meal1_times[day] - vars.wake_times[day] - 60)
            breakfast_abs = self.model.NewIntVar(0, self.DAY_MAX, f"breakfast_abs_{day}")
            self.model.AddAbsEquality(breakfast_abs, breakfast_diff)

            # Lunch: ~6h after wake
            lunch_diff = self.model.NewIntVar(-self.DAY_MAX, self.DAY_MAX, f"lunch_diff_{day}")
            self.model.Add(lunch_diff == vars.meal2_times[day] - vars.wake_times[day] - 360)
            lunch_abs = self.model.NewIntVar(0, self.DAY_MAX, f"lunch_abs_{day}")
            self.model.AddAbsEquality(lunch_abs, lunch_diff)

            # Dinner: ~3h before sleep (aligns with wind-down buffer)
            dinner_diff = self.model.NewIntVar(
                -self.SLEEP_MAX, self.SLEEP_MAX, f"dinner_diff_{day}"
            )
            self.model.Add(dinner_diff == vars.meal3_times[day] - vars.sleep_times[day] + 180)
            dinner_abs = self.model.NewIntVar(0, self.SLEEP_MAX, f"dinner_abs_{day}")
            self.model.AddAbsEquality(dinner_abs, dinner_diff)

            meal_timing_sum = self.model.NewIntVar(
                0, self.DAY_MAX * 2 + self.SLEEP_MAX, f"meal_timing_sum_{day}"
            )
            self.model.Add(meal_timing_sum == breakfast_abs + lunch_abs + dinner_abs)
            terms.append(meal_timing_sum * self.w5)

            # Wind-down soft target: ~1.5h before sleep
            winddown_diff = self.model.NewIntVar(
                -self.SLEEP_MAX, self.SLEEP_MAX, f"winddown_diff_{day}"
            )
            self.model.Add(winddown_diff == vars.winddown_times[day] - vars.sleep_times[day] + 90)
            winddown_abs = self.model.NewIntVar(0, self.SLEEP_MAX, f"winddown_abs_{day}")
            self.model.AddAbsEquality(winddown_abs, winddown_diff)
            terms.append(winddown_abs * self.w5)

            # Caffeine soft target: ~2h after wake (avoids cortisol peak, still morning)
            caffeine_diff = self.model.NewIntVar(
                -self.DAY_MAX, self.DAY_MAX, f"caffeine_diff_{day}"
            )
            self.model.Add(caffeine_diff == vars.caffeine_times[day] - vars.wake_times[day] - 120)
            caffeine_abs = self.model.NewIntVar(0, self.DAY_MAX, f"caffeine_abs_{day}")
            self.model.AddAbsEquality(caffeine_abs, caffeine_diff)

            # Exercise soft target: ~3h after wake (mid-morning)
            exercise_diff = self.model.NewIntVar(
                -self.DAY_MAX, self.DAY_MAX, f"exercise_diff_{day}"
            )
            self.model.Add(exercise_diff == vars.exercise_times[day] - vars.wake_times[day] - 180)
            exercise_abs = self.model.NewIntVar(0, self.DAY_MAX, f"exercise_abs_{day}")
            self.model.AddAbsEquality(exercise_abs, exercise_diff)

            activity_timing_sum = self.model.NewIntVar(
                0, self.DAY_MAX * 2, f"activity_timing_sum_{day}"
            )
            self.model.Add(activity_timing_sum == caffeine_abs + exercise_abs)
            terms.append(activity_timing_sum * self.w5)

        self.model.Minimize(sum(terms))

    def _extract_solution(
        self, vars: ScheduleVariables, start_date: date, status: cp_model.CpSolverStatus
    ) -> OptimizationResult:
        schedules = []
        total_deviation = 0
        for day in range(len(vars.sleep_times)):
            sleep_minutes = self.solver.Value(vars.sleep_times[day])
            wake_minutes = self.solver.Value(vars.wake_times[day])
            light_minutes = self.solver.Value(vars.light_times[day])
            caffeine_minutes = self.solver.Value(vars.caffeine_times[day])
            exercise_minutes = self.solver.Value(vars.exercise_times[day])
            meal1_minutes = self.solver.Value(vars.meal1_times[day])
            meal2_minutes = self.solver.Value(vars.meal2_times[day])
            meal3_minutes = self.solver.Value(vars.meal3_times[day])
            winddown_minutes = self.solver.Value(vars.winddown_times[day])
            current_date = start_date + timedelta(days=day)
            schedule = DailyScheduleOutput(
                date=current_date,
                day_of_week=current_date.weekday(),
                sleep_time=self._minutes_to_time(sleep_minutes),
                wake_time=self._minutes_to_time(wake_minutes),
                items=self._build_schedule_items(
                    wake_minutes,
                    light_minutes,
                    meal1_minutes,
                    meal2_minutes,
                    meal3_minutes,
                    caffeine_minutes,
                    exercise_minutes,
                    winddown_minutes,
                    sleep_minutes,
                ),
            )
            schedules.append(schedule)
            total_deviation += abs(sleep_minutes - self.ideal_sleep)
            total_deviation += abs(wake_minutes - self.ideal_wake)
        max_deviation = len(vars.sleep_times) * (self.SLEEP_MAX + self.DAY_MAX)
        alignment_score = max(0, 100 - (total_deviation / max_deviation * 100))
        return OptimizationResult(
            schedules=schedules,
            optimization_score=alignment_score,
            solver_status=status.name,
            generation_time_ms=int(self.solver.WallTime() * 1000),
        )

    def _fallback_solution(self, start_date: date, days: int) -> OptimizationResult:
        schedules = []
        for day in range(days):
            current_date = start_date + timedelta(days=day)
            day_of_week = current_date.weekday()
            earliest = self._get_earliest_obligation(day_of_week)
            if earliest:
                wake_minutes = (
                    self._time_to_minutes(earliest.start_time) - self.margin_pre_obligation
                )
            else:
                wake_minutes = self.ideal_wake
            wake_minutes = wake_minutes % 1440
            sleep_minutes = (wake_minutes + 1440 - self.min_sleep_duration) % 1440
            light_minutes = (wake_minutes + 15) % 1440
            meal1_minutes = (wake_minutes + 60) % 1440
            meal2_minutes = (wake_minutes + 300) % 1440
            meal3_minutes = (wake_minutes + 600) % 1440
            winddown_minutes = (sleep_minutes - 60) % 1440
            caffeine_minutes = (sleep_minutes - 360) % 1440
            exercise_minutes = (sleep_minutes - 180) % 1440
            schedule = DailyScheduleOutput(
                date=current_date,
                day_of_week=day_of_week,
                sleep_time=self._minutes_to_time(sleep_minutes),
                wake_time=self._minutes_to_time(wake_minutes),
                items=self._build_schedule_items(
                    wake_minutes,
                    light_minutes,
                    meal1_minutes,
                    meal2_minutes,
                    meal3_minutes,
                    caffeine_minutes,
                    exercise_minutes,
                    winddown_minutes,
                    sleep_minutes,
                ),
            )
            schedules.append(schedule)
        return OptimizationResult(
            schedules=schedules,
            optimization_score=0,
            solver_status="FALLBACK",
            generation_time_ms=0,
        )

    def _build_schedule_items(
        self,
        wake_minutes: int,
        light_minutes: int,
        meal1_minutes: int,
        meal2_minutes: int,
        meal3_minutes: int,
        caffeine_minutes: int,
        exercise_minutes: int,
        winddown_minutes: int,
        sleep_minutes: int,
    ):
        items = []
        items.append(
            (
                wake_minutes,
                ScheduleItemOutput(
                    activity_type=ActivityType.WAKE,
                    scheduled_time=self._minutes_to_time(wake_minutes),
                    scientific_rationale="Una hora de despertar constante ancla tu ritmo circadiano",
                ),
            )
        )
        items.append(
            (
                light_minutes,
                ScheduleItemOutput(
                    activity_type=ActivityType.LIGHT_EXPOSURE,
                    scheduled_time=self._minutes_to_time(light_minutes),
                    duration_minutes=30,
                    notes="Exposición a luz brillante",
                    scientific_rationale="La luz matutina adelanta la fase circadiana y mejora el estado de alerta",
                ),
            )
        )
        items.append(
            (
                meal1_minutes,
                ScheduleItemOutput(
                    activity_type=ActivityType.MEAL,
                    scheduled_time=self._minutes_to_time(meal1_minutes),
                    notes="Desayuno",
                ),
            )
        )
        items.append(
            (
                meal2_minutes,
                ScheduleItemOutput(
                    activity_type=ActivityType.MEAL,
                    scheduled_time=self._minutes_to_time(meal2_minutes),
                    notes="Almuerzo",
                ),
            )
        )
        items.append(
            (
                meal3_minutes,
                ScheduleItemOutput(
                    activity_type=ActivityType.MEAL,
                    scheduled_time=self._minutes_to_time(meal3_minutes),
                    notes="Cena",
                ),
            )
        )
        items.append(
            (
                caffeine_minutes,
                ScheduleItemOutput(
                    activity_type=ActivityType.CAFFEINE,
                    scheduled_time=self._minutes_to_time(caffeine_minutes),
                    notes="Última ingesta de cafeína",
                    scientific_rationale="La cafeína bloquea la adenosina hasta 10 horas; consumirla tarde retrasa el sueño",
                ),
            )
        )
        items.append(
            (
                exercise_minutes,
                ScheduleItemOutput(
                    activity_type=ActivityType.EXERCISE,
                    scheduled_time=self._minutes_to_time(exercise_minutes),
                    duration_minutes=45,
                    scientific_rationale="El ejercicio matutino adelanta la fase circadiana y mejora la calidad del sueño",
                ),
            )
        )
        items.append(
            (
                winddown_minutes,
                ScheduleItemOutput(
                    activity_type=ActivityType.WIND_DOWN,
                    scheduled_time=self._minutes_to_time(winddown_minutes),
                    duration_minutes=60,
                    notes="Rutina de relajación",
                    scientific_rationale="La rutina de relajación señaliza al cerebro el inicio del sueño",
                ),
            )
        )
        items.append(
            (
                sleep_minutes,
                ScheduleItemOutput(
                    activity_type=ActivityType.SLEEP,
                    scheduled_time=self._minutes_to_time(sleep_minutes),
                    scientific_rationale="Una hora de dormir constante refuerza el ritmo circadiano",
                ),
            )
        )
        items_sorted = [item for _, item in sorted(items, key=lambda x: x[0])]
        return items_sorted

    def _get_earliest_obligation(self, day_of_week: int):
        candidates = self._get_obligations_for_day(day_of_week)
        if not candidates:
            return None
        return sorted(candidates, key=lambda o: o.start_time)[0]

    def _get_obligations_for_day(self, day_of_week: int):
        return [o for o in self.obligations if day_of_week in (o.days_of_week or [])]

    def _free_day_indices(self, start_date: date, days: int) -> list[int]:
        obligations_days = set()
        for o in self.obligations:
            for d in o.days_of_week or []:
                obligations_days.add(d)
        return [
            day
            for day in range(days)
            if (start_date + timedelta(days=day)).weekday() not in obligations_days
        ]

    @staticmethod
    def _time_to_minutes(t: time) -> int:
        return t.hour * 60 + t.minute

    @staticmethod
    def _minutes_to_time(minutes: int) -> time:
        minutes = minutes % 1440
        return time(hour=minutes // 60, minute=minutes % 60)

    @staticmethod
    def _parse_time(t: str) -> time:
        parts = t.split(":")
        hour = int(parts[0])
        minute = int(parts[1])
        return time(hour=hour, minute=minute)
