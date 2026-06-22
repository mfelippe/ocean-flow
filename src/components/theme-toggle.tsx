"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // ignora ambientes sem localStorage
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center justify-between px-3 py-2 text-sm text-ink hover:bg-surface"
    >
      <span>Tema</span>
      <span className="text-muted">{dark ? "🌙 Escuro" : "☀️ Claro"}</span>
    </button>
  );
}
