"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[30px] h-[30px] rounded-full border border-[var(--border)] bg-[var(--bg-card)] shadow-sm animate-pulse ml-2" />;
  }

  const cycleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={cycleTheme}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "30px",
        height: "30px",
        borderRadius: "9999px",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        marginLeft: "8px"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--text)";
        e.currentTarget.style.background = "var(--bg-card-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-secondary)";
        e.currentTarget.style.background = "var(--bg-card)";
      }}
      aria-label="Toggle theme"
      title={`Current mode: ${theme}`}
    >
      <div style={{ position: "relative", width: "16px", height: "16px" }}>
        {theme === "dark" && <Moon size={16} style={{ position: "absolute", top: 0, left: 0 }} />}
        {theme === "light" && <Sun size={16} style={{ position: "absolute", top: 0, left: 0 }} />}
      </div>
    </button>
  );
}
