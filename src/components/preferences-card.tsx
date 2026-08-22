"use client";

import { useEffect, useState } from "react";
import { getThemePreference, setThemePreference, type ThemePref } from "@/lib/theme";

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function PreferencesCard() {
  const [pref, setPref] = useState<ThemePref>("system");

  // Read the stored preference after mount (client-only; avoids SSR mismatch).
  useEffect(() => {
    const id = requestAnimationFrame(() => setPref(getThemePreference()));
    return () => cancelAnimationFrame(id);
  }, []);

  function choose(p: ThemePref) {
    setPref(p);
    setThemePreference(p);
  }

  return (
    <section className="account-card">
      <h2>Appearance</h2>
      <div className="field">
        <label id="theme-label">Theme</label>
        <div className="theme-toggle" role="group" aria-labelledby="theme-label">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`theme-toggle-btn${pref === o.value ? " is-active" : ""}`}
              aria-pressed={pref === o.value}
              onClick={() => choose(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
