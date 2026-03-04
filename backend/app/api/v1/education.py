from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func

from app.dependencies import get_db
from app.repositories.education_repository import EducationRepository
from app.repositories.user_article_progress_repository import UserArticleProgressRepository
from app.models.education import EducationalContent
from app.models.user import User
from app.core.security import get_current_user
from app.schemas.education import ArticleProgressUpdate

router = APIRouter()
repo = EducationRepository()
progress_repo = UserArticleProgressRepository()


@router.get("/articles")
async def list_articles(
    category: str | None = None,
    tags: list[str] | None = None,
    search: str | None = None,
    chronotype: str | None = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    articles, total = await repo.list_articles(
        db, limit, offset, category=category, tags=tags, search=search, chronotype=chronotype
    )
    return {"articles": jsonable_encoder(articles), "total": total}


@router.get("/faq")
async def list_faq(
    limit: int = 50,
    offset: int = 0,
    category: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    faqs = await repo.list_faqs(db, limit, offset, category=category, search=search)
    return {"faqs": jsonable_encoder(faqs)}


@router.get("/articles/recommended")
async def recommended(
    chronotype: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    completed_ids = await progress_repo.list_completed_ids(db, current_user.id)
    articles = await repo.recommended(db, chronotype=chronotype, limit=10)
    filtered = [a for a in articles if a.id not in completed_ids][:5]
    return {"articles": jsonable_encoder(filtered)}


@router.get("/articles/{slug}")
async def get_article(slug: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        EducationalContent.__table__.select().where(EducationalContent.slug == slug)
    )
    row = res.mappings().first()
    if not row:
        return {"article": None, "related": []}
    related_res = await db.execute(
        EducationalContent.__table__.select()
        .where(
            EducationalContent.category == row["category"],
            EducationalContent.slug != slug,
        )
        .limit(3)
    )
    related = related_res.mappings().all()
    return {"article": jsonable_encoder(row), "related": jsonable_encoder(related)}


@router.post("/progress")
async def update_progress(
    payload: ArticleProgressUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await progress_repo.upsert(
        db, current_user.id, payload.content_id, payload.progress_percent
    )
    return {
        "content_id": str(res.content_id),
        "progress_percent": res.progress_percent,
        "is_completed": res.is_completed,
        "last_read_at": res.last_read_at.isoformat() if res.last_read_at else None,
    }


@router.get("/categories")
async def categories(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        EducationalContent.__table__.select()
        .with_only_columns(EducationalContent.category, func.count().label("count"))
        .group_by(EducationalContent.category)
    )
    rows = res.mappings().all()
    return {"categories": jsonable_encoder(rows)}
