from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.dependencies import get_db
from app.models.user import User
from app.schemas.chronotype import ChronotypeAssessmentCreate
from app.services.chronotype_service import ChronotypeService
from app.services.optimization.chronobiology import ChronobiologyCalculator

router = APIRouter()
service = ChronotypeService()


@router.post("/assessment", status_code=201)
async def submit_assessment(
    payload: ChronotypeAssessmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = await service.submit_assessment(db, current_user.id, payload.responses)
    return {
        "assessment": jsonable_encoder(assessment),
        "chronotype": assessment.chronotype,
        "score": assessment.total_score,
    }


@router.get("/current")
async def current_assessment(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = await service.repo.get_current(db, current_user.id)
    return {"assessment": jsonable_encoder(assessment)}


@router.get("/history")
async def history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessments = await service.repo.list_by_user(db, current_user.id)
    return {"assessments": jsonable_encoder(assessments)}


@router.get("/ideal-times")
async def ideal_times(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = await service.repo.get_current(db, current_user.id)
    if not assessment:
        return {"error": "No assessment found"}
    calc = ChronobiologyCalculator(assessment.chronotype)
    times = calc.get_ideal_times()
    return {
        "wake_time": calc.minutes_to_str(times["wake_time"]),
        "sleep_time": calc.minutes_to_str(times["sleep_time"]),
        "peak_performance_start": calc.minutes_to_str(times["peak_performance_start"]),
        "peak_performance_end": calc.minutes_to_str(times["peak_performance_end"]),
        "caffeine_cutoff": calc.minutes_to_str(max(times["sleep_time"] - 480, 840)),
        "exercise_optimal_start": calc.minutes_to_str(times["exercise_optimal_start"]),
        "exercise_optimal_end": calc.minutes_to_str(times["exercise_optimal_end"]),
    }
