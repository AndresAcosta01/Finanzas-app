"use strict";

/* ----------------------------------------------------------------
 * 14) MÓDULO: METAS DE AHORRO
 * ---------------------------------------------------------------- */
const Goals = {
  render() {
    const goals = Repos.goals.all();
    return `
      <div class="view space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><h2 class="text-xl font-bold">Metas de ahorro</h2><p class="text-sm text-slate-500">Define objetivos y sigue tu avance.</p></div>
          <button onclick="Goals.openForm()" class="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 shadow-soft"><i class="fa-solid fa-plus"></i> Nueva meta</button>
        </div>
        ${goals.length === 0 ? UI.empty('Sin metas todavía. ¡Crea una!', 'fa-bullseye') :
        `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${goals.map(g => {
            const pct = g.target > 0 ? Utils.clamp(g.current / g.target * 100, 0, 100) : 0;
            const C = 2 * Math.PI * 42;
            return `<div class="surface rounded-2xl p-5 shadow-soft text-center">
              <div class="flex justify-between items-start">
                <h3 class="font-semibold text-left">${Utils.escape(g.name)}</h3>
                <div class="flex gap-1">
                  <button onclick="Goals.openForm('${g.id}')" class="w-7 h-7 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><i class="fa-solid fa-pen text-xs"></i></button>
                  <button onclick="Goals.remove('${g.id}')" class="w-7 h-7 grid place-items-center rounded-lg hover:bg-rose-50 text-rose-500"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>
              </div>
              <div class="relative w-32 h-32 mx-auto my-3">
                <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" class="text-slate-200 dark:text-slate-800" stroke-width="8"/>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" class="text-brand-500 ring-progress" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C - C * pct / 100}"/>
                </svg>
                <div class="absolute inset-0 grid place-items-center"><span class="text-xl font-extrabold">${pct.toFixed(0)}%</span></div>
              </div>
              <p class="text-sm font-semibold">${Utils.money(g.current)} <span class="text-slate-400 font-normal">/ ${Utils.money(g.target)}</span></p>
              ${g.deadline ? `<p class="text-xs text-slate-500 mt-1">Meta: ${Utils.fmtDate(g.deadline)}</p>` : ''}
              <button onclick="Goals.addFunds('${g.id}')" class="mt-3 w-full rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 font-semibold py-2 text-sm hover:bg-brand-100"><i class="fa-solid fa-plus"></i> Abonar</button>
            </div>`;
          }).join('')}</div>`}
      </div>`;
  },
  openForm(id = null) {
    const g = id ? Repos.goals.find(id) : {};
    UI.modal({ title: id ? 'Editar meta' : 'Nueva meta',
      body: `<form id="goal-form" class="space-y-4">
        ${UI.field('Nombre', UI.input('name', { value: g.name || '', placeholder: 'Ej: Viaje, Fondo de emergencia', required: true }))}
        <div class="grid grid-cols-2 gap-4">
          ${UI.field('Valor objetivo', UI.input('target', { type: 'number', value: g.target || '', min: 0, required: true }))}
          ${UI.field('Valor actual', UI.input('current', { type: 'number', value: g.current || 0, min: 0 }))}
        </div>
        ${UI.field('Fecha objetivo', UI.input('deadline', { type: 'date', value: g.deadline || '' }))}
      </form>`,
      footer: `<button data-close class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium">Cancelar</button>
               <button onclick="Goals.save('${id||''}')" class="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold">Guardar</button>` });
  },
  save(id) {
    const f = $('#goal-form');
    const data = { name: f.name.value.trim(), target: Number(f.target.value) || 0, current: Number(f.current.value) || 0, deadline: f.deadline.value || null };
    if (id) Repos.goals.update(id, data); else Repos.goals.insert(data);
    Utils.toast('Meta guardada'); UI.closeModal(); Router.go('goals');
  },
  async addFunds(id) {
    const g = Repos.goals.find(id);
    if (window.Swal) {
      const { value } = await Swal.fire({ title: `Abonar a "${g.name}"`, input: 'number', inputLabelText: 'Monto', inputPlaceholder: '0', showCancelButton: true, confirmButtonColor: '#4f46e5', background: UI.isDark()?'#0f172a':'#fff', color: UI.isDark()?'#e2e8f0':'#0f172a' });
      if (value) { Repos.goals.update(id, { current: (g.current||0) + Number(value) }); Utils.toast('Abono registrado'); Router.go('goals'); }
    } else { const v = prompt('Monto a abonar'); if (v) { Repos.goals.update(id, { current: (g.current||0) + Number(v) }); Router.go('goals'); } }
  },
  async remove(id) { if (await Utils.confirm('¿Eliminar meta?', '', 'Eliminar')) { Repos.goals.remove(id); Router.go('goals'); } },
};
