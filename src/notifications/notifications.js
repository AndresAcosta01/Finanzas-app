"use strict";

/* ----------------------------------------------------------------
 * 24) MÓDULO: NOTIFICACIONES
 * ---------------------------------------------------------------- */
const Notifications = {
  compute() {
    const out = [];
    const today = Utils.todayStr();
    // Próximos pagos (ventana)
    Engine.pendingInstallments().forEach(p => {
      const days = Utils.daysUntil(p.cuota.dueDate);
      if (days < 0) out.push({ icon: 'fa-triangle-exclamation', color: 'rose', text: `Cuota vencida: ${p.expense.entity} #${p.cuota.number} (${Utils.money(p.cuota.value)})` });
      else if (days <= CONFIG.paymentDaysAhead) out.push({ icon: 'fa-calendar-day', color: 'amber', text: `Pago en ${days===0?'hoy':days+'d'}: ${p.expense.entity} ${Utils.money(p.cuota.value)}` });
    });
    // Próximo corte
    const nc = Engine.nextCut();
    if (nc && Utils.daysUntil(nc.date) <= CONFIG.paymentDaysAhead) out.push({ icon: 'fa-scissors', color: 'sky', text: `Corte de ${nc.card.name} el ${Utils.fmtDateShort(nc.date)}` });
    // Presupuestos
    const mk = Utils.monthKey(today);
    Repos.budgets.all().forEach(b => { const s = Engine.budgetStatus(b, mk); if (s.pct >= 80) out.push({ icon: 'fa-wallet', color: s.pct>=100?'rose':'amber', text: `Presupuesto ${b.category} al ${s.pct.toFixed(0)}%` }); });
    // Garantías próximas
    Repos.expenses.where(e => e.warranty).forEach(e => { const d = Utils.daysUntil(e.warranty); if (d >= 0 && d <= 30) out.push({ icon: 'fa-shield-halved', color: 'sky', text: `Garantía de ${e.entity} vence en ${d}d` }); });
    // Metas próximas
    Repos.goals.all().forEach(g => { const pct = g.target ? g.current/g.target*100 : 0; if (pct >= 90 && pct < 100) out.push({ icon: 'fa-bullseye', color: 'emerald', text: `¡Casi logras tu meta "${g.name}" (${pct.toFixed(0)}%)!` }); });
    return out;
  },
  refresh() {
    const list = this.compute();
    const badge = $('#notif-badge');
    if (badge) badge.classList.toggle('hidden', list.length === 0);
  },
  toggle() {
    const panel = $('#notif-panel');
    if (!panel.classList.contains('hidden')) { panel.classList.add('hidden'); return; }
    const list = this.compute();
    panel.innerHTML = `<div class="surface rounded-2xl shadow-card overflow-hidden animate__animated animate__fadeInDown animate__faster">
      <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between"><h4 class="font-semibold">Notificaciones</h4><span class="text-xs text-slate-400">${list.length}</span></div>
      <div class="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        ${list.length ? list.map(n => `<div class="flex items-start gap-3 px-4 py-3"><i class="fa-solid ${n.icon} text-${n.color}-500 mt-0.5"></i><p class="text-sm">${n.text}</p></div>`).join('')
          : `<p class="px-4 py-8 text-center text-sm text-slate-400">Sin notificaciones 🎉</p>`}
      </div></div>`;
    panel.classList.remove('hidden');
  },
};
