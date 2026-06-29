"use strict";

/* ----------------------------------------------------------------
 * 22) MÓDULO: RESPALDOS / EXPORTACIÓN
 * ---------------------------------------------------------------- */
const Backup = {
  download(filename, content, type = 'application/json') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  snapshot() {
    return {
      app: CONFIG.appName, version: CONFIG.version, exportedAt: Utils.nowISO(), user: State.user?.email,
      data: {
        cards: Repos.cards.all(), rates: Repos.rates.all(), expenses: Repos.expenses.all(),
        budgets: Repos.budgets.all(), goals: Repos.goals.all(), recurring: Repos.recurring.all(),
      },
    };
  },
  exportJSON() { this.download(`synaro-respaldo-${Utils.todayStr()}.json`, JSON.stringify(this.snapshot(), null, 2)); Utils.toast('Respaldo exportado'); },
  exportCSV() {
    const rows = [['ID','Fecha','Entidad','Tipo','Categoria','Metodo','Monto','Cuotas','Tasa','Estado']];
    Repos.expenses.all().forEach(e => rows.push([e.id, e.date, e.entity, e.type, e.category, e.method, e.amount, e.installmentsCount, e.interestRate||0, e.status]));
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    this.download(`synaro-movimientos-${Utils.todayStr()}.csv`, csv, 'text/csv');
    Utils.toast('CSV exportado');
  },
  async importJSON(file) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const d = json.data || json;
      if (!d || typeof d !== 'object') throw new Error('Formato inválido');
      if (!await Utils.confirm('¿Restaurar respaldo?', 'Esto reemplazará TODOS tus datos actuales.', 'Restaurar')) return;
      Repos.cards.bulkSet(d.cards || []);
      Repos.rates.bulkSet(d.rates || []);
      Repos.expenses.bulkSet(d.expenses || []);
      Repos.budgets.bulkSet(d.budgets || []);
      Repos.goals.bulkSet(d.goals || []);
      Repos.recurring.bulkSet(d.recurring || []);
      Utils.toast('Respaldo restaurado'); Router.go('dashboard');
    } catch (e) { Utils.toast('Error al importar: ' + e.message, 'error'); }
  },
  async clearAll() {
    if (!await Utils.confirm('¿Borrar todos los datos?', 'Se eliminarán tarjetas, gastos, presupuestos y metas de tu cuenta. No se puede deshacer.', 'Borrar todo')) return;
    ['cards','rates','expenses','budgets','goals','recurring','audit'].forEach(n => Storage.remove(`u:${State.userId}:${n}`));
    Utils.toast('Datos eliminados'); Router.go('dashboard');
  },
};
