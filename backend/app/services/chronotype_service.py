from sqlalchemy.ext.asyncio import AsyncSession
from app.models.chronotype import ChronotypeAssessment
from app.repositories.chronotype_repository import ChronotypeRepository
from app.utils.meq_scoring import calculate_chronotype


class ChronotypeService:
    def __init__(self):
        self.repo = ChronotypeRepository()

    async def submit_assessment(self, db: AsyncSession, user_id, responses: dict[str, int]):
        result = calculate_chronotype(responses)
        await self.repo.set_all_inactive(db, user_id)
        assessment = ChronotypeAssessment(
            user_id=user_id,
            responses=responses,
            total_score=result["score"],
            chronotype=result["chronotype"].value,
            ideal_wake_time=result["ideal_wake_time"],
            ideal_sleep_time=result["ideal_sleep_time"],
            midpoint_of_sleep=result["midpoint_of_sleep"],
        )
        return await self.repo.create(db, assessment)
