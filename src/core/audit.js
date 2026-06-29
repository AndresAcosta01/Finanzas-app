"use strict";

/* ----------------------------------------------------------------
 * 4) AUDITORÍA / HISTORIAL
 * ---------------------------------------------------------------- */
const Audit = {
  log(action, entity, entityId, label = '') {
    if (entity === 'audit' || !State.userId) return; // evita recursión
    const list = Storage.read(`u:${State.userId}:audit`, []);
    list.unshift({
      id: Utils.uid('aud'), action, entity, entityId, label,
      user: State.user?.email || 'sistema',
      at: Utils.nowISO(),
    });
    Storage.write(`u:${State.userId}:audit`, list.slice(0, 500));
  },
};
