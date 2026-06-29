"use strict";

/* ----------------------------------------------------------------
 * 12) MÓDULO: CENTRO DE PAGOS
 * ---------------------------------------------------------------- */
const Payments = {
  render() {
    const today = Utils.todayStr();
    const weekEnd = Utils.iso(new Date(Date.now() + 7 * 86400000));
    const monthEnd = Utils.iso(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
    const pend = Engine.pendingInstallments();

    const dueToday = pend.filter(p => p.cuota.dueDate === today);
    const dueWeek = pend.filter(p => p.cuota.dueDate > today && p.cuota.dueDate <= weekEnd);
    const dueMonth = pend.filter(p => p.cuota.dueDate <= monthEnd);
    const overdue = pend.filter(p => p.cuota.dueDate < today);

    const totalPending = Utils.sum(pend, p => p.cuota.value);
    const totalOverdue = Utils.sum(overdue, p => p.cuota.value);
    const nextPay = Engine.nextPayment();
    const nextCut = Engine.nextCut();

    const bucket = (title, items, color, icon) => `
      <div class="surface rounded-2xl p-5 shadow-soft">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold flex items-center gap-2"><i class="fa-solid ${icon} text-${color}-500"></i> ${title}</h3>
          <span class="text-sm font-bold">${Utils.money(Utils.sum(items, p => p.cuota.value))}</span>
        </div>
        ${items.length ? `<div class="space-y-2">${items.slice(0, 8).map(p => this.itemHTML(p)).join('')}</div>`
          : `<p class="text-sm text-slate-400 py-3 text-center">Nada por aquí 🎉</p>`}
      </div>`;

    return `
      <div class="view space-y-6">
        <div>
          <h2 class="text-xl font-bold">Centro de pagos</h2>
          <p class="text-sm text-slate-500">Qué debes pagar y cuánto necesitas para quedar al día.</p>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${UI.kpi({ label: 'Total pendiente', value: Utils.money(totalPending), icon: 'fa-list-check', color: 'amber' })}
          ${UI.kpi({ label: 'Vencido', value: Utils.money(totalOverdue), icon: 'fa-triangle-exclamation', color: 'rose' })}
          ${UI.kpi({ label: 'Próximo pago', value: nextPay ? Utils.money(nextPay.amount) : '—', icon: 'fa-calendar-day', color: 'brand', sub: nextPay ? Utils.fmtDate(nextPay.date) : '' })}
          ${UI.kpi({ label: 'Próximo corte', value: nextCut ? Utils.fmtDateShort(nextCut.date) : '—', icon: 'fa-scissors', color: 'sky', sub: nextCut ? nextCut.card.name : '' })}
        </div>

        <!-- Simulador de saldo total -->
        <div class="surface rounded-2xl p-5 shadow-soft">
          <h3 class="font-semibold mb-1"><i class="fa-solid fa-wand-magic-sparkles text-brand-500"></i> ¿Cuánto necesito para saldar todo?</h3>
          <p class="text-sm text-slate-500 mb-3">Calcula el total de cuotas pendientes hasta una fecha (de pago o corte).</p>
          <div class="flex flex-wrap items-end gap-3">
            <label class="block"><span class="text-sm font-medium">Hasta la fecha</span>
              <input id="settle-date" type="date" value="${monthEnd}" onchange="Payments.calcSettle()" class="mt-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2"/></label>
            <div class="rounded-xl bg-brand-600 text-white px-5 py-3">
              <p class="text-xs opacity-80">Total para quedar al día</p>
              <p id="settle-amount" class="text-2xl font-extrabold">${Utils.money(Engine.totalDueUntil(monthEnd))}</p>
            </div>
          </div>
        </div>

        ${overdue.length ? bucket('Vencidas', overdue, 'rose', 'fa-triangle-exclamation') : ''}
        <div class="grid lg:grid-cols-3 gap-5">
          ${bucket('Hoy', dueToday, 'brand', 'fa-calendar-day')}
          ${bucket('Esta semana', dueWeek, 'amber', 'fa-calendar-week')}
          ${bucket('Este mes', dueMonth, 'sky', 'fa-calendar')}
        </div>
      </div>`;
  },

  itemHTML(p) {
    const overdue = p.cuota.dueDate < Utils.todayStr();
    return `<div class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
      <div class="min-w-0">
        <p class="text-sm font-medium truncate">${Utils.escape(p.expense.entity)} <span class="text-xs text-slate-400">#${p.cuota.number}</span></p>
        <p class="text-xs ${overdue ? 'text-rose-500' : 'text-slate-500'}">${Utils.fmtDate(p.cuota.dueDate)}</p>
      </div>
      <div class="flex items-center gap-2">
        <b class="text-sm">${Utils.money(p.cuota.value)}</b>
        <button onclick="Expenses.toggleCuota('${p.expense.id}',${p.cuota.number},true)" class="text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg px-2 py-1"><i class="fa-solid fa-check"></i> Pagar</button>
      </div>
    </div>`;
  },

  calcSettle() {
    const date = $('#settle-date').value;
    $('#settle-amount').textContent = Utils.money(Engine.totalDueUntil(date));
  },
};
