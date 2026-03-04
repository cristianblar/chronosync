"""Idempotent seed script for education articles and FAQ entries.

Usage:
    python -m scripts.seed_education

The script loads data from:
    scripts/seed_data/articles.json  (20+ articles)
    scripts/seed_data/faq.json       (30+ FAQ entries)

It is idempotent: existing slugs / questions are skipped.
"""
import asyncio
import json
import os
from pathlib import Path

from sqlalchemy import select

from app.db.session import async_session
from app.models.education import EducationalContent, FAQ

SEED_DIR = Path(__file__).parent / "seed_data"


async def _seed_articles(session, articles: list[dict]) -> int:
    count = 0
    for article in articles:
        res = await session.execute(
            select(EducationalContent).where(EducationalContent.slug == article["slug"])
        )
        if res.scalar_one_or_none():
            continue
        obj = EducationalContent(
            title=article["title"],
            slug=article["slug"],
            excerpt=article.get("excerpt"),
            body=article["body"],
            category=article.get("category", "general"),
            tags=article.get("tags"),
            reading_time_minutes=article.get("reading_time_minutes"),
            citations=article.get("citations"),
            target_chronotypes=article.get("target_chronotypes"),
        )
        session.add(obj)
        count += 1
    return count


async def _seed_faq(session, entries: list[dict]) -> int:
    count = 0
    for entry in entries:
        res = await session.execute(
            select(FAQ).where(FAQ.question == entry["question"])
        )
        if res.scalar_one_or_none():
            continue
        obj = FAQ(
            question=entry["question"],
            answer=entry["answer"],
            category=entry.get("category", "general"),
            order=entry.get("sort_order", 0),
        )
        session.add(obj)
        count += 1
    return count


async def _run():
    # Load articles
    articles_file = Path(os.getenv("ARTICLES_FILE", str(SEED_DIR / "articles.json")))
    faq_file = Path(os.getenv("FAQ_FILE", str(SEED_DIR / "faq.json")))

    articles: list[dict] = []
    faq_entries: list[dict] = []

    if articles_file.exists():
        with open(articles_file, "r", encoding="utf-8") as f:
            articles = json.load(f)
    else:
        print(f"Warning: articles file not found at {articles_file}")

    if faq_file.exists():
        with open(faq_file, "r", encoding="utf-8") as f:
            faq_entries = json.load(f)
    else:
        print(f"Warning: FAQ file not found at {faq_file}")

    async with async_session() as session:
        n_articles = await _seed_articles(session, articles)
        n_faq = await _seed_faq(session, faq_entries)
        await session.commit()

    print(f"Seed complete: {n_articles} articles added, {n_faq} FAQ entries added.")


def main():
    asyncio.run(_run())


if __name__ == "__main__":
    main()
