"use strict";

/* ----------------------------------------------------------------
 * 19) MÓDULO: REPORTES
 * ---------------------------------------------------------------- */
const Reports = {
  render() {
    return `
      <div class="view space-y-6">
        <div><h2 class="text-xl font-bold">Reportes</h2><p class="text-sm text-slate-500">Analiza tus finanzas con gráficos avanzados.</p></div>
        <div class="grid lg:grid-cols-2 gap-5">
          <div class="surface rounded-2xl p-5 shadow-soft"><h3 class="font-semibold mb-4">Egresos por mes (12 meses)</h3><canvas id="rep-monthly" height="140"></canvas></div>
          <div class="surface rounded-2xl p-5 shadow-soft"><h3 class="font-semibold mb-4">Gastos por categoría (histórico)</h3><canvas id="rep-cat" height="140"></canvas></div>
          <div class="surface rounded-2xl p-5 shadow-soft"><h3 class="font-semibold mb-4">Gasto por banco</h3><canvas id="rep-bank" height="140"></canvas></div>
          <div class="surface rounded-2xl p-5 shadow-soft"><h3 class="font-semibold mb-4">Comparativo Ingresos vs Egresos</h3><canvas id="rep-cmp" height="140"></canvas></div>
        </div>
      </div>`;
  },
  mount() {
    const months = Charts.lastMonths(12);
    const labels = months.map(Charts.monthLabel);
    Charts.make('rep-monthly', { type: 'bar',
      data: { labels, datasets: [{ label: 'Egresos', data: months.map(m => Engine.monthFlow(m).outflow), backgroundColor: '#6366f1', borderRadius: 5 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: Charts.gridColor() }, ticks: { callback: v => Utils.number(v) } } } } });

    const catMap = {};
    Repos.expenses.where(e => e.type !== 'ingreso').forEach(e => catMap[e.category] = (catMap[e.category]||0) + e.amount);
    Charts.make('rep-cat', { type: 'pie',
      data: { labels: Object.keys(catMap).length ? Object.keys(catMap) : ['Sin datos'], datasets: [{ data: Object.values(catMap).length ? Object.values(catMap) : [1], backgroundColor: Charts.palette, borderWidth: 0 }] },
      options: { plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } } });

    const bankMap = {};
    Repos.expenses.where(e => e.type !== 'ingreso' && e.cardId).forEach(e => { const c = Repos.cards.find(e.cardId); if (c) bankMap[c.bank] = (bankMap[c.bank]||0) + e.amount; });
    Charts.make('rep-bank', { type: 'doughnut',
      data: { labels: Object.keys(bankMap).length ? Object.keys(bankMap) : ['Sin datos'], datasets: [{ data: Object.values(bankMap).length ? Object.values(bankMap) : [1], backgroundColor: Charts.palette, borderWidth: 0 }] },
      options: { cutout: '60%', plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } } });

    Charts.make('rep-cmp', { type: 'line',
      data: { labels, datasets: [
        { label: 'Ingresos', data: months.map(m => Engine.monthFlow(m).income), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.12)', fill: true, tension: .35 },
        { label: 'Egresos', data: months.map(m => Engine.monthFlow(m).outflow), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.12)', fill: true, tension: .35 },
      ]},
      options: { plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { grid: { color: Charts.gridColor() }, ticks: { callback: v => Utils.number(v) } } } } });
  },
};
