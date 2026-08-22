// Theme preference: "light" | "dark" | "system". The actual applied theme lives
// in <html data-theme="light|dark">, set before first paint by an inline script
// in the root layout (so there's no flash). This module is the React-side API
// used by the Appearance control on the account page.

export type ThemePref = "light" | "dark" | "system";

export const THEME_KEY = "fornetto:theme";

export function getThemePreference(): ThemePref {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage blocked */
  }
  return "system";
}

function resolve(pref: ThemePref): "light" | "dark" {
  if (pref === "system") {
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

export function setThemePreference(pref: ThemePref) {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* storage blocked */
  }
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolve(pref));
  }
}

// Inlined verbatim into a blocking <script> in the root layout <head>. Reads the
// stored preference, applies data-theme before paint, and keeps following the OS
// setting live while the preference is "system". Reads storage fresh on each
// change so a preference update elsewhere is always respected.
export const THEME_INIT_SCRIPT = `(function(){try{
var m=window.matchMedia('(prefers-color-scheme: dark)');
function apply(){var p;try{p=localStorage.getItem('${THEME_KEY}')||'system'}catch(e){p='system'}
var d=p==='dark'||(p==='system'&&m.matches);
document.documentElement.setAttribute('data-theme',d?'dark':'light')}
apply();m.addEventListener('change',apply)}catch(e){}})()`;
