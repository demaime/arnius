"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { addKeyword, removeKeyword, type KeywordActionState } from "./keyword-actions";

export interface Keyword {
  id: string;
  keyword: string;
}

const initialState: KeywordActionState = { error: null };

const emptySubscribe = () => () => {};

function TagIcon() {
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
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function KeywordsModal({ keywords }: { keywords: Keyword[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addKeyword, initialState);

  // false en SSR/hidratación, true en el cliente: el portal recién existe ahí.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Escape cierra; mientras está abierto, la página de atrás no scrollea.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mis palabras"
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-fg/10 motion-reduce:transition-none"
      >
        <TagIcon />
        <span className="hidden sm:inline">Mis palabras</span>
        <span className="flex size-5 items-center justify-center rounded-full bg-accent-fg text-xs font-bold text-white">
          {keywords.length}
        </span>
      </button>

      {mounted
        ? createPortal(
            <MotionConfig reducedMotion="user">
              <AnimatePresence>
                {open ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setOpen(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 12 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      role="dialog"
                      aria-modal="true"
                      aria-label="Mis palabras"
                      className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight">
                            Mis palabras
                            <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 align-middle text-xs font-bold text-accent-fg">
                              {keywords.length}
                            </span>
                          </h2>
                          <p className="mt-2 text-sm leading-relaxed text-muted">
                            Tu feed muestra las noticias cuyos títulos contienen alguna de estas
                            palabras. Matchea sin importar mayúsculas, tildes ni plurales.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpen(false)}
                          aria-label="Cerrar"
                          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface hover:text-foreground motion-reduce:transition-none"
                        >
                          <CloseIcon />
                        </button>
                      </div>

                      <form action={formAction} className="mt-5 flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            name="keyword"
                            placeholder="nueva palabra o frase"
                            minLength={2}
                            maxLength={80}
                            required
                            autoComplete="off"
                            autoFocus
                            className="h-11 w-full rounded-md border border-border bg-surface px-3 placeholder:text-muted"
                          />
                          <button
                            type="submit"
                            disabled={pending}
                            className="h-11 shrink-0 cursor-pointer rounded-md bg-accent px-4 font-semibold text-accent-fg transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 motion-reduce:transition-none"
                          >
                            {pending ? "..." : "Agregar"}
                          </button>
                        </div>
                        {state.error ? (
                          <p role="alert" className="text-sm text-danger">
                            {state.error}
                          </p>
                        ) : null}
                      </form>

                      {keywords.length === 0 ? (
                        <p className="mt-5 text-muted">
                          No tenés palabras todavía. Agregá la primera para armar tu feed.
                        </p>
                      ) : (
                        <ul className="mt-5 flex flex-wrap gap-2">
                          {keywords.map((k) => (
                            <li
                              key={k.id}
                              className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-sm"
                            >
                              <span>{k.keyword}</span>
                              <form action={removeKeyword} className="flex">
                                <input type="hidden" name="id" value={k.id} />
                                {/* Target de 36px dentro del chip: compromiso asumido para no
                                    agigantar los chips. */}
                                <button
                                  type="submit"
                                  aria-label={`Quitar ${k.keyword}`}
                                  className="-my-2 -mr-2 flex size-9 cursor-pointer items-center justify-center rounded-full font-bold text-muted transition-colors duration-150 hover:text-danger motion-reduce:transition-none"
                                >
                                  ×
                                </button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </MotionConfig>,
            document.body,
          )
        : null}
    </>
  );
}
