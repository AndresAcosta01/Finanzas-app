"use strict";

/* ----------------------------------------------------------------
 * 2) UTILIDADES
 * ---------------------------------------------------------------- */
const Utils = {
  uid(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },
  nowISO() { return new Date().toISOString(); },
  todayStr() { return new Date().toISOString().slice(0, 10); },

  money(n) {
    const v = Number(n) || 0;
    return new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.currency, maximumFractionDigits: 0 }).format(v);
  },
  number(n) { return new Intl.NumberFormat(CONFIG.locale).format(Number(n) || 0); },
  pct(n) { return (Number(n) || 0).toFixed(1) + '%'; },

  // Fechas
  parseDate(str) { const d = new Date(str + (String(str).length === 10 ? 'T00:00:00' : '')); return isNaN(d) ? new Date(str) : d; },
  monthKey(dateStr) { const d = Utils.parseDate(dateStr); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); },
  monthName(m) { return ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m - 1] || ''; },
  fmtDate(str) {
    if (!str) return '—';
    const d = Utils.parseDate(str);
    return d.toLocaleDateString(CONFIG.locale, { day: '2-digit', month: 'short', year: 'numeric' });
  },
  fmtDateShort(str) { if (!str) return '—'; const d = Utils.parseDate(str); return d.toLocaleDateString(CONFIG.locale, { day: '2-digit', month: 'short' }); },
  daysUntil(str) { const d = Utils.parseDate(str); const t = new Date(); t.setHours(0,0,0,0); return Math.round((d - t) / 86400000); },
  addMonths(date, n) { const d = new Date(date); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return d; },
  dateOnMonth(year, monthIdx, day) { const last = new Date(year, monthIdx + 1, 0).getDate(); return new Date(year, monthIdx, Math.min(day, last)); },
  iso(d) { return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); },

  // Hash de contraseña (SHA-256) — nunca guardamos texto plano
  async hash(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // fallback simple (entornos sin crypto.subtle / http)
      let h = 0; for (let i = 0; i < text.length; i++) { h = (h << 5) - h + text.charCodeAt(i); h |= 0; }
      return 'fb' + Math.abs(h).toString(16);
    }
  },

  escape(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); },
  clamp(n, min, max) { return Math.max(min, Math.min(max, n)); },
  sum(arr, fn) { return arr.reduce((a, x) => a + (fn ? fn(x) : x), 0); },
  groupBy(arr, fn) { return arr.reduce((m, x) => { const k = fn(x); (m[k] ||= []).push(x); return m; }, {}); },
  debounce(fn, ms = 300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },

  // Toast / alertas (SweetAlert2 con fallback)
  toast(title, icon = 'success') {
    if (window.Swal) Swal.fire({ toast: true, position: 'top-end', timer: 2600, showConfirmButton: false, icon, title, background: UI.isDark() ? '#0f172a' : '#fff', color: UI.isDark() ? '#e2e8f0' : '#0f172a' });
    else console.log(`[${icon}] ${title}`);
  },
  async confirm(title, text = '', confirmText = 'Sí, continuar') {
    if (window.Swal) {
      const r = await Swal.fire({ title, text, icon: 'warning', showCancelButton: true, confirmButtonText: confirmText, cancelButtonText: 'Cancelar', confirmButtonColor: '#e11d48', cancelButtonColor: '#64748b', background: UI.isDark() ? '#0f172a' : '#fff', color: UI.isDark() ? '#e2e8f0' : '#0f172a' });
      return r.isConfirmed;
    }
    return window.confirm(title);
  },
};

/* atajos DOM */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const h  = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
