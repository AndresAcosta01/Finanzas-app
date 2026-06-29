"use strict";

/* ----------------------------------------------------------------
 * 10) MÓDULO: TASAS DE INTERÉS (global, por mes)
 * ---------------------------------------------------------------- */
const Rates = {
  render() {
    const rates = Repos.rates.all().sort((a, b) => (b.year - a.year) || (b.month - a.month));
    const byYear = Utils.groupBy(rates, r => r.year);
    const years = Object.keys(byYear).sort((a, b) => b - a);
    return `
      <div class="view space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-bold">Tasas de interés mensuales</h2>
            <p class="text-sm text-slate-500">Define la tasa de cada mes. Al registrar una compra se usa la tasa del mes de la compra, nunca una actual.</p>
          </div>
          <button onclick="Rates.openForm()" class="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 shadow-soft"><i class="fa-solid fa-plus"></i> Agregar tasa</button>
        </div>

        ${rates.length === 0 ? UI.empty('No has registrado tasas. Agrega la tasa del mes para calcular intereses.', 'fa-percent',
          `<button onclick="Rates.seedYear()" class="rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-semibold">Crear 12 meses del año actual</button>`) :
        years.map(y => `
          <div class="surface rounded-2xl p-5 shadow-soft">
            <h3 class="font-bold mb-3">${y}</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              ${byYear[y].sort((a, b) => a.month - b.month).map(r => `
                <div class="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5">
                  <div>
                    <p class="text-xs text-slate-500">${Utils.monthName(r.month)}</p>
                    <p class="font-bold text-brand-600">${Number(r.rate).toFixed(2)}%</p>
                  </div>
                  <div class="flex gap-1">
                    <button onclick="Rates.openForm('${r.id}')" class="w-7 h-7 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><i class="fa-solid fa-pen text-xs"></i></button>
                    <button onclick="Rates.remove('${r.id}')" class="w-7 h-7 grid place-items-center rounded-lg hover:bg-rose-50 text-rose-500"><i class="fa-solid fa-trash text-xs"></i></button>
                  </div>
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>`;
  },

  openForm(id = null) {
    const r = id ? Repos.rates.find(id) : { year: new Date().getFullYear(), month: new Date().getMonth() + 1, rate: '' };
    UI.modal({
      title: id ? 'Editar tasa' : 'Nueva tasa mensual',
      body: `
        <form id="rate-form" class="space-y-4">
          <div class="grid grid-cols-3 gap-4">
            ${UI.field('Año', UI.input('year', { type: 'number', value: r.year, min: 2000, required: true }))}
            ${UI.field('Mes', UI.select('month', Array.from({length:12}, (_,i)=>({value:i+1,label:Utils.monthName(i+1)})), r.month))}
            ${UI.field('Tasa % mensual', UI.input('rate', { type: 'number', value: r.rate, step: '0.01', placeholder: '2.10', required: true }))}
          </div>
        </form>`,
      footer: `<button data-close class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium">Cancelar</button>
               <button onclick="Rates.save('${id || ''}')" class="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold">Guardar</button>`,
    });
  },

  save(id) {
    const f = $('#rate-form');
    const year = Number(f.year.value), month = Number(f.month.value), rate = Number(f.rate.value);
    if (!year || !rate && rate !== 0) return Utils.toast('Datos incompletos', 'error');
    // Evitar duplicados año/mes
    const dup = Repos.rates.all().find(r => r.year === year && r.month === month && r.id !== id);
    if (dup) Repos.rates.update(dup.id, { rate });
    else if (id) Repos.rates.update(id, { year, month, rate });
    else Repos.rates.insert({ year, month, rate });
    Utils.toast('Tasa guardada'); UI.closeModal(); Router.go('rates');
  },

  async remove(id) {
    if (await Utils.confirm('¿Eliminar tasa?', '', 'Eliminar')) { Repos.rates.remove(id); Router.go('rates'); }
  },

  seedYear() {
    const y = new Date().getFullYear();
    for (let m = 1; m <= 12; m++) Repos.rates.insert({ year: y, month: m, rate: 2.0 });
    Utils.toast('Año creado, ajusta cada mes'); Router.go('rates');
  },
};
