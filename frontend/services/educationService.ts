import { apiFetch } from "@/services/api";
import type { EducationalContent, FAQ } from "@/types/domain";

export const educationService = {
  listArticles(params?: { category?: string; search?: string; chronotype?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    if (params?.chronotype) query.set("chronotype", params.chronotype);
    return apiFetch<{ articles: EducationalContent[]; total: number }>(
      `/education/articles${query.size ? `?${query.toString()}` : ""}`,
      {},
      false,
    );
  },
  article(slug: string) {
    return apiFetch<{ article: EducationalContent | null; related: EducationalContent[] }>(
      `/education/articles/${slug}`,
      {},
      false,
    );
  },
  faq(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiFetch<{ faqs: FAQ[] }>(`/education/faq${query}`, {}, false);
  },
  recommended(chronotype?: string) {
    const query = chronotype ? `?chronotype=${chronotype}` : "";
    return apiFetch<{ articles: EducationalContent[] }>(`/education/articles/recommended${query}`);
  },
  categories() {
    return apiFetch<{ categories: Array<{ category: string; count: number }> }>(
      "/education/categories",
      {},
      false,
    );
  },
  updateProgress(payload: { content_id: string; progress_percent: number }) {
    return apiFetch<{
      content_id: string;
      progress_percent: number;
      is_completed: boolean;
      last_read_at: string | null;
    }>("/education/progress", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

