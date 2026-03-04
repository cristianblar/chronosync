"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { educationService } from "@/services/educationService";
import type { EducationalContent } from "@/types/domain";
import { cacheArticle, getCachedArticle } from "@/lib/offline-sync";
import { cn } from "@/lib/utils";

const BOOKMARKS_KEY = "chronosync_article_bookmarks";

const CATEGORY_GRADIENTS: Record<string, string> = {
  cronotipos: "from-indigo-400 to-violet-500",
  sueno: "from-blue-400 to-indigo-500",
  luz: "from-amber-400 to-orange-500",
  cafeina: "from-orange-400 to-red-400",
  ejercicio: "from-green-400 to-emerald-500",
  default: "from-slate-400 to-slate-500",
};

const CATEGORY_LABELS: Record<string, string> = {
  cronotipos: "Cronotipos",
  sueno: "Sueño",
  luz: "Luz",
  cafeina: "Cafeína",
  ejercicio: "Ejercicio",
};

function readBookmarkList(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(BOOKMARKS_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export default function EducationArticlePage() {
  const params = useParams<{ slug: string }>();
  return <EducationArticlePageInner key={params.slug} slug={params.slug} />;
}

function EducationArticlePageInner({ slug }: { slug: string }) {
  const [article, setArticle] = useState<EducationalContent | null>(null);
  const [related, setRelated] = useState<EducationalContent[]>([]);
  const [readPct, setReadPct] = useState(0);
  const [bookmarked, setBookmarked] = useState(() => readBookmarkList().includes(slug));
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    educationService
      .article(slug)
      .then((r) => {
        setArticle(r.article);
        setRelated(r.related ?? []);
        cacheArticle(slug, r).catch(() => {});
      })
      .catch(async () => {
        const cached = await getCachedArticle<{ article: EducationalContent | null; related: EducationalContent[] }>(slug);
        setArticle(cached?.article ?? null);
        setRelated(cached?.related ?? []);
      });
  }, [slug]);

  // Reading progress scroll tracking
  useEffect(() => {
    function onScroll() {
      const el = articleRef.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrolled = Math.max(0, vh - top);
      const pct = Math.min(100, Math.round((scrolled / (height + vh)) * 100));
      setReadPct(pct);
      if (pct >= 90 && article) {
        educationService.updateProgress({ content_id: article.id, progress_percent: 100 }).catch(() => {});
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [article]);

  function toggleBookmark() {
    const list = readBookmarkList();
    const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setBookmarked(next.includes(slug));
  }

  const gradient = CATEGORY_GRADIENTS[article?.category ?? ""] ?? CATEGORY_GRADIENTS.default;

  // Render body with citation blockquote styling
  function renderBody(body: string) {
    return body.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return <h2 className="mt-6 mb-2 text-base font-bold text-foreground" key={i}>{line.slice(3)}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 className="mt-4 mb-1 text-sm font-bold text-foreground" key={i}>{line.slice(4)}</h3>;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p className="text-sm font-semibold text-foreground mt-2" key={i}>{line.slice(2, -2)}</p>;
      }
      if (line.startsWith("- ")) {
        return <li className="ml-4 text-sm text-muted list-disc leading-relaxed" key={i}>{line.slice(2)}</li>;
      }
      if (line.startsWith("> ")) {
        return (
          <blockquote className="border-l-4 border-primary/40 pl-3 my-2 italic text-sm text-muted" key={i}>
            {line.slice(2)}
          </blockquote>
        );
      }
      if (line.trim() === "") return <div className="h-2" key={i} />;
      return <p className="text-sm text-foreground leading-relaxed" key={i}>{line}</p>;
    });
  }

  return (
    <div>
      {/* Reading progress bar - sticky */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1">
        <div
          className={cn("h-full bg-gradient-to-r transition-all", gradient)}
          style={{ width: `${readPct}%` }}
        />
      </div>

      <div className="mobile-container space-y-4 pt-3">
        {/* Hero header */}
        <div className={cn("rounded-2xl bg-gradient-to-br p-6 text-white", gradient)}>
          <div className="flex items-center justify-between mb-4">
            <Link
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
              href="/education"
            >
              ←
            </Link>
            <button
              className={cn("flex h-8 w-8 items-center justify-center rounded-full", bookmarked ? "bg-white/30" : "bg-white/20 hover:bg-white/30")}
              onClick={toggleBookmark}
              type="button"
            >
              {bookmarked ? "🔖" : "🏷"}
            </button>
          </div>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">
            {CATEGORY_LABELS[article?.category ?? ""] ?? article?.category}
          </span>
          <h1 className="mt-2 text-xl font-bold leading-tight">{article?.title ?? "Cargando…"}</h1>
          <div className="mt-3 flex items-center gap-3 text-xs opacity-80">
            <span>📖 {article?.reading_time_minutes ?? 5} min</span>
            {article?.citations?.length ? <span>📚 {article.citations.length} referencias</span> : null}
          </div>
        </div>

        {/* Article body */}
        <Card>
          <div className="space-y-1" ref={articleRef}>
            {article?.body ? renderBody(article.body) : (
              <p className="text-sm text-muted">No se encontró el artículo.</p>
            )}
          </div>
        </Card>

        {/* Citations */}
        {(article?.citations ?? []).length > 0 && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Referencias científicas</h2>
            <ol className="space-y-2 list-decimal pl-4">
              {(article!.citations as string[]).map((citation, i) => (
                <li className="text-xs text-muted italic leading-relaxed" key={i}>{citation}</li>
              ))}
            </ol>
          </Card>
        )}

        {/* Related articles */}
        {related.length > 0 && (
          <div>
            <h2 className="mb-3 font-semibold text-foreground">Artículos relacionados</h2>
            <div className="space-y-2">
              {related.map((item) => (
                <Link
                  className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 hover:border-primary/40 transition"
                  href={`/education/articles/${item.slug}`}
                  key={item.id}
                >
                  <div className={cn("h-10 w-10 flex-shrink-0 rounded-lg bg-gradient-to-br", CATEGORY_GRADIENTS[item.category] ?? CATEGORY_GRADIENTS.default)} />
                  <p className="text-sm font-medium leading-tight">{item.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
