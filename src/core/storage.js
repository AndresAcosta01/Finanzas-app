"use strict";

/* ----------------------------------------------------------------
 * 3) CAPA DE PERSISTENCIA (abstracción tipo Repository)
 *    Hoy: LocalStorage.  Mañana: cambiar SOLO Storage._read/_write
 *    por llamadas a SQLite / MySQL / PostgreSQL / Supabase.
 * ---------------------------------------------------------------- */
const Storage = {
  _key(k) { return CONFIG.storagePrefix + k; },
  read(k, fallback = null) {
    try { const raw = localStorage.getItem(this._key(k)); return raw == null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  },
  write(k, value) { localStorage.setItem(this._key(k), JSON.stringify(value)); },
  remove(k) { localStorage.removeItem(this._key(k)); },
  keys() { return Object.keys(localStorage).filter(k => k.startsWith(CONFIG.storagePrefix)).map(k => k.slice(CONFIG.storagePrefix.length)); },
};

/* Factoría de repositorios con CRUD + auditoría, datos aislados por usuario */
function Repository(name) {
  const key = () => `u:${State.userId || 'anon'}:${name}`;
  return {
    name,
    all() { return Storage.read(key(), []); },
    save(list) { Storage.write(key(), list); return list; },
    find(id) { return this.all().find(x => x.id === id) || null; },
    where(fn) { return this.all().filter(fn); },
    insert(obj) {
      const list = this.all();
      obj.id ||= Utils.uid(name.slice(0, 3));
      obj.createdAt ||= Utils.nowISO();
      list.push(obj); this.save(list);
      Audit.log('create', name, obj.id, obj.description || obj.name || obj.id);
      return obj;
    },
    update(id, patch) {
      const list = this.all(); const i = list.findIndex(x => x.id === id);
      if (i < 0) return null;
      list[i] = { ...list[i], ...patch, updatedAt: Utils.nowISO() };
      this.save(list);
      Audit.log('update', name, id, list[i].description || list[i].name || id);
      return list[i];
    },
    remove(id) {
      const list = this.all().filter(x => x.id !== id);
      this.save(list);
      Audit.log('delete', name, id, '');
      return true;
    },
    bulkSet(list) { this.save(list); return list; },
  };
}

/* Repositorios de dominio */
const Repos = {
  cards:     Repository('cards'),
  rates:     Repository('rates'),       // tasas de interés por mes
  expenses:  Repository('expenses'),    // compras / movimientos (ingresos y egresos)
  budgets:   Repository('budgets'),
  goals:     Repository('goals'),
  recurring: Repository('recurring'),
  audit:     Repository('audit'),
};
