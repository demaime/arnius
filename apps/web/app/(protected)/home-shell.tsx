"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { highlightTitle } from "@arnius/core";
import { dayKeyAR, formatRelative } from "@/lib/format";
import { formatNextScrape } from "@/lib/scrape-schedule";
import { BackToTop } from "./back-to-top";
import { FeedList, type FeedArticle } from "./feed-list";
import { KeywordsModal, type Keyword } from "./keywords-modal";
import { UserMenu } from "./user-menu";
import type { Theme } from "./theme-actions";

type DateFilter = "all" | "1h" | "3h" | "6h" | "12h" | "today" | "yesterday";

/** Ventana en horas de los filtros "Últimas X horas". */
const HOUR_FILTERS: Partial<Record<DateFilter, number>> = { "1h": 1, "3h": 3, "6h": 6, "12h": 12 };

interface Filters {
  portals: string[]; // slugs tildados: solo esos medios se muestran (arranca con todos)
  keyword: string; // keyword o "all"
  date: DateFilter;
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-auto size-8 text-accent"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function FilterIcon() {
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
      <path d="M3 6h18M7 12h10m-7 6h4" />
    </svg>
  );
}

function ChevronIcon({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""} ${className}`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "Últimos 3 días" },
  { value: "1h", label: "Última hora" },
  { value: "3h", label: "Últimas 3 horas" },
  { value: "6h", label: "Últimas 6 horas" },
  { value: "12h", label: "Últimas 12 horas" },
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
];

/* Fila del panel de filtros: rótulo + botón que despliega su propio menú
   con el estilo de la app (los popups de <select> nativos no se pueden estilar). */
function FilterMenuRow({
  label,
  summary,
  open,
  onToggle,
  children,
}: {
  label: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs font-medium text-muted">
      {label}
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex h-11 w-full cursor-pointer items-center justify-between rounded-md px-2 text-sm font-normal text-foreground transition-colors duration-150 hover:bg-surface motion-reduce:transition-none"
        >
          {summary}
          <ChevronIcon open={open} className="text-accent" />
        </button>
        {open ? (
          <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-[60vh] animate-panel-in overflow-y-auto rounded-md border border-border bg-background p-1 shadow-lg motion-reduce:animate-none">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OptionItem({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`flex min-h-9 w-full cursor-pointer items-center rounded px-2 text-left text-sm transition-colors duration-150 hover:bg-surface motion-reduce:transition-none ${
        selected ? "font-semibold text-accent-strong" : "text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function HomeShell({
  articles,
  keywords,
  displayName,
  email,
  avatarUrl,
  dbTheme,
  lastRunIso,
}: {
  articles: FeedArticle[];
  keywords: Keyword[];
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  dbTheme: Theme;
  lastRunIso: string | null;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Submenú abierto dentro del panel (de a uno por vez).
  const [openMenu, setOpenMenu] = useState<"keyword" | "date" | "portals" | null>(null);
  const [filters, setFilters] = useState<Filters>(() => ({
    portals: [...new Set(articles.map((a) => a.portal_slug))],
    keyword: "all",
    date: "all",
  }));
  // Referencia temporal capturada al elegir un filtro de fecha/hora (calcular
  // "ahora" durante el render viola la pureza que exige React).
  const [dateRef, setDateRef] = useState<{
    today: string;
    yesterday: string;
    nowMs: number;
  } | null>(null);

  // Los rótulos "Actualizado hace X" y "Próxima en ~Y" se refrescan solos.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Cierra el panel colapsando también los submenús de adentro.
  function closePanel() {
    setPanelOpen(false);
    setOpenMenu(null);
  }

  // El desplegable de filtros se cierra con click afuera o Escape.
  useEffect(() => {
    if (!panelOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        closePanel();
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closePanel();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [panelOpen]);

  const keywordStrings = useMemo(() => keywords.map((k) => k.keyword), [keywords]);

  /** Cambia filtros; la lista rearranca su paginación vía `key`. */
  function applyFilters(next: Filters) {
    if (next.date !== "all") {
      const now = new Date();
      setDateRef({
        today: dayKeyAR(now),
        yesterday: dayKeyAR(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
        nowMs: now.getTime(),
      });
    }
    setFilters(next);
  }

  function togglePortal(slug: string) {
    const has = filters.portals.includes(slug);
    applyFilters({
      ...filters,
      portals: has ? filters.portals.filter((s) => s !== slug) : [...filters.portals, slug],
    });
  }

  const portals = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of articles) map.set(a.portal_slug, a.portal_name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [articles]);

  /** Vuelve al estado inicial: todos los medios tildados, sin palabra ni fecha. */
  function clearFilters() {
    applyFilters({ portals: portals.map(([slug]) => slug), keyword: "all", date: "all" });
  }

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (!filters.portals.includes(a.portal_slug)) return false;
      if (filters.date !== "all" && dateRef) {
        const when = a.published_at ?? a.first_seen_at;
        const hours = HOUR_FILTERS[filters.date];
        if (hours) {
          if (new Date(when).getTime() < dateRef.nowMs - hours * 60 * 60 * 1000) return false;
        } else {
          const key = dayKeyAR(when);
          if (filters.date === "today" && key !== dateRef.today) return false;
          if (filters.date === "yesterday" && key !== dateRef.yesterday) return false;
        }
      }
      if (filters.keyword !== "all") {
        const matches = highlightTitle(a.title, [filters.keyword]).some((s) => s.match);
        if (!matches) return false;
      }
      return true;
    });
  }, [articles, filters, dateRef]);

  const activeCount =
    (filters.portals.length !== portals.length ? 1 : 0) +
    (filters.keyword !== "all" ? 1 : 0) +
    (filters.date !== "all" ? 1 : 0);

  const listKey = `${filters.portals.join(",")}|${filters.keyword}|${filters.date}|${dateRef?.nowMs ?? 0}`;
  const greeting = displayName.split(" ")[0];

  return (
    <div className="w-full px-4 sm:px-8">
      {/* Todas las franjas son opacas: el contenido scrollea por debajo sin verse. */}
      <header className="sticky top-0 z-40 -mx-4 sm:-mx-8">
        {/* Zona superior: celeste pleno; todo el texto va en navy accent-fg. */}
        <div className="bg-accent px-4 pt-3 pb-3 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div>
              <Link href="/" className="text-2xl font-bold lowercase tracking-tight text-accent-fg">
                arnius<span className="text-highlight">.</span>
              </Link>
              <p className="text-sm font-medium text-accent-fg">Hola, {greeting}</p>
            </div>

            <div className="flex items-center gap-2">
              <KeywordsModal keywords={keywords} />

              <div ref={panelRef} className="relative">
                <button
                  type="button"
                  onClick={() => (panelOpen ? closePanel() : setPanelOpen(true))}
                  aria-expanded={panelOpen}
                  aria-controls="feed-filters"
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-fg/10 motion-reduce:transition-none"
                >
                  <FilterIcon />
                  Filtros
                  {activeCount > 0 ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-accent-fg text-xs font-bold text-white">
                      {activeCount}
                    </span>
                  ) : null}
                  <ChevronIcon open={panelOpen} />
                </button>

                {panelOpen ? (
                  <div
                    id="feed-filters"
                    className="absolute right-0 top-full z-50 mt-1 flex w-72 animate-panel-in flex-col gap-4 rounded-lg border border-border bg-background p-4 shadow-xl motion-reduce:animate-none"
                  >
                    <FilterMenuRow
                      label="Palabra"
                      summary={filters.keyword === "all" ? "Todas" : filters.keyword}
                      open={openMenu === "keyword"}
                      onToggle={() => setOpenMenu((m) => (m === "keyword" ? null : "keyword"))}
                    >
                      <OptionItem
                        selected={filters.keyword === "all"}
                        onSelect={() => {
                          applyFilters({ ...filters, keyword: "all" });
                          setOpenMenu(null);
                        }}
                      >
                        Todas
                      </OptionItem>
                      {keywordStrings.map((k) => (
                        <OptionItem
                          key={k}
                          selected={filters.keyword === k}
                          onSelect={() => {
                            applyFilters({ ...filters, keyword: k });
                            setOpenMenu(null);
                          }}
                        >
                          {k}
                        </OptionItem>
                      ))}
                    </FilterMenuRow>

                    <FilterMenuRow
                      label="Fecha"
                      summary={
                        DATE_OPTIONS.find((o) => o.value === filters.date)?.label ??
                        "Últimos 3 días"
                      }
                      open={openMenu === "date"}
                      onToggle={() => setOpenMenu((m) => (m === "date" ? null : "date"))}
                    >
                      {DATE_OPTIONS.map((o) => (
                        <OptionItem
                          key={o.value}
                          selected={filters.date === o.value}
                          onSelect={() => {
                            applyFilters({ ...filters, date: o.value });
                            setOpenMenu(null);
                          }}
                        >
                          {o.label}
                        </OptionItem>
                      ))}
                    </FilterMenuRow>

                    <FilterMenuRow
                      label="Medios"
                      summary={
                        filters.portals.length === portals.length
                          ? "Todos"
                          : filters.portals.length === 0
                            ? "Ninguno"
                            : `${filters.portals.length} de ${portals.length}`
                      }
                      open={openMenu === "portals"}
                      onToggle={() => setOpenMenu((m) => (m === "portals" ? null : "portals"))}
                    >
                      <div className="flex items-center gap-4 border-b border-border px-2 pb-1.5 pt-1 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() =>
                            applyFilters({ ...filters, portals: portals.map(([slug]) => slug) })
                          }
                          className="cursor-pointer text-accent-strong hover:underline"
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFilters({ ...filters, portals: [] })}
                          className="cursor-pointer text-accent-strong hover:underline"
                        >
                          Ninguno
                        </button>
                      </div>
                      {portals.map(([slug, name]) => (
                        <label
                          key={slug}
                          className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 text-sm transition-colors duration-150 hover:bg-surface motion-reduce:transition-none"
                        >
                          <input
                            type="checkbox"
                            checked={filters.portals.includes(slug)}
                            onChange={() => togglePortal(slug)}
                            className="size-4 cursor-pointer accent-highlight"
                          />
                          {name}
                        </label>
                      ))}
                    </FilterMenuRow>

                    {activeCount > 0 ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="cursor-pointer self-start text-sm font-medium text-accent-strong hover:underline"
                      >
                        Limpiar filtros
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <UserMenu
                displayName={displayName}
                email={email}
                avatarUrl={avatarUrl}
                dbTheme={dbTheme}
              />
            </div>
          </div>
        </div>

        {/* Separador amarillo */}
        <div aria-hidden="true" className="h-[3px] bg-highlight" />

        {/* Barra de datos */}
        <div className="border-b border-border bg-background px-4 py-1.5 sm:px-8">
          <p className="text-xs text-muted" suppressHydrationWarning>
            {activeCount > 0
              ? `${filtered.length} de ${articles.length} noticias`
              : `${articles.length} noticias`}
            {lastRunIso ? ` · Actualizado ${formatRelative(lastRunIso)}` : ""}
            {` · Próxima en ${formatNextScrape()}`}
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[60rem] flex-col gap-3 py-4">
        <h1 className="sr-only">Noticias</h1>

        {/* Contenido */}
        {keywordStrings.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center">
            <SearchIcon />
            <p className="mt-3 font-semibold">Todavía no tenés palabras clave</p>
            <p className="mt-1 text-sm text-muted">
              Agregá la primera desde «Mis palabras» (arriba) para armar tu feed.
            </p>
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center">
            <SearchIcon />
            <p className="mt-3 font-semibold">Sin noticias para tus palabras</p>
            <p className="mt-1 text-sm text-muted">
              Nada en los últimos 3 días para{" "}
              <span className="text-foreground">{keywordStrings.join(", ")}</span>. Ajustá tu lista
              desde «Mis palabras» (arriba).
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center">
            <p className="font-semibold">Ninguna noticia con estos filtros</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 cursor-pointer text-sm font-medium text-accent-strong hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <FeedList key={listKey} articles={filtered} keywords={keywordStrings} />
        )}
      </main>

      <BackToTop />
    </div>
  );
}
