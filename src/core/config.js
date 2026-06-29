"use strict";

/* =================================================================
 * FINANZAS PRO
 * Centro Financiero Personal Inteligente
 * Arquitectura modular (módulos internos namespaced) — Vanilla ES2023
 * Capas: Config · Utils · Storage(Repository) · Models · Services · UI · Router · App
 * ================================================================= */

/* ----------------------------------------------------------------
 * 1) CONFIGURACIÓN GLOBAL
 * ---------------------------------------------------------------- */
const CONFIG = {
  appName: 'Finanzas PRO',
  version: '1.0.0',
  storagePrefix: 'finpro:',
  currency: 'COP',
  locale: 'es-CO',
  admin: { name: 'Andrés Acosta', email: 'andresacost12@gmail.com', password: 'andres12' },
  categories: ['Comida','Transporte','Ocio','Salud','Educación','Tecnología','Hogar','Servicios','Ropa','Mascotas','Viajes','Otros'],
  incomeCategories: ['Salario','Freelance','Ventas','Negocio','Inversiones','Intereses','Reembolso','Bonificación','Regalo','Arriendo recibido','Otros'],
  banks: ['Bancolombia','Davivienda','Banco de Bogotá','BBVA','Nu','Scotiabank Colpatria','Falabella','Banco Popular','AV Villas','Itaú','Otro'],
  paymentDaysAhead: 7,   // ventana "próximo pago"
};
