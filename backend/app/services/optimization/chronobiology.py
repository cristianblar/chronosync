from app.models.chronotype import ChronotypeCategory


class ChronobiologyCalculator:
    CHRONOTYPE_PROFILES = {
        ChronotypeCategory.EXTREME_MORNING: {
            "ideal_wake": 300,
            "ideal_sleep": 1260,
            "peak_start": 480,
            "peak_end": 720,
            "exercise_optimal": 420,
        },
        ChronotypeCategory.MODERATE_MORNING: {
            "ideal_wake": 360,
            "ideal_sleep": 1320,
            "peak_start": 540,
            "peak_end": 780,
            "exercise_optimal": 480,
        },
        ChronotypeCategory.INTERMEDIATE: {
            "ideal_wake": 420,
            "ideal_sleep": 1380,
            "peak_start": 600,
            "peak_end": 840,
            "exercise_optimal": 600,
        },
        ChronotypeCategory.MODERATE_EVENING: {
            "ideal_wake": 480,
            "ideal_sleep": 1440,
            "peak_start": 720,
            "peak_end": 960,
            "exercise_optimal": 1020,
        },
        ChronotypeCategory.EXTREME_EVENING: {
            "ideal_wake": 540,
            "ideal_sleep": 1500,
            "peak_start": 840,
            "peak_end": 1080,
            "exercise_optimal": 1080,
        },
    }

    def __init__(self, chronotype: ChronotypeCategory):
        self.chronotype = ChronotypeCategory(chronotype)
        self.profile = self.CHRONOTYPE_PROFILES[self.chronotype]

    def get_optimal_meal_times(self, wake_minutes: int):
        return {
            "breakfast": wake_minutes + 60,
            "lunch": wake_minutes + 300,
            "dinner": wake_minutes + 600,
        }

    def get_caffeine_cutoff(self, sleep_minutes: int) -> int:
        cutoff = sleep_minutes - 480
        return max(cutoff, 840)

    def get_optimal_exercise_time(self, chronotype: ChronotypeCategory) -> int:
        return self.profile["exercise_optimal"]

    def get_ideal_times(self) -> dict:
        return {
            "wake_time": self.profile["ideal_wake"],
            "sleep_time": self.profile["ideal_sleep"],
            "peak_performance_start": self.profile["peak_start"],
            "peak_performance_end": self.profile["peak_end"],
            "exercise_optimal_start": self.profile["exercise_optimal"],
            "exercise_optimal_end": self.profile["exercise_optimal"] + 60,
        }

    @staticmethod
    def minutes_to_str(minutes: int) -> str:
        minutes = minutes % 1440
        return f"{minutes // 60:02d}:{minutes % 60:02d}"
