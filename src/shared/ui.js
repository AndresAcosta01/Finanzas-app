"use strict";

/* ----------------------------------------------------------------
 * 6) UI — helpers de interfaz (tema, modales, componentes)
 * ---------------------------------------------------------------- */
const UI = {
  isDark() { return document.documentElement.classList.contains('dark'); },
  applyTheme(theme) {
    const dark = theme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    Storage.write('theme', theme);
    const icon = $('#btn-theme i');
    if (icon) icon.className = dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    // refrescar gráficos para colores
    if (State.user) Router.refreshCharts();
  },
  toggleTheme() { this.applyTheme(this.isDark() ? 'light' : 'dark'); },
  initTheme() {
    const saved = Storage.read('theme', null);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  },

  /* Modal genérico */
  modal({ title, body, footer = '', size = 'max-w-lg', onMount } = {}) {
    this.closeModal();
    const wrap = h(`
      <div class="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 animate__animated animate__fadeIn animate__faster">
        <div class="modal-box w-full ${size} bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-card border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col animate__animated animate__fadeInUp animate__faster">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 class="text-lg font-bold">${title}</h3>
            <button data-close class="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="p-6 overflow-y-auto">${body}</div>
          ${footer ? `<div class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 justify-end">${footer}</div>` : ''}
        </div>
      </div>`);
    wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) UI.closeModal(); });
    $('#modal-root').appendChild(wrap);
    onMount && onMount(wrap);
    return wrap;
  },
  closeModal() { const m = $('#modal-root .modal-backdrop'); if (m) m.remove(); },

  /* Componentes reutilizables */
  kpi({ label, value, icon, color = 'brand', sub = '' }) {
    return `
      <div class="surface rounded-2xl p-5 shadow-soft hover:shadow-card transition">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">${label}</p>
            <p class="mt-2 text-2xl font-extrabold tracking-tight">${value}</p>
            ${sub ? `<p class="mt-1 text-xs text-slate-500">${sub}</p>` : ''}
          </div>
          <div class="w-11 h-11 rounded-xl grid place-items-center bg-${color}-100 text-${color}-600 dark:bg-${color}-500/15 dark:text-${color}-300">
            <i class="fa-solid ${icon}"></i>
          </div>
        </div>
      </div>`;
  },
  badge(text, color = 'slate') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-${color}-100 text-${color}-700 dark:bg-${color}-500/15 dark:text-${color}-300">${text}</span>`;
  },
  progress(pct, color = 'brand') {
    const p = Utils.clamp(pct, 0, 100);
    return `<div class="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div class="h-full rounded-full bg-${color}-500 transition-all" style="width:${p}%"></div></div>`;
  },
  empty(msg, icon = 'fa-inbox', actionHtml = '') {
    return `<div class="text-center py-16 text-slate-400">
      <div class="text-5xl mb-3"><i class="fa-solid ${icon}"></i></div>
      <p class="font-medium">${msg}</p>${actionHtml ? `<div class="mt-4">${actionHtml}</div>` : ''}</div>`;
  },
  field(label, inputHtml, hint = '') {
    return `<label class="block"><span class="text-sm font-medium">${label}</span>${inputHtml}${hint ? `<span class="block text-xs text-slate-400 mt-1">${hint}</span>` : ''}</label>`;
  },
  input(name, opts = {}) {
    const { type = 'text', value = '', placeholder = '', required = false, step = '', min = '', extra = '' } = opts;
    return `<input name="${name}" type="${type}" value="${Utils.escape(value)}" placeholder="${placeholder}" ${required ? 'required' : ''} ${step ? `step="${step}"` : ''} ${min !== '' ? `min="${min}"` : ''} ${extra}
      class="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />`;
  },
  select(name, options, value = '', extra = '') {
    const opts = options.map(o => { const v = typeof o === 'object' ? o.value : o; const l = typeof o === 'object' ? o.label : o; return `<option value="${Utils.escape(v)}" ${String(v) === String(value) ? 'selected' : ''}>${Utils.escape(l)}</option>`; }).join('');
    return `<select name="${name}" ${extra} class="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 focus:ring-2 focus:ring-brand-500 outline-none">${opts}</select>`;
  },
  textarea(name, value = '', placeholder = '') {
    return `<textarea name="${name}" rows="2" placeholder="${placeholder}" class="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 focus:ring-2 focus:ring-brand-500 outline-none">${Utils.escape(value)}</textarea>`;
  },
};
