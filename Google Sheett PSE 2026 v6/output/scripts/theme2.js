/* ============================================================
   THEME.JS — Public Service Examination | Dark / Light Mode
   ─────────────────────────────────────────────────────────────
   PURPOSE:
   • Manages dark/light mode toggle persisted in localStorage
   • Falls back to OS prefers-color-scheme when no preference saved
   • Applies [data-theme] attribute on <html> element
   • Syncs toggle button aria-pressed state
   • Runs before page paint (placed before </body> via <script> tag
     at end of HTML) to prevent flash of wrong theme
   • Zero dependency — vanilla JS only
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'pse-colour-theme';
  const html        = document.documentElement;
  const DARK        = 'dark';
  const LIGHT       = 'light';

  /* ── 1. Determine initial theme ─────────────────────────── */
  function getInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === DARK || stored === LIGHT) return stored;
    /* OS preference fallback */
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return DARK;
    }
    return LIGHT;
  }

  /* ── 2. Apply theme to <html> ───────────────────────────── */
  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  /* ── 3. Sync button aria-pressed ───────────────────────── */
  function syncButton(theme) {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.setAttribute('aria-pressed', theme === DARK ? 'true' : 'false');
    btn.setAttribute('aria-label', theme === DARK ? 'Switch to light mode' : 'Switch to dark mode');
  }

  /* ── 4. Bootstrap ───────────────────────────────────────── */
  const initial = getInitialTheme();
  applyTheme(initial);

  /* ── 5. Wire toggle button once DOM is ready ────────────── */
  function wireToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    syncButton(html.getAttribute('data-theme') || initial);

    btn.addEventListener('click', function () {
      const current = html.getAttribute('data-theme') || LIGHT;
      const next    = current === DARK ? LIGHT : DARK;
      applyTheme(next);
      syncButton(next);
    });
  }

  /* Run after DOM is parsed */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireToggle);
  } else {
    wireToggle();
  }

  /* ── 6. React to OS theme changes in real time ──────────── */
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      /* Only update if user hasn't explicitly set a preference */
      if (!localStorage.getItem(STORAGE_KEY)) {
        const theme = e.matches ? DARK : LIGHT;
        applyTheme(theme);
        syncButton(theme);
      }
    });
  }

})();
