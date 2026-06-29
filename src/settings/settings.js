"use strict";

/* ----------------------------------------------------------------
 * 23) MÓDULO: AJUSTES + HISTORIAL (auditoría) + Usuarios (admin)
 * ---------------------------------------------------------------- */
const Settings = {
  render() {
    const u = State.user;
    const audit = Storage.read(`u:${State.userId}:audit`, []).slice(0, 40);
    const isAdmin = u.role === 'admin';
    const users = isAdmin ? Auth.getUsers() : [];
    const actionLabel = { create: 'Creó', update: 'Modificó', delete: 'Eliminó' };
    const actionColor = { create: 'emerald', update: 'amber', delete: 'rose' };
    return `
      <div class="view space-y-6">
        <div><h2 class="text-xl font-bold">Ajustes y respaldos</h2><p class="text-sm text-slate-500">Perfil, copias de seguridad e historial de actividad.</p></div>

        <div class="grid lg:grid-cols-2 gap-5">
          <div class="surface rounded-2xl p-5 shadow-soft">
            <h3 class="font-semibold mb-3">Perfil</h3>
            <div class="flex items-center gap-3">
              <div class="w-14 h-14 rounded-2xl bg-brand-600 text-white grid place-items-center text-xl font-bold">${(u.name||u.email)[0].toUpperCase()}</div>
              <div><p class="font-semibold">${Utils.escape(u.name)}</p><p class="text-sm text-slate-500">${Utils.escape(u.email)}</p>${UI.badge(u.role, u.role==='admin'?'brand':'slate')}</div>
            </div>
          </div>

          <div class="surface rounded-2xl p-5 shadow-soft">
            <h3 class="font-semibold mb-3">Apariencia</h3>
            <button onclick="UI.toggleTheme()" class="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 font-medium"><i class="fa-solid fa-circle-half-stroke"></i> Cambiar tema (claro/oscuro)</button>
          </div>

          <div class="surface rounded-2xl p-5 shadow-soft">
            <h3 class="font-semibold mb-3">Copias de seguridad</h3>
            <p class="text-sm text-slate-500 mb-3">Tus datos se guardan automáticamente en este navegador. Exporta un respaldo para no perderlos.</p>
            <div class="flex flex-wrap gap-2">
              <button onclick="Backup.exportJSON()" class="rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-semibold"><i class="fa-solid fa-download"></i> Exportar JSON</button>
              <button onclick="Backup.exportCSV()" class="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
              <label class="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium cursor-pointer"><i class="fa-solid fa-upload"></i> Importar
                <input type="file" accept="application/json" class="hidden" onchange="if(this.files[0])Backup.importJSON(this.files[0])"/></label>
            </div>
          </div>

          <div class="surface rounded-2xl p-5 shadow-soft border-rose-200 dark:border-rose-500/30">
            <h3 class="font-semibold mb-3 text-rose-600">Zona de peligro</h3>
            <button onclick="Backup.clearAll()" class="rounded-xl bg-rose-600 text-white px-4 py-2 text-sm font-semibold"><i class="fa-solid fa-trash"></i> Borrar todos mis datos</button>
          </div>
        </div>

        ${isAdmin ? `<div class="surface rounded-2xl p-5 shadow-soft">
          <h3 class="font-semibold mb-3">Usuarios registrados (${users.length})</h3>
          <div class="space-y-2">${users.map(x => `<div class="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm"><div><b>${Utils.escape(x.name)}</b> <span class="text-slate-500">${Utils.escape(x.email)}</span></div>${UI.badge(x.role, x.role==='admin'?'brand':'slate')}</div>`).join('')}</div>
        </div>` : ''}

        <div class="surface rounded-2xl p-5 shadow-soft">
          <h3 class="font-semibold mb-3">Historial de actividad</h3>
          ${audit.length ? `<div class="space-y-1 max-h-96 overflow-y-auto">${audit.map(a => `
            <div class="flex items-center gap-3 text-sm py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
              ${UI.badge(actionLabel[a.action]||a.action, actionColor[a.action]||'slate')}
              <span class="flex-1 truncate">${a.entity}${a.label ? ' · ' + Utils.escape(a.label) : ''}</span>
              <span class="text-xs text-slate-400">${new Date(a.at).toLocaleString(CONFIG.locale)}</span>
            </div>`).join('')}</div>` : `<p class="text-sm text-slate-400">Sin actividad registrada.</p>`}
        </div>
      </div>`;
  },
};
