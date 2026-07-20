"use client";

import { useEffect, useState, useTransition } from "react";
import { setTheme, type Theme } from "./theme-actions";

const CYCLE: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };

const LABELS: Record<Theme, string> = {
  light: "claro",
  dark: "oscuro",
  system: "sistema",
};

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

function writeCookie(theme: Theme) {
  document.cookie = `arnius-theme=${theme}; path=/; max-age=31536000; samesite=lax`;
}

function readCookie(): Theme | null {
  const match = document.cookie.match(/(?:^|;\s*)arnius-theme=(light|dark|system)/);
  return (match?.[1] as Theme) ?? null;
}

function SunIcon() {
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
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
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function MonitorIcon() {
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
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8m-4-4v4" />
    </svg>
  );
}

const ICONS: Record<Theme, () => React.ReactNode> = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
};

export function ThemeToggle({ dbTheme }: { dbTheme: Theme }) {
  const [theme, setThemeState] = useState<Theme>(dbTheme);
  const [prevDbTheme, setPrevDbTheme] = useState<Theme>(dbTheme);
  const [, startTransition] = useTransition();

  // Si la DB trae otro tema (revalidación / login en otro dispositivo), gana la DB.
  // Ajuste de estado durante el render, patrón recomendado por React para derivar de props.
  if (prevDbTheme !== dbTheme) {
    setPrevDbTheme(dbTheme);
    setThemeState(dbTheme);
  }

  // Sincronizar cookie y DOM del navegador con la DB (sistemas externos).
  useEffect(() => {
    if (readCookie() !== dbTheme) {
      applyTheme(dbTheme);
      writeCookie(dbTheme);
    }
  }, [dbTheme]);

  function cycle() {
    const next = CYCLE[theme];
    setThemeState(next);
    // Crossfade suave entre temas vía View Transitions; si el navegador no la
    // soporta (o el usuario prefiere menos movimiento), cambio instantáneo.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && document.startViewTransition) {
      document.startViewTransition(() => applyTheme(next));
    } else {
      applyTheme(next);
    }
    writeCookie(next);
    startTransition(() => setTheme(next));
  }

  const Icon = ICONS[theme];
  const label = `Tema: ${LABELS[theme]}. Cambiar a ${LABELS[CYCLE[theme]]}.`;

  // Ítem del menú de usuario: fila completa con ícono + estado actual.
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm text-foreground transition-colors duration-150 hover:bg-surface motion-reduce:transition-none"
    >
      <span className="text-muted">
        <Icon />
      </span>
      Tema: {LABELS[theme]}
    </button>
  );
}
