"use client";

import { useActionState, useEffect, useState } from "react";
import { addKeyword, removeKeyword, type KeywordActionState } from "./keyword-actions";

export interface Keyword {
  id: string;
  keyword: string;
}

const initialState: KeywordActionState = { error: null };

export function KeywordsModal({ keywords }: { keywords: Keyword[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addKeyword, initialState);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-gray-400 px-3 py-1 hover:bg-gray-100"
      >
        Mis palabras ({keywords.length})
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mis palabras"
            className="max-h-[75vh] w-full max-w-lg overflow-y-auto rounded border border-gray-300 bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Mis palabras</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Tu feed muestra las noticias cuyos títulos contienen alguna de estas palabras.
                  Matchea sin importar mayúsculas, tildes ni plurales.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-2xl leading-none text-gray-500 hover:text-black"
              >
                ×
              </button>
            </div>

            <form action={formAction} className="mt-4 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  name="keyword"
                  placeholder="nueva palabra o frase"
                  minLength={2}
                  maxLength={80}
                  required
                  autoComplete="off"
                  className="w-full rounded border border-gray-400 px-3 py-1"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="shrink-0 rounded border border-gray-800 px-4 py-1 font-medium hover:bg-gray-100 disabled:opacity-50"
                >
                  {pending ? "..." : "Agregar"}
                </button>
              </div>
              {state.error ? (
                <p role="alert" className="text-sm text-gray-700">
                  {state.error}
                </p>
              ) : null}
            </form>

            {keywords.length === 0 ? (
              <p className="mt-4 text-gray-600">
                No tenés palabras todavía. Agregá la primera para armar tu feed.
              </p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <li
                    key={k.id}
                    className="flex items-center gap-2 rounded border border-gray-300 px-3 py-1"
                  >
                    <span>{k.keyword}</span>
                    <form action={removeKeyword}>
                      <input type="hidden" name="id" value={k.id} />
                      <button
                        type="submit"
                        aria-label={`Quitar ${k.keyword}`}
                        className="font-bold text-gray-500 hover:text-black"
                      >
                        ×
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
