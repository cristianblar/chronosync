"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { educationService } from "@/services/educationService";
import type { EducationalContent } from "@/types/domain";
import { MedicalDisclaimer } from "@/components/legal/MedicalDisclaimer";
import { cn } from "@/lib/utils";

const BOOKMARKS_KEY = "chronosync_article_bookmarks";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  cronotipos: { bg: "bg-indigo-50", text: "text-indigo-700", gradient: "from-indigo-400 to-violet-500" },
  sueno: { bg: "bg-blue-50", text: "text-blue-700", gradient: "from-blue-400 to-indigo-500" },
  luz: { bg: "bg-amber-50", text: "text-amber-700", gradient: "from-amber-400 to-orange-500" },
  cafeina: { bg: "bg-orange-50", text: "text-orange-700", gradient: "from-orange-400 to-red-400" },
  ejercicio: { bg: "bg-green-50", text: "text-green-700", gradient: "from-green-400 to-emerald-500" },
  default: { bg: "bg-slate-50", text: "text-slate-700", gradient: "from-slate-400 to-slate-500" },
};

function getCategoryColors(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default;
}

const CATEGORY_LABELS: Record<string, string> = {
  cronotipos: "Cronotipos",
  sueno: "Sueño",
  luz: "Luz",
  cafeina: "Cafeína",
  ejercicio: "Ejercicio",
};

type Tab = "articles" | "faq" | "bookmarks";

export default function EducationPage() {
  const [activeTab, setActiveTab] = useState<Tab>("articles");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [articles, setArticles] = useState<EducationalContent[]>([]);
  const [recommended, setRecommended] = useState<EducationalContent[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(BOOKMARKS_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    educationService.categories().then((r) => setCategories(r.categories)).catch(() => {});
    educationService.recommended().then((r) => setRecommended(r.articles ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    educationService
      .listArticles({ search, category: activeCategory || undefined })
      .then((r) => setArticles(r.articles ?? []))
      .catch(() => {});
  }, [search, activeCategory]);

  function toggleBookmark(slug: string) {
    const next = bookmarks.includes(slug)
      ? bookmarks.filter((s) => s !== slug)
      : [...bookmarks, slug];
    setBookmarks(next);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  }

  const displayedArticles = activeTab === "bookmarks"
    ? articles.filter((a) => bookmarks.includes(a.slug))
    : articles;

  return (
    <div className="mobile-container space-y-4">
      <h1 className="text-xl font-bold text-foreground">Aprender</h1>

      {/* Tab bar */}
      <div className="flex rounded-xl border border-border bg-white p-1 gap-1">
        {(["articles", "faq", "bookmarks"] as Tab[]).map((tab) => {
          const labels: Record<Tab, string> = { articles: "Artículos", faq: "FAQ", bookmarks: "Guardados" };
          return (
            <button
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition",
                activeTab === tab
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {activeTab === "faq" ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted mb-4">Explora las preguntas frecuentes sobre cronobiología y sueño</p>
          <Link href="/education/faq">
            <button className="rounded-xl bg-primary/10 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition">
              Ver preguntas frecuentes →
            </button>
          </Link>
        </div>
      ) : (
        <>
          {/* Search */}
          <Input
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar artículos…"
            value={search}
          />

          {/* Category filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              className={cn(
                "flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                !activeCategory ? "border-primary bg-primary text-white" : "border-border bg-white text-muted",
              )}
              onClick={() => setActiveCategory("")}
              type="button"
            >
              Todo
            </button>
            {categories.map((cat) => {
              const colors = getCategoryColors(cat.category);
              const isActive = activeCategory === cat.category;
              return (
                <button
                  className={cn(
                    "flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    isActive
                      ? `border-primary bg-primary text-white`
                      : `border-border bg-white ${colors.text}`,
                  )}
                  key={cat.category}
                  onClick={() => setActiveCategory(isActive ? "" : cat.category)}
                  type="button"
                >
                  {CATEGORY_LABELS[cat.category] ?? cat.category} ({cat.count})
                </button>
              );
            })}
          </div>

          {/* Recommended section */}
          {activeTab === "articles" && recommended.length > 0 && !search && !activeCategory && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Para ti</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {recommended.slice(0, 3).map((article) => {
                  const colors = getCategoryColors(article.category);
                  return (
                    <Link
                      className="flex-shrink-0 w-48"
                      href={`/education/articles/${article.slug}`}
                      key={article.id}
                    >
                      <div className={cn("h-20 rounded-t-xl bg-gradient-to-br", colors.gradient)} />
                      <div className="rounded-b-xl border border-t-0 border-border bg-white p-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", colors.bg, colors.text)}>
                          Para ti
                        </span>
                        <p className="mt-1 text-xs font-semibold leading-tight line-clamp-2">{article.title}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Articles list */}
          <div className="space-y-3">
            {displayedArticles.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted">
                  {activeTab === "bookmarks" ? "No tienes artículos guardados aún." : "No hay artículos que coincidan."}
                </p>
              </div>
            ) : (
              displayedArticles.map((article) => {
                const colors = getCategoryColors(article.category);
                const isBookmarked = bookmarks.includes(article.slug);
                const isRecommended = recommended.some((r) => r.id === article.id);
                return (
                  <div
                    className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
                    key={article.id}
                  >
                    {/* Color top stripe */}
                    <div className={cn("h-1.5 bg-gradient-to-r", colors.gradient)} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", colors.bg, colors.text)}>
                              {CATEGORY_LABELS[article.category] ?? article.category}
                            </span>
                            {isRecommended && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                ★ Recomendado
                              </span>
                            )}
                          </div>
                          <Link href={`/education/articles/${article.slug}`}>
                            <h3 className="text-sm font-semibold leading-snug hover:text-primary">
                              {article.title}
                            </h3>
                          </Link>
                          <p className="mt-1 text-xs text-muted line-clamp-2">{article.excerpt}</p>
                          <p className="mt-2 text-xs text-muted">
                            📖 {article.reading_time_minutes ?? 5} min
                            {article.citations?.length ? ` · ${article.citations.length} referencias` : ""}
                          </p>
                        </div>
                        <button
                          className={cn(
                            "flex-shrink-0 rounded-full p-2 transition",
                            isBookmarked ? "text-primary" : "text-muted hover:text-primary",
                          )}
                          onClick={() => toggleBookmark(article.slug)}
                          type="button"
                        >
                          {isBookmarked ? "🔖" : "🏷"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      <MedicalDisclaimer variant="footer" />
    </div>
  );
}
