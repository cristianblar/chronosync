from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from pydantic import ConfigDict


class ChronotypeAssessmentCreate(BaseModel):
    responses: dict[str, int]


class ChronotypeAssessmentOut(BaseModel):
    id: UUID
    total_score: int
    chronotype: str
    ideal_wake_time: str
    ideal_sleep_time: str
    midpoint_of_sleep: str
    assessed_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ChronotypeIdealTimes(BaseModel):
    wake_time: str
    sleep_time: str
    peak_performance_start: str
    peak_performance_end: str
    caffeine_cutoff: str
    exercise_optimal_start: str
    exercise_optimal_end: str
