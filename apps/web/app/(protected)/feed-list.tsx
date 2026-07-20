"use client";

import { highlightTitle } from "@arnius/core";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { formatRelative } from "@/lib/format";

export interface FeedArticle {
  id: number;
  url: string;
  title: string;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  first_seen_at: string;
  portal_slug: string;
  portal_name: string;
}

/** Cuántas noticias se renderizan por tanda al scrollear. */
const BATCH = 30;

function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

/* Logo del medio: /public/logos/{slug}.webp (80px, generados desde los originales).
   Círculo blanco plano en ambos temas: los logos oscuros no se pierden en dark. */
function PortalLogo({ slug }: { slug: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1.5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- asset local chico, sin optimizador */}
      <img src={`/logos/${slug}.webp`} alt="" loading="lazy" className="size-full object-contain" />
    </div>
  );
}

function ArticleItem({
  article,
  keywords,
  isOpen,
  onToggle,
}: {
  article: FeedArticle;
  keywords: string[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const segments = highlightTitle(article.title, keywords);
  const when = article.published_at ?? article.first_seen_at;

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3">
      <PortalLogo slug={article.portal_slug} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-fg">
            {article.portal_name}
          </span>
          <time dateTime={when}>{formatRelative(when)}</time>
        </div>

        {article.author ? (
          <p className="mt-0.5 truncate text-xs text-muted">{article.author}</p>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 block w-full cursor-pointer py-0.5 text-left text-lg font-semibold leading-snug tracking-tight transition-colors duration-150 hover:text-accent-strong motion-reduce:transition-none"
          aria-expanded={isOpen}
        >
          {segments.map((segment, i) =>
            segment.match ? (
              <mark
                key={i}
                className="bg-transparent text-inherit underline decoration-highlight decoration-[3px] underline-offset-[3px]"
              >
                {segment.text}
              </mark>
            ) : (
              <span key={i}>{segment.text}</span>
            ),
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="col-start-2 overflow-hidden"
          >
            <div className="mt-2 flex flex-col gap-3 border-l-2 border-accent pb-1 pl-3">
              <p className="text-[15px] leading-relaxed text-muted">
                {article.summary ?? "(Sin vista previa)"}
              </p>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors duration-150 hover:border-accent hover:bg-surface motion-reduce:transition-none"
              >
                Nota completa en {article.portal_name}
                <ExternalLinkIcon />
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Lista presentacional con carga progresiva. El filtrado vive en HomeShell,
    que la remonta (vía `key`) al cambiar filtros para rearrancar la paginación. */
export function FeedList({ articles, keywords }: { articles: FeedArticle[]; keywords: string[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Carga progresiva: cuando el centinela del final entra en pantalla, sumar tanda.
  useEffect(() => {
    if (visibleCount >= articles.length) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + BATCH, articles.length));
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, articles.length]);

  const visible = articles.slice(0, visibleCount);

  function toggle(id: number) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <MotionConfig reducedMotion="user">
      <ul className="flex flex-col divide-y divide-border">
        {visible.map((article) => (
          <motion.li
            key={article.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -40px 0px" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="py-4"
          >
            <ArticleItem
              article={article}
              keywords={keywords}
              isOpen={openId === article.id}
              onToggle={() => toggle(article.id)}
            />
          </motion.li>
        ))}
      </ul>
      {visibleCount < articles.length ? (
        <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      ) : null}
    </MotionConfig>
  );
}
