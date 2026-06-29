"use strict";

/* ----------------------------------------------------------------
 * 20) MÓDULO: CALENDARIO FINANCIERO
 * ---------------------------------------------------------------- */
const Calendar = {
  current: new Date(),
  render() {
    const d = this.current;
    const year = d.getFullYear(), month = d.getMonth();
    const first = new Date(year, month, 1);
    const startDay = (first.getDay() + 6) % 7; // lunes = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const events = this.eventsForMonth(year, month);

    let cells = '';
    for (let i = 0; i < startDay; i++) cells += `<div class="min-h-20 rounded-xl bg-slate-50 dark:bg-slate-800/40"></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const key = Utils.iso(new Date(year, month, day));
      const evs = events[key] || [];
      const isToday = key === Utils.todayStr();
      cells += `<div class="min-h-20 rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 ${isToday ? 'ring-2 ring-brand-500' : ''}">
        <div class="text-xs font-semibold ${isToday ? 'text-brand-600' : 'text-slate-400'}">${day}</div>
        <div class="space-y-0.5 mt-0.5">${evs.slice(0,3).map(e => `<div class="text-[10px] truncate px-1 py-0.5 rounded bg-${e.color}-100 text-${e.color}-700 dark:bg-${e.color}-500/15 dark:text-${e.color}-300" title="${Utils.escape(e.label)}">${e.icon} ${Utils.escape(e.label)}</div>`).join('')}${evs.length>3?`<div class="text-[10px] text-slate-400">+${evs.length-3} más</div>`:''}</div>
      </div>`;
    }

    return `
      <div class="view space-y-6">
        <div class="flex items-center justify-between">
          <div><h2 class="text-xl font-bold">Calendario financiero</h2><p class="text-sm text-slate-500">Pagos, cortes, ingresos y suscripciones del mes.</p></div>
          <div class="flex items-center gap-2">
            <button onclick="Calendar.move(-1)" class="w-9 h-9 grid place-items-center rounded-lg border border-slate-300 dark:border-slate-700"><i class="fa-solid fa-chevron-left"></i></button>
            <span class="font-semibold w-36 text-center">${Utils.monthName(month+1)} ${year}</span>
            <button onclick="Calendar.move(1)" class="w-9 h-9 grid place-items-center rounded-lg border border-slate-300 dark:border-slate-700"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>
        <div class="surface rounded-2xl p-4 shadow-soft">
          <div class="grid grid-cols-7 gap-1.5 mb-1.5 text-center text-xs font-semibold text-slate-400">
            ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(x=>`<div>${x}</div>`).join('')}
          </div>
          <div class="grid grid-cols-7 gap-1.5">${cells}</div>
          <div class="flex flex-wrap gap-4 mt-4 text-xs text-slate-500">
            <span><i class="fa-solid fa-circle text-rose-400"></i> Pago de cuota</span>
            <span><i class="fa-solid fa-circle text-sky-400"></i> Corte</span>
            <span><i class="fa-solid fa-circle text-emerald-400"></i> Ingreso</span>
            <span><i class="fa-solid fa-circle text-amber-400"></i> Recurrente</span>
          </div>
        </div>
      </div>`;
  },
  eventsForMonth(year, month) {
    const ev = {};
    const add = (date, label, color, icon) => { (ev[date] ||= []).push({ label, color, icon }); };
    // Cuotas
    Repos.expenses.where(e => e.method === 'credito' && e.installments).forEach(e => {
      (e.installments||[]).forEach(c => { const dd = Utils.parseDate(c.dueDate); if (dd.getFullYear()===year && dd.getMonth()===month) add(c.dueDate, `${e.entity} #${c.number}`, c.status==='pagada'?'emerald':'rose', '💳'); });
    });
    // Ingresos / egresos del mes
    Repos.expenses.where(e => e.method !== 'credito').forEach(e => { const dd = Utils.parseDate(e.date); if (dd.getFullYear()===year && dd.getMonth()===month) add(e.date, e.entity, e.type==='ingreso'?'emerald':'slate', e.type==='ingreso'?'⬆️':'🧾'); });
    // Cortes de tarjetas
    Repos.cards.where(c => c.type === 'credito' && c.cutDay).forEach(c => { const date = Utils.iso(Utils.dateOnMonth(year, month, c.cutDay)); add(date, `Corte ${c.name}`, 'sky', '✂️'); });
    // Recurrentes
    Repos.recurring.where(r => r.active !== false).forEach(r => { const date = Utils.iso(Utils.dateOnMonth(year, month, r.dayOfMonth)); add(date, r.name, 'amber', '🔁'); });
    return ev;
  },
  move(n) { this.current = new Date(this.current.getFullYear(), this.current.getMonth() + n, 1); Router.go('calendar'); },
};
