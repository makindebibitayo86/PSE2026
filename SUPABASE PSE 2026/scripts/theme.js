/* ============================================================
   THEME.JS — Dark / Light mode toggle
   • Reads preference from localStorage on page load
   • Falls back to OS preference (prefers-color-scheme)
   • Writes preference back on toggle
   ============================================================ */

(function () {
  'use strict';

  const ROOT       = document.documentElement;  // <html data-theme="…">
  const STORE_KEY  = 'pse-theme';
  const TOGGLE_BTN = document.getElementById('themeToggle');

  /* ── 1. Determine initial theme ──────────────────────────── */
  function prefersDark () {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function savedTheme () {
    try { return localStorage.getItem(STORE_KEY); } catch (_) { return null; }
  }

  function applyTheme (theme) {
    ROOT.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORE_KEY, theme); } catch (_) {}
    if (TOGGLE_BTN) {
      TOGGLE_BTN.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
      TOGGLE_BTN.setAttribute(
        'title',
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
  }

  /* Determine starting theme:
     1. Saved user preference (if any)
     2. OS dark-mode preference
     3. Default: light                */
  const initial = savedTheme() || (prefersDark() ? 'dark' : 'light');
  applyTheme(initial);

  /* ── 2. Toggle handler ───────────────────────────────────── */
  if (TOGGLE_BTN) {
    TOGGLE_BTN.addEventListener('click', () => {
      const current = ROOT.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    /* Support keyboard: Space / Enter both toggle */
    TOGGLE_BTN.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        TOGGLE_BTN.click();
      }
    });
  }

  /* ── 3. Sync when OS theme changes (user hasn't overridden) ─ */
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    /* Only follow OS if no saved preference */
    if (!savedTheme()) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
})();
