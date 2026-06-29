"use strict";

/* ----------------------------------------------------------------
 * 16) HELPER DE GRÁFICOS (Chart.js)
 * ---------------------------------------------------------------- */
const Charts = {
  palette: ['#6366f1','#10b981','#f59e0b','#ef4444','#0ea5e9','#a855f7','#ec4899','#14b8a6','#f97316','#64748b','#84cc16','#eab308'],
  destroyAll() { Object.values(State.charts).forEach(c => { try { c.destroy(); } catch {} }); State.charts = {}; },
  gridColor() { return UI.isDark() ? 'rgba(148,163,184,.15)' : 'rgba(100,116,139,.15)'; },
  tickColor() { return UI.isDark() ? '#94a3b8' : '#475569'; },
  make(id, config) {
    const el = document.getElementById(id); if (!el || !window.Chart) return;
    if (State.charts[id]) { try { State.charts[id].destroy(); } catch {} }
    Chart.defaults.font.family = 'Inter, sans-serif';
    Chart.defaults.color = this.tickColor();
    State.charts[id] = new Chart(el, config);
  },
  // últimos n meses como claves YYYY-MM
  lastMonths(n = 6) {
    const out = []; const d = new Date();
    for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(Utils.iso(x).slice(0, 7)); }
    return out;
  },
  monthLabel(mk) { const [y, m] = mk.split('-'); return Utils.monthName(+m).slice(0, 3) + ' ' + y.slice(2); },
};
