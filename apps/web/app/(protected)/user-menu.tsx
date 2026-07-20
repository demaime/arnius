"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import type { Theme } from "./theme-actions";

function LogoutIcon() {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function UserMenu({
  displayName,
  email,
  avatarUrl,
  dbTheme,
}: {
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  dbTheme: Theme;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Cerrar con click afuera o Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de usuario"
        className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-opacity duration-150 hover:opacity-80 motion-reduce:transition-none"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar externo de Google, sin optimizador
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="size-9 rounded-full border border-border"
          />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-fg text-sm font-bold uppercase text-white">
            {displayName.charAt(0)}
          </span>
        )}
      </button>

      {/* Siempre montado (oculto con CSS): si se desmontara, el ThemeToggle de
          adentro volvería a nacer con la prop del servidor, que queda vieja tras
          cambiar el tema, y pisaría la elección del usuario. */}
      <div
        role="menu"
        className={`absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-background p-2 shadow-xl ${
          open ? "animate-panel-in motion-reduce:animate-none" : "hidden"
        }`}
      >
        <div className="border-b border-border px-3 pb-2 pt-1">
          <p className="truncate font-semibold">{displayName}</p>
          {email ? <p className="truncate text-xs text-muted">{email}</p> : null}
        </div>

        <div className="mt-1 flex flex-col">
          <ThemeToggle dbTheme={dbTheme} />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm text-foreground transition-colors duration-150 hover:bg-surface motion-reduce:transition-none"
            >
              <span className="text-muted">
                <LogoutIcon />
              </span>
              Salir
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
