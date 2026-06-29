"use strict";

/* ----------------------------------------------------------------
 * 5) ESTADO GLOBAL
 * ---------------------------------------------------------------- */
const State = {
  user: null,
  userId: null,
  view: 'dashboard',
  charts: {},          // instancias Chart.js para destruir/recrear
  searchQuery: '',
};
