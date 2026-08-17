import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

const THEMES = [
  { id: "red", name: "Copado Red", hex: "#ef4444", hsl: "0 84.2% 60.2%" },
  { id: "purple", name: "Cyberpunk Purple", hex: "#a855f7", hsl: "270 91% 65%" },
  { id: "emerald", name: "Emerald Ops", hex: "#10b981", hsl: "158 64% 42%" },
  { id: "blue", name: "Ocean Blue", hex: "#0ea5e9", hsl: "199 89% 48%" },
];

export function ColorThemePicker() {
  const [activeColor, setActiveColor] = useState("red");

  useEffect(() => {
    const saved = localStorage.getItem("csm_accent_theme");
    if (saved) applyColor(saved);
  }, []);

  const applyColor = (themeId: string) => {
    setActiveColor(themeId);
    localStorage.setItem("csm_accent_theme", themeId);

    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;

    let styleEl = document.getElementById("csm-theme-override") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "csm-theme-override";
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      :root {
        --primary: ${theme.hsl} !important;
        --ring: ${theme.hsl} !important;
      }
      .bg-primary { background-color: ${theme.hex} !important; }
      .text-primary { color: ${theme.hex} !important; }
      .border-primary { border-color: ${theme.hex} !important; }
    `;
  };

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1">
      <Palette className="size-3.5 text-muted-foreground mr-0.5" />
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => applyColor(t.id)}
          className={`size-4 rounded-full transition-transform ${
            activeColor === t.id
              ? "scale-125 ring-2 ring-foreground ring-offset-1 ring-offset-background"
              : "opacity-70 hover:opacity-100"
          }`}
          style={{ backgroundColor: t.hex }}
          title={t.name}
        />
      ))}
    </div>
  );
}