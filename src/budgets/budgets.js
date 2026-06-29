"use strict";

/* ----------------------------------------------------------------
 * 13) MÓDULO: PRESUPUESTOS
 * ---------------------------------------------------------------- */
const Budgets = {
  render() {
    const mk = Utils.monthKey(Utils.todayStr());
    const budgets = Repos.budgets.all();
    return `
      <div class="view space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><h2 class="text-xl font-bold">Presupuestos</h2><p class="text-sm text-slate-500">Define un límite por categoría y recibe alertas al 80%, 90% y 100%.</p></div>
          <button onclick="Budgets.openForm()" class="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 shadow-soft"><i class="fa-solid fa-plus"></i> Nuevo presupuesto</button>
        </div>
        ${budgets.length === 0 ? UI.empty('Sin presupuestos definidos.', 'fa-wallet') :
          `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${budgets.map(b => {
            const s = Engine.budgetStatus(b, mk);
            const color = s.pct >= 100 ? 'rose' : s.pct >= 80 ? 'amber' : 'emerald';
            return `<div class="surface rounded-2xl p-5 shadow-soft">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">${Utils.escape(b.category)}</h3>
                <div class="flex gap-1">
                  <button onclick="Budgets.openForm('${b.id}')" class="w-7 h-7 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><i class="fa-solid fa-pen text-xs"></i></button>
                  <button onclick="Budgets.remove('${b.id}')" class="w-7 h-7 grid place-items-center rounded-lg hover:bg-rose-50 text-rose-500"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>
              </div>
              <p class="mt-2 text-2xl font-extrabold">${Utils.money(s.spent)} <span class="text-sm font-medium text-slate-400">/ ${Utils.money(b.limit)}</span></p>
              <div class="mt-3">${UI.progress(s.pct, color)}</div>
              <p class="mt-2 text-xs ${color === 'rose' ? 'text-rose-500' : 'text-slate-500'}">${Utils.pct(s.pct)} consumido · ${s.remaining >= 0 ? Utils.money(s.remaining) + ' disponible' : 'Excedido ' + Utils.money(-s.remaining)}</p>
            </div>`;
          }).join('')}</div>`}
      </div>`;
  },
  openForm(id = null) {
    const b = id ? Repos.budgets.find(id) : {};
    UI.modal({ title: id ? 'Editar presupuesto' : 'Nuevo presupuesto',
      body: `<form id="bud-form" class="space-y-4">
        ${UI.field('Categoría', UI.select('category', CONFIG.categories, b.category || 'Comida'))}
        ${UI.field('Límite mensual', UI.input('limit', { type: 'number', value: b.limit || '', min: 0, required: true }))}
      </form>`,
      footer: `<button data-close class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium">Cancelar</button>
               <button onclick="Budgets.save('${id||''}')" class="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold">Guardar</button>` });
  },
  save(id) {
    const f = $('#bud-form');
    const data = { category: f.category.value, limit: Number(f.limit.value) || 0 };
    if (id) Repos.budgets.update(id, data); else Repos.budgets.insert(data);
    Utils.toast('Presupuesto guardado'); UI.closeModal(); Router.go('budgets');
  },
  async remove(id) { if (await Utils.confirm('¿Eliminar presupuesto?', '', 'Eliminar')) { Repos.budgets.remove(id); Router.go('budgets'); } },
};
