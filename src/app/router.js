"use strict";

/* ----------------------------------------------------------------
 * 25) ROUTER / NAVEGACIÓN
 * ---------------------------------------------------------------- */
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high', module: Dashboard, title: 'Dashboard' },
  { id: 'expenses', label: 'Ingresos y egresos', icon: 'fa-right-left', module: Expenses, title: 'Ingresos y egresos' },
  { id: 'payments', label: 'Centro de pagos', icon: 'fa-money-bill-transfer', module: Payments, title: 'Centro de pagos' },
  { id: 'cards', label: 'Tarjetas', icon: 'fa-credit-card', module: Cards, title: 'Tarjetas' },
  { id: 'rates', label: 'Intereses', icon: 'fa-percent', module: Rates, title: 'Tasas de interés' },
  { id: 'budgets', label: 'Presupuestos', icon: 'fa-wallet', module: Budgets, title: 'Presupuestos' },
  { id: 'goals', label: 'Metas', icon: 'fa-bullseye', module: Goals, title: 'Metas de ahorro' },
  { id: 'recurring', label: 'Recurrentes', icon: 'fa-repeat', module: Recurring, title: 'Gastos recurrentes' },
  { id: 'calendar', label: 'Calendario', icon: 'fa-calendar-days', module: Calendar, title: 'Calendario financiero' },
  { id: 'reports', label: 'Reportes', icon: 'fa-chart-column', module: Reports, title: 'Reportes' },
  { id: 'search', label: 'Buscador', icon: 'fa-magnifying-glass', module: Search, title: 'Buscador' },
  { id: 'settings', label: 'Ajustes', icon: 'fa-gear', module: Settings, title: 'Ajustes y respaldos' },
];

const Router = {
  go(id) {
    const item = NAV.find(n => n.id === id) || NAV[0];
    State.view = item.id;
    Charts.destroyAll();
    $('#main-content').innerHTML = item.module.render();
    $('#page-title').textContent = item.title;
    // Vista especial: expenses necesita poblar lista
    if (item.id === 'expenses') Expenses.applyFilters();
    if (typeof item.module.mount === 'function') item.module.mount();
    // nav activo
    $$('#nav-menu .nav-link').forEach(a => a.classList.toggle('active', a.dataset.view === item.id));
    // cerrar sidebar móvil
    if (window.innerWidth < 1024) App.closeSidebar();
    Notifications.refresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  refreshCharts() {
    const item = NAV.find(n => n.id === State.view);
    if (item && typeof item.module.mount === 'function') { try { item.module.mount(); } catch {} }
  },
};
