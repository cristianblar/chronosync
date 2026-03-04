"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { educationService } from "@/services/educationService";
import type { FAQ } from "@/types/domain";
import { cn } from "@/lib/utils";

export default function FAQPage() {
  const [search, setSearch] = useState("");
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    educationService
      .faq("")
      .then((response) => {
        const items = response.faqs ?? [];
        setFaqs(items);
        if (items.length > 0) setOpenId(items[0].id);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
    );
  }, [faqs, search]);

  return (
    <div className="mobile-container space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-muted hover:bg-primary/5"
          href="/education"
        >
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Preguntas Frecuentes</h1>
          <p className="text-xs text-muted">{faqs.length} preguntas</p>
        </div>
      </div>

      {/* Search */}
      <Input
        icon={
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar en las preguntas…"
        value={search}
      />

      {/* FAQ accordion */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">No se encontraron preguntas con &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          filtered.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                className={cn(
                  "overflow-hidden rounded-2xl border border-border bg-white transition-shadow",
                  isOpen && "shadow-sm",
                )}
                key={faq.id}
              >
                <button
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  type="button"
                >
                  <span className={cn("text-sm font-semibold", isOpen && "text-primary")}>
                    {faq.question}
                  </span>
                  <span
                    className={cn(
                      "flex-shrink-0 text-muted transition-transform",
                      isOpen && "rotate-180 text-primary",
                    )}
                  >
                    ↓
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
