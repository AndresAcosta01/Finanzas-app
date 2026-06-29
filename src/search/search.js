"use strict";

/* ----------------------------------------------------------------
 * 21) MÓDULO: BUSCADOR GLOBAL
 * ---------------------------------------------------------------- */
const Search = {
  render() {
    const q = State.searchQuery || '';
    return `
      <div class="view space-y-6">
        <div><h2 class="text-xl font-bold">Buscador</h2><p class="text-sm text-slate-500">Busca por entidad, banco, tarjeta, categoría, monto, estado, etiqueta o texto libre.</p></div>
        <div class="surface rounded-2xl p-2 flex items-center">
          <i class="fa-solid fa-magnifying-glass text-slate-400 px-3"></i>
          <input id="search-box" value="${Utils.escape(q)}" oninput="Search.run(this.value)" placeholder="Escribe para buscar..." class="flex-1 bg-transparent py-3 outline-none" autofocus/>
        </div>
        <div id="search-results"></div>
      </div>`;
  },
  mount() { this.run(State.searchQuery || ''); },
  run(q) {
    State.searchQuery = q;
    const res = $('#search-results'); if (!res) return;
    const term = q.trim().toLowerCase();
    if (!term) { res.innerHTML = UI.empty('Empieza a escribir para buscar.', 'fa-magnifying-glass'); return; }

    const expenses = Repos.expenses.all().filter(e => {
      const card = e.cardId ? Repos.cards.find(e.cardId) : null;
      const hay = [e.entity, e.description, e.category, e.subcategory, e.tags, e.city, e.method, e.status, String(e.amount), card?.name, card?.bank].join(' ').toLowerCase();
      return hay.includes(term);
    });
    const cards = Repos.cards.all().filter(c => [c.name, c.bank, c.brand, c.last4].join(' ').toLowerCase().includes(term));

    res.innerHTML = `
      ${cards.length ? `<h3 class="font-semibold mb-2 mt-2">Tarjetas (${cards.length})</h3>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">${cards.map(c => `<div class="surface rounded-xl p-3 flex items-center gap-3 cursor-pointer" onclick="Cards.openDetail('${c.id}')"><div class="w-9 h-9 rounded-lg grid place-items-center bg-brand-100 text-brand-600 dark:bg-brand-500/15"><i class="fa-solid fa-credit-card"></i></div><div><p class="font-medium text-sm">${Utils.escape(c.name)}</p><p class="text-xs text-slate-500">${c.bank} ····${c.last4||''}</p></div></div>`).join('')}</div>` : ''}
      ${expenses.length ? `<h3 class="font-semibold mb-2">Movimientos (${expenses.length})</h3><div class="space-y-2">${expenses.map(e => Expenses.rowHTML(Engine.refreshInstallmentStatus(e))).join('')}</div>`
        : (cards.length ? '' : UI.empty('Sin resultados para "' + Utils.escape(q) + '"', 'fa-ban'))}`;
  },
};
