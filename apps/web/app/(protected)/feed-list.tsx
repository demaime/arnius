"use client";

import { highlightTitle } from "@arnius/core";
import { useState } from "react";
import { formatRelative } from "@/lib/format";

export interface FeedArticle {
  id: number;
  url: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  first_seen_at: string;
  portal_slug: string;
  portal_name: string;
}

export function FeedList({ articles, keywords }: { articles: FeedArticle[]; keywords: string[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className="flex flex-col divide-y divide-gray-200">
      {articles.map((article) => {
        const isOpen = expanded.has(article.id);
        const segments = highlightTitle(article.title, keywords);
        const when = article.published_at ?? article.first_seen_at;

        return (
          <li key={article.id} className="py-3">
            <div className="flex items-baseline gap-2 text-xs text-gray-500">
              <span className="font-medium">{article.portal_name}</span>
              <span>·</span>
              <time dateTime={when}>{formatRelative(when)}</time>
            </div>

            <button
              type="button"
              onClick={() => toggle(article.id)}
              className="mt-1 block text-left font-medium leading-snug hover:underline"
              aria-expanded={isOpen}
            >
              {segments.map((segment, i) =>
                segment.match ? (
                  <mark key={i} className="bg-gray-300">
                    {segment.text}
                  </mark>
                ) : (
                  <span key={i}>{segment.text}</span>
                ),
              )}
            </button>

            {isOpen ? (
              <div className="mt-2 flex flex-col gap-2 text-sm text-gray-700">
                {article.summary ? <p>{article.summary}</p> : <p>(Sin vista previa)</p>}
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-fit rounded border border-gray-400 px-3 py-1 hover:bg-gray-100"
                >
                  Nota completa en {article.portal_name}
                </a>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
