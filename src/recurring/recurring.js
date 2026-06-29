"use strict";

/* ----------------------------------------------------------------
 * 15) MÓDULO: GASTOS RECURRENTES (suscripciones / servicios)
 * ---------------------------------------------------------------- */
const Recurring = {
  render() {
    const items = Repos.recurring.all();
    return `
      <div class="view space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><h2 class="text-xl font-bold">Gastos recurrentes</h2><p class="text-sm text-slate-500">Suscripciones y servicios que se generan automáticamente cada mes.</p></div>
          <button onclick="Recurring.openForm()" class="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 shadow-soft"><i class="fa-solid fa-plus"></i> Nuevo recurrente</button>
        </div>
        ${items.length === 0 ? UI.empty('Sin gastos recurrentes. Agrega Netflix, arriendo, servicios...', 'fa-repeat') :
        `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${items.map(r => `
          <div class="surface rounded-2xl p-5 shadow-soft">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl grid place-items-center bg-brand-100 text-brand-600 dark:bg-brand-500/15"><i class="fa-solid fa-repeat"></i></div>
                <div><h3 class="font-semibold">${Utils.escape(r.name)}</h3><p class="text-xs text-slate-500">${Utils.escape(r.category)} · día ${r.dayOfMonth}</p></div>
              </div>
              <div class="flex gap-1">
                <button onclick="Recurring.openForm('${r.id}')" class="w-7 h-7 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><i class="fa-solid fa-pen text-xs"></i></button>
                <button onclick="Recurring.remove('${r.id}')" class="w-7 h-7 grid place-items-center rounded-lg hover:bg-rose-50 text-rose-500"><i class="fa-solid fa-trash text-xs"></i></button>
              </div>
            </div>
            <p class="mt-3 text-xl font-extrabold">${Utils.money(r.amount)}<span class="text-sm font-normal text-slate-400">/mes</span></p>
            <div class="mt-2 flex items-center justify-between">
              ${r.active !== false ? UI.badge('Activo','emerald') : UI.badge('Pausado','slate')}
              <button onclick="Recurring.generateNow('${r.id}')" class="text-xs font-semibold text-brand-600 hover:underline">Generar este mes</button>
            </div>
          </div>`).join('')}</div>`}
      </div>`;
  },
  openForm(id = null) {
    const r = id ? Repos.recurring.find(id) : { dayOfMonth: 1, active: true };
    const cards = Repos.cards.all();
    UI.modal({ title: id ? 'Editar recurrente' : 'Nuevo gasto recurrente',
      body: `<form id="rec-form" class="space-y-4">
        <div class="grid sm:grid-cols-2 gap-4">
          ${UI.field('Nombre', UI.input('name', { value: r.name || '', placeholder: 'Netflix, Arriendo...', required: true }))}
          ${UI.field('Monto', UI.input('amount', { type: 'number', value: r.amount || '', min: 0, required: true }))}
          ${UI.field('Categoría', UI.select('category', CONFIG.categories, r.category || 'Servicios'))}
          ${UI.field('Día del mes', UI.input('dayOfMonth', { type: 'number', value: r.dayOfMonth || 1, min: 1, extra: 'max=31' }))}
          ${UI.field('Método', UI.select('method', [{value:'debito',label:'Débito'},{value:'credito',label:'Crédito'},{value:'efectivo',label:'Efectivo'}], r.method || 'debito'))}
          ${UI.field('Tarjeta', UI.select('cardId', [{value:'',label:'—'}, ...cards.map(c=>({value:c.id,label:c.name}))], r.cardId || ''))}
        </div>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="active" ${r.active !== false ? 'checked' : ''} class="rounded"/> Activo</label>
      </form>`,
      footer: `<button data-close class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium">Cancelar</button>
               <button onclick="Recurring.save('${id||''}')" class="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold">Guardar</button>` });
  },
  save(id) {
    const f = $('#rec-form');
    const data = { name: f.name.value.trim(), amount: Number(f.amount.value) || 0, category: f.category.value,
      dayOfMonth: Number(f.dayOfMonth.value) || 1, method: f.method.value, cardId: f.cardId.value || null, active: f.active.checked };
    if (id) Repos.recurring.update(id, data); else Repos.recurring.insert(data);
    Utils.toast('Recurrente guardado'); UI.closeModal(); Router.go('recurring');
  },
  async remove(id) { if (await Utils.confirm('¿Eliminar recurrente?', '', 'Eliminar')) { Repos.recurring.remove(id); Router.go('recurring'); } },

  generateNow(id) {
    const r = Repos.recurring.find(id); if (!r) return;
    this._createExpense(r, Utils.monthKey(Utils.todayStr()));
    Utils.toast('Gasto generado'); Router.go('recurring');
  },
  _createExpense(r, monthKey) {
    const [y, m] = monthKey.split('-').map(Number);
    const date = Utils.iso(Utils.dateOnMonth(y, m - 1, r.dayOfMonth));
    const data = {
      type: 'egreso', entity: r.name, amount: r.amount, category: r.category, subcategory: 'Recurrente',
      tags: 'recurrente', date, time: '', city: '', method: r.method, cardId: r.cardId,
      installmentsCount: 1, status: 'pendiente', recurringId: r.id, description: 'Gasto recurrente generado automáticamente',
    };
    if (r.method === 'credito') { data.interestRate = Engine.rateForDate(date); data.installments = Engine.buildInstallments(data, r.cardId ? Repos.cards.find(r.cardId) : null); }
    Repos.expenses.insert(data);
  },
  // Genera automáticamente los recurrentes del mes actual que aún no existan
  autoGenerate() {
    const mk = Utils.monthKey(Utils.todayStr());
    const existing = Repos.expenses.all();
    Repos.recurring.where(r => r.active !== false).forEach(r => {
      const already = existing.some(e => e.recurringId === r.id && Utils.monthKey(e.date) === mk);
      if (!already) this._createExpense(r, mk);
    });
  },
};
