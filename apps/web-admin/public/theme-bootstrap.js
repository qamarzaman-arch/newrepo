/**
 * QA C1: theme bootstrap moved out of an inline <script> so we can drop
 * 'unsafe-inline' from script-src. Loaded synchronously in <head> so the
 * dark class is set before the first paint and we avoid a light-flash.
 */
(function () {
  try {
    var t = localStorage.getItem('poslytic-theme');
    var d = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (d) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
